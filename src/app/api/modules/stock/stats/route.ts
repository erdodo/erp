import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const [total, lowStock, warehouses, categories] = await Promise.all([
    prisma.stockItem.count({ where: { tenantId, deletedAt: null, isActive: true } }),
    prisma.stockItem.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true, name: true, quantity: true, minQuantity: true, unit: true, warehouse: { select: { name: true } } },
    }),
    prisma.warehouse.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      include: { _count: { select: { stockItems: { where: { deletedAt: null } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.stockItem.groupBy({
      by: ["category"], where: { tenantId, deletedAt: null, isActive: true }, _count: { _all: true },
    }),
  ]);

  const lowStockItems = lowStock.filter((i) => i.quantity <= i.minQuantity);

  return NextResponse.json({
    total,
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.slice(0, 10),
    warehouses,
    categories,
  });
}
