// ============================================================
// Inventory & Stock Module — Shared Types
// ============================================================

export type MovementType = "in" | "out" | "transfer" | "adjustment" | "reserve" | "sale";

export interface MovementTypeConfig {
  id:    MovementType;
  label: string;
  icon:  string;
  color: string;
  bg:    string;
  sign:  1 | -1;
}

export const MOVEMENT_TYPES: MovementTypeConfig[] = [
  { id: "in",         label: "Giriş",      icon: "pi-arrow-down-left", color: "#10b981", bg: "bg-emerald-100 text-emerald-700", sign:  1 },
  { id: "out",        label: "Çıkış",      icon: "pi-arrow-up-right",  color: "#ef4444", bg: "bg-red-100 text-red-600",         sign: -1 },
  { id: "transfer",   label: "Transfer",   icon: "pi-arrows-h",        color: "#6366f1", bg: "bg-indigo-100 text-indigo-700",   sign:  1 },
  { id: "adjustment", label: "Düzeltme",   icon: "pi-sliders-h",       color: "#f59e0b", bg: "bg-amber-100 text-amber-700",     sign:  1 },
  { id: "reserve",    label: "Rezerv",     icon: "pi-lock",            color: "#64748b", bg: "bg-slate-100 text-slate-600",     sign: -1 },
  { id: "sale",       label: "Satış",      icon: "pi-shopping-cart",   color: "#0891b2", bg: "bg-cyan-100 text-cyan-700",       sign: -1 },
];

export function getMovementType(id: string): MovementTypeConfig {
  return MOVEMENT_TYPES.find((m) => m.id === id) ?? MOVEMENT_TYPES[0];
}

export type CountStatus = "draft" | "in_progress" | "completed" | "approved";

export interface CountStatusConfig {
  id:    CountStatus;
  label: string;
  icon:  string;
  bg:    string;
  next:  CountStatus[];
}

export const COUNT_STATUSES: CountStatusConfig[] = [
  { id: "draft",       label: "Taslak",     icon: "pi-file-edit",    bg: "bg-slate-100 text-slate-500",    next: ["in_progress"] },
  { id: "in_progress", label: "Sayılıyor",  icon: "pi-spin pi-sync", bg: "bg-amber-100 text-amber-700",   next: ["completed"] },
  { id: "completed",   label: "Tamamlandı", icon: "pi-check",        bg: "bg-blue-100 text-blue-700",     next: ["approved"] },
  { id: "approved",    label: "Onaylandı",  icon: "pi-check-circle", bg: "bg-emerald-100 text-emerald-700", next: [] },
];

export function getCountStatus(id: string): CountStatusConfig {
  return COUNT_STATUSES.find((s) => s.id === id) ?? COUNT_STATUSES[0];
}

// ---- Domain types ----

export interface Warehouse {
  id:          string;
  name:        string;
  location:    string | null;
  isActive:    boolean;
  createdAt:   string;
  _count?:     { stockItems: number };
  rentals?:    { id: string; name: string; ownershipType: string }[];
}

export interface StockItem {
  id:          string;
  warehouseId: string | null;
  sku:         string | null;
  name:        string;
  category:    string | null;
  unit:        string;
  quantity:    number;
  minQuantity: number;
  cost:        number | null;
  currency:    string;
  isActive:    boolean;
  createdAt:   string;
  updatedAt:   string;
  warehouse?:  { id: string; name: string } | null;
  isLowStock?: boolean;
}

export interface StockMovement {
  id:          string;
  itemId:      string;
  warehouseId: string | null;
  type:        MovementType;
  quantity:    number;
  reason:      string | null;
  reference:   string | null;
  createdAt:   string;
}

export interface InventoryItem {
  id:          string;
  sku:         string | null;
  barcode:     string | null;
  name:        string;
  category:    string | null;
  unit:        string;
  quantity:    number;
  minQuantity: number;
  location:    string | null;
  isActive:    boolean;
  createdAt:   string;
}

export interface InventoryCount {
  id:          string;
  name:        string;
  status:      CountStatus;
  startedAt:   string | null;
  completedAt: string | null;
  notes:       string | null;
  createdAt:   string;
  _count?:     { items: number };
}

export interface InventoryCountItem {
  id:         string;
  countId:    string;
  itemId:     string;
  expected:   number;
  actual:     number | null;
  difference: number | null;
  notes:      string | null;
  item?:      InventoryItem;
}

export interface Material {
  id:             string;
  code:           string;
  name:           string;
  description:    string | null;
  category:       string | null;
  unit:           string;
  specifications: string | null;
  suppliers:      string | null;
  minOrderQty:    number | null;
  leadTimeDays:   number | null;
  cost:           number | null;
  currency:       string;
  isActive:       boolean;
  createdAt:      string;
  updatedAt:      string;
}
