import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requireModule("fleet");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const where = { tenantId, deletedAt: null, ...(status ? { status } : {}) };

  const [vehicles, employees] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        driver: { select: { id: true, name: true } },
        _count: {
          select: {
            fuelRecords: { where: { deletedAt: null } },
            expenses: { where: { deletedAt: null } },
          },
        },
      },
    }),
    prisma.employee.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return NextResponse.json({ vehicles, employees });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("fleet");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as {
    plate: string;
    brand?: string;
    model?: string;
    year?: number;
    fuelType?: string;
    notes?: string;
    insuranceExpiry?: string;
    inspectionExpiry?: string;
    driverId?: string;
  };

  if (!body.plate) return NextResponse.json({ error: "plate required" }, { status: 400 });

  const v = await prisma.vehicle.create({
    data: {
      tenantId,
      plate: body.plate,
      brand: body.brand ?? null,
      model: body.model ?? null,
      year: body.year ?? null,
      fuelType: body.fuelType ?? "gasoline",
      notes: body.notes ?? null,
      insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : null,
      inspectionExpiry: body.inspectionExpiry ? new Date(body.inspectionExpiry) : null,
      driverId: body.driverId ?? null,
    },
    include: {
      driver: { select: { id: true, name: true } },
    },
  });

  await auditLog(guard.session, "create", "fleet", v.id, {
    newData: body as Record<string, unknown>,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json(v, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule("fleet");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { id: string; [key: string]: unknown };
  const { id, ...rest } = body;

  const v = await prisma.vehicle.update({
    where: { id, tenantId },
    data: {
      ...(rest.plate !== undefined ? { plate: rest.plate as string } : {}),
      ...(rest.status !== undefined ? { status: rest.status as string } : {}),
      ...(rest.brand !== undefined ? { brand: rest.brand as string | null } : {}),
      ...(rest.model !== undefined ? { model: rest.model as string | null } : {}),
      ...(rest.year !== undefined ? { year: rest.year ? Number(rest.year) : null } : {}),
      ...(rest.fuelType !== undefined ? { fuelType: rest.fuelType as string } : {}),
      ...(rest.insuranceExpiry !== undefined ? { insuranceExpiry: rest.insuranceExpiry ? new Date(rest.insuranceExpiry as string) : null } : {}),
      ...(rest.inspectionExpiry !== undefined ? { inspectionExpiry: rest.inspectionExpiry ? new Date(rest.inspectionExpiry as string) : null } : {}),
      ...(rest.notes !== undefined ? { notes: rest.notes as string | null } : {}),
      ...(rest.driverId !== undefined ? { driverId: rest.driverId as string | null } : {}),
    },
    include: {
      driver: { select: { id: true, name: true } },
    },
  });

  await auditLog(guard.session, "update", "fleet", id, {
    newData: rest,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json(v);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireModule("fleet");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await req.json() as { id: string };
  await prisma.vehicle.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  await auditLog(guard.session, "delete", "fleet", id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json({ ok: true });
}

