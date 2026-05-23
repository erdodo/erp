import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const equipmentId  = searchParams.get("equipmentId")  ?? "";
  const scheduleId   = searchParams.get("scheduleId")   ?? "";
  const page         = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit        = 25;

  const where = {
    deletedAt: null,
    ...(equipmentId ? { equipmentId } : {}),
    ...(scheduleId  ? { scheduleId }  : {}),
  };

  const [records, total] = await Promise.all([
    prisma.maintenanceRecord.findMany({
      where, skip: (page-1)*limit, take: limit, orderBy: { completedAt: "desc" },
      include: {
        schedule:  { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.maintenanceRecord.count({ where }),
  ]);

  const totalCost = records.reduce((s, r) => s + (r.cost ?? 0), 0);
  return NextResponse.json({ records, total, pages: Math.ceil(total / limit), totalCost });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    description: string; type?: string; scheduleId?: string; equipmentId?: string;
    technician?: string; cost?: number; currency?: string; duration?: number; completedAt?: string;
  };
  if (!body.description) return NextResponse.json({ error: "description required" }, { status: 400 });

  const record = await prisma.maintenanceRecord.create({
    data: {
      type:        body.type        ?? "preventive",
      description: body.description,
      scheduleId:  body.scheduleId  ?? null,
      equipmentId: body.equipmentId ?? null,
      technician:  body.technician  ?? null,
      cost:        body.cost        ?? null,
      currency:    body.currency    ?? "TRY",
      duration:    body.duration    ?? null,
      completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
    },
    include: {
      schedule:  { select: { id: true, name: true } },
      equipment: { select: { id: true, name: true, code: true } },
    },
  });

  if (body.scheduleId) {
    await prisma.maintenanceSchedule.update({
      where: { id: body.scheduleId },
      data:  { lastDate: record.completedAt },
    });
  }

  return NextResponse.json(record, { status: 201 });
}
