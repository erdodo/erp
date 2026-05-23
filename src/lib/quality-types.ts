// ============================================================
// Quality & Maintenance Module — Shared Types
// ============================================================

export type CheckType   = "incoming" | "in_process" | "final" | "customer";
export type CheckResult = "pending" | "pass" | "fail" | "conditional";
export type MaintType   = "preventive" | "corrective" | "predictive";
export type EquipStatus = "active" | "idle" | "maintenance" | "scrapped";

// ---- Quality ----

export interface CheckTypeConfig { id: CheckType; label: string; icon: string; color: string; bg: string }
export interface CheckResultConfig { id: CheckResult; label: string; icon: string; bg: string; color: string }

export const CHECK_TYPES: CheckTypeConfig[] = [
  { id: "incoming",   label: "Gelen Kontrol",   icon: "pi-arrow-down",   color: "#6366f1", bg: "bg-indigo-100 text-indigo-700" },
  { id: "in_process", label: "Süreç İçi",       icon: "pi-cog",          color: "#f59e0b", bg: "bg-amber-100 text-amber-700"   },
  { id: "final",      label: "Final Kontrol",   icon: "pi-check-circle", color: "#0891b2", bg: "bg-cyan-100 text-cyan-700"     },
  { id: "customer",   label: "Müşteri Şikayeti",icon: "pi-user",         color: "#ef4444", bg: "bg-red-100 text-red-700"       },
];

export const CHECK_RESULTS: CheckResultConfig[] = [
  { id: "pending",     label: "Bekliyor",  icon: "pi-clock",        bg: "bg-slate-100 text-slate-500",    color: "#94a3b8" },
  { id: "pass",        label: "Geçti",     icon: "pi-check",        bg: "bg-emerald-100 text-emerald-700",color: "#10b981" },
  { id: "fail",        label: "Başarısız", icon: "pi-times",        bg: "bg-red-100 text-red-700",        color: "#ef4444" },
  { id: "conditional", label: "Koşullu",   icon: "pi-exclamation-triangle", bg: "bg-amber-100 text-amber-700", color: "#f59e0b" },
];

export function getCheckType(id: string): CheckTypeConfig   { return CHECK_TYPES.find((t) => t.id === id)   ?? CHECK_TYPES[0]; }
export function getCheckResult(id: string): CheckResultConfig { return CHECK_RESULTS.find((r) => r.id === id) ?? CHECK_RESULTS[0]; }

export interface QualityStandard {
  id:          string;
  name:        string;
  description: string | null;
  maxPpm:      number;
  isActive:    boolean;
  createdAt:   string;
}

export interface QualityCheck {
  id:          string;
  standardId:  string | null;
  type:        CheckType;
  productName: string;
  batchNo:     string | null;
  quantity:    number;
  defectCount: number;
  ppm:         number;
  result:      CheckResult;
  inspector:   string | null;
  notes:       string | null;
  checkedAt:   string;
  createdAt:   string;
  standard?:   QualityStandard | null;
}

// ---- Maintenance ----

export interface MaintTypeConfig { id: MaintType; label: string; icon: string; color: string; bg: string }

export const MAINT_TYPES: MaintTypeConfig[] = [
  { id: "preventive",  label: "Önleyici",    icon: "pi-shield",      color: "#10b981", bg: "bg-emerald-100 text-emerald-700" },
  { id: "corrective",  label: "Düzeltici",   icon: "pi-wrench",      color: "#ef4444", bg: "bg-red-100 text-red-700"         },
  { id: "predictive",  label: "Kestirimci",  icon: "pi-chart-line",  color: "#6366f1", bg: "bg-indigo-100 text-indigo-700"   },
];

export function getMaintType(id: string): MaintTypeConfig { return MAINT_TYPES.find((t) => t.id === id) ?? MAINT_TYPES[0]; }

export interface MaintenanceSchedule {
  id:            string;
  equipmentId:   string | null;
  name:          string;
  type:          MaintType;
  frequency:     string | null;
  lastDate:      string | null;
  nextDate:      string | null;
  estimatedCost: number | null;
  currency:      string;
  isActive:      boolean;
  notes:         string | null;
  createdAt:     string;
  _count?:       { records: number };
}

export interface MaintenanceRecord {
  id:          string;
  scheduleId:  string | null;
  equipmentId: string | null;
  technician:  string | null;
  type:        MaintType;
  description: string;
  cost:        number | null;
  currency:    string;
  duration:    number | null;
  completedAt: string;
  createdAt:   string;
  schedule?:   { id: string; name: string } | null;
  equipment?:  { id: string; name: string; code: string } | null;
}

// ---- Equipment ----

export interface EquipStatusConfig { id: EquipStatus; label: string; icon: string; bg: string; color: string }

export const EQUIP_STATUSES: EquipStatusConfig[] = [
  { id: "active",      label: "Aktif",       icon: "pi-check-circle",  bg: "bg-emerald-100 text-emerald-700", color: "#10b981" },
  { id: "idle",        label: "Beklemede",   icon: "pi-pause-circle",  bg: "bg-slate-100 text-slate-500",     color: "#94a3b8" },
  { id: "maintenance", label: "Bakımda",     icon: "pi-wrench",        bg: "bg-amber-100 text-amber-700",     color: "#f59e0b" },
  { id: "scrapped",    label: "Hurdaya Ayrıldı", icon: "pi-trash",    bg: "bg-red-100 text-red-600",         color: "#ef4444" },
];

export function getEquipStatus(id: string): EquipStatusConfig { return EQUIP_STATUSES.find((s) => s.id === id) ?? EQUIP_STATUSES[0]; }

export interface EquipmentItem {
  id:            string;
  code:          string;
  name:          string;
  brand:         string | null;
  model:         string | null;
  serialNo:      string | null;
  location:      string | null;
  status:        EquipStatus;
  purchaseDate:  string | null;
  purchasePrice: number | null;
  currency:      string;
  warrantyUntil: string | null;
  notes:         string | null;
  createdAt:     string;
  updatedAt:     string;
  _count?:       { maintenanceRecords: number };
}
