import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalOrders, monthOrders, pendingApproval, invoicedOrders,
    monthRevenue, prevRevenue, byStatus, recentOrders, lowStock,
  ] = await Promise.all([
    prisma.sale.count({ where: { tenantId, deletedAt: null } }),
    prisma.sale.count({ where: { tenantId, deletedAt: null, createdAt: { gte: start } } }),
    prisma.sale.count({ where: { tenantId, deletedAt: null, status: "pending_approval" } }),
    prisma.sale.count({ where: { tenantId, deletedAt: null, status: "invoiced" } }),
    prisma.sale.aggregate({
      where:   { tenantId, deletedAt: null, status: { in: ["invoiced", "delivered"] }, createdAt: { gte: start } },
      _sum:    { totalAmount: true },
    }),
    prisma.sale.aggregate({
      where:   { tenantId, deletedAt: null, status: { in: ["invoiced", "delivered"] }, createdAt: { gte: prev, lt: start } },
      _sum:    { totalAmount: true },
    }),
    prisma.sale.groupBy({
      by:    ["status"],
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.sale.findMany({
      where:   { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take:    8,
      select: {
        id: true, saleNo: true, status: true, totalAmount: true, currency: true, orderDate: true,
        customer: { select: { id: true, name: true } },
      },
    }),
    prisma.stockItem.findMany({
      where:   { tenantId, deletedAt: null, isActive: true },
      orderBy: { quantity: "asc" },
      take:    5,
      select:  { id: true, name: true, sku: true, quantity: true, minQuantity: true, unit: true },
    }),
  ]);

  const mrv = monthRevenue._sum.totalAmount ?? 0;
  const prv = prevRevenue._sum.totalAmount ?? 0;
  const revGrowth = prv > 0 ? Math.round(((mrv - prv) / prv) * 100) : 0;

  return NextResponse.json({
    totalOrders, monthOrders, pendingApproval, invoicedOrders,
    monthRevenue: mrv, revGrowth, byStatus, recentOrders,
    lowStock: lowStock.filter((s) => s.quantity <= s.minQuantity),
  });
}
