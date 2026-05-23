import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateStepSchema = z.object({
  sortOrder: z.number().int().min(1).optional(),
  action:    z.string().min(1).optional(),
  config:    z.record(z.string(), z.unknown()).optional(),
});

type Ctx = { params: Promise<{ id: string; stepId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id, stepId } = await params;

  // Verify ownership
  const step = await prisma.workflowStep.findFirst({
    where: { id: stepId, workflow: { id, tenantId: session!.user.tenantId! } },
  });
  if (!step) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = UpdateStepSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.sortOrder !== undefined) data.sortOrder = parsed.data.sortOrder;
  if (parsed.data.action    !== undefined) data.action    = parsed.data.action;
  if (parsed.data.config    !== undefined) data.config    = JSON.stringify(parsed.data.config);

  await prisma.workflowStep.update({ where: { id: stepId }, data });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id, stepId } = await params;

  const step = await prisma.workflowStep.findFirst({
    where: { id: stepId, workflow: { id, tenantId: session!.user.tenantId! } },
  });
  if (!step) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await prisma.workflowStep.delete({ where: { id: stepId } });
  return NextResponse.json({ success: true });
}
