// ============================================================
// Production Module — Shared Types & State Machines
// ============================================================

export type ProductionStatus =
  | "planned"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled";

export type MethodStatus = "draft" | "active" | "deprecated";

export interface ProductionStatusConfig {
  id:    ProductionStatus;
  label: string;
  color: string;
  bg:    string;
  icon:  string;
  next:  ProductionStatus[];
}

export const PRODUCTION_STATUSES: ProductionStatusConfig[] = [
  { id: "planned",     label: "Planlandı",     color: "#6366f1", bg: "bg-indigo-100 text-indigo-700",  icon: "pi-calendar",    next: ["in_progress", "cancelled"] },
  { id: "in_progress", label: "Üretimde",      color: "#f59e0b", bg: "bg-amber-100 text-amber-700",    icon: "pi-spin pi-cog", next: ["paused", "completed", "cancelled"] },
  { id: "paused",      label: "Duraklatıldı",  color: "#64748b", bg: "bg-slate-100 text-slate-600",    icon: "pi-pause-circle",next: ["in_progress", "cancelled"] },
  { id: "completed",   label: "Tamamlandı",    color: "#10b981", bg: "bg-emerald-100 text-emerald-700",icon: "pi-check-circle",next: [] },
  { id: "cancelled",   label: "İptal",         color: "#ef4444", bg: "bg-red-100 text-red-600",        icon: "pi-times-circle",next: [] },
];

export function getProductionStatus(id: string): ProductionStatusConfig {
  return PRODUCTION_STATUSES.find((s) => s.id === id) ?? PRODUCTION_STATUSES[0];
}

export interface MethodStatusConfig {
  id:    MethodStatus;
  label: string;
  color: string;
  bg:    string;
  icon:  string;
}

export const METHOD_STATUSES: MethodStatusConfig[] = [
  { id: "draft",      label: "Taslak",        color: "#94a3b8", bg: "bg-slate-100 text-slate-500",    icon: "pi-file-edit" },
  { id: "active",     label: "Aktif",         color: "#10b981", bg: "bg-emerald-100 text-emerald-700",icon: "pi-check-circle" },
  { id: "deprecated", label: "Kullanım Dışı", color: "#6b7280", bg: "bg-gray-100 text-gray-500",      icon: "pi-ban" },
];

export function getMethodStatus(id: string): MethodStatusConfig {
  return METHOD_STATUSES.find((s) => s.id === id) ?? METHOD_STATUSES[0];
}

export interface ProductionOrder {
  id:           string;
  orderNo:      string;
  productName:  string;
  quantity:     number;
  unit:         string;
  lineId:       string | null;
  methodId:     string | null;
  saleId:       string | null;
  status:       ProductionStatus;
  plannedStart: string | null;
  plannedEnd:   string | null;
  actualStart:  string | null;
  actualEnd:    string | null;
  notes:        string | null;
  createdAt:    string;
  updatedAt:    string;
  line?:        { id: string; name: string } | null;
  method?:      { id: string; name: string; version: string } | null;
}

export interface ProductionLine {
  id:          string;
  name:        string;
  description: string | null;
  isActive:    boolean;
  createdAt:   string;
  _count?: { orders: number };
}

export interface ProductionMethod {
  id:          string;
  name:        string;
  version:     string;
  description: string | null;
  steps:       string | null;
  materials:   string | null;
  equipment:   string | null;
  status:      MethodStatus;
  approvedAt:  string | null;
  approvedBy:  string | null;
  createdAt:   string;
  updatedAt:   string;
}

export interface FiveSAudit {
  id:          string;
  title:       string;
  location:    string | null;
  auditor:     string | null;
  sort:        number;
  setInOrder:  number;
  shine:       number;
  standardize: number;
  sustain:     number;
  totalScore:  number;
  notes:       string | null;
  actions:     string | null;
  auditDate:   string;
  createdAt:   string;
}

export const FIVE_S_CATEGORIES = [
  { key: "sort",        label: "Sıralama (Seiri)",       icon: "pi-sort-alt",    color: "#6366f1" },
  { key: "setInOrder",  label: "Düzenleme (Seiton)",     icon: "pi-list",        color: "#0891b2" },
  { key: "shine",       label: "Temizlik (Seiso)",        icon: "pi-star",        color: "#10b981" },
  { key: "standardize", label: "Standartlaştırma (Seiketsu)", icon: "pi-verified", color: "#f59e0b" },
  { key: "sustain",     label: "Sürdürme (Shitsuke)",    icon: "pi-refresh",     color: "#ef4444" },
] as const;

export type FiveSKey = "sort" | "setInOrder" | "shine" | "standardize" | "sustain";
