// ============================================================
// Project & Task Module — Shared Types
// ============================================================

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type TaskStatus    = "todo" | "in_progress" | "review" | "done";
export type TaskPriority  = "low" | "medium" | "high" | "urgent";
export type ProcessStatus = "open" | "in_progress" | "waiting" | "completed" | "cancelled";

export interface StatusConfig { id: string; label: string; icon: string; bg: string; color: string }

export const PROJECT_STATUSES: StatusConfig[] = [
  { id: "planning",   label: "Planlama",  icon: "pi-compass",       bg: "bg-slate-100 text-slate-600",     color: "#64748b" },
  { id: "active",     label: "Aktif",     icon: "pi-play",          bg: "bg-blue-100 text-blue-700",       color: "#2563eb" },
  { id: "on_hold",    label: "Beklemede", icon: "pi-pause",         bg: "bg-amber-100 text-amber-700",     color: "#f59e0b" },
  { id: "completed",  label: "Tamamlandı",icon: "pi-check-circle",  bg: "bg-emerald-100 text-emerald-700", color: "#10b981" },
  { id: "cancelled",  label: "İptal",     icon: "pi-times-circle",  bg: "bg-red-100 text-red-700",         color: "#ef4444" },
];

export const TASK_STATUSES: StatusConfig[] = [
  { id: "todo",        label: "Yapılacak",  icon: "pi-inbox",        bg: "bg-slate-100 text-slate-600",     color: "#64748b" },
  { id: "in_progress", label: "Devam Ediyor",icon:"pi-spin pi-cog", bg: "bg-blue-100 text-blue-700",       color: "#2563eb" },
  { id: "review",      label: "İnceleme",   icon: "pi-eye",          bg: "bg-amber-100 text-amber-700",     color: "#f59e0b" },
  { id: "done",        label: "Tamamlandı", icon: "pi-check-circle", bg: "bg-emerald-100 text-emerald-700", color: "#10b981" },
];

export const TASK_PRIORITIES: StatusConfig[] = [
  { id: "low",    label: "Düşük",  icon: "pi-arrow-down",  bg: "bg-slate-100 text-slate-500",  color: "#94a3b8" },
  { id: "medium", label: "Orta",   icon: "pi-minus",       bg: "bg-blue-100 text-blue-600",    color: "#3b82f6" },
  { id: "high",   label: "Yüksek", icon: "pi-arrow-up",    bg: "bg-amber-100 text-amber-700",  color: "#f59e0b" },
  { id: "urgent", label: "Acil",   icon: "pi-bolt",        bg: "bg-red-100 text-red-700",      color: "#ef4444" },
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
export function getProcessStatus(id: string): StatusConfig { return PROCESS_STATUSES.find((s) => s.id === id) ?? PROCESS_STATUSES[0]; }

export interface Project {
  id: string; tenantId: string; name: string; description: string | null; status: ProjectStatus;
  budget: number | null; currency: string; progress: number; startDate: string | null;
  endDate: string | null; managerId: string | null; customerId: string | null;
  createdAt: string; updatedAt: string;
  milestones?: ProjectMilestone[];
  _count?: { tasks: number; milestones: number };
}

export interface ProjectMilestone {
  id: string; projectId: string; name: string; dueDate: string | null; isDone: boolean; createdAt: string;
}

export interface Task {
  id: string; tenantId: string; projectId: string | null; parentId: string | null;
  title: string; description: string | null; status: TaskStatus; priority: TaskPriority;
  assignedTo: string | null; dueDate: string | null; estimatedHours: number | null;
  actualHours: number | null; tags: string | null; createdAt: string; updatedAt: string;
  project?:  { id: string; name: string } | null;
  assignee?: { id: string; name: string } | null;
  subtasks?: Task[];
  _count?: { subtasks: number; comments: number };
}

export interface ProcessFlow {
  id: string; tenantId: string; title: string; description: string | null;
  fromDept: string | null; toDept: string | null; status: ProcessStatus;
  priority: string; slaHours: number | null; startedAt: string; dueAt: string | null;
  completedAt: string | null; createdAt: string; updatedAt: string;
  _count?: { comments: number };
}
