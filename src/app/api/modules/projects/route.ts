import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const where  = { tenantId, deletedAt: null, ...(status ? { status } : {}) };
  const [projects, total] = await Promise.all([
    prisma.project.findMany({ where, orderBy: { createdAt: "desc" },
      include: { _count: { select: { tasks: { where: { deletedAt: null } }, milestones: true } } } }),
    prisma.project.count({ where }),
  ]);
  return NextResponse.json({ projects, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { name: string; description?: string; budget?: number; currency?: string; startDate?: string; endDate?: string };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const p = await prisma.project.create({
    data: { tenantId, name: body.name, description: body.description ?? null, budget: body.budget ?? null, currency: body.currency ?? "TRY",
      startDate: body.startDate ? new Date(body.startDate) : null, endDate: body.endDate ? new Date(body.endDate) : null },
  });
  return NextResponse.json(p, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { id: string; [key: string]: unknown };
  const { id, ...rest } = body;
  const p = await prisma.project.update({
    where: { id, tenantId },
    data: {
      ...(rest.name        !== undefined ? { name: rest.name as string } : {}),
      ...(rest.status      !== undefined ? { status: rest.status as string } : {}),
      ...(rest.progress    !== undefined ? { progress: rest.progress as number } : {}),
      ...(rest.description !== undefined ? { description: rest.description as string | null } : {}),
      ...(rest.budget      !== undefined ? { budget: rest.budget as number | null } : {}),
    },
  });
  return NextResponse.json(p);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await req.json() as { id: string };
  await prisma.project.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
