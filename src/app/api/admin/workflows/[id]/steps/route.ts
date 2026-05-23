import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const StepSchema = z.object({
  sortOrder: z.number().int().min(1),
  action:    z.string().min(1),
  config:    z.record(z.string(), z.unknown()), // StepConfig as object
});

const ReorderSchema = z.object({
  steps: z.array(z.object({ id: z.string(), sortOrder: z.number() })),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  const steps = await prisma.workflowStep.findMany({
    where:   { workflowId: id, workflow: { tenantId: session!.user.tenantId! } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(steps);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  // Verify ownership
  const wf = await prisma.workflow.findFirst({
    where: { id, tenantId: session!.user.tenantId!, deletedAt: null },
  });
  if (!wf) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json() as unknown;

  // Handle reorder
  if (typeof body === "object" && body !== null && "steps" in body) {
    const parsed = ReorderSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    await Promise.all(
      parsed.data.steps.map((s) =>
        prisma.workflowStep.update({ where: { id: s.id }, data: { sortOrder: s.sortOrder } })
      )
    );
    return NextResponse.json({ success: true });
  }

  // Create step
  const parsed = StepSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const step = await prisma.workflowStep.create({
    data: {
      workflowId: id,
      sortOrder:  parsed.data.sortOrder,
      action:     parsed.data.action,
      config:     JSON.stringify(parsed.data.config),
    },
  });

  return NextResponse.json(step, { status: 201 });
}
