// CRM shared types and constants — client-safe (no prisma imports)

export type PipelineStage = "lead" | "prospect" | "proposal" | "negotiation" | "won" | "lost";
export type CustomerType   = "corporate" | "individual";
export type InteractionType = "call" | "email" | "meeting" | "note" | "visit";

// ─── Pipeline Stages ───────────────────────────────────────────────────────────

export interface StageConfig {
  id:    PipelineStage;
  label: string;
  color: string;
  bg:    string;
  icon:  string;
}

export const PIPELINE_STAGES: StageConfig[] = [
  { id: "lead",        label: "Aday",      color: "#64748b", bg: "bg-slate-100 text-slate-600",   icon: "pi-user-plus" },
  { id: "prospect",    label: "Görüşme",   color: "#3b82f6", bg: "bg-blue-100 text-blue-700",     icon: "pi-phone" },
  { id: "proposal",    label: "Teklif",    color: "#f59e0b", bg: "bg-amber-100 text-amber-700",   icon: "pi-file" },
  { id: "negotiation", label: "Müzakere",  color: "#8b5cf6", bg: "bg-violet-100 text-violet-700", icon: "pi-refresh" },
  { id: "won",         label: "Kazanıldı", color: "#10b981", bg: "bg-emerald-100 text-emerald-700", icon: "pi-check-circle" },
  { id: "lost",        label: "Kaybedildi", color: "#ef4444", bg: "bg-red-100 text-red-700",      icon: "pi-times-circle" },
];

export function getStage(id: string): StageConfig {
  return PIPELINE_STAGES.find((s) => s.id === id) ?? PIPELINE_STAGES[0];
}

// ─── Interaction Types ─────────────────────────────────────────────────────────

export interface InteractionTypeConfig {
  id:    InteractionType;
  label: string;
  icon:  string;
  color: string;
}

export const INTERACTION_TYPES: InteractionTypeConfig[] = [
  { id: "call",    label: "Telefon",  icon: "pi-phone",    color: "#10b981" },
  { id: "email",   label: "E-posta",  icon: "pi-envelope", color: "#3b82f6" },
  { id: "meeting", label: "Toplantı", icon: "pi-users",    color: "#8b5cf6" },
  { id: "note",    label: "Not",      icon: "pi-pencil",   color: "#f59e0b" },
  { id: "visit",   label: "Ziyaret",  icon: "pi-map-marker", color: "#ef4444" },
];

export function getInteractionType(id: string): InteractionTypeConfig {
  return INTERACTION_TYPES.find((t) => t.id === id) ?? INTERACTION_TYPES[3];
}

// ─── Customer Types ────────────────────────────────────────────────────────────

export const CUSTOMER_TYPES = [
  { id: "corporate",  label: "Kurumsal", icon: "pi-building" },
  { id: "individual", label: "Bireysel", icon: "pi-user"     },
];

// ─── Data Interfaces ───────────────────────────────────────────────────────────

export interface CrmCustomer {
  id:            string;
  tenantId:      string;
  type:          CustomerType;
  name:          string;
  email:         string | null;
  phone:         string | null;
  address:       string | null;
  city:          string | null;
  country:       string;
  taxNumber:     string | null;
  taxOffice:     string | null;
  website:       string | null;
  pipelineStage: PipelineStage;
  assignedTo:    string | null;
  tags:          string | null;
  notes:         string | null;
  createdAt:     string;
  updatedAt:     string;
  _count?:       { contacts: number; interactions: number; sales: number };
  assignedUser?: { id: string; name: string } | null;
}

export interface CrmContact {
  id:        string;
  customerId: string;
  name:      string;
  title:     string | null;
  email:     string | null;
  phone:     string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface CrmInteraction {
  id:         string;
  customerId: string;
  userId:     string | null;
  type:       InteractionType;
  subject:    string;
  body:       string | null;
  date:       string;
  createdAt:  string;
  user?:      { id: string; name: string } | null;
}

export interface CrmStats {
  total:       number;
  newThisMonth: number;
  byStage:     Record<string, number>;
  wonThisMonth: number;
  lostThisMonth: number;
}
