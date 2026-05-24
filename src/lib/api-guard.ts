import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction, type AuditAction } from "@/lib/audit";

export interface GuardedSession {
  userId: string;
  tenantId: string;
  isSuperAdmin: boolean;
}

/**
 * Checks session auth + tenant membership.
 * Returns { ok, session } or a NextResponse error.
 */
export async function requireAuth(): Promise<
  { ok: true; session: GuardedSession } | { ok: false; res: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!session.user.tenantId && !session.user.isSuperAdmin) {
    return { ok: false, res: NextResponse.json({ error: "Tenant yok" }, { status: 403 }) };
  }
  return {
    ok: true,
    session: {
      userId: session.user.id,
      tenantId: session.user.tenantId ?? "",
      isSuperAdmin: session.user.isSuperAdmin,
    },
  };
}

/**
 * Checks session auth + tenant membership + module active status.
 */
export async function requireModule(
  moduleSlug: string
): Promise<{ ok: true; session: GuardedSession } | { ok: false; res: NextResponse }> {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;

  if (authResult.session.isSuperAdmin) {
    return { ok: true, session: authResult.session };
  }

  const { tenantId } = authResult.session;

  const tenantModule = await prisma.tenantModule.findUnique({
    where: { tenantId_module: { tenantId, module: moduleSlug } },
  });

  if (!tenantModule?.isActive) {
    return {
      ok: false,
      res: NextResponse.json({ error: `'${moduleSlug}' modülü bu hesap için aktif değil` }, { status: 403 }),
    };
  }

  return { ok: true, session: authResult.session };
}

/**
 * Logs a CRUD action after a successful operation.
 */
export async function auditLog(
  session: GuardedSession,
  action: AuditAction,
  mod: string,
  recordId?: string,
  opts?: { oldData?: Record<string, unknown>; newData?: Record<string, unknown>; ipAddress?: string | null }
) {
  await logAction({
    userId: session.userId,
    tenantId: session.tenantId,
    action,
    mod,
    recordId: recordId ?? null,
    oldData: opts?.oldData ?? null,
    newData: opts?.newData ?? null,
    ipAddress: opts?.ipAddress ?? null,
  });
}
