import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name:          z.string().min(1).optional(),
  description:   z.string().optional(),
  triggerModule: z.string().min(1).optional(),
  triggerEvent:  z.string().min(1).optional(),
  conditions:    z.string().optional(),
  isActive:      z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  const wf = await prisma.workflow.findFirst({
    where:   { id, tenantId: session!.user.tenantId!, deletedAt: null },
    include: {
      steps:      { orderBy: { sortOrder: "asc" } },
      executions: { orderBy: { startedAt: "desc" }, take: 50 },
    },
  });

  if (!wf) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json(wf);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  const body = await req.json() as unknown;
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const wf = await prisma.workflow.updateMany({
    where: { id, tenantId: session!.user.tenantId!, deletedAt: null },
    data:  parsed.data,
  });

  if (wf.count === 0) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  await prisma.workflow.updateMany({
    where: { id, tenantId: session!.user.tenantId!, deletedAt: null },
    data:  { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
