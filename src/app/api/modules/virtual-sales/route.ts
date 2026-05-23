import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(_req: NextRequest) {
  const guard = await requireModule("virtual-sales");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const channels = await prisma.virtualSaleChannel.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });
  return NextResponse.json({ channels });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("virtual-sales");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { name: string; platform?: string; url?: string };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const ch = await prisma.virtualSaleChannel.create({
    data: { tenantId, name: body.name, platform: body.platform ?? null, url: body.url ?? null },
  });
  await auditLog(guard.session, "create", "virtual-sales", ch.id, { newData: body as Record<string, unknown>, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(ch, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule("virtual-sales");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { id: string; isActive?: boolean; name?: string; platform?: string; url?: string };
  const { id, ...rest } = body;
  const ch = await prisma.virtualSaleChannel.update({ where: { id, tenantId }, data: rest });
  await auditLog(guard.session, "update", "virtual-sales", id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json(ch);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireModule("virtual-sales");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await req.json() as { id: string };
  await prisma.virtualSaleChannel.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  await auditLog(guard.session, "delete", "virtual-sales", id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json({ ok: true });
}
