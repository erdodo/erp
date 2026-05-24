import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function calculateProgress(initial: number, current: number, target: number): number {
  if (target === initial) return 100;
  const progress = ((current - initial) / (target - initial)) * 100;
  return Math.min(100, Math.max(0, Math.round(progress * 10) / 10));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  try {
    const body = await req.json() as {
      objectiveId: string;
      title: string;
      description?: string;
      initialValue: number;
      targetValue: number;
      unit: string;
      ownerId?: string;
    };

    if (!body.objectiveId || !body.title || body.initialValue === undefined || body.targetValue === undefined) {
      return NextResponse.json({ error: "Eksik parametreler girdiniz." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const kr = await tx.okrKeyResult.create({
        data: {
          tenantId,
          objectiveId: body.objectiveId,
          title: body.title,
          description: body.description || null,
          initialValue: Number(body.initialValue),
          currentValue: Number(body.initialValue),
          targetValue: Number(body.targetValue),
          unit: body.unit || "%",
          progress: 0,
          ownerId: body.ownerId || session.user.id
        }
      });

      // Recalculate parent objective progress
      const krs = await tx.okrKeyResult.findMany({
        where: { objectiveId: body.objectiveId, deletedAt: null }
      });
      const avgProgress = krs.length === 0 ? 0 : krs.reduce((sum, item) => sum + item.progress, 0) / krs.length;
      
      await tx.okrObjective.update({
        where: { id: body.objectiveId },
        data: { progress: Math.round(avgProgress * 10) / 10 }
      });

      return kr;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error("[OKR_KEYRESULTS_POST]", e);
    return NextResponse.json({ error: "Key Result eklenirken hata oluştu" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  try {
    const body = await req.json() as {
      id: string;
      title?: string;
      description?: string;
      currentValue?: number;
      targetValue?: number;
      initialValue?: number;
      unit?: string;
      ownerId?: string;
      deleted?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ error: "id parametresi zorunludur" }, { status: 400 });
    }

    const kr = await prisma.okrKeyResult.findFirst({
      where: { id: body.id, tenantId, deletedAt: null }
    });

    if (!kr) {
      return NextResponse.json({ error: "Key Result bulunamadı" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (body.deleted) {
        // Soft delete Key Result
        await tx.okrKeyResult.update({
          where: { id: body.id },
          data: { deletedAt: new Date() }
        });
      } else {
        const initialValue = body.initialValue !== undefined ? Number(body.initialValue) : kr.initialValue;
        const currentValue = body.currentValue !== undefined ? Number(body.currentValue) : kr.currentValue;
        const targetValue = body.targetValue !== undefined ? Number(body.targetValue) : kr.targetValue;
        const progress = calculateProgress(initialValue, currentValue, targetValue);

        await tx.okrKeyResult.update({
          where: { id: body.id },
          data: {
            ...(body.title ? { title: body.title } : {}),
            ...(body.description !== undefined ? { description: body.description || null } : {}),
            initialValue,
            currentValue,
            targetValue,
            progress,
            ...(body.unit ? { unit: body.unit } : {}),
            ...(body.ownerId ? { ownerId: body.ownerId } : {})
          }
        });
      }

      // Recalculate parent objective progress
      const krs = await tx.okrKeyResult.findMany({
        where: { objectiveId: kr.objectiveId, deletedAt: null }
      });
      const avgProgress = krs.length === 0 ? 0 : krs.reduce((sum, item) => sum + item.progress, 0) / krs.length;

      await tx.okrObjective.update({
        where: { id: kr.objectiveId },
        data: { progress: Math.round(avgProgress * 10) / 10 }
      });

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[OKR_KEYRESULTS_PATCH]", e);
    return NextResponse.json({ error: "Key Result güncellenirken hata oluştu" }, { status: 500 });
  }
}
