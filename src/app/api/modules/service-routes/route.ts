import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const where  = { tenantId, deletedAt: null, ...(status ? { status } : {}) };
  const routes = await prisma.serviceRoute.findMany({ where, orderBy: { createdAt: "desc" },
    include: { vehicle: { select: { id: true, plate: true } } } });
  const vehicles = await prisma.vehicle.findMany({ where: { tenantId, deletedAt: null, status: "active" }, select: { id: true, plate: true, brand: true, model: true } });
  return NextResponse.json({ routes, vehicles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { name: string; vehicleId?: string; stops?: string; notes?: string };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const r = await prisma.serviceRoute.create({ data: { tenantId, name: body.name, vehicleId: body.vehicleId ?? null, stops: body.stops ?? null, notes: body.notes ?? null } });
  return NextResponse.json(r, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { id: string; status?: string; vehicleId?: string; notes?: string };
  const r = await prisma.serviceRoute.update({ where: { id: body.id, tenantId }, data: {
    ...(body.status    !== undefined ? { status: body.status } : {}),
    ...(body.vehicleId !== undefined ? { vehicleId: body.vehicleId ?? null } : {}),
    ...(body.notes     !== undefined ? { notes: body.notes }  : {}),
    ...(body.status === "completed"  ? { completedAt: new Date() } : {}),
    ...(body.status === "active"     ? { startedAt: new Date() }   : {}),
  } });
  return NextResponse.json(r);
}
