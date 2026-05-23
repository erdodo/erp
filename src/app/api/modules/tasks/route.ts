import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { searchParams } = req.nextUrl;
  const status    = searchParams.get("status")    ?? "";
  const priority  = searchParams.get("priority")  ?? "";
  const projectId = searchParams.get("projectId") ?? "";
  const where = {
    tenantId, deletedAt: null, parentId: null,
    ...(status    ? { status }    : {}),
    ...(priority  ? { priority }  : {}),
    ...(projectId ? { projectId } : {}),
  };
  const tasks = await prisma.task.findMany({
    where, orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      project:  { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      _count:   { select: { subtasks: { where: { deletedAt: null } }, comments: { where: { deletedAt: null } } } },
    },
  });
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { title: string; description?: string; status?: string; priority?: string; projectId?: string; assignedTo?: string; dueDate?: string; estimatedHours?: number };
  if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const t = await prisma.task.create({
    data: { tenantId, title: body.title, description: body.description ?? null, status: body.status ?? "todo",
      priority: body.priority ?? "medium", projectId: body.projectId ?? null, assignedTo: body.assignedTo ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null, estimatedHours: body.estimatedHours ?? null,
      createdBy: session.user.id },
    include: { project: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
  });
  return NextResponse.json(t, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { id: string; [key: string]: unknown };
  const { id, ...rest } = body;
  const t = await prisma.task.update({
    where: { id, tenantId },
    data: {
      ...(rest.title       !== undefined ? { title: rest.title as string } : {}),
      ...(rest.status      !== undefined ? { status: rest.status as string } : {}),
      ...(rest.priority    !== undefined ? { priority: rest.priority as string } : {}),
      ...(rest.description !== undefined ? { description: rest.description as string | null } : {}),
      ...(rest.assignedTo  !== undefined ? { assignedTo: rest.assignedTo as string | null } : {}),
      ...(rest.actualHours !== undefined ? { actualHours: rest.actualHours as number | null } : {}),
    },
  });
  return NextResponse.json(t);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await req.json() as { id: string };
  await prisma.task.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
