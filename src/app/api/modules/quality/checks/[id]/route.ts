import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;
  const body = await req.json() as { result?: string; notes?: string; inspector?: string };
  const check = await prisma.qualityCheck.update({
    where: { id, tenantId },
    data: {
      ...(body.result    !== undefined ? { result: body.result } : {}),
      ...(body.notes     !== undefined ? { notes: body.notes } : {}),
      ...(body.inspector !== undefined ? { inspector: body.inspector } : {}),
    },
  });
  return NextResponse.json(check);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;
  await prisma.qualityCheck.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
