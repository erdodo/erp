import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const where  = { tenantId, deletedAt: null, ...(status ? { status } : {}) };
  
  const [routes, vehicles, employees] = await Promise.all([
    prisma.serviceRoute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, name: true } },
      },
    }),
    prisma.vehicle.findMany({
      where: { tenantId, deletedAt: null, status: "active" },
      select: { id: true, plate: true, brand: true, model: true },
    }),
    prisma.employee.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  return NextResponse.json({ routes, vehicles, employees });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  
  const body = await req.json() as {
    name: string;
    vehicleId?: string;
    driverId?: string;
    stops?: string;
    path?: string;
    passengerIds?: string;
    distance?: number;
    notes?: string;
  };
  
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const r = await prisma.serviceRoute.create({
    data: {
      tenantId,
      name: body.name,
      vehicleId: body.vehicleId ?? null,
      driverId: body.driverId ?? null,
      stops: body.stops ?? null,
      path: body.path ?? null,
      passengerIds: body.passengerIds ?? null,
      distance: body.distance ? Number(body.distance) : null,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(r, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  
  const body = await req.json() as {
    id: string;
    name?: string;
    status?: string;
    vehicleId?: string | null;
    driverId?: string | null;
    stops?: string | null;
    path?: string | null;
    passengerIds?: string | null;
    distance?: number | null;
    notes?: string | null;
  };

  const r = await prisma.serviceRoute.update({
    where: { id: body.id, tenantId },
    data: {
      ...(body.name         !== undefined ? { name: body.name } : {}),
      ...(body.status       !== undefined ? { status: body.status } : {}),
      ...(body.vehicleId    !== undefined ? { vehicleId: body.vehicleId } : {}),
      ...(body.driverId     !== undefined ? { driverId: body.driverId } : {}),
      ...(body.stops        !== undefined ? { stops: body.stops } : {}),
      ...(body.path         !== undefined ? { path: body.path } : {}),
      ...(body.passengerIds !== undefined ? { passengerIds: body.passengerIds } : {}),
      ...(body.distance     !== undefined ? { distance: body.distance ? Number(body.distance) : null } : {}),
      ...(body.notes        !== undefined ? { notes: body.notes } : {}),
      ...(body.status === "completed"  ? { completedAt: new Date() } : {}),
      ...(body.status === "active"     ? { startedAt: new Date() }   : {}),
    },
  });

  return NextResponse.json(r);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const r = await prisma.serviceRoute.update({
    where: { id, tenantId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true, r });
}
