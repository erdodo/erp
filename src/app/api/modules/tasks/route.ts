import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { searchParams } = req.nextUrl;
  const status    = searchParams.get("status")    ?? "";
  const priority  = searchParams.get("priority")  ?? "";
  const projectId = searchParams.get("projectId") ?? "";
  const sprintId  = searchParams.get("sprintId")  ?? "";
  const type      = searchParams.get("type")      ?? "";
  
  const where = {
    tenantId,
    deletedAt: null,
    ...(projectId ? { projectId } : { parentId: null }),
    ...(status    ? { status }    : {}),
    ...(priority  ? { priority }  : {}),
    ...(sprintId  ? { sprintId }  : {}),
    ...(type      ? { type }      : {}),
  };
  
  const tasks = await prisma.task.findMany({
    where, orderBy: [{ position: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: {
      project:  { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, image: true } },
      sprint:   { select: { id: true, name: true } },
      subtasks: { where: { deletedAt: null } },
      comments: { where: { deletedAt: null } },
      labels:   { include: { label: true } },
      _count:   { select: { subtasks: { where: { deletedAt: null } }, comments: { where: { deletedAt: null } }, workLogs: true } },
    },
  });
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  
  const body = await req.json() as {
    title: string;
    description?: string;
    type?: string;
    status?: string;
    priority?: string;
    storyPoints?: number;
    projectId?: string;
    parentId?: string;
    sprintId?: string;
    assignedTo?: string;
    dueDate?: string;
    estimatedHours?: number;
    labelIds?: string[];
    integrationType?: string;
    integrationId?: string;
    
    // Integration Triggers
    integrationAction?: "create_production" | "create_expense";
    productionLineId?: string;
    productionMethodId?: string;
    productionQuantity?: number;
    expenseCategoryId?: string;
    expenseAmount?: number;
    expenseCurrency?: string;
  };
  
  if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });

  try {
    let integrationType = body.integrationType ?? null;
    let integrationId = body.integrationId ?? null;
    let detailsLog = "";

    if (body.integrationAction === "create_production") {
      const count = await prisma.productionOrder.count({ where: { tenantId } });
      const orderNo = `ÜE-${String(count + 1).padStart(6, "0")}`;
      const order = await prisma.productionOrder.create({
        data: {
          tenantId, orderNo, productName: body.title,
          quantity: body.productionQuantity ? Number(body.productionQuantity) : 1,
          unit: "adet", lineId: body.productionLineId || null,
          methodId: body.productionMethodId || null, status: "planned",
          notes: body.description || "Görevin tetiklediği otomatik üretim emri."
        }
      });
      integrationType = "production";
      integrationId = order.id;
      detailsLog = ` Üretim emri başlatıldı (#${order.id.slice(-6).toUpperCase()})`;
    }

    if (body.integrationAction === "create_expense") {
      const expense = await prisma.expense.create({
        data: {
          tenantId, title: `Satın Alma: ${body.title}`,
          amount: body.expenseAmount ? Number(body.expenseAmount) : 0,
          currency: body.expenseCurrency || "TRY",
          categoryId: body.expenseCategoryId || null,
          userId: session.user.id, status: "pending",
          notes: body.description || "Görevin tetiklediği satın alma / harcama talebi."
        }
      });
      integrationType = "purchase";
      integrationId = expense.id;
      detailsLog = ` Satın alma talebi açıldı (${body.expenseAmount} ${body.expenseCurrency})`;
    }

    const t = await prisma.task.create({
      data: {
        tenantId,
        title: body.title,
        description: body.description ?? null,
        type: body.type ?? "task",
        status: body.status ?? "todo",
        priority: body.priority ?? "medium",
        storyPoints: body.storyPoints ? Number(body.storyPoints) : null,
        projectId: body.projectId ?? null,
        parentId: body.parentId ?? null,
        sprintId: body.sprintId ?? null,
        assignedTo: body.assignedTo ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        estimatedHours: body.estimatedHours ? Number(body.estimatedHours) : null,
        createdBy: session.user.id,
        integrationType,
        integrationId,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        sprint: { select: { id: true, name: true } }
      },
    });

    // Add labels
    if (body.labelIds && body.labelIds.length > 0) {
      await prisma.taskLabel.createMany({
        data: body.labelIds.map((labelId) => ({ taskId: t.id, labelId })),
        skipDuplicates: true
      });
    }

    if (body.projectId) {
      await prisma.projectActivity.create({
        data: {
          projectId: body.projectId,
          taskId: t.id,
          userId: session.user.id,
          action: body.parentId ? "subtask_created" : "task_created",
          details: `${session.user.name}, "${t.title}" adlı ${body.parentId ? "alt görevi" : "yeni görevi"} oluşturdu.${detailsLog}`
        }
      });
    }

    return NextResponse.json(t, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Görev kaydedilirken hata oluştu" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  
  const body = await req.json() as {
    id: string;
    title?: string;
    description?: string;
    type?: string;
    status?: string;
    priority?: string;
    storyPoints?: number | null;
    position?: number;
    assignedTo?: string | null;
    sprintId?: string | null;
    estimatedHours?: number | null;
    actualHours?: number | null;
    dueDate?: string | null;
    labelIds?: string[];
    integrationType?: string | null;
    integrationId?: string | null;
  };
  
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const existing = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const t = await prisma.task.update({
      where: { id, tenantId },
      data: {
        ...(rest.title          !== undefined ? { title: rest.title } : {}),
        ...(rest.status         !== undefined ? { status: rest.status } : {}),
        ...(rest.type           !== undefined ? { type: rest.type } : {}),
        ...(rest.priority       !== undefined ? { priority: rest.priority } : {}),
        ...(rest.description    !== undefined ? { description: rest.description } : {}),
        ...(rest.assignedTo     !== undefined ? { assignedTo: rest.assignedTo } : {}),
        ...(rest.sprintId       !== undefined ? { sprintId: rest.sprintId } : {}),
        ...(rest.storyPoints    !== undefined ? { storyPoints: rest.storyPoints } : {}),
        ...(rest.position       !== undefined ? { position: rest.position } : {}),
        ...(rest.estimatedHours !== undefined ? { estimatedHours: rest.estimatedHours ? Number(rest.estimatedHours) : null } : {}),
        ...(rest.actualHours    !== undefined ? { actualHours: rest.actualHours ? Number(rest.actualHours) : null } : {}),
        ...(rest.dueDate        !== undefined ? { dueDate: rest.dueDate ? new Date(rest.dueDate) : null } : {}),
        ...(rest.integrationType !== undefined ? { integrationType: rest.integrationType } : {}),
        ...(rest.integrationId   !== undefined ? { integrationId: rest.integrationId } : {}),
      },
    });

    // Update labels if provided
    if (rest.labelIds !== undefined) {
      await prisma.taskLabel.deleteMany({ where: { taskId: id } });
      if (rest.labelIds.length > 0) {
        await prisma.taskLabel.createMany({
          data: rest.labelIds.map((labelId) => ({ taskId: id, labelId })),
          skipDuplicates: true
        });
      }
    }

    // Log Activity
    if (existing.projectId) {
      let details = "";
      let actionType = "task_updated";
      
      if (rest.status && rest.status !== existing.status) {
        actionType = "status_changed";
        details = `${session.user.name}, "${t.title}" görevinin durumunu [${existing.status}] → [${rest.status}] olarak güncelledi.`;
      } else if (rest.assignedTo !== undefined && rest.assignedTo !== existing.assignedTo) {
        actionType = "assigned";
        if (rest.assignedTo) {
          const u = await prisma.user.findFirst({ where: { id: rest.assignedTo }, select: { name: true } });
          details = `${session.user.name}, "${t.title}" görevini ${u?.name ?? "bir kişiye"} atadı.`;
        } else {
          details = `${session.user.name}, "${t.title}" görevinin atamasını kaldırdı.`;
        }
      } else if (rest.sprintId !== undefined) {
        actionType = "sprint_changed";
        if (rest.sprintId) {
          const s = await prisma.projectSprint.findFirst({ where: { id: rest.sprintId }, select: { name: true } });
          details = `${session.user.name}, "${t.title}" görevini "${s?.name}" sprintine taşıdı.`;
        } else {
          details = `${session.user.name}, "${t.title}" görevini backlog'a taşıdı.`;
        }
      }

      if (details) {
        await prisma.projectActivity.create({
          data: { projectId: existing.projectId, taskId: t.id, userId: session.user.id, action: actionType, details }
        });
      }
    }

    return NextResponse.json(t);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Görev güncellenirken hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  
  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const existing = await prisma.task.findFirst({ where: { id, tenantId } });
    if (existing?.projectId) {
      await prisma.projectActivity.create({
        data: {
          projectId: existing.projectId,
          userId: session.user.id,
          action: "task_deleted",
          details: `${session.user.name}, "${existing.title}" adlı görevi sildi.`
        }
      });
    }

    await prisma.task.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Görev silinirken hata oluştu" }, { status: 500 });
  }
}
