import { prisma } from "./prisma";

export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "export" | "import" | "view";

interface LogActionParams {
  userId?: string | null;
  tenantId?: string | null;
  action: AuditAction;
  mod: string;
  recordId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        tenantId: params.tenantId ?? null,
        action: params.action,
        module: params.mod,
        recordId: params.recordId ?? null,
        oldData: params.oldData ? JSON.stringify(params.oldData) : null,
        newData: params.newData ? JSON.stringify(params.newData) : null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[AUDIT LOG ERROR]", err);
  }
}

export function getIpFromRequest(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip") ?? null;
}
