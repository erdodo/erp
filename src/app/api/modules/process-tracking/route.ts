import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { searchParams } = req.nextUrl;
  const status   = searchParams.get("status")   ?? "";
  const priority = searchParams.get("priority") ?? "";
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit    = 25;
  const where = { tenantId, deletedAt: null, ...(status ? { status } : {}), ...(priority ? { priority } : {}) };
  const [flows, total] = await Promise.all([
    prisma.processFlow.findMany({ where, skip: (page-1)*limit, take: limit, orderBy: { createdAt: "desc" },
      include: { _count: { select: { comments: { where: { deletedAt: null } } } } } }),
    prisma.processFlow.count({ where }),
  ]);
  return NextResponse.json({ flows, total, pages: Math.ceil(total/limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { title: string; description?: string; fromDept?: string; toDept?: string; priority?: string; slaHours?: number; dueAt?: string };
  if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const f = await prisma.processFlow.create({
    data: { tenantId, title: body.title, description: body.description ?? null, fromDept: body.fromDept ?? null,
      toDept: body.toDept ?? null, priority: body.priority ?? "medium", slaHours: body.slaHours ?? null,
      dueAt: body.dueAt ? new Date(body.dueAt) : null },
  });
  return NextResponse.json(f, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { id: string; [key: string]: unknown };
  const { id, ...rest } = body;
  const f = await prisma.processFlow.update({
    where: { id, tenantId },
    data: {
      ...(rest.status      !== undefined ? { status: rest.status as string } : {}),
      ...(rest.priority    !== undefined ? { priority: rest.priority as string } : {}),
      ...(rest.description !== undefined ? { description: rest.description as string | null } : {}),
      ...(rest.status === "completed"    ? { completedAt: new Date() } : {}),
    },
  });
  return NextResponse.json(f);
}
