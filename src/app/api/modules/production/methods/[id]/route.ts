import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const method = await prisma.productionMethod.findFirst({ where: { id, tenantId, deletedAt: null } });
  if (!method) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(method);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const body = await req.json() as {
    name?: string; version?: string; description?: string;
    steps?: string; materials?: string; equipment?: string;
    status?: string; approve?: boolean;
  };

  const data: Record<string, unknown> = {};
  if (body.name        !== undefined) data.name        = body.name;
  if (body.version     !== undefined) data.version     = body.version;
  if (body.description !== undefined) data.description = body.description;
  if (body.steps       !== undefined) data.steps       = body.steps;
  if (body.materials   !== undefined) data.materials   = body.materials;
  if (body.equipment   !== undefined) data.equipment   = body.equipment;
  if (body.status      !== undefined) data.status      = body.status;
  if (body.approve) {
    data.status     = "active";
    data.approvedAt = new Date();
    data.approvedBy = session.user.name ?? session.user.email;
  }

  const method = await prisma.productionMethod.update({ where: { id, tenantId }, data });
  return NextResponse.json(method);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  await prisma.productionMethod.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
