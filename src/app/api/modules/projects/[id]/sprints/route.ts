import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const projectId = (await params).id as string;

  try {
    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null } });
    if (!project) return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });

    const sprints = await prisma.projectSprint.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        tasks: {
          where: { deletedAt: null },
          include: {
            assignee: { select: { id: true, name: true } },
            labels: { include: { label: true } }
          }
        },
        _count: { select: { tasks: { where: { deletedAt: null } } } }
      }
    });

    return NextResponse.json({ sprints });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sprint yüklenirken hata oluştu" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const projectId = (await params).id as string;

  try {
    const project = await prisma.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null } });
    if (!project) return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });

    const body = await req.json() as {
      name: string; goal?: string; startDate?: string; endDate?: string; status?: string;
    };

    if (!body.name) return NextResponse.json({ error: "Sprint adı zorunludur" }, { status: 400 });

    const sprint = await prisma.projectSprint.create({
      data: {
        projectId,
        name: body.name,
        goal: body.goal || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: body.status || "planning"
      }
    });

    // Log activity
    await prisma.projectActivity.create({
      data: {
        projectId,
        userId: session.user.id,
        action: "sprint_created",
        details: `${session.user.name}, "${sprint.name}" sprintini oluşturdu.`
      }
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sprint oluşturulurken hata oluştu" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = (await params).id as string;

  try {
    const body = await req.json() as {
      id: string; name?: string; goal?: string; status?: string;
      startDate?: string | null; endDate?: string | null; velocity?: number;
    };

    if (!body.id) return NextResponse.json({ error: "id zorunludur" }, { status: 400 });

    const sprint = await prisma.projectSprint.update({
      where: { id: body.id, projectId },
      data: {
        ...(body.name      !== undefined ? { name: body.name } : {}),
        ...(body.goal      !== undefined ? { goal: body.goal || null } : {}),
        ...(body.status    !== undefined ? { status: body.status } : {}),
        ...(body.velocity  !== undefined ? { velocity: body.velocity } : {}),
        ...(body.startDate !== undefined ? { startDate: body.startDate ? new Date(body.startDate) : null } : {}),
        ...(body.endDate   !== undefined ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
      }
    });

    // If activating, set other sprints to planning
    if (body.status === "active") {
      await prisma.projectSprint.updateMany({
        where: { projectId, id: { not: body.id }, status: "active" },
        data: { status: "planning" }
      });
    }

    return NextResponse.json(sprint);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sprint güncellenirken hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = (await params).id as string;

  try {
    const body = await req.json() as { id: string };
    if (!body.id) return NextResponse.json({ error: "id zorunludur" }, { status: 400 });

    // Remove sprint from tasks first
    await prisma.task.updateMany({
      where: { sprintId: body.id, projectId },
      data: { sprintId: null }
    });

    await prisma.projectSprint.delete({ where: { id: body.id, projectId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sprint silinirken hata oluştu" }, { status: 500 });
  }
}
