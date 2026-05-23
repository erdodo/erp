import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name:          z.string().min(1),
  description:   z.string().optional(),
  triggerModule: z.string().min(1),
  triggerEvent:  z.string().min(1),
  conditions:    z.string().optional(), // JSON string
  isActive:      z.boolean().optional(),
});

export async function GET(_req: NextRequest) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const workflows = await prisma.workflow.findMany({
    where:   { tenantId: session!.user.tenantId!, deletedAt: null },
    include: {
      steps:      { orderBy: { sortOrder: "asc" } },
      _count:     { select: { executions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(workflows);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const body = await req.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const wf = await prisma.workflow.create({
    data: { ...parsed.data, tenantId: session!.user.tenantId! },
  });

  return NextResponse.json(wf, { status: 201 });
}
