import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// ─── Condition Types ───────────────────────────────────────────────────────────

export type ConditionOperator =
  | "eq" | "ne" | "gt" | "lt" | "gte" | "lte"
  | "contains" | "not_contains"
  | "in" | "not_in"
  | "is_null" | "is_not_null";

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
}

export interface ConditionGroup {
  logic: "and" | "or";
  conditions: (Condition | ConditionGroup)[];
}

// ─── Action Types ──────────────────────────────────────────────────────────────

export type ActionType =
  | "notify"
  | "createTask"
  | "updateStatus"
  | "assignUser"
  | "sendToModule"
  | "updateField"
  | "wait";

export interface StepConfig {
  // notify
  notifyUserId?: string;       // literal userId or "$triggerUserId"
  notifyTitle?: string;
  notifyBody?: string;
  notifyType?: string;
  notifyModule?: string;
  // createTask
  taskTitle?: string;
  taskAssignedTo?: string;
  taskDueInDays?: number;
  taskRelatedModule?: string;
  taskRelatedId?: string;      // field name in triggerData
  // updateStatus / updateField — Prisma model name
  model?: string;
  recordIdField?: string;      // field in triggerData holding the record id
  status?: string;             // for updateStatus
  fieldName?: string;          // for updateField
  fieldValue?: unknown;        // for updateField
  // assignUser
  assignUserField?: string;    // field name in triggerData to get userId
  // sendToModule
  targetModule?: string;
  targetEvent?: string;
  // wait
  waitSeconds?: number;
}

export interface WorkflowStepDef {
  id: string;
  sortOrder: number;
  action: ActionType;
  config: StepConfig;
}

// ─── Condition Evaluation ──────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export function evaluateCondition(
  condition: Condition | ConditionGroup,
  data: Record<string, unknown>
): boolean {
  if ("logic" in condition) {
    const group = condition as ConditionGroup;
    return group.logic === "and"
      ? group.conditions.every((c) => evaluateCondition(c, data))
      : group.conditions.some((c) => evaluateCondition(c, data));
  }

  const { field, operator, value } = condition as Condition;
  const actual = getNestedValue(data, field);

  switch (operator) {
    case "eq":          return actual === value;
    case "ne":          return actual !== value;
    case "gt":          return Number(actual) > Number(value);
    case "lt":          return Number(actual) < Number(value);
    case "gte":         return Number(actual) >= Number(value);
    case "lte":         return Number(actual) <= Number(value);
    case "contains":    return typeof actual === "string" && actual.includes(String(value));
    case "not_contains":return typeof actual === "string" && !actual.includes(String(value));
    case "in":          return Array.isArray(value) && value.includes(actual);
    case "not_in":      return Array.isArray(value) && !value.includes(actual);
    case "is_null":     return actual == null;
    case "is_not_null": return actual != null;
    default:            return false;
  }
}

// ─── Step Execution ────────────────────────────────────────────────────────────

export async function executeStep(
  step: WorkflowStepDef,
  context: {
    tenantId: string;
    triggerData: Record<string, unknown>;
    triggerUserId?: string;
  }
): Promise<void> {
  const { tenantId, triggerData, triggerUserId } = context;
  const cfg = step.config;

  switch (step.action) {
    case "notify": {
      const userId = cfg.notifyUserId === "$triggerUserId"
        ? (triggerUserId ?? "")
        : (cfg.notifyUserId ?? "");
      if (!userId) break;
      await createNotification({
        tenantId,
        userId,
        title: interpolate(cfg.notifyTitle ?? "Bildirim", triggerData),
        body:  interpolate(cfg.notifyBody  ?? "",          triggerData),
        type:  cfg.notifyType   as "info" | "success" | "warning" | "error" ?? "info",
        module: cfg.notifyModule,
      });
      break;
    }

    case "createTask": {
      const relatedId = cfg.taskRelatedId ? String(triggerData[cfg.taskRelatedId] ?? "") : undefined;
      await prisma.task.create({
        data: {
          tenantId,
          title:      interpolate(cfg.taskTitle ?? "Görev", triggerData),
          assignedTo: cfg.taskAssignedTo ?? null,
          dueDate:    cfg.taskDueInDays
            ? new Date(Date.now() + cfg.taskDueInDays * 86_400_000)
            : null,
          status: "todo",
          ...(relatedId ? { description: `İlgili kayıt: ${relatedId}` } : {}),
        },
      });
      break;
    }

    case "updateStatus": {
      if (!cfg.model || !cfg.recordIdField || !cfg.status) break;
      const recordId = String(triggerData[cfg.recordIdField] ?? "");
      if (!recordId) break;
      // Dynamic Prisma update — model must be a valid Prisma model name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (prisma as any)[cfg.model];
      if (model?.update) {
        await model.update({ where: { id: recordId }, data: { status: cfg.status } });
      }
      break;
    }

    case "updateField": {
      if (!cfg.model || !cfg.recordIdField || !cfg.fieldName) break;
      const recordId = String(triggerData[cfg.recordIdField] ?? "");
      if (!recordId) break;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (prisma as any)[cfg.model];
      if (model?.update) {
        await model.update({
          where: { id: recordId },
          data:  { [cfg.fieldName]: cfg.fieldValue },
        });
      }
      break;
    }

    case "assignUser": {
      if (!cfg.model || !cfg.recordIdField || !cfg.assignUserField) break;
      const recordId = String(triggerData[cfg.recordIdField] ?? "");
      const userId   = String(triggerData[cfg.assignUserField] ?? "");
      if (!recordId || !userId) break;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (prisma as any)[cfg.model];
      if (model?.update) {
        await model.update({ where: { id: recordId }, data: { assignedToId: userId } });
      }
      break;
    }

    case "sendToModule": {
      // Fire-and-forget to another module's trigger chain
      if (cfg.targetModule && cfg.targetEvent) {
        await triggerWorkflows({
          tenantId,
          module: cfg.targetModule,
          event:  cfg.targetEvent,
          data:   triggerData,
          userId: triggerUserId,
        });
      }
      break;
    }

    case "wait": {
      if (cfg.waitSeconds && cfg.waitSeconds > 0) {
        await new Promise((r) => setTimeout(r, cfg.waitSeconds! * 1000));
      }
      break;
    }
  }
}

// ─── Workflow Execution ────────────────────────────────────────────────────────

export async function executeWorkflow(
  workflowId: string,
  context: {
    tenantId: string;
    triggerData: Record<string, unknown>;
    triggerUserId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      triggerData: JSON.stringify(context.triggerData),
      status:      "running",
    },
  });

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });

    if (!workflow || !workflow.isActive) {
      throw new Error("Workflow bulunamadı veya pasif");
    }

    for (const rawStep of workflow.steps) {
      const step: WorkflowStepDef = {
        id:        rawStep.id,
        sortOrder: rawStep.sortOrder,
        action:    rawStep.action as ActionType,
        config:    JSON.parse(rawStep.config) as StepConfig,
      };
      await executeStep(step, context);
    }

    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data:  { status: "completed", completedAt: new Date() },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data:  { status: "failed", error: message, completedAt: new Date() },
    });
    return { success: false, error: message };
  }
}

// ─── Trigger Entry Point ───────────────────────────────────────────────────────

export async function triggerWorkflows(opts: {
  tenantId: string;
  module: string;
  event: string;
  data: Record<string, unknown>;
  userId?: string;
}): Promise<void> {
  const { tenantId, module, event, data, userId } = opts;

  const workflows = await prisma.workflow.findMany({
    where: {
      tenantId,
      triggerModule: module,
      triggerEvent:  event,
      isActive:      true,
      deletedAt:     null,
    },
  });

  for (const wf of workflows) {
    // Evaluate top-level conditions if present
    if (wf.conditions) {
      const conditionGroup = JSON.parse(wf.conditions) as ConditionGroup;
      if (!evaluateCondition(conditionGroup, data)) continue;
    }

    // Execute async, don't block the caller
    void executeWorkflow(wf.id, { tenantId, triggerData: data, triggerUserId: userId });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path: string) => {
    const val = getNestedValue(data, path);
    return val != null ? String(val) : "";
  });
}
