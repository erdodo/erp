// ============================================================
// Operations Module — Shared Types (Fleet, Field, Expenses, Rent)
// ============================================================

export type VehicleStatus   = "active" | "maintenance" | "out_of_service";
export type FieldServiceType = "repair" | "installation" | "maintenance" | "inspection";
export type ExpenseStatus   = "pending" | "approved" | "rejected";
export type FuelType        = "gasoline" | "diesel" | "lpg" | "electric" | "hybrid";

export interface VehicleStatusConfig  { id: VehicleStatus;    label: string; icon: string; bg: string }
export interface FieldTypeConfig      { id: FieldServiceType; label: string; icon: string; color: string }
export interface ExpenseStatusConfig  { id: ExpenseStatus;    label: string; icon: string; bg: string }

export const VEHICLE_STATUSES: VehicleStatusConfig[] = [
  { id: "active",          label: "Aktif",         icon: "pi-check-circle",   bg: "bg-emerald-100 text-emerald-700" },
  { id: "maintenance",     label: "Bakımda",        icon: "pi-wrench",         bg: "bg-amber-100 text-amber-700"   },
  { id: "out_of_service",  label: "Hizmet Dışı",   icon: "pi-times-circle",   bg: "bg-red-100 text-red-700"       },
];

export const FIELD_TYPES: FieldTypeConfig[] = [
  { id: "repair",       label: "Tamir",     icon: "pi-wrench",      color: "#ef4444" },
  { id: "installation", label: "Kurulum",   icon: "pi-hammer",      color: "#3b82f6" },
  { id: "maintenance",  label: "Bakım",     icon: "pi-cog",         color: "#f59e0b" },
  { id: "inspection",   label: "Denetim",   icon: "pi-search",      color: "#10b981" },
];

export const EXPENSE_STATUSES: ExpenseStatusConfig[] = [
  { id: "pending",  label: "Bekliyor",   icon: "pi-clock",        bg: "bg-amber-100 text-amber-700"   },
  { id: "approved", label: "Onaylandı",  icon: "pi-check-circle", bg: "bg-emerald-100 text-emerald-700" },
  { id: "rejected", label: "Reddedildi", icon: "pi-times-circle", bg: "bg-red-100 text-red-700"       },
];

export function getVehicleStatus(id: string):  VehicleStatusConfig  { return VEHICLE_STATUSES.find((s) => s.id === id)  ?? VEHICLE_STATUSES[0]; }
export function getFieldType(id: string):      FieldTypeConfig      { return FIELD_TYPES.find((t) => t.id === id)       ?? FIELD_TYPES[0]; }
export function getExpenseStatus(id: string):  ExpenseStatusConfig  { return EXPENSE_STATUSES.find((s) => s.id === id)  ?? EXPENSE_STATUSES[0]; }

export interface Vehicle {
  id: string; tenantId: string; plate: string; brand: string | null; model: string | null;
  year: number | null; fuelType: FuelType; driverId: string | null; status: VehicleStatus;
  insuranceExpiry: string | null; inspectionExpiry: string | null; notes: string | null;
  createdAt: string; _count?: { fuelRecords: number };
}

export interface FuelRecord {
  id: string; vehicleId: string; liters: number; cost: number; currency: string;
  odometer: number | null; station: string | null; filledAt: string; createdAt: string;
}

export interface ServiceRoute {
  id: string; tenantId: string; name: string; vehicleId: string | null; driverId: string | null;
  status: string; stops: string | null; notes: string | null; startedAt: string | null;
  completedAt: string | null; createdAt: string;
  vehicle?: { id: string; plate: string } | null;
}

export interface Expense {
  id: string; tenantId: string; categoryId: string | null; userId: string | null;
  title: string; amount: number; currency: string; receiptUrl: string | null;
  status: ExpenseStatus; approvedBy: string | null; expenseDate: string; notes: string | null;
  createdAt: string;
  category?: { id: string; name: string } | null;
  user?:     { id: string; name: string } | null;
}

export interface ExpenseCategory {
  id: string; tenantId: string; name: string; budget: number | null; currency: string; isActive: boolean;
  _count?: { expenses: number };
}

export interface FieldService {
  id: string; tenantId: string; customerId: string | null; assignedTo: string | null;
  type: FieldServiceType; title: string; description: string | null; status: string;
  priority: string; scheduledAt: string | null; startedAt: string | null;
  completedAt: string | null; notes: string | null; createdAt: string;
  customer?: { id: string; name: string } | null;
}

export interface RentalProperty {
  id: string; tenantId: string; name: string; type: string; address: string | null;
  area: number | null; isActive: boolean; createdAt: string;
  contracts?: RentalContract[];
  _count?: { contracts: number };
}

export interface RentalContract {
  id: string; propertyId: string; tenantName: string; amount: number; currency: string;
  startDate: string; endDate: string | null; isActive: boolean; notes: string | null; createdAt: string;
  payments?: RentalPayment[];
}

export interface RentalPayment {
  id: string; contractId: string; amount: number; currency: string;
  dueDate: string; paidAt: string | null; status: string; notes: string | null;
}
