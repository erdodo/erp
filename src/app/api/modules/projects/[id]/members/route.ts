import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const projectId = (await params).id as string;

  try {
    const project = await prisma.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null } });
    if (!project) return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { joinedAt: "asc" }
    });

    return NextResponse.json({ members });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Üyeler yüklenirken hata oluştu" }, { status: 500 });
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

    const body = await req.json() as { userId: string; role?: string };
    if (!body.userId) return NextResponse.json({ error: "userId zorunludur" }, { status: 400 });

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: body.userId } },
      create: { projectId, userId: body.userId, role: body.role || "member" },
      update: { role: body.role || "member" },
      include: { user: { select: { id: true, name: true, image: true } } }
    });

    return NextResponse.json(member, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Üye eklenirken hata oluştu" }, { status: 500 });
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
    const body = await req.json() as { userId: string };
    await prisma.projectMember.deleteMany({ where: { projectId, userId: body.userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Üye kaldırılırken hata oluştu" }, { status: 500 });
  }
}
