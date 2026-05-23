import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId, deletedAt: null },
    include: { _count: { select: { stockItems: { where: { deletedAt: null } } } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ warehouses });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { name: string; location?: string };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const w = await prisma.warehouse.create({ data: { tenantId, name: body.name, location: body.location ?? null } });
  return NextResponse.json(w, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { id: string; name?: string; location?: string; isActive?: boolean };
  const w = await prisma.warehouse.update({
    where: { id: body.id, tenantId },
    data: {
      ...(body.name     !== undefined ? { name: body.name } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });
  return NextResponse.json(w);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await req.json() as { id: string };
  await prisma.warehouse.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
