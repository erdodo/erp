import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(_req: NextRequest) {
  const guard = await requireModule("rental");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const properties = await prisma.rentalProperty.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { contracts: true } } },
  });
  return NextResponse.json({ properties });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("rental");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { name: string; type?: string; address?: string; area?: number; storeId?: string };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const prop = await prisma.rentalProperty.create({
    data: { tenantId, name: body.name, type: body.type ?? "office", address: body.address ?? null, area: body.area ?? null, storeId: body.storeId ?? null },
  });
  await auditLog(guard.session, "create", "rental", prop.id, { newData: body as Record<string, unknown>, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(prop, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule("rental");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { id: string; isActive?: boolean; name?: string; address?: string; area?: number };
  const { id, ...rest } = body;
  const prop = await prisma.rentalProperty.update({ where: { id, tenantId }, data: rest });
  await auditLog(guard.session, "update", "rental", id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json(prop);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireModule("rental");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await req.json() as { id: string };
  await prisma.rentalProperty.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  await auditLog(guard.session, "delete", "rental", id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json({ ok: true });
}
