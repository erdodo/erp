import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  
  const body = await req.json() as { projectId: string; body: string };
  if (!body.projectId || !body.body) {
    return NextResponse.json({ error: "projectId and body required" }, { status: 400 });
  }

  try {
    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, tenantId }
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const comment = await prisma.projectComment.create({
      data: {
        projectId: body.projectId,
        userId: session.user.id,
        body: body.body
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    });

    // Create activity log
    await prisma.projectActivity.create({
      data: {
        projectId: body.projectId,
        userId: session.user.id,
        action: "project_comment_added",
        details: `${session.user.name} projeye yeni bir yorum yazdı.`
      }
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Yorum kaydedilirken hata oluştu" }, { status: 500 });
  }
}
