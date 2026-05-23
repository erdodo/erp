import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const lines = await prisma.productionLine.findMany({
    where: { tenantId, deletedAt: null },
    include: { _count: { select: { orders: { where: { deletedAt: null } } } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ lines });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as { name: string; description?: string };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const line = await prisma.productionLine.create({
    data: { tenantId, name: body.name, description: body.description ?? null },
  });
  return NextResponse.json(line, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as { id: string; name?: string; description?: string; isActive?: boolean };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const line = await prisma.productionLine.update({
    where: { id: body.id, tenantId },
    data: {
      ...(body.name        !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.isActive    !== undefined ? { isActive: body.isActive } : {}),
    },
  });
  return NextResponse.json(line);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const { id } = await req.json() as { id: string };
  await prisma.productionLine.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
