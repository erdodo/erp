// ============================================================
// HR Module — Shared Types
// ============================================================

export type LeaveType    = "annual" | "sick" | "excuse" | "maternity" | "paternity" | "unpaid";
export type LeaveStatus  = "pending" | "approved" | "rejected" | "cancelled";
export type AppStatus    = "new" | "review" | "interview" | "offer" | "hired" | "rejected";

export interface LeaveTypeConfig   { id: LeaveType;  label: string; icon: string; color: string }
export interface LeaveStatusConfig { id: LeaveStatus; label: string; icon: string; bg: string }
export interface AppStatusConfig   { id: AppStatus;  label: string; icon: string; bg: string; next: AppStatus[] }

export const LEAVE_TYPES: LeaveTypeConfig[] = [
  { id: "annual",     label: "Yıllık İzin",    icon: "pi-sun",          color: "#10b981" },
  { id: "sick",       label: "Hastalık",        icon: "pi-heart",        color: "#ef4444" },
  { id: "excuse",     label: "Mazeret",         icon: "pi-info-circle",  color: "#f59e0b" },
  { id: "maternity",  label: "Doğum (Anne)",   icon: "pi-user",         color: "#8b5cf6" },
  { id: "paternity",  label: "Doğum (Baba)",   icon: "pi-user",         color: "#6366f1" },
  { id: "unpaid",     label: "Ücretsiz",        icon: "pi-ban",          color: "#94a3b8" },
];

export const LEAVE_STATUSES: LeaveStatusConfig[] = [
  { id: "pending",   label: "Bekliyor",   icon: "pi-clock",         bg: "bg-amber-100 text-amber-700"   },
  { id: "approved",  label: "Onaylandı",  icon: "pi-check-circle",  bg: "bg-emerald-100 text-emerald-700" },
  { id: "rejected",  label: "Reddedildi", icon: "pi-times-circle",  bg: "bg-red-100 text-red-700"        },
  { id: "cancelled", label: "İptal",      icon: "pi-ban",           bg: "bg-slate-100 text-slate-500"   },
];

export const APP_STATUSES: AppStatusConfig[] = [
  { id: "new",       label: "Yeni",      icon: "pi-inbox",        bg: "bg-slate-100 text-slate-600",    next: ["review", "rejected"] },
  { id: "review",    label: "İnceleme",  icon: "pi-eye",          bg: "bg-blue-100 text-blue-700",      next: ["interview", "rejected"] },
  { id: "interview", label: "Mülakat",   icon: "pi-calendar",     bg: "bg-indigo-100 text-indigo-700",  next: ["offer", "rejected"] },
  { id: "offer",     label: "Teklif",    icon: "pi-send",         bg: "bg-amber-100 text-amber-700",    next: ["hired", "rejected"] },
  { id: "hired",     label: "İşe Alındı",icon: "pi-check-circle", bg: "bg-emerald-100 text-emerald-700",next: [] },
  { id: "rejected",  label: "Red",       icon: "pi-times-circle", bg: "bg-red-100 text-red-700",        next: [] },
];

export function getLeaveType(id: string):   LeaveTypeConfig   { return LEAVE_TYPES.find((t) => t.id === id)    ?? LEAVE_TYPES[0]; }
export function getLeaveStatus(id: string): LeaveStatusConfig { return LEAVE_STATUSES.find((s) => s.id === id) ?? LEAVE_STATUSES[0]; }
export function getAppStatus(id: string):   AppStatusConfig   { return APP_STATUSES.find((s) => s.id === id)   ?? APP_STATUSES[0]; }

export interface Department {
  id: string; tenantId: string; name: string; managerId: string | null; parentId: string | null;
  createdAt: string; _count?: { employees: number };
}

export interface Employee {
  id: string; tenantId: string; employeeNo: string; name: string; email: string | null;
  phone: string | null; departmentId: string | null; storeId: string | null; position: string | null;
  managerId: string | null; salary: number | null; currency: string;
  relativeLocation?: string; // conceptual location details
  hireDate: string | null; birthDate: string | null; address: string | null;
  isActive: boolean; createdAt: string; updatedAt: string;
  department?: { id: string; name: string } | null;
  store?:      { id: string; name: string } | null;
  manager?:    { id: string; name: string } | null;
  vehicles?:   { id: string; plate: string; brand: string | null; model: string | null }[];
}

export interface LeaveRequest {
  id: string; employeeId: string; leaveType: LeaveType; startDate: string; endDate: string;
  days: number; status: LeaveStatus; reason: string | null; notes: string | null;
  createdAt: string; updatedAt: string;
  employee?: { id: string; name: string; employeeNo: string } | null;
  approver?: { id: string; name: string } | null;
}

export interface LeaveBalance {
  id: string; employeeId: string; year: number; leaveType: string;
  totalDays: number; usedDays: number; remainingDays: number;
}

export interface JobPosting {
  id: string; tenantId: string; title: string; departmentId: string | null;
  description: string | null; requirements: string | null; status: string;
  openedAt: string; closedAt: string | null; createdAt: string;
  department?: { id: string; name: string } | null;
  _count?: { applications: number };
}

export interface JobApplication {
  id: string; postingId: string; name: string; email: string; phone: string | null;
  cvUrl: string | null; status: AppStatus; notes: string | null; appliedAt: string; createdAt: string;
  posting?: { id: string; title: string } | null;
  interviews?: Interview[];
}

export interface Interview {
  id: string; applicationId: string; scheduledAt: string; interviewers: string | null;
  type: string; result: string | null; notes: string | null; createdAt: string;
}
