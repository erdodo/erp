import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const [total, byStatus, lines, recent] = await Promise.all([
    prisma.productionOrder.count({ where: { tenantId, deletedAt: null } }),
    prisma.productionOrder.groupBy({
      by: ["status"],
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.productionLine.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      include: { _count: { select: { orders: { where: { status: "in_progress" } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.productionOrder.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { line: { select: { name: true } } },
    }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));

  // Simple OEE estimate: completed / (total - planned) * 100
  const executed = total - (statusMap["planned"] ?? 0);
  const completed = statusMap["completed"] ?? 0;
  const oee = executed > 0 ? Math.round((completed / executed) * 100) : 0;

  return NextResponse.json({ total, byStatus: statusMap, oee, lines, recent });
}
