import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requireModule("subscriptions");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 25;
  const where = { tenantId, deletedAt: null, ...(status ? { status } : {}) };
  const [subs, total] = await Promise.all([
    prisma.subscription.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true } } } }),
    prisma.subscription.count({ where }),
  ]);
  return NextResponse.json({ subscriptions: subs, total, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("subscriptions");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { name: string; plan?: string; amount: number; currency?: string; billingCycle?: string; customerId?: string; storeId?: string; startDate?: string; notes?: string };
  if (!body.name || !body.amount) return NextResponse.json({ error: "name and amount required" }, { status: 400 });
  const sub = await prisma.subscription.create({
    data: {
      tenantId, name: body.name, plan: body.plan ?? null, amount: body.amount,
      currency: body.currency ?? "TRY", billingCycle: body.billingCycle ?? "monthly",
      customerId: body.customerId ?? null, storeId: body.storeId ?? null,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      notes: body.notes ?? null,
    },
  });
  await auditLog(guard.session, "create", "subscriptions", sub.id, { newData: body as Record<string, unknown>, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(sub, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule("subscriptions");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { id: string; status?: string; notes?: string; nextRenewal?: string; endDate?: string };
  const { id, ...rest } = body;
  const sub = await prisma.subscription.update({ where: { id, tenantId }, data: {
    ...(rest.status !== undefined ? { status: rest.status } : {}),
    ...(rest.notes !== undefined ? { notes: rest.notes } : {}),
    ...(rest.nextRenewal ? { nextRenewal: new Date(rest.nextRenewal) } : {}),
    ...(rest.endDate ? { endDate: new Date(rest.endDate) } : {}),
  } });
  await auditLog(guard.session, "update", "subscriptions", id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json(sub);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireModule("subscriptions");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await req.json() as { id: string };
  await prisma.subscription.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  await auditLog(guard.session, "delete", "subscriptions", id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json({ ok: true });
}
