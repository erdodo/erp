import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    const expenses = await prisma.projectExpense.findMany({
      where: { projectId },
      orderBy: { expenseDate: "desc" },
      include: { user: { select: { id: true, name: true } } }
    });

    // Aggregate stats
    const totalByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({ expenses, totalAmount, totalByCategory });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Giderler yüklenirken hata oluştu" }, { status: 500 });
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

    const body = await req.json() as {
      title: string; amount: number; currency?: string; category?: string;
      description?: string; taskId?: string; expenseDate?: string;
    };

    if (!body.title || body.amount === undefined) {
      return NextResponse.json({ error: "Başlık ve tutar zorunludur" }, { status: 400 });
    }

    const expense = await prisma.projectExpense.create({
      data: {
        projectId,
        taskId: body.taskId || null,
        userId: session.user.id,
        title: body.title,
        amount: Number(body.amount),
        currency: body.currency || project.currency || "TRY",
        category: body.category || "other",
        description: body.description || null,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date()
      },
      include: { user: { select: { id: true, name: true } } }
    });

    // Log activity
    await prisma.projectActivity.create({
      data: {
        projectId,
        userId: session.user.id,
        action: "expense_added",
        details: `${session.user.name}, "${body.title}" gideri ekledi (${Number(body.amount).toLocaleString("tr-TR")} ${body.currency || project.currency}).`
      }
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gider eklenirken hata oluştu" }, { status: 500 });
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
    await prisma.projectExpense.delete({ where: { id: body.id, projectId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gider silinirken hata oluştu" }, { status: 500 });
  }
}
