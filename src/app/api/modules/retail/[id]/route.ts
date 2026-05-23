import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireModule("retail");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await params;

  const store = await prisma.retailStore.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!store) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const [transactions, employees, expenses, subscriptions, rentals] = await Promise.all([
    prisma.retailTransaction.findMany({
      where: { storeId: id, deletedAt: null },
      orderBy: { transactedAt: "desc" },
      take: 50,
    }),
    prisma.employee.findMany({
      where: { tenantId, storeId: id, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, position: true, email: true, phone: true, employeeNo: true },
    }),
    prisma.expense.findMany({
      where: { tenantId, storeId: id, deletedAt: null },
      orderBy: { expenseDate: "desc" },
      take: 20,
      select: { id: true, title: true, amount: true, currency: true, status: true, expenseDate: true },
    }),
    prisma.subscription.findMany({
      where: { tenantId, storeId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, plan: true, amount: true, currency: true, status: true, nextRenewal: true },
    }),
    prisma.rentalProperty.findMany({
      where: { tenantId, storeId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { contracts: { where: { isActive: true }, take: 1 } },
    }),
  ]);

  const revenue = transactions
    .filter((t) => t.type === "sale")
    .reduce((s, t) => s + t.totalAmount, 0);

  return NextResponse.json({ store, transactions, employees, expenses, subscriptions, rentals, revenue });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await requireModule("retail");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;
  const store = await prisma.retailStore.update({ where: { id, tenantId }, data: body });
  await auditLog(guard.session, "update", "retail", id, { newData: body, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(store);
}
