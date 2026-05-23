import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const standards = await prisma.qualityStandard.findMany({
    where: { tenantId, deletedAt: null }, orderBy: { name: "asc" },
  });
  return NextResponse.json({ standards });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { name: string; description?: string; maxPpm?: number };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const s = await prisma.qualityStandard.create({
    data: { tenantId, name: body.name, description: body.description ?? null, maxPpm: body.maxPpm ?? 1000 },
  });
  return NextResponse.json(s, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { id: string; name?: string; description?: string; maxPpm?: number; isActive?: boolean };
  const s = await prisma.qualityStandard.update({
    where: { id: body.id, tenantId },
    data: {
      ...(body.name        !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.maxPpm      !== undefined ? { maxPpm: body.maxPpm } : {}),
      ...(body.isActive    !== undefined ? { isActive: body.isActive } : {}),
    },
  });
  return NextResponse.json(s);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await req.json() as { id: string };
  await prisma.qualityStandard.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
