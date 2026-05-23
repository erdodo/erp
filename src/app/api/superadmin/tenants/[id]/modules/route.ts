import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { ALL_MODULES } from "@/lib/modules-data";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  const { id } = await params;

  const tenantModules = await prisma.tenantModule.findMany({ where: { tenantId: id } });
  const moduleMap = new Map(tenantModules.map((m) => [m.module, m]));

  const result = ALL_MODULES.map((m) => ({
    slug: m.slug,
    name: m.name,
    icon: m.icon,
    group: m.group,
    isActive: moduleMap.get(m.slug)?.isActive ?? false,
    sortOrder: moduleMap.get(m.slug)?.sortOrder ?? 0,
    allowedActions: moduleMap.get(m.slug)?.allowedActions ?? "read,create,update,delete,export",
  }));

  return NextResponse.json({ modules: result });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSuperAdminApi();
  if (error) return error;
  const { id: tenantId } = await params;

  const { slug, isActive, allowedActions } = (await req.json()) as { slug: string; isActive?: boolean; allowedActions?: string };

  await prisma.tenantModule.upsert({
    where: { tenantId_module: { tenantId, module: slug } },
    create: { tenantId, module: slug, isActive: isActive ?? false, allowedActions: allowedActions ?? "read,create,update,delete,export" },
    update: {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(allowedActions !== undefined ? { allowedActions } : {}),
    },
  });

  const actionLabel = allowedActions !== undefined ? "UPDATE_MODULE_ACTIONS" : (isActive ? "ENABLE_MODULE" : "DISABLE_MODULE");
  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: actionLabel,
      module: "superadmin.tenant.modules",
      recordId: tenantId,
      newData: JSON.stringify({ slug, isActive, allowedActions }),
    },
  });

  return NextResponse.json({ success: true });
}
