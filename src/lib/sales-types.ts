// Sales module shared types — client-safe (no Prisma imports)

// ─── Order Status Machine ─────────────────────────────────────────────────────

export type OrderStatus =
  | "draft"
  | "quote"
  | "pending_approval"
  | "approved"
  | "preparing"
  | "shipped"
  | "delivered"
  | "invoiced"
  | "cancelled"
  | "returned";

export interface StatusConfig {
  id:       OrderStatus;
  label:    string;
  color:    string;
  bg:       string;
  icon:     string;
  next?:    OrderStatus[]; // allowed transitions
}

export const ORDER_STATUSES: StatusConfig[] = [
  { id: "draft",            label: "Taslak",          color: "#94a3b8", bg: "bg-slate-100 text-slate-600",    icon: "pi-file",           next: ["quote", "pending_approval", "cancelled"] },
  { id: "quote",            label: "Teklif",          color: "#6366f1", bg: "bg-violet-100 text-violet-700",  icon: "pi-file-edit",      next: ["pending_approval", "approved", "cancelled"] },
  { id: "pending_approval", label: "Onay Bekliyor",   color: "#f59e0b", bg: "bg-amber-100 text-amber-700",    icon: "pi-clock",          next: ["approved", "cancelled"] },
  { id: "approved",         label: "Onaylandı",       color: "#10b981", bg: "bg-emerald-100 text-emerald-700",icon: "pi-check-circle",   next: ["preparing", "cancelled"] },
  { id: "preparing",        label: "Hazırlanıyor",    color: "#3b82f6", bg: "bg-blue-100 text-blue-700",      icon: "pi-wrench",         next: ["shipped", "cancelled"] },
  { id: "shipped",          label: "Kargolandı",      color: "#8b5cf6", bg: "bg-purple-100 text-purple-700",  icon: "pi-truck",          next: ["delivered"] },
  { id: "delivered",        label: "Teslim Edildi",   color: "#0ea5e9", bg: "bg-sky-100 text-sky-700",        icon: "pi-box",            next: ["invoiced", "returned"] },
  { id: "invoiced",         label: "Faturalandı",     color: "#10b981", bg: "bg-green-100 text-green-700",    icon: "pi-receipt",        next: ["returned"] },
  { id: "cancelled",        label: "İptal",           color: "#ef4444", bg: "bg-red-100 text-red-700",        icon: "pi-times-circle",   next: [] },
  { id: "returned",         label: "İade",            color: "#f97316", bg: "bg-orange-100 text-orange-700",  icon: "pi-undo",           next: [] },
];

export function getOrderStatus(id: string): StatusConfig {
  return ORDER_STATUSES.find((s) => s.id === id) ?? ORDER_STATUSES[0];
}

// Status groups for filtering
export const STATUS_GROUPS = {
  active:    ["draft", "quote", "pending_approval", "approved", "preparing", "shipped", "delivered"] as OrderStatus[],
  closed:    ["invoiced", "cancelled", "returned"] as OrderStatus[],
  pending:   ["pending_approval"] as OrderStatus[],
  invoiced:  ["invoiced"] as OrderStatus[],
};

// ─── Product / StockItem ──────────────────────────────────────────────────────

export interface SalesProduct {
  id:          string;
  tenantId:    string;
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
}

// ─── Sale / Order ─────────────────────────────────────────────────────────────

export interface SaleItemData {
  id:          string;
  saleId:      string;
  stockItemId: string | null;
  name:        string;
  quantity:    number;
  unit:        string;
  unitPrice:   number;
  totalPrice:  number;
  notes:       string | null;
  product?:    Pick<SalesProduct, "id"|"name"|"sku"|"quantity"> | null;
}

export interface SaleData {
  id:           string;
  tenantId:     string;
  saleNo:       string;
  customerId:   string | null;
  status:       OrderStatus;
  totalAmount:  number;
  currency:     string;
  discount:     number;
  tax:          number;
  notes:        string | null;
  invoiceUrl:   string | null;
  orderDate:    string;
  deliveryDate: string | null;
  createdAt:    string;
  updatedAt:    string;
  customer?:    { id: string; name: string; type: string } | null;
  items?:       SaleItemData[];
  _count?:      { items: number };
}

// ─── Discount Matrix ──────────────────────────────────────────────────────────

export interface DiscountRule {
  label:       string;
  condition:   string;
  discountPct: number;
}

export const DISCOUNT_MATRIX: DiscountRule[] = [
  { label: "Kurumsal B2B",         condition: "type=corporate",   discountPct: 5 },
  { label: "10+ Adet Alım",        condition: "qty>=10",          discountPct: 3 },
  { label: "50+ Adet Alım",        condition: "qty>=50",          discountPct: 7 },
  { label: "100+ Adet Alım",       condition: "qty>=100",         discountPct: 12 },
  { label: "Kampanyalı Ürün",      condition: "campaign",         discountPct: 10 },
];

// ─── Cari Hesap ───────────────────────────────────────────────────────────────

export interface CariEntry {
  customerId:   string;
  customerName: string;
  customerType: string;
  totalOrders:  number;
  totalInvoiced: number;
  currency:     string;
  openOrders:   number;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export const TAX_RATES = [
  { label: "KDV %0",   value: 0   },
  { label: "KDV %1",   value: 1   },
  { label: "KDV %10",  value: 10  },
  { label: "KDV %20",  value: 20  },
];
