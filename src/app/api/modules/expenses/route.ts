import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requireModule("expenses");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit  = 25;
  const where  = { tenantId, deletedAt: null, ...(status ? { status } : {}) };
  const [expenses, total, categories, totalAmount] = await Promise.all([
    prisma.expense.findMany({ where, skip: (page-1)*limit, take: limit, orderBy: { expenseDate: "desc" },
      include: { category: { select: { id: true, name: true } }, user: { select: { id: true, name: true } } } }),
    prisma.expense.count({ where }),
    prisma.expenseCategory.findMany({ where: { tenantId, deletedAt: null } }),
    prisma.expense.aggregate({ where: { ...where, status: "approved" }, _sum: { amount: true } }),
  ]);
  return NextResponse.json({ expenses, total, pages: Math.ceil(total/limit), categories, totalApproved: totalAmount._sum.amount ?? 0 });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("expenses");
  if (!guard.ok) return guard.res;
  const { tenantId, userId } = guard.session;
  const body = await req.json() as { title: string; amount: number; currency?: string; categoryId?: string; expenseDate?: string; notes?: string };
  if (!body.title || !body.amount) return NextResponse.json({ error: "title and amount required" }, { status: 400 });
  const e = await prisma.expense.create({ data: { tenantId, title: body.title, amount: body.amount, currency: body.currency ?? "TRY", categoryId: body.categoryId ?? null, userId, notes: body.notes ?? null, expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date() },
    include: { category: { select: { id: true, name: true } } } });
  await auditLog(guard.session, "create", "expenses", e.id, { newData: body as Record<string, unknown>, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(e, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule("expenses");
  if (!guard.ok) return guard.res;
  const { userId } = guard.session;
  const body = await req.json() as { id: string; status?: string; notes?: string };
  const e = await prisma.expense.update({ where: { id: body.id }, data: {
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.status === "approved" ? { approvedBy: userId, approvedAt: new Date() } : {}),
    ...(body.notes  !== undefined  ? { notes: body.notes }  : {}),
  } });
  await auditLog(guard.session, "update", "expenses", body.id, { newData: body as Record<string, unknown>, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(e);
}
