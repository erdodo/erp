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
  const periodId = (await params).id as string;

  try {
    const body = await req.json() as {
      body: string;
    };

    if (!body.body || body.body.trim() === "") {
      return NextResponse.json({ error: "Yorum içeriği boş olamaz" }, { status: 400 });
    }

    const period = await prisma.okrPeriod.findFirst({
      where: { id: periodId, tenantId, deletedAt: null }
    });

    if (!period) {
      return NextResponse.json({ error: "Dönem bulunamadı" }, { status: 404 });
    }

    const comment = await prisma.okrPeriodComment.create({
      data: {
        periodId,
        userId,
        body: body.body
      },
      include: {
        user: { select: { id: true, name: true, image: true } }
      }
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    console.error("[OKR_PERIOD_COMMENT_POST]", e);
    return NextResponse.json({ error: "Yorum eklenirken hata oluştu" }, { status: 500 });
  }
}
