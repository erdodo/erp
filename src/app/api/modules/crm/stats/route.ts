import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant yok" }, { status: 403 });

  const now    = new Date();
  const start  = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, newThisMonth, byStageRaw, wonThisMonth, lostThisMonth, recentInteractions] = await Promise.all([
    prisma.customer.count({ where: { tenantId, deletedAt: null } }),
    prisma.customer.count({ where: { tenantId, deletedAt: null, createdAt: { gte: start } } }),
    prisma.customer.groupBy({
      by: ["pipelineStage"],
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.customer.count({ where: { tenantId, deletedAt: null, pipelineStage: "won",  updatedAt: { gte: start } } }),
    prisma.customer.count({ where: { tenantId, deletedAt: null, pipelineStage: "lost", updatedAt: { gte: start } } }),
    prisma.customerInteraction.findMany({
      where: { customer: { tenantId, deletedAt: null }, deletedAt: null },
      orderBy: { date: "desc" },
      take: 10,
      select: {
        id: true, type: true, subject: true, date: true,
        customer: { select: { id: true, name: true } },
        userId: true,
      },
    }),
  ]);

  const byStage = Object.fromEntries(byStageRaw.map((r) => [r.pipelineStage, r._count._all]));

  return NextResponse.json({ total, newThisMonth, byStage, wonThisMonth, lostThisMonth, recentInteractions });
}
