import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(_req: NextRequest) {
  const guard = await requireModule("retail");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const stores = await prisma.retailStore.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { transactions: true } } },
  });
  return NextResponse.json({ stores });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("retail");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { name: string; address?: string; phone?: string; managerId?: string };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const store = await prisma.retailStore.create({
    data: { tenantId, name: body.name, address: body.address ?? null, phone: body.phone ?? null, managerId: body.managerId ?? null },
  });
  await auditLog(guard.session, "create", "retail", store.id, { newData: body as Record<string, unknown>, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(store, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule("retail");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { id: string; isActive?: boolean; name?: string; address?: string; phone?: string };
  const { id, ...rest } = body;
  const store = await prisma.retailStore.update({ where: { id, tenantId }, data: rest });
  await auditLog(guard.session, "update", "retail", id, { newData: rest as Record<string, unknown>, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(store);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireModule("retail");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await req.json() as { id: string };
  await prisma.retailStore.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  await auditLog(guard.session, "delete", "retail", id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json({ ok: true });
}
