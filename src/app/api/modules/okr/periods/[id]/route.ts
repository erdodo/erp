import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const id = (await params).id as string;

  if (!session.user.isAdmin && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Yönetici yetkisi gereklidir" }, { status: 403 });
  }

  try {
    const body = await req.json() as {
      isActive?: boolean;
      votingActive?: boolean;
      name?: string;
      startDate?: string;
      endDate?: string;
      deleted?: boolean;
    };

    const period = await prisma.okrPeriod.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!period) {
      return NextResponse.json({ error: "Dönem bulunamadı" }, { status: 404 });
    }

    if (body.deleted) {
      await prisma.okrPeriod.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      return NextResponse.json({ success: true });
    }

    const updated = await prisma.okrPeriod.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.votingActive !== undefined ? { votingActive: body.votingActive } : {}),
        ...(body.name ? { name: body.name } : {}),
        ...(body.startDate ? { startDate: new Date(body.startDate) } : {}),
        ...(body.endDate ? { endDate: new Date(body.endDate) } : {})
      }
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[OKR_PERIOD_PATCH]", e);
    return NextResponse.json({ error: "Dönem güncellenirken hata oluştu" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const id = (await params).id as string;

  try {
    const period = await prisma.okrPeriod.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        comments: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, image: true } } }
        },
        votes: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, image: true } } }
        }
      }
    });

    if (!period) {
      return NextResponse.json({ error: "Dönem bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ period });
  } catch (e) {
    console.error("[OKR_PERIOD_GET_DETAIL]", e);
    return NextResponse.json({ error: "Dönem detayları yüklenirken hata oluştu" }, { status: 500 });
  }
}
