import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as { taskId: string; body: string };
  if (!body.taskId || !body.body) {
    return NextResponse.json({ error: "taskId and body required" }, { status: 400 });
  }

  try {
    // Verify task belongs to tenant
    const task = await prisma.task.findFirst({
      where: { id: body.taskId, tenantId }
    });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const comment = await prisma.taskComment.create({
      data: {
        taskId: body.taskId,
        userId: session.user.id,
        body: body.body
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    });

    // If task belongs to a project, create project activity log
    if (task.projectId) {
      await prisma.projectActivity.create({
        data: {
          projectId: task.projectId,
          taskId: task.id,
          userId: session.user.id,
          action: "comment_added",
          details: `${session.user.name}, "${task.title}" görevine yeni bir yorum ekledi.`
        }
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Yorum kaydedilirken hata oluştu" }, { status: 500 });
  }
}
