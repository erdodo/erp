import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requireModule("iot");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { searchParams } = req.nextUrl;
  const deviceId = searchParams.get("deviceId");
  if (deviceId) {
    const readings = await prisma.ioTReading.findMany({ where: { deviceId }, orderBy: { recordedAt: "desc" }, take: 100 });
    return NextResponse.json({ readings });
  }
  const devices = await prisma.ioTDevice.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: "desc" },
    include: { _count: { select: { readings: true } } } });
  return NextResponse.json({ devices });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("iot");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { name: string; type?: string; location?: string };
  const deviceId = `dev_${Date.now()}`;
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const d = await prisma.ioTDevice.create({ data: { tenantId, deviceId, name: body.name, type: body.type ?? "counter", location: body.location ?? null } });
  await auditLog(guard.session, "create", "iot", d.id, { newData: body as Record<string, unknown>, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(d, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule("iot");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { id: string; isActive?: boolean; location?: string; name?: string };
  const d = await prisma.ioTDevice.update({ where: { id: body.id, tenantId }, data: {
    ...(body.isActive  !== undefined ? { isActive: body.isActive }   : {}),
    ...(body.location  !== undefined ? { location: body.location }   : {}),
    ...(body.name      !== undefined ? { name: body.name }           : {}),
  } });
  await auditLog(guard.session, "update", "iot", body.id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json(d);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireModule("iot");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await req.json() as { id: string };
  await prisma.ioTDevice.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  await auditLog(guard.session, "delete", "iot", id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json({ ok: true });
}
