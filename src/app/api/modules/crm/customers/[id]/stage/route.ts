import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const StageSchema = z.object({
  pipelineStage: z.enum(["lead", "prospect", "proposal", "negotiation", "won", "lost"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: session.user.tenantId!, deletedAt: null },
  });
  if (!customer) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = StageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const updated = await prisma.customer.update({
    where: { id },
    data:  { pipelineStage: parsed.data.pipelineStage },
  });

  // Auto-log a stage change interaction
  await prisma.customerInteraction.create({
    data: {
      customerId: id,
      userId:     session.user.id,
      type:       "note",
      subject:    `Aşama değiştirildi: ${customer.pipelineStage} → ${parsed.data.pipelineStage}`,
      date:       new Date(),
    },
  });

  return NextResponse.json(updated);
}
