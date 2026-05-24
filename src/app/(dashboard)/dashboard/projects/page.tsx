"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  PROJECT_STATUSES, TASK_STATUSES, TASK_PRIORITIES, TASK_TYPES,
  SPRINT_STATUSES, EXPENSE_CATEGORIES, PROJECT_CATEGORIES, PROJECT_COLORS,
  getProjectStatus, getTaskStatus, getTaskPriority, getTaskType, getSprintStatus, getExpenseCategory
} from "@/lib/project-types";
import type {
  Project, Task, ProjectSprint, ProjectMember, ProjectLabel,
  ProjectExpense, TaskComment, TaskWorkLog, ProjectComment, ProjectActivity
} from "@/lib/project-types";

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_PROJECT = { name: "", key: "", description: "", category: "", color: PROJECT_COLORS[0], budget: "", currency: "TRY", startDate: "", endDate: "" };
const EMPTY_TASK: Record<string, string | number | string[]> = {
  title: "", description: "", type: "task", status: "todo", priority: "medium",
  assignedTo: "", estimatedHours: "", storyPoints: "", dueDate: "", sprintId: "", parentId: "", labelIds: [] as string[]
};
const EMPTY_SPRINT = { name: "", goal: "", startDate: "", endDate: "" };
const EMPTY_EXPENSE = { title: "", amount: "", currency: "TRY", category: "other", description: "", expenseDate: new Date().toISOString().split("T")[0] };

type WorkspaceView = "board" | "backlog" | "sprints" | "tempo" | "budget" | "members" | "activity";

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}
function formatHours(h: number | null | undefined) {
  if (!h) return "—";
  return `${h}s`;
}
function formatMoney(n: number, currency = "TRY") {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
}
function relativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "az önce";
  if (mins < 60) return `${mins}d önce`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}s önce`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}g önce`;
  return formatDate(d);
}
function userInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}
function avatarColor(id: string) {
  const colors = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-teal-500", "bg-pink-500"];
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { data: session } = useSession();

  // ── Project List ──
  const [projects, setProjects] = useState<Project[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // ── Workspace ──
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string; image: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("board");
  const [boardFilterAssignee, setBoardFilterAssignee] = useState("");
  const [boardFilterPriority, setBoardFilterPriority] = useState("");
  const [boardFilterType, setBoardFilterType] = useState("");
  const [boardSearch, setBoardSearch] = useState("");
  const [boardFilterSprint, setBoardFilterSprint] = useState("");

  // ── Modals / Drawers ──
  const [projectDrawer, setProjectDrawer] = useState<"new" | Project | null>(null);
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT);
  const [savingProject, setSavingProject] = useState(false);

  const [taskPanel, setTaskPanel] = useState<Task | null>(null); // right panel detail
  const [taskDrawer, setTaskDrawer] = useState<"new" | { parentId?: string; sprintId?: string } | null>(null);
  const [taskForm, setTaskForm] = useState<typeof EMPTY_TASK>({ ...EMPTY_TASK });
  const [savingTask, setSavingTask] = useState(false);

  const [sprintDrawer, setSprintDrawer] = useState<"new" | ProjectSprint | null>(null);
  const [sprintForm, setSprintForm] = useState(EMPTY_SPRINT);
  const [savingSprint, setSavingSprint] = useState(false);

  const [expenseDrawer, setExpenseDrawer] = useState<boolean>(false);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);
  const [savingExpense, setSavingExpense] = useState(false);

  const [memberDrawer, setMemberDrawer] = useState<boolean>(false);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [savingMember, setSavingMember] = useState(false);

  const [labelDrawer, setLabelDrawer] = useState(false);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#6366f1");
  const [savingLabel, setSavingLabel] = useState(false);

  // ── Task Detail Panel ──
  const [taskCommentText, setTaskCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [workLogForm, setWorkLogForm] = useState({ hours: "", description: "", loggedAt: new Date().toISOString().split("T")[0] });
  const [savingWorkLog, setSavingWorkLog] = useState(false);
  const [taskPanelTab, setTaskPanelTab] = useState<"detail" | "worklog" | "activity">("detail");

  // ── Tempo View ──
  const [tempoLogs, setTempoLogs] = useState<TaskWorkLog[]>([]);
  const [tempoLoading, setTempoLoading] = useState(false);
  const [tempoFromDate, setTempoFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  });
  const [tempoToDate, setTempoToDate] = useState(new Date().toISOString().split("T")[0]);
  const [tempoFilterUser, setTempoFilterUser] = useState("");

  // ── Integration (create task) ──
  const [integrationAction, setIntegrationAction] = useState<"" | "create_production" | "create_expense">("");
  const [integrationForm, setIntegrationForm] = useState({ productionLineId: "", productionMethodId: "", productionQuantity: 100, expenseCategoryId: "", expenseAmount: 1000, expenseCurrency: "TRY" });
  const [productionLines, setProductionLines] = useState<{ id: string; name: string }[]>([]);
  const [productionMethods, setProductionMethods] = useState<{ id: string; name: string; version: string }[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<{ id: string; name: string }[]>([]);

  // ── Derived ──
  const activeSprint = project?.sprints?.find((s) => s.status === "active") ?? null;
  const backlogTasks = (project?.tasks ?? []).filter((t) => !t.sprintId);
  const filteredTasks = (project?.tasks ?? []).filter((t) => {
    if (boardFilterAssignee && t.assignedTo !== boardFilterAssignee) return false;
    if (boardFilterPriority && t.priority !== boardFilterPriority) return false;
    if (boardFilterType && t.type !== boardFilterType) return false;
    if (boardFilterSprint === "__backlog" && t.sprintId) return false;
    if (boardFilterSprint && boardFilterSprint !== "__backlog" && t.sprintId !== boardFilterSprint) return false;
    if (boardSearch && !t.title.toLowerCase().includes(boardSearch.toLowerCase())) return false;
    return true;
  });

  // ─── Data Loading ───────────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    setListLoading(true);
    try {
      const r = await fetch(`/api/modules/projects?status=${statusFilter}`);
      if (r.ok) {
        const d = await r.json() as { projects: Project[] };
        setProjects(d.projects ?? []);
      }
    } finally {
      setListLoading(false);
    }
  }, [statusFilter]);

  const loadWorkspace = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/modules/projects/${id}`);
      if (r.ok) {
        const d = await r.json() as {
          project: Project;
          users: { id: string; name: string; image: string | null }[];
          expenseCategories: { id: string; name: string }[];
          productionLines: { id: string; name: string }[];
          productionMethods: { id: string; name: string; version: string }[];
        };
        setProject(d.project);
        setUsers(d.users ?? []);
        setExpenseCategories(d.expenseCategories ?? []);
        setProductionLines(d.productionLines ?? []);
        setProductionMethods(d.productionMethods ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTempoLogs = useCallback(async () => {
    if (!selectedProjectId) return;
    setTempoLoading(true);
    try {
      const params = new URLSearchParams({ projectId: selectedProjectId, from: tempoFromDate, to: tempoToDate, ...(tempoFilterUser ? { userId: tempoFilterUser } : {}) });
      const r = await fetch(`/api/modules/tasks/worklogs?${params}`);
      if (r.ok) {
        const d = await r.json() as { logs: TaskWorkLog[] };
        setTempoLogs(d.logs ?? []);
      }
    } finally {
      setTempoLoading(false);
    }
  }, [selectedProjectId, tempoFromDate, tempoToDate, tempoFilterUser]);

  useEffect(() => {
    if (selectedProjectId) {
      void loadWorkspace(selectedProjectId);
    } else {
      setProject(null);
      void loadProjects();
    }
  }, [selectedProjectId, loadWorkspace, loadProjects]);

  useEffect(() => {
    if (workspaceView === "tempo") void loadTempoLogs();
  }, [workspaceView, loadTempoLogs]);

  // Sync task panel with updated project data
  useEffect(() => {
    if (taskPanel && project?.tasks) {
      const updated = project.tasks.find((t) => t.id === taskPanel.id);
      if (updated) setTaskPanel(updated);
    }
  }, [project]);

  // ─── CRUD Handlers ──────────────────────────────────────────────────────────

  async function saveProject() {
    setSavingProject(true);
    try {
      const payload = { ...projectForm, budget: projectForm.budget ? Number(projectForm.budget) : null, startDate: projectForm.startDate || null, endDate: projectForm.endDate || null };
      if (projectDrawer === "new") {
        const r = await fetch("/api/modules/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (r.ok) { const p = await r.json() as Project; setProjectDrawer(null); await loadProjects(); setSelectedProjectId(p.id); }
      } else if (projectDrawer) {
        await fetch(`/api/modules/projects/${(projectDrawer as Project).id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        setProjectDrawer(null);
        if (selectedProjectId) await loadWorkspace(selectedProjectId);
        await loadProjects();
      }
    } finally { setSavingProject(false); }
  }

  async function deleteProject(id: string) {
    if (!confirm("Bu projeyi ve tüm görevlerini silmek istediğinize emin misiniz?")) return;
    await fetch("/api/modules/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setSelectedProjectId(null);
    await loadProjects();
  }

  async function saveTask() {
    if (!taskForm.title || !selectedProjectId) return;
    setSavingTask(true);
    try {
      const payload = {
        ...taskForm,
        projectId: selectedProjectId,
        estimatedHours: taskForm.estimatedHours ? Number(taskForm.estimatedHours) : undefined,
        storyPoints: taskForm.storyPoints ? Number(taskForm.storyPoints) : undefined,
        dueDate: taskForm.dueDate || undefined,
        sprintId: taskForm.sprintId || undefined,
        parentId: (typeof taskDrawer === "object" && taskDrawer?.parentId) ? taskDrawer.parentId : undefined,
        labelIds: taskForm.labelIds as string[],
        integrationAction: integrationAction || undefined,
        ...integrationForm,
      };
      const r = await fetch("/api/modules/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        setTaskDrawer(null);
        setTaskForm({ ...EMPTY_TASK });
        setIntegrationAction("");
        await loadWorkspace(selectedProjectId);
      }
    } finally { setSavingTask(false); }
  }

  async function updateTask(id: string, patch: Record<string, unknown>) {
    await fetch("/api/modules/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    if (selectedProjectId) await loadWorkspace(selectedProjectId);
  }

  async function deleteTask(id: string) {
    if (!confirm("Bu görevi silmek istediğinize emin misiniz?")) return;
    await fetch("/api/modules/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setTaskPanel(null);
    if (selectedProjectId) await loadWorkspace(selectedProjectId);
  }

  async function addWorkLog() {
    if (!taskPanel || !workLogForm.hours || !selectedProjectId) return;
    setSavingWorkLog(true);
    try {
      const r = await fetch("/api/modules/tasks/worklogs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: taskPanel.id, hours: Number(workLogForm.hours), description: workLogForm.description, loggedAt: workLogForm.loggedAt })
      });
      if (r.ok) { setWorkLogForm({ hours: "", description: "", loggedAt: new Date().toISOString().split("T")[0] }); await loadWorkspace(selectedProjectId); }
    } finally { setSavingWorkLog(false); }
  }

  async function addComment() {
    if (!taskPanel || !taskCommentText.trim() || !selectedProjectId) return;
    setSavingComment(true);
    try {
      const r = await fetch("/api/modules/tasks/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: taskPanel.id, body: taskCommentText.trim() })
      });
      if (r.ok) { setTaskCommentText(""); await loadWorkspace(selectedProjectId); }
    } finally { setSavingComment(false); }
  }

  async function saveSprint() {
    if (!sprintForm.name || !selectedProjectId) return;
    setSavingSprint(true);
    try {
      if (sprintDrawer === "new") {
        await fetch(`/api/modules/projects/${selectedProjectId}/sprints`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sprintForm) });
      } else {
        await fetch(`/api/modules/projects/${selectedProjectId}/sprints`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: (sprintDrawer as ProjectSprint).id, ...sprintForm }) });
      }
      setSprintDrawer(null);
      setSprintForm(EMPTY_SPRINT);
      await loadWorkspace(selectedProjectId);
    } finally { setSavingSprint(false); }
  }

  async function updateSprintStatus(sprintId: string, status: string) {
    if (!selectedProjectId) return;
    await fetch(`/api/modules/projects/${selectedProjectId}/sprints`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sprintId, status }) });
    await loadWorkspace(selectedProjectId);
  }

  async function deleteSprint(sprintId: string) {
    if (!confirm("Sprint silinecek, görevler backlog'a taşınacak. Emin misiniz?") || !selectedProjectId) return;
    await fetch(`/api/modules/projects/${selectedProjectId}/sprints`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sprintId }) });
    await loadWorkspace(selectedProjectId);
  }

  async function saveExpense() {
    if (!expenseForm.title || !expenseForm.amount || !selectedProjectId) return;
    setSavingExpense(true);
    try {
      await fetch(`/api/modules/projects/${selectedProjectId}/expenses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount) }) });
      setExpenseDrawer(false);
      setExpenseForm(EMPTY_EXPENSE);
      await loadWorkspace(selectedProjectId);
    } finally { setSavingExpense(false); }
  }

  async function deleteExpense(id: string) {
    if (!confirm("Bu gideri silmek istediğinize emin misiniz?") || !selectedProjectId) return;
    await fetch(`/api/modules/projects/${selectedProjectId}/expenses`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadWorkspace(selectedProjectId);
  }

  async function saveMember() {
    if (!memberUserId || !selectedProjectId) return;
    setSavingMember(true);
    try {
      await fetch(`/api/modules/projects/${selectedProjectId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: memberUserId, role: memberRole }) });
      setMemberUserId(""); setMemberRole("member");
      await loadWorkspace(selectedProjectId);
    } finally { setSavingMember(false); }
  }

  async function removeMember(userId: string) {
    if (!confirm("Bu üyeyi projeden kaldırmak istediğinize emin misiniz?") || !selectedProjectId) return;
    await fetch(`/api/modules/projects/${selectedProjectId}/members`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    await loadWorkspace(selectedProjectId);
  }

  async function saveLabel() {
    if (!labelName || !selectedProjectId) return;
    setSavingLabel(true);
    try {
      await fetch(`/api/modules/projects/${selectedProjectId}/labels`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: labelName, color: labelColor }) });
      setLabelName(""); setLabelColor("#6366f1"); setLabelDrawer(false);
      await loadWorkspace(selectedProjectId);
    } finally { setSavingLabel(false); }
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  // If no project selected → project list
  if (!selectedProjectId) {
    return (
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm">
                <i className="pi pi-briefcase" />
              </span>
              Projeler
            </h1>
            <p className="text-slate-400 text-sm mt-0.5 font-medium">Tüm projelerinizi yönetin ve takip edin</p>
          </div>
          <button
            onClick={() => { setProjectForm({ ...EMPTY_PROJECT, color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)] }); setProjectDrawer("new"); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition"
            style={{ background: "var(--color-primary)" }}
          >
            <i className="pi pi-plus text-xs" /> Yeni Proje
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[{ id: "", label: "Tümü" }, ...PROJECT_STATUSES].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${statusFilter === s.id ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-900 border border-border text-slate-600 dark:text-slate-300 hover:border-indigo-300"}`}
            >
              {"icon" in s && <i className={`pi ${s.icon} mr-1 text-[10px]`} />}{s.label}
            </button>
          ))}
          <div className="ml-auto relative">
            <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Proje ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-border text-xs focus:outline-none w-44 bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {listLoading ? (
          <div className="flex items-center justify-center py-24"><i className="pi pi-spin pi-spinner text-3xl text-indigo-500" /></div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <i className="pi pi-briefcase text-2xl text-slate-400" />
            </div>
            <h3 className="font-bold text-foreground text-lg">Proje Bulunamadı</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-xs">Yeni bir proje başlatarak ekibinizi organize edin.</p>
            <button
              onClick={() => { setProjectForm({ ...EMPTY_PROJECT }); setProjectDrawer("new"); }}
              className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition"
            >
              İlk Projeyi Oluştur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects
              .filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((p) => {
                const st = getProjectStatus(p.status);
                const pColor = p.color || "#6366f1";
                const memberCount = p._count?.members ?? 0;
                const taskCount = p._count?.tasks ?? 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-border hover:border-slate-300 hover:shadow-lg transition duration-200 cursor-pointer overflow-hidden group"
                  >
                    {/* Color bar */}
                    <div className="h-1.5" style={{ backgroundColor: pColor }} />
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        {/* Project Avatar */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0" style={{ backgroundColor: pColor }}>
                          {p.key ? p.key.slice(0, 3) : p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-sm group-hover:text-indigo-600 transition line-clamp-1">{p.name}</h3>
                          {p.category && <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{PROJECT_CATEGORIES.find((c) => c.id === p.category)?.label ?? p.category}</p>}
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 ${st.bg}`}>{st.label}</span>
                      </div>

                      {p.description && <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>}

                      {/* Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>İlerleme</span><span style={{ color: pColor }}>{p.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: pColor }} />
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                          <span className="flex items-center gap-1"><i className="pi pi-check-square" />{taskCount}</span>
                          <span className="flex items-center gap-1"><i className="pi pi-users" />{memberCount}</span>
                          {p.budget && <span className="flex items-center gap-1 text-emerald-600"><i className="pi pi-wallet" />{formatMoney(p.budget, p.currency)}</span>}
                        </div>
                        {p.endDate && (
                          <span className={`text-[10px] font-bold ${new Date(p.endDate) < new Date() ? "text-red-500" : "text-slate-400"}`}>
                            <i className="pi pi-calendar mr-1" />{formatDate(p.endDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* New/Edit Project Drawer */}
        {projectDrawer && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end" onClick={() => setProjectDrawer(null)}>
            <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-black text-foreground">{projectDrawer === "new" ? "Yeni Proje Başlat" : "Projeyi Düzenle"}</h2>
                <button onClick={() => setProjectDrawer(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><i className="pi pi-times" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Color Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Proje Rengi</label>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setProjectForm((f) => ({ ...f, color: c }))}
                        className={`w-7 h-7 rounded-lg transition ${projectForm.color === c ? "ring-2 ring-offset-2 ring-slate-500 scale-110" : "hover:scale-110"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Proje Adı *</label>
                    <input value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} placeholder="E-Ticaret Projesi" className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Kısa Kod</label>
                    <input value={projectForm.key} onChange={(e) => setProjectForm((f) => ({ ...f, key: e.target.value.toUpperCase().slice(0, 6) }))} placeholder="EKT" className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none font-mono" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Kategori</label>
                  <select value={projectForm.category} onChange={(e) => setProjectForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none bg-white dark:bg-slate-900">
                    <option value="">Seçiniz...</option>
                    {PROJECT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Açıklama</label>
                  <textarea value={projectForm.description} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Bütçe</label>
                    <input type="number" value={projectForm.budget} onChange={(e) => setProjectForm((f) => ({ ...f, budget: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none text-right" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Para Birimi</label>
                    <select value={projectForm.currency} onChange={(e) => setProjectForm((f) => ({ ...f, currency: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white dark:bg-slate-900 focus:outline-none">
                      {["TRY", "USD", "EUR", "GBP"].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Başlangıç</label>
                    <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm((f) => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Bitiş</label>
                    <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm((f) => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border flex gap-3">
                {projectDrawer !== "new" && (
                  <button onClick={() => deleteProject((projectDrawer as Project).id)} className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition">Sil</button>
                )}
                <button onClick={() => setProjectDrawer(null)} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-slate-50 transition">İptal</button>
                <button onClick={saveProject} disabled={savingProject || !projectForm.name} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition">
                  {savingProject ? <i className="pi pi-spin pi-spinner" /> : projectDrawer === "new" ? "Oluştur" : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── WORKSPACE VIEW ──────────────────────────────────────────────────────────
  if (loading || !project) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="text-center space-y-4">
          <i className="pi pi-spin pi-spinner text-4xl text-indigo-500" />
          <p className="text-slate-400 text-sm font-medium">Proje yükleniyor...</p>
        </div>
      </div>
    );
  }

  const pColor = project.color || "#6366f1";

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-border shadow-xs">
        <div className="flex items-start gap-4">
          <button
            onClick={() => setSelectedProjectId(null)}
            className="w-9 h-9 rounded-xl border border-border hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-foreground transition shrink-0 bg-slate-50/50 dark:bg-slate-800/30"
          >
            <i className="pi pi-chevron-left text-xs" />
          </button>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-inner" style={{ backgroundColor: pColor }}>
                {project.key ? project.key.slice(0, 3) : project.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground tracking-tight leading-tight flex items-center gap-2">
                  {project.name}
                  {project.category && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                      {PROJECT_CATEGORIES.find((c) => c.id === project.category)?.label ?? project.category}
                    </span>
                  )}
                </h1>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Proje Kodu: <span className="font-mono font-bold text-slate-500">{project.key || "—"}</span> • Durum: <span className="font-bold text-indigo-500">{getProjectStatus(project.status).label}</span>
                </p>
              </div>
            </div>
            {project.description && (
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={() => {
              setProjectForm({
                name: project.name,
                key: project.key || "",
                description: project.description || "",
                category: project.category || "",
                color: project.color || PROJECT_COLORS[0],
                budget: project.budget?.toString() || "",
                currency: project.currency,
                startDate: project.startDate?.slice(0, 10) || "",
                endDate: project.endDate?.slice(0, 10) || ""
              });
              setProjectDrawer(project);
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <i className="pi pi-cog text-xs" /> Proje Ayarları
          </button>

          <button
            onClick={() => { setTaskForm({ ...EMPTY_TASK }); setTaskDrawer("new"); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold shadow-xs hover:opacity-90 transition"
            style={{ backgroundColor: pColor }}
          >
            <i className="pi pi-plus text-xs" /> Yeni Görev
          </button>
        </div>
      </div>

      {/* ── HORIZONTAL TAB NAVIGATION ── */}
      <div className="border-b border-border flex items-center justify-between flex-wrap gap-3 pb-1">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {([
            { id: "board", label: "Kanban Tahtası", icon: "pi-table" },
            { id: "backlog", label: "Backlog & Görevler", icon: "pi-list" },
            { id: "sprints", label: "Sprint Planlaması", icon: "pi-bolt" },
            { id: "tempo", label: "Tempo & Zaman", icon: "pi-clock" },
            { id: "activity", label: "Aktivite Günlüğü", icon: "pi-history" },
          ] as { id: WorkspaceView; label: string; icon: string }[]).map((item) => {
            const isActive = workspaceView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setWorkspaceView(item.id)}
                className={`flex items-center gap-2 px-3 py-2.5 text-xs font-bold transition-all relative border-b-2 -mb-px whitespace-nowrap ${isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
                  }`}
                style={isActive ? { borderColor: pColor, color: pColor } : {}}
              >
                <i className={`pi ${item.icon} text-[11px]`} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Board / Backlog filters */}
        {(workspaceView === "board" || workspaceView === "backlog") && (
          <div className="flex items-center gap-2 flex-wrap pb-1">
            <div className="relative">
              <i className="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
              <input
                type="text"
                placeholder="Ara..."
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none w-36 bg-white dark:bg-slate-900 text-foreground"
              />
            </div>
            <select value={boardFilterAssignee} onChange={(e) => setBoardFilterAssignee(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none bg-white dark:bg-slate-900 text-foreground cursor-pointer">
              <option value="">Tüm Üyeler</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={boardFilterPriority} onChange={(e) => setBoardFilterPriority(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none bg-white dark:bg-slate-900 text-foreground cursor-pointer">
              <option value="">Tüm Öncelikler</option>
              {TASK_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <select value={boardFilterType} onChange={(e) => setBoardFilterType(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none bg-white dark:bg-slate-900 text-foreground cursor-pointer">
              <option value="">Tüm Tipler</option>
              {TASK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        )}

        {workspaceView === "sprints" && (
          <button onClick={() => { setSprintForm(EMPTY_SPRINT); setSprintDrawer("new"); }} className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg transition" style={{ backgroundColor: pColor }}>
            <i className="pi pi-plus text-[10px]" /> Yeni Sprint
          </button>
        )}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="  overflow-hidden">
        {/* ══ BOARD VIEW ══ */}
        {workspaceView === "board" && (
          <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-290px)] min-h-[500px]">
            {TASK_STATUSES.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.id && !t.parentId);
              return (
                <div key={col.id} className="flex flex-col shrink-0 w-72 bg-slate-50 dark:bg-slate-900/50 rounded-2xl overflow-hidden">
                  {/* Column Header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex-1">{col.label}</span>
                    <span className="text-[10px] font-extrabold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                    <button
                      onClick={() => { setTaskForm({ ...EMPTY_TASK, status: col.id }); setTaskDrawer("new"); }}
                      className="w-5 h-5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                      title="Bu kolona görev ekle"
                    >
                      <i className="pi pi-plus text-[10px]" />
                    </button>
                  </div>

                  {/* Tasks */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {colTasks.length === 0 && (
                      <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-8 text-center text-[10px] text-slate-400 font-semibold">
                        Görev yok
                      </div>
                    )}
                    {colTasks.map((t) => {
                      const pr = getTaskPriority(t.priority);
                      const ty = getTaskType(t.type);
                      const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done";
                      return (
                        <div
                          key={t.id}
                          onClick={() => setTaskPanel(t)}
                          className="bg-white dark:bg-slate-800 rounded-xl border border-border hover:border-slate-300 hover:shadow-md transition duration-150 cursor-pointer group"
                        >
                          <div className="p-3 space-y-2">
                            {/* Type + Priority badges */}
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${ty.bg}`}>
                                <i className={`pi ${ty.icon} mr-0.5 text-[8px]`} />{ty.label}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${pr.bg}`}>{pr.label}</span>
                              {t.sprint && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">{t.sprint.name}</span>}
                            </div>

                            {/* Title */}
                            <p className="text-xs font-bold text-foreground leading-snug group-hover:text-indigo-600 transition line-clamp-2">{t.title}</p>

                            {/* Labels */}
                            {t.labels && t.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {t.labels.map((tl) => tl.label && (
                                  <span key={tl.labelId} className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ backgroundColor: tl.label.color }}>{tl.label.name}</span>
                                ))}
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                {t._count?.comments ? <span><i className="pi pi-comment mr-0.5" />{t._count.comments}</span> : null}
                                {t._count?.subtasks ? <span><i className="pi pi-sitemap mr-0.5" />{t._count.subtasks}</span> : null}
                                {t.storyPoints ? <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold text-slate-600">{t.storyPoints}sp</span> : null}
                                {t.estimatedHours ? <span><i className="pi pi-clock mr-0.5" />{t.estimatedHours}s</span> : null}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {isOverdue && <span className="text-red-500 text-[9px] font-bold">⚠ GECIKTI</span>}
                                {t.assignee ? (
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white ${avatarColor(t.assignee.id)}`} title={t.assignee.name}>
                                    {userInitials(t.assignee.name)}
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                    <i className="pi pi-user text-[8px] text-slate-400" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status change buttons */}
                          <div className="flex border-t border-border/40 divide-x divide-border/40 opacity-0 group-hover:opacity-100 transition">
                            {TASK_STATUSES.filter((s) => s.id !== t.status).map((s) => (
                              <button
                                key={s.id}
                                onClick={(e) => { e.stopPropagation(); updateTask(t.id, { status: s.id }); }}
                                className="flex-1 py-1.5 text-[9px] font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                              >
                                → {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ BACKLOG VIEW ══ */}
        {workspaceView === "backlog" && (
          <div className="space-y-3">
            {/* Epic / Story / Task hierarchy */}
            {(() => {
              const epics = filteredTasks.filter((t) => t.type === "epic");
              const stories = filteredTasks.filter((t) => t.type === "story");
              const standaloneTasks = filteredTasks.filter((t) => !["epic"].includes(t.type) && !t.parentId);

              const renderTask = (t: Task, depth = 0) => {
                const st = getTaskStatus(t.status);
                const pr = getTaskPriority(t.priority);
                const ty = getTaskType(t.type);
                const subs = (project?.tasks ?? []).filter((sub) => sub.parentId === t.id && sub.deletedAt === undefined);
                return (
                  <div key={t.id}>
                    <div
                      onClick={() => setTaskPanel(t)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group transition"
                      style={{ paddingLeft: `${12 + depth * 20}px` }}
                    >
                      {depth > 0 && <i className="pi pi-level-down text-slate-300 text-[10px] shrink-0" />}
                      <i className={`pi ${ty.icon} text-xs shrink-0`} style={{ color: ty.color }} />
                      <span className="flex-1 text-xs font-semibold text-foreground line-clamp-1 group-hover:text-indigo-600 transition">{t.title}</span>
                      {t.sprint && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-bold shrink-0">{t.sprint.name}</span>}
                      {t.labels?.map((tl) => tl.label && (
                        <span key={tl.labelId} className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white shrink-0" style={{ backgroundColor: tl.label.color }}>{tl.label.name}</span>
                      ))}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${st.bg}`}>{st.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${pr.bg}`}>{pr.label}</span>
                      {t.storyPoints && <span className="text-[10px] font-bold text-slate-400 shrink-0">{t.storyPoints}sp</span>}
                      {t.estimatedHours && <span className="text-[10px] text-slate-400 shrink-0"><i className="pi pi-clock text-[8px]" /> {t.estimatedHours}s</span>}
                      {t.assignee ? (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0 ${avatarColor(t.assignee.id)}`}>
                          {userInitials(t.assignee.name)}
                        </div>
                      ) : <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 shrink-0" />}
                      <button
                        onClick={(e) => { e.stopPropagation(); setTaskForm({ ...EMPTY_TASK, parentId: t.id }); setTaskDrawer({ parentId: t.id }); }}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition shrink-0"
                        title="Alt görev ekle"
                      >
                        <i className="pi pi-plus text-[9px]" />
                      </button>
                    </div>
                    {subs.map((sub) => renderTask(sub, depth + 1))}
                  </div>
                );
              };

              return (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-600">Tüm Görevler — {filteredTasks.length}</h3>
                    <button onClick={() => { setTaskForm({ ...EMPTY_TASK }); setTaskDrawer("new"); }} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                      <i className="pi pi-plus text-[10px]" /> Görev Ekle
                    </button>
                  </div>
                  {filteredTasks.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-semibold">Görev bulunamadı</div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {standaloneTasks.map((t) => renderTask(t))}
                      {epics.map((epic) => (
                        <div key={epic.id}>
                          {renderTask(epic)}
                          {stories.filter((s) => s.parentId === epic.id).map((story) => (
                            <div key={story.id}>
                              {renderTask(story, 1)}
                              {(project?.tasks ?? []).filter((t) => t.parentId === story.id).map((t) => renderTask(t, 2))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ══ SPRINTS VIEW ══ */}
        {workspaceView === "sprints" && (
          <div className="space-y-4">
            {/* Backlog section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <i className="pi pi-inbox text-slate-500 text-sm" />
                  <h3 className="font-black text-sm text-foreground">Backlog</h3>
                  <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 px-2 py-0.5 rounded-full">{backlogTasks.length}</span>
                </div>
                <button onClick={() => { setTaskForm({ ...EMPTY_TASK }); setTaskDrawer("new"); }} className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <i className="pi pi-plus text-[10px]" /> Ekle
                </button>
              </div>
              <div className="divide-y divide-border/30">
                {backlogTasks.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400 font-semibold">Backlog boş</p>
                ) : backlogTasks.map((t) => {
                  const st = getTaskStatus(t.status);
                  const pr = getTaskPriority(t.priority);
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 group transition">
                      <i className={`pi ${getTaskType(t.type).icon} text-xs shrink-0`} style={{ color: getTaskType(t.type).color }} />
                      <span className="flex-1 text-xs font-semibold text-foreground line-clamp-1 cursor-pointer" onClick={() => setTaskPanel(t)}>{t.title}</span>
                      {t.storyPoints && <span className="text-[10px] font-bold text-slate-400">{t.storyPoints}sp</span>}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${pr.bg}`}>{pr.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${st.bg}`}>{st.label}</span>
                      {/* Sprint assignment dropdown */}
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) updateTask(t.id, { sprintId: e.target.value }); }}
                        className="text-[10px] border border-border rounded-lg px-1.5 py-1 opacity-0 group-hover:opacity-100 transition bg-white dark:bg-slate-900 focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Sprint'e Taşı...</option>
                        {(project.sprints ?? []).filter((s) => s.status !== "completed").map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sprint blocks */}
            {(project.sprints ?? []).map((sprint) => {
              const sprintTasks = (project.tasks ?? []).filter((t) => t.sprintId === sprint.id);
              const doneCount = sprintTasks.filter((t) => t.status === "done").length;
              const progress = sprintTasks.length > 0 ? Math.round((doneCount / sprintTasks.length) * 100) : 0;
              const ss = getSprintStatus(sprint.status);
              const totalSP = sprintTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
              const doneSP = sprintTasks.filter((t) => t.status === "done").reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

              return (
                <div key={sprint.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${ss.bg}`}>{ss.label}</span>
                    <h3 className="font-black text-sm text-foreground flex-1">{sprint.name}</h3>
                    {sprint.startDate && sprint.endDate && (
                      <span className="text-[10px] text-slate-400 font-semibold">{formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}</span>
                    )}
                    {totalSP > 0 && <span className="text-[10px] font-bold text-slate-500">{doneSP}/{totalSP} SP</span>}
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{progress}%</span>
                    {sprint.status === "planning" && (
                      <button onClick={() => updateSprintStatus(sprint.id, "active")} className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold hover:bg-emerald-200 transition">Başlat</button>
                    )}
                    {sprint.status === "active" && (
                      <button onClick={() => updateSprintStatus(sprint.id, "completed")} className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 transition">Tamamla</button>
                    )}
                    <button onClick={() => { setSprintForm({ name: sprint.name, goal: sprint.goal || "", startDate: sprint.startDate?.slice(0, 10) || "", endDate: sprint.endDate?.slice(0, 10) || "" }); setSprintDrawer(sprint); }} className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                      <i className="pi pi-pencil text-[10px]" />
                    </button>
                    <button onClick={() => deleteSprint(sprint.id)} className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400">
                      <i className="pi pi-trash text-[10px]" />
                    </button>
                  </div>
                  {sprint.goal && <p className="px-4 py-2 text-xs text-slate-400 font-medium border-b border-border/50 bg-amber-50/50 dark:bg-amber-950/10">{sprint.goal}</p>}
                  <div className="divide-y divide-border/30">
                    {sprintTasks.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400 font-semibold">Sprint boş — backlog'dan görev taşıyın</p>
                    ) : sprintTasks.map((t) => {
                      const st = getTaskStatus(t.status);
                      const pr = getTaskPriority(t.priority);
                      return (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 group transition">
                          <i className={`pi ${getTaskType(t.type).icon} text-xs shrink-0`} style={{ color: getTaskType(t.type).color }} />
                          <span className="flex-1 text-xs font-semibold text-foreground line-clamp-1 cursor-pointer hover:text-indigo-600 transition" onClick={() => setTaskPanel(t)}>{t.title}</span>
                          {t.storyPoints && <span className="text-[10px] font-bold text-slate-400">{t.storyPoints}sp</span>}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${pr.bg}`}>{pr.label}</span>
                          <select value={t.status} onChange={(e) => updateTask(t.id, { status: e.target.value })} className="text-[9px] border-none outline-none font-bold rounded-lg px-1.5 py-0.5 cursor-pointer focus:outline-none">
                            {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                          {t.assignee ? (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0 ${avatarColor(t.assignee.id)}`} title={t.assignee.name}>{userInitials(t.assignee.name)}</div>
                          ) : <div className="w-5 h-5 rounded-full bg-slate-100 shrink-0" />}
                          <button onClick={() => updateTask(t.id, { sprintId: null })} className="opacity-0 group-hover:opacity-100 text-[9px] text-slate-400 hover:text-red-500 font-bold transition">
                            Backlog'a Taşı
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ TEMPO VIEW ══ */}
        {workspaceView === "tempo" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border p-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Başlangıç</label>
                <input type="date" value={tempoFromDate} onChange={(e) => setTempoFromDate(e.target.value)} className="px-3 py-2 rounded-xl border border-border text-xs focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Bitiş</label>
                <input type="date" value={tempoToDate} onChange={(e) => setTempoToDate(e.target.value)} className="px-3 py-2 rounded-xl border border-border text-xs focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Personel</label>
                <select value={tempoFilterUser} onChange={(e) => setTempoFilterUser(e.target.value)} className="px-3 py-2 rounded-xl border border-border text-xs focus:outline-none bg-white dark:bg-slate-900">
                  <option value="">Tümü</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <button onClick={loadTempoLogs} className="px-4 py-2 rounded-xl text-white text-xs font-bold transition" style={{ backgroundColor: pColor }}>
                Filtrele
              </button>

              {/* Summary stats */}
              <div className="ml-auto flex gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-foreground">{tempoLogs.reduce((s, l) => s + l.hours, 0).toFixed(1)}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Toplam Saat</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-foreground">{new Set(tempoLogs.map((l) => l.userId)).size}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Personel</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-foreground">{tempoLogs.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Kayıt</p>
                </div>
              </div>
            </div>

            {/* Per-user summary */}
            {!tempoFilterUser && tempoLogs.length > 0 && (() => {
              const byUser = tempoLogs.reduce((acc, log) => {
                const uid = log.userId;
                if (!acc[uid]) acc[uid] = { name: log.user?.name ?? "?", hours: 0, logs: 0 };
                acc[uid].hours += log.hours;
                acc[uid].logs += 1;
                return acc;
              }, {} as Record<string, { name: string; hours: number; logs: number }>);
              const maxH = Math.max(...Object.values(byUser).map((u) => u.hours));
              return (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border p-4">
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-500 mb-3">Personel Bazlı Özet</h3>
                  <div className="space-y-2">
                    {Object.entries(byUser).sort((a, b) => b[1].hours - a[1].hours).map(([uid, data]) => (
                      <div key={uid} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${avatarColor(uid)}`}>
                          {userInitials(data.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-foreground">{data.name}</span>
                            <span className="text-xs font-black text-slate-600">{data.hours.toFixed(1)}s</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(data.hours / maxH) * 100}%`, backgroundColor: pColor }} />
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">{data.logs} kayıt</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Log table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-500">Tempo Kayıtları</h3>
              </div>
              {tempoLoading ? (
                <div className="py-12 text-center"><i className="pi pi-spin pi-spinner text-xl text-slate-400" /></div>
              ) : tempoLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold">Bu aralıkta kayıt bulunamadı</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="text-left px-4 py-2">Tarih</th>
                      <th className="text-left px-4 py-2">Personel</th>
                      <th className="text-left px-4 py-2">Görev</th>
                      <th className="text-left px-4 py-2">Açıklama</th>
                      <th className="text-right px-4 py-2">Saat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tempoLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border/40 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 text-slate-500 font-medium whitespace-nowrap">{formatDate(log.loggedAt)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white ${avatarColor(log.userId)}`}>{userInitials(log.user?.name ?? "?")}</div>
                            <span className="font-semibold text-foreground">{log.user?.name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 max-w-xs">
                          <span className="font-semibold text-foreground line-clamp-1">{(log as any).task?.title ?? "—"}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 max-w-xs">
                          <span className="line-clamp-1">{log.description ?? "—"}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-foreground">{log.hours}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ══ ACTIVITY VIEW ══ */}
        {workspaceView === "activity" && (
          <div className="space-y-4 max-w-2xl">
            {/* Project comment form */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border p-4 space-y-3">
              <h3 className="font-black text-sm text-foreground">Proje Yorumu Ekle</h3>
              <div className="flex gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${avatarColor(session?.user?.id ?? "a")}`}>
                  {userInitials(session?.user?.name ?? "?")}
                </div>
                <textarea
                  rows={2}
                  placeholder="Proje hakkında bir yorum yazın..."
                  className="flex-1 px-3 py-2 rounded-xl border border-border text-sm focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Activity stream */}
            <div className="space-y-1">
              {(project.activities ?? []).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">Henüz aktivite yok</div>
              ) : (project.activities ?? []).map((act, i) => (
                <div key={act.id} className={`flex gap-3 ${i > 0 ? "pt-1" : ""}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${avatarColor(act.userId)}`}>
                      {userInitials(act.user?.name ?? "?")}
                    </div>
                    {i < (project.activities ?? []).length - 1 && <div className="w-px flex-1 bg-border/60 my-1 min-h-[16px]" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-xs text-foreground font-medium leading-relaxed">{act.details}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{relativeTime(act.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── TASK DETAIL PANEL ── */}
      {taskPanel && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]" onClick={() => setTaskPanel(null)} />
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-[480px] bg-white dark:bg-slate-950 border-l border-border shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            {/* Panel Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <i className={`pi ${getTaskType(taskPanel.type).icon} text-sm shrink-0`} style={{ color: getTaskType(taskPanel.type).color }} />
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0 ${getTaskType(taskPanel.type).bg}`}>{getTaskType(taskPanel.type).label}</span>
                {project.key && <span className="text-[10px] text-slate-400 font-mono font-semibold shrink-0">{project.key}-{taskPanel.id.slice(-4).toUpperCase()}</span>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateTask(taskPanel.id, { status: taskPanel.status === "done" ? "todo" : "done" })} className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${taskPanel.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700"}`}>
                  {taskPanel.status === "done" ? "✓ Bitti" : "Tamamla"}
                </button>
                <button onClick={() => { setTaskForm({ ...EMPTY_TASK, parentId: taskPanel.id }); setTaskDrawer({ parentId: taskPanel.id }); }} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition">+ Alt Görev</button>
                <button onClick={() => deleteTask(taskPanel.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 transition"><i className="pi pi-trash text-xs" /></button>
                <button onClick={() => setTaskPanel(null)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition"><i className="pi pi-times text-xs" /></button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Title */}
              <div className="px-4 pt-4 pb-2">
                <h2 className="font-extrabold text-foreground text-base leading-tight">{taskPanel.title}</h2>
                {taskPanel.description && <p className="text-xs text-slate-500 mt-2 leading-relaxed whitespace-pre-wrap">{taskPanel.description}</p>}
              </div>

              {/* Meta fields */}
              <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                {/* Status */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Durum</label>
                  <select value={taskPanel.status} onChange={(e) => updateTask(taskPanel.id, { status: e.target.value })} className="w-full text-xs border border-border rounded-xl px-3 py-2 focus:outline-none bg-white dark:bg-slate-900">
                    {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                {/* Priority */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Öncelik</label>
                  <select value={taskPanel.priority} onChange={(e) => updateTask(taskPanel.id, { priority: e.target.value })} className="w-full text-xs border border-border rounded-xl px-3 py-2 focus:outline-none bg-white dark:bg-slate-900">
                    {TASK_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                {/* Assignee */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Atanan</label>
                  <select value={taskPanel.assignedTo ?? ""} onChange={(e) => updateTask(taskPanel.id, { assignedTo: e.target.value || null })} className="w-full text-xs border border-border rounded-xl px-3 py-2 focus:outline-none bg-white dark:bg-slate-900">
                    <option value="">— Atanmamış —</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                {/* Sprint */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Sprint</label>
                  <select value={taskPanel.sprintId ?? ""} onChange={(e) => updateTask(taskPanel.id, { sprintId: e.target.value || null })} className="w-full text-xs border border-border rounded-xl px-3 py-2 focus:outline-none bg-white dark:bg-slate-900">
                    <option value="">— Backlog —</option>
                    {(project.sprints ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {/* Story Points */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Story Points</label>
                  <input type="number" min="0" max="100" value={taskPanel.storyPoints ?? ""} onChange={(e) => updateTask(taskPanel.id, { storyPoints: e.target.value ? Number(e.target.value) : null })} className="w-full text-xs border border-border rounded-xl px-3 py-2 focus:outline-none" placeholder="—" />
                </div>
                {/* Due Date */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Bitiş Tarihi</label>
                  <input type="date" value={taskPanel.dueDate?.slice(0, 10) ?? ""} onChange={(e) => updateTask(taskPanel.id, { dueDate: e.target.value || null })} className="w-full text-xs border border-border rounded-xl px-3 py-2 focus:outline-none" />
                </div>
                {/* Estimated Hours */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Tahmini Saat</label>
                  <input type="number" min="0" step="0.5" value={taskPanel.estimatedHours ?? ""} onChange={(e) => updateTask(taskPanel.id, { estimatedHours: e.target.value ? Number(e.target.value) : null })} className="w-full text-xs border border-border rounded-xl px-3 py-2 focus:outline-none" placeholder="—" />
                </div>
                {/* Actual Hours */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Gerçek Saat</label>
                  <div className="flex items-center h-8 px-3 py-2 border border-border rounded-xl text-xs font-bold text-slate-600 bg-slate-50 dark:bg-slate-800">
                    {taskPanel.actualHours ?? 0}s / {taskPanel.estimatedHours ?? "?"}s
                  </div>
                </div>
              </div>

              {/* Labels */}
              {(project.labels ?? []).length > 0 && (
                <div className="px-4 pb-3 border-t border-border/50 pt-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Etiketler</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(project.labels ?? []).map((label) => {
                      const isSelected = taskPanel.labels?.some((tl) => tl.labelId === label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => {
                            const currentIds = (taskPanel.labels ?? []).map((tl) => tl.labelId);
                            const newIds = isSelected ? currentIds.filter((id) => id !== label.id) : [...currentIds, label.id];
                            updateTask(taskPanel.id, { labelIds: newIds });
                          }}
                          className={`text-[10px] px-2 py-1 rounded-lg font-bold transition ${isSelected ? "text-white" : "border border-dashed opacity-50 hover:opacity-100"}`}
                          style={isSelected ? { backgroundColor: label.color } : { borderColor: label.color, color: label.color }}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-tasks */}
              {(taskPanel.subtasks ?? []).length > 0 && (
                <div className="px-4 pb-3 border-t border-border/50 pt-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Alt Görevler ({taskPanel.subtasks?.length})</label>
                  <div className="space-y-1.5">
                    {(taskPanel.subtasks ?? []).map((sub) => {
                      const st = getTaskStatus(sub.status);
                      return (
                        <div key={sub.id} className="flex items-center gap-2 p-2 rounded-xl border border-border hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition group" onClick={() => setTaskPanel(sub)}>
                          <i className="pi pi-angle-right text-slate-300 text-xs" />
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0`} style={{ backgroundColor: st.color }} />
                          <span className="flex-1 text-xs font-semibold text-foreground line-clamp-1 group-hover:text-indigo-600 transition">{sub.title}</span>
                          {sub.assignee && <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0 ${avatarColor(sub.assignee.id)}`}>{userInitials(sub.assignee.name)}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="px-4 pt-3 border-t border-border/50">
                <div className="flex gap-3 border-b border-border">
                  {([
                    { id: "detail", label: "Yorumlar" },
                    { id: "worklog", label: "Tempo & Zaman" },
                    { id: "activity", label: "Aktivite" },
                  ] as const).map((tab) => (
                    <button key={tab.id} onClick={() => setTaskPanelTab(tab.id)} className={`text-xs font-bold pb-2 border-b-2 transition ${taskPanelTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-foreground"}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments tab */}
              {taskPanelTab === "detail" && (
                <div className="px-4 py-3 space-y-3">
                  {/* Comment form */}
                  <div className="flex gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${avatarColor(session?.user?.id ?? "a")}`}>
                      {userInitials(session?.user?.name ?? "?")}
                    </div>
                    <div className="flex-1">
                      <textarea
                        rows={2}
                        placeholder="Yorum yazın..."
                        value={taskCommentText}
                        onChange={(e) => setTaskCommentText(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:outline-none resize-none"
                      />
                      {taskCommentText.trim() && (
                        <button onClick={addComment} disabled={savingComment} className="mt-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                          {savingComment ? <i className="pi pi-spin pi-spinner" /> : "Gönder"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comments list */}
                  {(taskPanel.comments ?? []).length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-4 font-medium">Henüz yorum yok</p>
                  ) : (
                    <div className="space-y-3">
                      {(taskPanel.comments ?? []).map((c) => (
                        <div key={c.id} className="flex gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${avatarColor(c.userId ?? "x")}`}>
                            {userInitials(c.user?.name ?? "?")}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-foreground">{c.user?.name}</span>
                              <span className="text-[10px] text-slate-400">{relativeTime(c.createdAt)}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">{c.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Work log tab */}
              {taskPanelTab === "worklog" && (
                <div className="px-4 py-3 space-y-3">
                  {/* Add work log form */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Çalışma Saati Ekle</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Saat *</label>
                        <input type="number" step="0.25" min="0.25" value={workLogForm.hours} onChange={(e) => setWorkLogForm((f) => ({ ...f, hours: e.target.value }))} className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs focus:outline-none" placeholder="1.5" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Tarih</label>
                        <input type="date" value={workLogForm.loggedAt} onChange={(e) => setWorkLogForm((f) => ({ ...f, loggedAt: e.target.value }))} className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Açıklama (opsiyonel)</label>
                      <input type="text" value={workLogForm.description} onChange={(e) => setWorkLogForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs focus:outline-none" placeholder="Yapılan iş açıklaması..." />
                    </div>
                    <button onClick={addWorkLog} disabled={!workLogForm.hours || savingWorkLog} className="w-full py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                      {savingWorkLog ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
                    </button>
                  </div>

                  {/* Time summary */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl p-2.5 text-center">
                      <p className="font-black text-lg text-indigo-600">{(taskPanel.estimatedHours ?? 0)}s</p>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase">Tahmini</p>
                    </div>
                    <div className="flex-1 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-2.5 text-center">
                      <p className="font-black text-lg text-amber-600">{(taskPanel.actualHours ?? 0).toFixed(1)}s</p>
                      <p className="text-[10px] font-bold text-amber-400 uppercase">Harcanan</p>
                    </div>
                    <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-2.5 text-center">
                      <p className={`font-black text-lg ${((taskPanel.estimatedHours ?? 0) - (taskPanel.actualHours ?? 0)) < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {Math.abs((taskPanel.estimatedHours ?? 0) - (taskPanel.actualHours ?? 0)).toFixed(1)}s
                      </p>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase">{(taskPanel.estimatedHours ?? 0) < (taskPanel.actualHours ?? 0) ? "Aşıldı" : "Kalan"}</p>
                    </div>
                  </div>

                  {/* Work log entries */}
                  {(taskPanel.workLogs ?? []).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 font-medium py-4">Henüz çalışma kaydı yok</p>
                  ) : (
                    <div className="space-y-2">
                      {(taskPanel.workLogs ?? []).map((log) => (
                        <div key={log.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-border">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 ${avatarColor(log.userId)}`}>{userInitials(log.user?.name ?? "?")}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{log.user?.name}</span>
                              <span className="text-[10px] text-slate-400">{formatDate(log.loggedAt)}</span>
                            </div>
                            {log.description && <p className="text-[10px] text-slate-500 line-clamp-1">{log.description}</p>}
                          </div>
                          <span className="text-xs font-black text-indigo-600 shrink-0">{log.hours}s</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Activity tab */}
              {taskPanelTab === "activity" && (
                <div className="px-4 py-3 space-y-2">
                  {(taskPanel.activities ?? []).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 font-medium py-4">Henüz aktivite yok</p>
                  ) : (taskPanel.activities ?? []).map((act) => (
                    <div key={act.id} className="flex gap-2 items-start">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 ${avatarColor(act.userId)}`}>{userInitials(act.user?.name ?? "?")}</div>
                      <div className="flex-1">
                        <p className="text-xs text-foreground font-medium">{act.details}</p>
                        <p className="text-[10px] text-slate-400">{relativeTime(act.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── DRAWERS ── */}

      {/* New Task Drawer */}
      {taskDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end" onClick={() => { setTaskDrawer(null); setIntegrationAction(""); }}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-black text-foreground">{typeof taskDrawer === "object" && taskDrawer?.parentId ? "Alt Görev Oluştur" : "Yeni Görev Oluştur"}</h2>
              <button onClick={() => { setTaskDrawer(null); setIntegrationAction(""); }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><i className="pi pi-times" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tip</label>
                  <select value={taskForm.type as string} onChange={(e) => setTaskForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none bg-white dark:bg-slate-900">
                    {TASK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sprint</label>
                  <select value={taskForm.sprintId as string} onChange={(e) => setTaskForm((f) => ({ ...f, sprintId: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none bg-white dark:bg-slate-900">
                    <option value="">Backlog</option>
                    {(project.sprints ?? []).filter((s) => s.status !== "completed").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Başlık *</label>
                <input value={taskForm.title as string} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} placeholder="Görev başlığını yazın..." className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Açıklama</label>
                <textarea value={taskForm.description as string} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} rows={4} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none resize-none" placeholder="Görevin ayrıntıları, kabul kriterleri..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Atanan</label>
                  <select value={taskForm.assignedTo as string} onChange={(e) => setTaskForm((f) => ({ ...f, assignedTo: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none bg-white dark:bg-slate-900">
                    <option value="">— Atanmamış —</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Öncelik</label>
                  <select value={taskForm.priority as string} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none bg-white dark:bg-slate-900">
                    {TASK_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tahmini Saat</label>
                  <input type="number" step="0.5" min="0" value={taskForm.estimatedHours as string} onChange={(e) => setTaskForm((f) => ({ ...f, estimatedHours: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Story Points</label>
                  <input type="number" min="0" value={taskForm.storyPoints as string} onChange={(e) => setTaskForm((f) => ({ ...f, storyPoints: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bitiş Tarihi</label>
                  <input type="date" value={taskForm.dueDate as string} onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Durum</label>
                  <select value={taskForm.status as string} onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none bg-white dark:bg-slate-900">
                    {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Labels */}
              {(project.labels ?? []).length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Etiketler</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(project.labels ?? []).map((label) => {
                      const isSelected = ((taskForm.labelIds as string[]) ?? []).includes(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => {
                            const curr = (taskForm.labelIds as string[]) ?? [];
                            setTaskForm((f) => ({ ...f, labelIds: isSelected ? curr.filter((id) => id !== label.id) : [...curr, label.id] }));
                          }}
                          className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition ${isSelected ? "text-white" : "border border-dashed opacity-60 hover:opacity-100"}`}
                          style={isSelected ? { backgroundColor: label.color } : { borderColor: label.color, color: label.color }}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Integration section */}
              <div className="border-t border-border pt-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">🔗 Modül Entegrasyonu (Opsiyonel)</label>
                <select value={integrationAction} onChange={(e) => setIntegrationAction(e.target.value as any)} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none bg-white dark:bg-slate-900">
                  <option value="">— Entegrasyon Seçme —</option>
                  <option value="create_production">⚙️ Üretim Emri Başlat</option>
                  <option value="create_expense">🛒 Satın Alma / Gider Talebi</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-3">
              <button onClick={() => { setTaskDrawer(null); setIntegrationAction(""); }} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-slate-50 transition">İptal</button>
              <button onClick={saveTask} disabled={savingTask || !(taskForm.title as string)} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-indigo-700 transition">
                {savingTask ? <i className="pi pi-spin pi-spinner" /> : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Drawer */}
      {sprintDrawer !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center" onClick={() => setSprintDrawer(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-foreground">{sprintDrawer === "new" ? "Yeni Sprint Oluştur" : "Sprinti Düzenle"}</h2>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Sprint Adı *</label>
              <input value={sprintForm.name} onChange={(e) => setSprintForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" placeholder="Sprint 1 — Çekirdek Özellikler" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Sprint Hedefi</label>
              <textarea value={sprintForm.goal} onChange={(e) => setSprintForm((f) => ({ ...f, goal: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none resize-none" placeholder="Bu sprintte neyi başarmak istiyoruz?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Başlangıç</label>
                <input type="date" value={sprintForm.startDate} onChange={(e) => setSprintForm((f) => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Bitiş</label>
                <input type="date" value={sprintForm.endDate} onChange={(e) => setSprintForm((f) => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSprintDrawer(null)} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-slate-50 transition">İptal</button>
              <button onClick={saveSprint} disabled={savingSprint || !sprintForm.name} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-indigo-700 transition">
                {savingSprint ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Drawer */}
      {expenseDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center" onClick={() => setExpenseDrawer(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-foreground">Gider Ekle</h2>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Başlık *</label>
              <input value={expenseForm.title} onChange={(e) => setExpenseForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" placeholder="Sunucu maliyeti, personel gideri..." autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tutar *</label>
                <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none text-right" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Para Birimi</label>
                <select value={expenseForm.currency} onChange={(e) => setExpenseForm((f) => ({ ...f, currency: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none bg-white dark:bg-slate-900">
                  {["TRY", "USD", "EUR"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kategori</label>
                <select value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none bg-white dark:bg-slate-900">
                  {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tarih</label>
                <input type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm((f) => ({ ...f, expenseDate: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Açıklama</label>
              <textarea value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setExpenseDrawer(false)} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-slate-50 transition">İptal</button>
              <button onClick={saveExpense} disabled={savingExpense || !expenseForm.title || !expenseForm.amount} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-indigo-700 transition">
                {savingExpense ? <i className="pi pi-spin pi-spinner" /> : "Gider Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Edit Drawer (inside workspace) */}
      {projectDrawer && selectedProjectId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end" onClick={() => setProjectDrawer(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-black text-foreground">Proje Ayarları</h2>
              <button onClick={() => setProjectDrawer(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><i className="pi pi-times" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Color Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">Proje Rengi</label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((c) => (
                    <button key={c} onClick={() => setProjectForm((f) => ({ ...f, color: c }))} className={`w-7 h-7 rounded-lg transition ${projectForm.color === c ? "ring-2 ring-offset-2 ring-slate-500 scale-110" : "hover:scale-110"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Proje Adı *</label>
                  <input value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Kısa Kod</label>
                  <input value={projectForm.key} onChange={(e) => setProjectForm((f) => ({ ...f, key: e.target.value.toUpperCase().slice(0, 6) }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Açıklama</label>
                <textarea value={projectForm.description} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bütçe</label>
                  <input type="number" value={projectForm.budget} onChange={(e) => setProjectForm((f) => ({ ...f, budget: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none text-right" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Para Birimi</label>
                  <select value={projectForm.currency} onChange={(e) => setProjectForm((f) => ({ ...f, currency: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white dark:bg-slate-900 focus:outline-none">
                    {["TRY", "USD", "EUR", "GBP"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Başlangıç</label>
                  <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm((f) => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bitiş</label>
                  <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm((f) => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none" />
                </div>
              </div>

              {/* Labels management */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Etiket Yönetimi</label>
                  <button onClick={() => setLabelDrawer(!labelDrawer)} className="text-xs font-bold text-indigo-600"><i className="pi pi-plus text-[10px]" /> Etiket</button>
                </div>
                {labelDrawer && (
                  <div className="flex gap-2 mb-2">
                    <input value={labelName} onChange={(e) => setLabelName(e.target.value)} placeholder="Etiket adı" className="flex-1 px-2.5 py-1.5 rounded-lg border border-border text-xs focus:outline-none" />
                    <input type="color" value={labelColor} onChange={(e) => setLabelColor(e.target.value)} className="w-8 h-8 rounded-lg border border-border cursor-pointer" />
                    <button onClick={saveLabel} disabled={!labelName || savingLabel} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                      {savingLabel ? <i className="pi pi-spin pi-spinner" /> : "Ekle"}
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {(project.labels ?? []).map((label) => (
                    <span key={label.id} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-bold text-white" style={{ backgroundColor: label.color }}>
                      {label.name}
                    </span>
                  ))}
                  {(project.labels ?? []).length === 0 && <span className="text-xs text-slate-400 font-medium">Etiket yok</span>}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button onClick={() => deleteProject((projectDrawer as Project).id)} className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition">Sil</button>
              <button onClick={() => setProjectDrawer(null)} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-slate-50 transition">İptal</button>
              <button onClick={saveProject} disabled={savingProject} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-indigo-700 transition">
                {savingProject ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
