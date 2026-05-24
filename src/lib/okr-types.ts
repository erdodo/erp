// ============================================================
// OKR (Objectives and Key Results) Module — Shared Types
// ============================================================

export type OkrObjectiveLevel = "company" | "department" | "team" | "personal";
export type OkrPeriodType = "quarterly" | "yearly";

export interface StatusConfig {
  id: string;
  label: string;
  icon: string;
  bg: string;
  color: string;
}

export const OKR_LEVELS: StatusConfig[] = [
  { id: "company", label: "Şirket", icon: "pi-building", bg: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400", color: "#0d9488" },
  { id: "department", label: "Departman", icon: "pi-sitemap", bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", color: "#2563eb" },
  { id: "team", label: "Takım", icon: "pi-users", bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", color: "#7c3aed" },
  { id: "personal", label: "Bireysel", icon: "pi-user", bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", color: "#64748b" },
];

export function getOkrLevelConfig(id: string): StatusConfig {
  return OKR_LEVELS.find((l) => l.id === id) ?? OKR_LEVELS[3];
}

export interface OkrPeriod {
  id: string;
  tenantId: string;
  name: string;
  type: OkrPeriodType;
  startDate: string;
  endDate: string;
  isActive: boolean;
  votingActive: boolean;
  createdAt: string;
  deletedAt: string | null;
  objectives?: OkrObjective[];
  comments?: OkrPeriodComment[];
  votes?: OkrPeriodVote[];
  _count?: { objectives: number; comments: number; votes: number };
}

export interface OkrTeam {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  createdAt: string;
  deletedAt: string | null;
  leader?: { id: string; name: string } | null;
  members?: OkrTeamMember[];
  objectives?: OkrObjective[];
  _count?: { members: number; objectives: number };
}

export interface OkrTeamMember {
  id: string;
  teamId: string;
  userId: string;
  user?: { id: string; name: string; email: string } | null;
  team?: OkrTeam | null;
}

export interface OkrObjective {
  id: string;
  tenantId: string;
  periodId: string;
  title: string;
  description: string | null;
  level: OkrObjectiveLevel;
  departmentId: string | null;
  teamId: string | null;
  userId: string | null;
  ownerId: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  period?: OkrPeriod | null;
  department?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
  user?: { id: string; name: string } | null; // for personal objective
  owner?: { id: string; name: string } | null; // responsible user
  keyResults?: OkrKeyResult[];
  comments?: OkrObjectiveComment[];
  _count?: { keyResults: number; comments: number };
}

export interface OkrKeyResult {
  id: string;
  tenantId: string;
  objectiveId: string;
  title: string;
  description: string | null;
  initialValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  progress: number;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  objective?: OkrObjective | null;
  owner?: { id: string; name: string } | null;
}

export interface OkrPeriodComment {
  id: string;
  periodId: string;
  userId: string;
  body: string;
  createdAt: string;
  user?: { id: string; name: string } | null;
  period?: OkrPeriod | null;
}

export interface OkrPeriodVote {
  id: string;
  periodId: string;
  userId: string;
  score: number;
  comment: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
  period?: OkrPeriod | null;
}

export interface OkrObjectiveComment {
  id: string;
  objectiveId: string;
  userId: string;
  body: string;
  createdAt: string;
  user?: { id: string; name: string } | null;
  objective?: OkrObjective | null;
}
