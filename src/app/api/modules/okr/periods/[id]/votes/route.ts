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
      score: number; // 1-5
      comment?: string;
    };

    if (!body.score || body.score < 1 || body.score > 5) {
      return NextResponse.json({ error: "Oylama skoru 1-5 arasında olmalıdır." }, { status: 400 });
    }

    // Check if period exists and voting is active
    const period = await prisma.okrPeriod.findFirst({
      where: { id: periodId, tenantId, deletedAt: null }
    });

    if (!period) {
      return NextResponse.json({ error: "Dönem bulunamadı" }, { status: 404 });
    }

    if (!period.votingActive) {
      return NextResponse.json({ error: "Bu dönem için oylamalar kapatılmıştır." }, { status: 400 });
    }

    // Upsert the vote (user can only have 1 vote per period)
    const existingVote = await prisma.okrPeriodVote.findFirst({
      where: { periodId, userId }
    });

    let vote;
    if (existingVote) {
      vote = await prisma.okrPeriodVote.update({
        where: { id: existingVote.id },
        data: {
          score: Number(body.score),
          comment: body.comment || null
        }
      });
    } else {
      vote = await prisma.okrPeriodVote.create({
        data: {
          periodId,
          userId,
          score: Number(body.score),
          comment: body.comment || null
        }
      });
    }

    return NextResponse.json(vote, { status: existingVote ? 200 : 210 });
  } catch (e) {
    console.error("[OKR_PERIOD_VOTE_POST]", e);
    return NextResponse.json({ error: "Oylama yapılırken hata oluştu" }, { status: 500 });
  }
}
