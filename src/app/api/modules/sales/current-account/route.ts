import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  // Aggregate invoiced orders per customer
  const rows = await prisma.sale.groupBy({
    by:    ["customerId", "currency"],
    where: { tenantId, deletedAt: null, customerId: { not: null } },
    _sum:  { totalAmount: true },
    _count: { _all: true },
  });

  // Count open (non-invoiced, non-cancelled) orders per customer
  const openRows = await prisma.sale.groupBy({
    by:    ["customerId"],
    where: { tenantId, deletedAt: null, customerId: { not: null }, status: { notIn: ["invoiced", "cancelled", "returned"] } },
    _count: { _all: true },
  });
  const openMap = Object.fromEntries(openRows.map((r) => [r.customerId!, r._count._all]));

  // Fetch customer names
  const customerIds = [...new Set(rows.map((r) => r.customerId!))];
  const customers   = customerIds.length
    ? await prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true, type: true } })
    : [];
  const cMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const cari = rows.map((r) => ({
    customerId:    r.customerId!,
    customerName:  cMap[r.customerId!]?.name ?? "—",
    customerType:  cMap[r.customerId!]?.type ?? "—",
    currency:      r.currency,
    totalOrders:   r._count._all,
    totalInvoiced: r._sum.totalAmount ?? 0,
    openOrders:    openMap[r.customerId!] ?? 0,
  }));

  return NextResponse.json(cari);
}
