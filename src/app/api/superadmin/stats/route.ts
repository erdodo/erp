import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;

  const [tenantCount, userCount, activeModuleCount, auditCount] = await Promise.all([
    prisma.tenant.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isSuperAdmin: false } }),
    prisma.tenantModule.count({ where: { isActive: true } }),
    prisma.auditLog.count(),
  ]);

  const activeTenants = await prisma.tenant.count({ where: { deletedAt: null, isActive: true } });
  const recentTenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, slug: true, isActive: true, createdAt: true },
  });

  return NextResponse.json({
    tenantCount,
    activeTenants,
    userCount,
    activeModuleCount,
    auditCount,
    recentTenants,
  });
}
