import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const order = await prisma.productionOrder.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      line:   true,
      method: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const body = await req.json() as {
    productName?: string; quantity?: number; unit?: string;
    lineId?: string | null; methodId?: string | null;
    plannedStart?: string | null; plannedEnd?: string | null;
    notes?: string;
  };

  const order = await prisma.productionOrder.update({
    where: { id, tenantId },
    data: {
      ...(body.productName !== undefined ? { productName: body.productName } : {}),
      ...(body.quantity    !== undefined ? { quantity: body.quantity } : {}),
      ...(body.unit        !== undefined ? { unit: body.unit } : {}),
      ...(body.lineId      !== undefined ? { lineId: body.lineId }   : {}),
      ...(body.methodId    !== undefined ? { methodId: body.methodId } : {}),
      ...(body.plannedStart !== undefined ? { plannedStart: body.plannedStart ? new Date(body.plannedStart) : null } : {}),
      ...(body.plannedEnd   !== undefined ? { plannedEnd:   body.plannedEnd   ? new Date(body.plannedEnd)   : null } : {}),
      ...(body.notes       !== undefined ? { notes: body.notes } : {}),
    },
    include: { line: true, method: true },
  });
  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  await prisma.productionOrder.update({
    where: { id, tenantId },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
