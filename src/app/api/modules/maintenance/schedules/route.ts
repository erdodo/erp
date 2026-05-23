import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 25;

  const where = { tenantId, deletedAt: null, ...(type ? { type } : {}) };
  const [schedules, total] = await Promise.all([
    prisma.maintenanceSchedule.findMany({
      where, skip: (page-1)*limit, take: limit, orderBy: { nextDate: "asc" },
      include: { _count: { select: { records: true } } },
    }),
    prisma.maintenanceSchedule.count({ where }),
  ]);
  return NextResponse.json({ schedules, total, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as {
    name: string; type?: string; equipmentId?: string; frequency?: string;
    lastDate?: string; nextDate?: string; estimatedCost?: number; currency?: string; notes?: string;
  };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const s = await prisma.maintenanceSchedule.create({
    data: {
      tenantId,
      name:          body.name,
      type:          body.type          ?? "preventive",
      equipmentId:   body.equipmentId   ?? null,
      frequency:     body.frequency     ?? null,
      lastDate:      body.lastDate      ? new Date(body.lastDate)  : null,
      nextDate:      body.nextDate      ? new Date(body.nextDate)  : null,
      estimatedCost: body.estimatedCost ?? null,
      currency:      body.currency      ?? "TRY",
      notes:         body.notes         ?? null,
    },
  });
  return NextResponse.json(s, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { id: string; [key: string]: unknown };
  const { id, ...rest } = body;
  const s = await prisma.maintenanceSchedule.update({
    where: { id, tenantId },
    data: {
      ...(rest.name          !== undefined ? { name: rest.name as string } : {}),
      ...(rest.type          !== undefined ? { type: rest.type as string } : {}),
      ...(rest.frequency     !== undefined ? { frequency: rest.frequency as string | null } : {}),
      ...(rest.estimatedCost !== undefined ? { estimatedCost: rest.estimatedCost as number | null } : {}),
      ...(rest.isActive      !== undefined ? { isActive: rest.isActive as boolean } : {}),
      ...(rest.notes         !== undefined ? { notes: rest.notes as string | null } : {}),
      ...(rest.nextDate      !== undefined ? { nextDate: rest.nextDate ? new Date(rest.nextDate as string) : null } : {}),
      ...(rest.lastDate      !== undefined ? { lastDate: rest.lastDate ? new Date(rest.lastDate as string) : null } : {}),
    },
  });
  return NextResponse.json(s);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await req.json() as { id: string };
  await prisma.maintenanceSchedule.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
