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

    const labels = await prisma.projectLabel.findMany({
      where: { projectId },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ labels });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Etiketler yüklenirken hata oluştu" }, { status: 500 });
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

    const body = await req.json() as { name: string; color?: string };
    if (!body.name) return NextResponse.json({ error: "Etiket adı zorunludur" }, { status: 400 });

    const label = await prisma.projectLabel.create({
      data: { projectId, name: body.name, color: body.color || "#6366f1" }
    });

    return NextResponse.json(label, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Etiket oluşturulurken hata oluştu" }, { status: 500 });
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
    const body = await req.json() as { id: string };
    await prisma.projectLabel.delete({ where: { id: body.id, projectId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Etiket silinirken hata oluştu" }, { status: 500 });
  }
}
