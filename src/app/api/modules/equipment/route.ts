import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit  = 25;

  const where = {
    tenantId, deletedAt: null,
    ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {}),
    ...(status ? { status } : {}),
  };

  const [equipment, total] = await Promise.all([
    prisma.equipment.findMany({
      where, skip: (page-1)*limit, take: limit, orderBy: { name: "asc" },
      include: { _count: { select: { maintenanceRecords: { where: { deletedAt: null } } } } },
    }),
    prisma.equipment.count({ where }),
  ]);

  return NextResponse.json({ equipment, total, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as {
    code: string; name: string; brand?: string; model?: string; serialNo?: string;
    location?: string; status?: string; purchaseDate?: string; purchasePrice?: number;
    currency?: string; warrantyUntil?: string; notes?: string;
  };
  if (!body.code || !body.name) return NextResponse.json({ error: "code and name required" }, { status: 400 });

  const eq = await prisma.equipment.create({
    data: {
      tenantId,
      code:          body.code,
      name:          body.name,
      brand:         body.brand         ?? null,
      model:         body.model         ?? null,
      serialNo:      body.serialNo      ?? null,
      location:      body.location      ?? null,
      status:        body.status        ?? "active",
      purchaseDate:  body.purchaseDate  ? new Date(body.purchaseDate)  : null,
      purchasePrice: body.purchasePrice ?? null,
      currency:      body.currency      ?? "TRY",
      warrantyUntil: body.warrantyUntil ? new Date(body.warrantyUntil) : null,
      notes:         body.notes         ?? null,
    },
    include: { _count: { select: { maintenanceRecords: true } } },
  });
  return NextResponse.json(eq, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { id: string; [key: string]: unknown };
  const { id, ...rest } = body;

  const eq = await prisma.equipment.update({
    where: { id, tenantId },
    data: {
      ...(rest.code          !== undefined ? { code:  rest.code  as string } : {}),
      ...(rest.name          !== undefined ? { name:  rest.name  as string } : {}),
      ...(rest.brand         !== undefined ? { brand: rest.brand as string | null } : {}),
      ...(rest.model         !== undefined ? { model: rest.model as string | null } : {}),
      ...(rest.serialNo      !== undefined ? { serialNo: rest.serialNo as string | null } : {}),
      ...(rest.location      !== undefined ? { location: rest.location as string | null } : {}),
      ...(rest.status        !== undefined ? { status: rest.status as string } : {}),
      ...(rest.purchasePrice !== undefined ? { purchasePrice: rest.purchasePrice as number | null } : {}),
      ...(rest.currency      !== undefined ? { currency: rest.currency as string } : {}),
      ...(rest.notes         !== undefined ? { notes: rest.notes as string | null } : {}),
      ...(rest.purchaseDate  !== undefined ? { purchaseDate: rest.purchaseDate ? new Date(rest.purchaseDate as string) : null } : {}),
      ...(rest.warrantyUntil !== undefined ? { warrantyUntil: rest.warrantyUntil ? new Date(rest.warrantyUntil as string) : null } : {}),
    },
  });
  return NextResponse.json(eq);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await req.json() as { id: string };
  await prisma.equipment.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
