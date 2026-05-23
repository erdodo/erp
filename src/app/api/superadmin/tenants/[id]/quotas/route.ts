import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";

const DEFAULT_RESOURCES = [
  "users", "customers", "projects", "tasks", "employees",
  "warehouses", "sales", "equipment", "vehicles",
];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  const { id: tenantId } = await params;

  const quotas = await prisma.tenantQuota.findMany({ where: { tenantId } });
  const quotaMap = new Map(quotas.map((q) => [q.resource, q]));

  const result = DEFAULT_RESOURCES.map((resource) => ({
    resource,
    maxCount: quotaMap.get(resource)?.maxCount ?? 100,
    currentCount: quotaMap.get(resource)?.currentCount ?? 0,
    isUnlimited: quotaMap.get(resource)?.isUnlimited ?? false,
  }));

  return NextResponse.json({ quotas: result });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSuperAdminApi();
  if (error) return error;
  const { id: tenantId } = await params;

  const { resource, maxCount, isUnlimited } = (await req.json()) as {
    resource: string;
    maxCount: number;
    isUnlimited: boolean;
  };

  await prisma.tenantQuota.upsert({
    where: { tenantId_resource: { tenantId, resource } },
    create: { tenantId, resource, maxCount, isUnlimited },
    update: { maxCount, isUnlimited },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "UPDATE_QUOTA",
      module: "superadmin.tenant.quotas",
      recordId: tenantId,
      newData: JSON.stringify({ resource, maxCount, isUnlimited }),
    },
  });

  return NextResponse.json({ success: true });
}
