import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const body = await req.json() as Partial<{
    title: string; location: string; auditor: string;
    sort: number; setInOrder: number; shine: number; standardize: number; sustain: number;
    notes: string; actions: string;
  }>;

  const existing = await prisma.fiveSAudit.findFirst({ where: { id, tenantId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const s = { sort: existing.sort, setInOrder: existing.setInOrder, shine: existing.shine, standardize: existing.standardize, sustain: existing.sustain, ...body };
  const totalScore = (s.sort + s.setInOrder + s.shine + s.standardize + s.sustain) / 5;

  const audit = await prisma.fiveSAudit.update({
    where: { id, tenantId },
    data: { ...body, totalScore: Math.round(totalScore * 100) / 100 },
  });
  return NextResponse.json(audit);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  await prisma.fiveSAudit.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
