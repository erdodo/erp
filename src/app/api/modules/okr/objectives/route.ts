import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const { searchParams } = req.nextUrl;
  const periodId = searchParams.get("periodId") || "";
  const level = searchParams.get("level") || "";
  const departmentId = searchParams.get("departmentId") || "";
  const teamId = searchParams.get("teamId") || "";
  const userId = searchParams.get("userId") || "";
  const search = searchParams.get("search") || "";

  if (!periodId) {
    return NextResponse.json({ error: "periodId parametresi zorunludur" }, { status: 400 });
  }

  try {
    const objectives = await prisma.okrObjective.findMany({
      where: {
        tenantId,
        periodId,
        deletedAt: null,
        ...(level ? { level } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(teamId ? { teamId } : {}),
        ...(userId ? { userId } : {}),
        ...(search ? { title: { contains: search, mode: "insensitive" } } : {})
      },
      include: {
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, image: true } },
        keyResults: {
          where: { deletedAt: null },
          include: { owner: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" }
        },
        _count: { select: { comments: true } }
      },
      orderBy: [
        { level: "asc" }, // company -> department -> team -> personal
        { createdAt: "desc" }
      ]
    });

    return NextResponse.json({ objectives });
  } catch (e) {
    console.error("[OKR_OBJECTIVES_GET]", e);
    return NextResponse.json({ error: "Hedefler yüklenirken hata oluştu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  try {
    const body = await req.json() as {
      periodId: string;
      title: string;
      description?: string;
      level: "company" | "department" | "team" | "personal";
      departmentId?: string;
      teamId?: string;
      userId?: string;
      ownerId?: string;
      keyResults?: Array<{
        title: string;
        description?: string;
        initialValue: number;
        targetValue: number;
        unit: string;
        ownerId?: string;
      }>;
    };

    if (!body.periodId || !body.title || !body.level) {
      return NextResponse.json({ error: "Lütfen zorunlu alanları doldurun" }, { status: 400 });
    }

    // Set owner to current user if not provided
    const ownerId = body.ownerId || session.user.id;

    // Use transaction to create objective and its Key Results
    const result = await prisma.$transaction(async (tx) => {
      const objective = await tx.okrObjective.create({
        data: {
          tenantId,
          periodId: body.periodId,
          title: body.title,
          description: body.description || null,
          level: body.level,
          departmentId: body.level === "department" ? body.departmentId || null : null,
          teamId: body.level === "team" ? body.teamId || null : null,
          userId: body.level === "personal" ? body.userId || session.user.id : null,
          ownerId,
          progress: 0
        }
      });

      if (body.keyResults && body.keyResults.length > 0) {
        await tx.okrKeyResult.createMany({
          data: body.keyResults.map((kr) => ({
            tenantId,
            objectiveId: objective.id,
            title: kr.title,
            description: kr.description || null,
            initialValue: Number(kr.initialValue || 0),
            currentValue: Number(kr.initialValue || 0),
            targetValue: Number(kr.targetValue || 100),
            unit: kr.unit || "%",
            progress: 0,
            ownerId: kr.ownerId || ownerId
          }))
        });
      }

      return objective;
    });

    // Fetch the newly created objective with KRs
    const fullObjective = await prisma.okrObjective.findUnique({
      where: { id: result.id },
      include: {
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        keyResults: { where: { deletedAt: null } }
      }
    });

    return NextResponse.json(fullObjective, { status: 201 });
  } catch (e) {
    console.error("[OKR_OBJECTIVES_POST]", e);
    return NextResponse.json({ error: "Hedef oluşturulurken hata oluştu" }, { status: 500 });
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
      level?: "company" | "department" | "team" | "personal";
      departmentId?: string;
      teamId?: string;
      userId?: string;
      ownerId?: string;
      deleted?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ error: "id zorunludur" }, { status: 400 });
    }

    const existing = await prisma.okrObjective.findFirst({
      where: { id: body.id, tenantId, deletedAt: null }
    });

    if (!existing) {
      return NextResponse.json({ error: "Hedef bulunamadı" }, { status: 404 });
    }

    if (body.deleted) {
      await prisma.$transaction(async (tx) => {
        // Soft delete objective
        await tx.okrObjective.update({
          where: { id: body.id },
          data: { deletedAt: new Date() }
        });
        // Soft delete its Key Results
        await tx.okrKeyResult.updateMany({
          where: { objectiveId: body.id },
          data: { deletedAt: new Date() }
        });
      });
      return NextResponse.json({ success: true });
    }

    const updated = await prisma.okrObjective.update({
      where: { id: body.id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.level ? { level: body.level } : {}),
        ...(body.departmentId !== undefined ? { departmentId: body.departmentId || null } : {}),
        ...(body.teamId !== undefined ? { teamId: body.teamId || null } : {}),
        ...(body.userId !== undefined ? { userId: body.userId || null } : {}),
        ...(body.ownerId ? { ownerId: body.ownerId } : {})
      },
      include: {
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[OKR_OBJECTIVES_PATCH]", e);
    return NextResponse.json({ error: "Hedef güncellenirken hata oluştu" }, { status: 500 });
  }
}
