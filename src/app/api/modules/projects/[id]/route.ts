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
  const id = (await params).id as string;

  try {
    const [project, users, expenseCategories, productionLines, productionMethods] = await Promise.all([
      prisma.project.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
          milestones: {
            where: { deletedAt: null },
            orderBy: { dueDate: "asc" }
          },
          sprints: {
            orderBy: { createdAt: "desc" },
            include: {
              _count: { select: { tasks: { where: { deletedAt: null } } } }
            }
          },
          members: {
            include: {
              user: { select: { id: true, name: true, image: true } }
            }
          },
          labels: { orderBy: { name: "asc" } },
          expenses: {
            orderBy: { expenseDate: "desc" },
            include: { user: { select: { id: true, name: true } } }
          },
          tasks: {
            where: { deletedAt: null, parentId: null },
            orderBy: [{ position: "asc" }, { createdAt: "desc" }],
            include: {
              assignee: { select: { id: true, name: true, image: true } },
              creator: { select: { id: true, name: true } },
              sprint: { select: { id: true, name: true } },
              labels: { include: { label: true } },
              subtasks: {
                where: { deletedAt: null },
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
                include: {
                  assignee: { select: { id: true, name: true } },
                  subtasks: { where: { deletedAt: null } },
                  workLogs: {
                    include: { user: { select: { id: true, name: true } } }
                  }
                }
              },
              comments: {
                where: { deletedAt: null },
                include: { user: { select: { id: true, name: true, image: true } } },
                orderBy: { createdAt: "asc" }
              },
              workLogs: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { loggedAt: "desc" }
              },
              _count: {
                select: {
                  subtasks: { where: { deletedAt: null } },
                  comments: { where: { deletedAt: null } },
                  workLogs: true
                }
              }
            }
          },
          comments: {
            where: { deletedAt: null },
            include: { user: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: "desc" }
          },
          activities: {
            include: {
              user: { select: { id: true, name: true } },
              task: { select: { id: true, title: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 100
          }
        }
      }),
      prisma.user.findMany({
        where: { tenantId, isActive: true, deletedAt: null },
        select: { id: true, name: true, image: true }
      }),
      prisma.expenseCategory.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true }
      }),
      prisma.productionLine.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true }
      }),
      prisma.productionMethod.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, version: true }
      })
    ]);

    if (!project) {
      return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({
      project,
      users,
      expenseCategories,
      productionLines,
      productionMethods
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Proje yüklenirken hata oluştu" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const id = (await params).id as string;

  try {
    const body = await req.json() as {
      name?: string; description?: string; status?: string; progress?: number;
      budget?: number | null; currency?: string; startDate?: string | null; endDate?: string | null;
      key?: string | null; color?: string | null; category?: string | null;
    };

    const updated = await prisma.project.update({
      where: { id, tenantId },
      data: {
        ...(body.name        !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.status      !== undefined ? { status: body.status } : {}),
        ...(body.progress    !== undefined ? { progress: body.progress } : {}),
        ...(body.budget      !== undefined ? { budget: body.budget } : {}),
        ...(body.currency    !== undefined ? { currency: body.currency } : {}),
        ...(body.startDate   !== undefined ? { startDate: body.startDate ? new Date(body.startDate) : null } : {}),
        ...(body.endDate     !== undefined ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
        ...(body.key         !== undefined ? { key: body.key || null } : {}),
        ...(body.color       !== undefined ? { color: body.color || null } : {}),
        ...(body.category    !== undefined ? { category: body.category || null } : {}),
      }
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Proje güncellenirken hata oluştu" }, { status: 500 });
  }
}
