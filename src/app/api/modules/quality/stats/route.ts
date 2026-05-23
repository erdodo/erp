import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [total, recent, byType, byResult] = await Promise.all([
    prisma.qualityCheck.count({ where: { tenantId, deletedAt: null } }),
    prisma.qualityCheck.findMany({
      where: { tenantId, deletedAt: null, checkedAt: { gte: thirtyDaysAgo } },
      select: { ppm: true, result: true, quantity: true, defectCount: true, type: true, checkedAt: true },
      orderBy: { checkedAt: "asc" },
    }),
    prisma.qualityCheck.groupBy({
      by: ["type"], where: { tenantId, deletedAt: null }, _count: { _all: true }, _avg: { ppm: true },
    }),
    prisma.qualityCheck.groupBy({
      by: ["result"], where: { tenantId, deletedAt: null }, _count: { _all: true },
    }),
  ]);

  const avgPpm     = recent.length ? recent.reduce((s, c) => s + c.ppm, 0) / recent.length : 0;
  const passRate   = total ? (byResult.find((r) => r.result === "pass")?._count._all ?? 0) / total * 100 : 0;
  const totalQty   = recent.reduce((s, c) => s + c.quantity, 0);
  const totalDef   = recent.reduce((s, c) => s + c.defectCount, 0);
  const overallPpm = totalQty > 0 ? (totalDef / totalQty) * 1_000_000 : 0;

  return NextResponse.json({ total, avgPpm, overallPpm, passRate, byType, byResult, trend: recent });
}
