// ============================================================
// Project & Task Module — Shared Types (Jira-Grade)
// ============================================================

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type TaskStatus    = "todo" | "in_progress" | "review" | "done";
export type TaskPriority  = "low" | "medium" | "high" | "urgent";
export type TaskType      = "epic" | "story" | "task" | "bug" | "subtask";
export type SprintStatus  = "planning" | "active" | "completed";
export type MemberRole    = "owner" | "lead" | "member" | "viewer";
export type ProcessStatus = "open" | "in_progress" | "waiting" | "completed" | "cancelled";

export interface StatusConfig { id: string; label: string; icon: string; bg: string; color: string }

export const PROJECT_STATUSES: StatusConfig[] = [
  { id: "planning",   label: "Planlama",   icon: "pi-compass",       bg: "bg-slate-100 text-slate-600",     color: "#64748b" },
  { id: "active",     label: "Aktif",      icon: "pi-play",          bg: "bg-blue-100 text-blue-700",       color: "#2563eb" },
  { id: "on_hold",    label: "Beklemede",  icon: "pi-pause",         bg: "bg-amber-100 text-amber-700",     color: "#f59e0b" },
  { id: "completed",  label: "Tamamlandı", icon: "pi-check-circle",  bg: "bg-emerald-100 text-emerald-700", color: "#10b981" },
  { id: "cancelled",  label: "İptal",      icon: "pi-times-circle",  bg: "bg-red-100 text-red-700",         color: "#ef4444" },
];

export const TASK_STATUSES: StatusConfig[] = [
  { id: "todo",        label: "Yapılacak",    icon: "pi-inbox",        bg: "bg-slate-100 text-slate-600",     color: "#64748b" },
  { id: "in_progress", label: "Devam Ediyor", icon: "pi-spin pi-cog",  bg: "bg-blue-100 text-blue-700",       color: "#2563eb" },
  { id: "review",      label: "İnceleme",     icon: "pi-eye",          bg: "bg-amber-100 text-amber-700",     color: "#f59e0b" },
  { id: "done",        label: "Tamamlandı",   icon: "pi-check-circle", bg: "bg-emerald-100 text-emerald-700", color: "#10b981" },
];

export const TASK_PRIORITIES: StatusConfig[] = [
  { id: "low",    label: "Düşük",  icon: "pi-arrow-down",  bg: "bg-slate-100 text-slate-500",  color: "#94a3b8" },
  { id: "medium", label: "Orta",   icon: "pi-minus",       bg: "bg-blue-100 text-blue-600",    color: "#3b82f6" },
  { id: "high",   label: "Yüksek", icon: "pi-arrow-up",    bg: "bg-amber-100 text-amber-700",  color: "#f59e0b" },
  { id: "urgent", label: "Acil",   icon: "pi-bolt",        bg: "bg-red-100 text-red-700",      color: "#ef4444" },
];

export const TASK_TYPES: { id: TaskType; label: string; icon: string; color: string; bg: string }[] = [
  { id: "epic",    label: "Epic",    icon: "pi-bolt",         color: "#7c3aed", bg: "bg-purple-100 text-purple-700" },
  { id: "story",   label: "Hikaye",  icon: "pi-bookmark",     color: "#059669", bg: "bg-emerald-100 text-emerald-700" },
  { id: "task",    label: "Görev",   icon: "pi-check-square", color: "#2563eb", bg: "bg-blue-100 text-blue-700" },
  { id: "bug",     label: "Hata",    icon: "pi-times-circle", color: "#dc2626", bg: "bg-red-100 text-red-700" },
  { id: "subtask", label: "Alt Görev", icon: "pi-sitemap",   color: "#64748b", bg: "bg-slate-100 text-slate-600" },
];

export const SPRINT_STATUSES: StatusConfig[] = [
  { id: "planning",  label: "Planlama", icon: "pi-calendar", bg: "bg-slate-100 text-slate-600",     color: "#64748b" },
  { id: "active",    label: "Aktif",    icon: "pi-play",     bg: "bg-emerald-100 text-emerald-700", color: "#10b981" },
  { id: "completed", label: "Bitti",    icon: "pi-check",    bg: "bg-blue-100 text-blue-700",       color: "#2563eb" },
];

export const MEMBER_ROLES: { id: MemberRole; label: string; icon: string }[] = [
  { id: "owner",  label: "Sahip",     icon: "pi-crown" },
  { id: "lead",   label: "Lider",     icon: "pi-star" },
  { id: "member", label: "Üye",       icon: "pi-user" },
  { id: "viewer", label: "İzleyici",  icon: "pi-eye" },
];

export const EXPENSE_CATEGORIES = [
  { id: "personnel", label: "Personel Gideri", icon: "pi-users", color: "#6366f1" },
  { id: "material",  label: "Malzeme",          icon: "pi-box",   color: "#f59e0b" },
  { id: "service",   label: "Hizmet",           icon: "pi-cog",   color: "#10b981" },
  { id: "travel",    label: "Seyahat",           icon: "pi-car",   color: "#3b82f6" },
  { id: "other",     label: "Diğer",            icon: "pi-tag",   color: "#64748b" },
];

export const PROJECT_CATEGORIES = [
  { id: "software",     label: "Yazılım" },
  { id: "construction", label: "İnşaat" },
  { id: "marketing",    label: "Pazarlama" },
  { id: "rd",           label: "Ar-Ge" },
  { id: "operations",   label: "Operasyon" },
  { id: "other",        label: "Diğer" },
];

export const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#f59e0b", "#10b981", "#06b6d4",
  "#2563eb", "#64748b"
];

export const PROCESS_STATUSES: StatusConfig[] = [
  { id: "open",        label: "Açık",       icon: "pi-inbox",        bg: "bg-slate-100 text-slate-600",     color: "#64748b" },
  { id: "in_progress", label: "Devam",      icon: "pi-cog",          bg: "bg-blue-100 text-blue-700",       color: "#2563eb" },
  { id: "waiting",     label: "Bekliyor",   icon: "pi-clock",        bg: "bg-amber-100 text-amber-700",     color: "#f59e0b" },
  { id: "completed",   label: "Tamamlandı", icon: "pi-check-circle", bg: "bg-emerald-100 text-emerald-700", color: "#10b981" },
  { id: "cancelled",   label: "İptal",      icon: "pi-times-circle", bg: "bg-red-100 text-red-700",         color: "#ef4444" },
];

export function getProjectStatus(id: string): StatusConfig { return PROJECT_STATUSES.find((s) => s.id === id) ?? PROJECT_STATUSES[0]; }
export function getTaskStatus(id: string):    StatusConfig { return TASK_STATUSES.find((s) => s.id === id)    ?? TASK_STATUSES[0]; }
export function getTaskPriority(id: string):  StatusConfig { return TASK_PRIORITIES.find((p) => p.id === id)  ?? TASK_PRIORITIES[1]; }
export function getTaskType(id: string) { return TASK_TYPES.find((t) => t.id === id) ?? TASK_TYPES[2]; }
export function getSprintStatus(id: string):  StatusConfig { return SPRINT_STATUSES.find((s) => s.id === id)  ?? SPRINT_STATUSES[0]; }
export function getProcessStatus(id: string): StatusConfig { return PROCESS_STATUSES.find((s) => s.id === id) ?? PROCESS_STATUSES[0]; }
export function getExpenseCategory(id: string) { return EXPENSE_CATEGORIES.find((c) => c.id === id) ?? EXPENSE_CATEGORIES[4]; }

// ============================================================
// TypeScript Interfaces
// ============================================================

export interface ProjectSprint {
  id: string; projectId: string; name: string; goal: string | null;
  status: SprintStatus; startDate: string | null; endDate: string | null;
  velocity: number | null; createdAt: string; updatedAt: string;
  tasks?: Task[];
  _count?: { tasks: number };
}

export interface ProjectMember {
  id: string; projectId: string; userId: string; role: MemberRole; joinedAt: string;
  user?: { id: string; name: string; image: string | null };
}

export interface ProjectLabel {
  id: string; projectId: string; name: string; color: string;
}

export interface TaskLabel {
  taskId: string; labelId: string;
  label?: ProjectLabel;
}

export interface ProjectExpense {
  id: string; projectId: string; taskId: string | null; userId: string;
  title: string; amount: number; currency: string; category: string;
  description: string | null; expenseDate: string; createdAt: string;
  user?: { id: string; name: string };
}

export interface Project {
  id: string; tenantId: string; name: string; key: string | null; description: string | null;
  category: string | null; color: string | null; status: ProjectStatus;
  budget: number | null; currency: string; progress: number;
  startDate: string | null; endDate: string | null;
  managerId: string | null; customerId: string | null;
  createdAt: string; updatedAt: string;
  milestones?: ProjectMilestone[];
  tasks?: Task[];
  sprints?: ProjectSprint[];
  members?: ProjectMember[];
  labels?: ProjectLabel[];
  expenses?: ProjectExpense[];
  comments?: ProjectComment[];
  activities?: ProjectActivity[];
  _count?: { tasks: number; milestones: number; members: number };
}

export interface ProjectMilestone {
  id: string; projectId: string; name: string; dueDate: string | null; isDone: boolean; createdAt: string;
}

export interface Task {
  id: string; tenantId: string; projectId: string | null; parentId: string | null;
  sprintId: string | null; type: TaskType; title: string; description: string | null;
  status: TaskStatus; priority: TaskPriority; storyPoints: number | null; position: number;
  assignedTo: string | null; dueDate: string | null; estimatedHours: number | null;
  actualHours: number | null; tags: string | null; createdAt: string; updatedAt: string;
  deletedAt?: string | null;
  integrationType?: string | null; integrationId?: string | null;
  project?:  { id: string; name: string } | null;
  assignee?: { id: string; name: string; image?: string | null } | null;
  creator?:  { id: string; name: string } | null;
  sprint?:   { id: string; name: string } | null;
  subtasks?: Task[];
  comments?: TaskComment[];
  workLogs?: TaskWorkLog[];
  activities?: ProjectActivity[];
  labels?: TaskLabel[];
  _count?: { subtasks: number; comments: number; workLogs: number };
}

export interface TaskComment {
  id: string; taskId: string; userId: string | null; body: string; createdAt: string;
  user?: { id: string; name: string; image?: string | null } | null;
}

export interface TaskWorkLog {
  id: string; taskId: string; userId: string; hours: number; description: string | null;
  loggedAt: string;
  user?: { id: string; name: string } | null;
}

export interface ProjectComment {
  id: string; projectId: string; userId: string; body: string; createdAt: string;
  user?: { id: string; name: string } | null;
}

export interface ProjectActivity {
  id: string; projectId: string; taskId: string | null; userId: string;
  action: string; details: string; createdAt: string;
  user?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
}

export interface ProcessFlow {
  id: string; tenantId: string; title: string; description: string | null;
  fromDept: string | null; toDept: string | null; status: ProcessStatus;
  priority: string; slaHours: number | null; startedAt: string; dueAt: string | null;
  completedAt: string | null; createdAt: string; updatedAt: string;
  _count?: { comments: number };
}
