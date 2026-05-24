import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const tenantId = session.user.tenantId!;
  const { id: objectiveId } = await params;
  if (!objectiveId) return NextResponse.json({ error: "id gereklidir" }, { status: 400 });

  try {
    const body = await req.json() as {
      body: string;
    };

    if (!body.body || body.body.trim() === "") {
      return NextResponse.json({ error: "Yorum içeriği boş olamaz" }, { status: 400 });
    }

    const objective = await prisma.okrObjective.findFirst({
      where: { id: objectiveId, tenantId, deletedAt: null }
    });

    if (!objective) {
      return NextResponse.json({ error: "Hedef bulunamadı" }, { status: 404 });
    }

    const comment = await prisma.okrObjectiveComment.create({
      data: {
        objectiveId,
        userId,
        body: body.body
      },
      include: {
        user: { select: { id: true, name: true, image: true } }
      }
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    console.error("[OKR_OBJECTIVE_COMMENT_POST]", e);
    return NextResponse.json({ error: "Yorum eklenirken hata oluştu" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id: objectiveId } = await params;
  if (!objectiveId) return NextResponse.json({ error: "id gereklidir" }, { status: 400 });

  try {
    const comments = await prisma.okrObjectiveComment.findMany({
      where: { objectiveId },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ comments });
  } catch (e) {
    console.error("[OKR_OBJECTIVE_COMMENTS_GET]", e);
    return NextResponse.json({ error: "Yorumlar yüklenirken hata oluştu" }, { status: 500 });
  }
}
