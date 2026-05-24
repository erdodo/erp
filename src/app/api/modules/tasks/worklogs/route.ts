import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as {
    taskId: string; hours: number; description?: string;
    loggedAt?: string; // allow custom date
  };

  if (!body.taskId || body.hours === undefined) {
    return NextResponse.json({ error: "taskId and hours required" }, { status: 400 });
  }

  const hours = Number(body.hours);
  if (isNaN(hours) || hours <= 0) {
    return NextResponse.json({ error: "hours must be a positive number" }, { status: 400 });
  }

  try {
    const task = await prisma.task.findFirst({ where: { id: body.taskId, tenantId } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const log = await prisma.taskWorkLog.create({
      data: {
        taskId: body.taskId,
        userId: session.user.id,
        hours,
        description: body.description ?? null,
        loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date()
      },
      include: { user: { select: { id: true, name: true } } }
    });

    // Update actualHours in Task
    const newActual = (task.actualHours ?? 0) + hours;
    await prisma.task.update({ where: { id: body.taskId }, data: { actualHours: newActual } });

    if (task.projectId) {
      await prisma.projectActivity.create({
        data: {
          projectId: task.projectId,
          taskId: task.id,
          userId: session.user.id,
          action: "worklog_added",
          details: `${session.user.name}, "${task.title}" görevi için ${hours}s çalışma süresi kaydetti.`
        }
      });
    }

    return NextResponse.json(log, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Çalışma kaydı kaydedilirken hata oluştu" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  
  const { searchParams } = req.nextUrl;
  const projectId = searchParams.get("projectId") ?? "";
  const userId    = searchParams.get("userId") ?? "";
  const from      = searchParams.get("from") ?? "";
  const to        = searchParams.get("to") ?? "";

  try {
    // Find tasks for this project
    const taskWhere = projectId ? { projectId, tenantId, deletedAt: null } : { tenantId, deletedAt: null };
    const tasks = await prisma.task.findMany({ where: taskWhere, select: { id: true } });
    const taskIds = tasks.map((t) => t.id);

    const logs = await prisma.taskWorkLog.findMany({
      where: {
        taskId: { in: taskIds },
        ...(userId ? { userId } : {}),
        ...(from ? { loggedAt: { gte: new Date(from) } } : {}),
        ...(to ? { loggedAt: { lte: new Date(to) } } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, projectId: true } }
      },
      orderBy: { loggedAt: "desc" }
    });

    return NextResponse.json({ logs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Tempo kayıtları yüklenirken hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    // Fetch log to deduct from actualHours
    const log = await prisma.taskWorkLog.findFirst({
      where: { id },
      include: { task: { select: { actualHours: true } } }
    });

    if (log) {
      await prisma.task.update({
        where: { id: log.taskId },
        data: { actualHours: Math.max(0, (log.task.actualHours ?? 0) - log.hours) }
      });
      await prisma.taskWorkLog.delete({ where: { id } });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Tempo kaydı silinirken hata oluştu" }, { status: 500 });
  }
}
