import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  title:  z.string().min(1).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  x:      z.number().int().min(0).optional(),
  y:      z.number().int().min(0).optional(),
  w:      z.number().int().min(1).max(12).optional(),
  h:      z.number().int().min(1).max(12).optional(),
});

type Ctx = { params: Promise<{ id: string; wId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, wId } = await params;

  const widget = await prisma.dashboardWidget.findFirst({
    where: { id: wId, layout: { id, userId: session.user.id } },
  });
  if (!widget) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.config) data.config = JSON.stringify(parsed.data.config);

  await prisma.dashboardWidget.update({ where: { id: wId }, data });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, wId } = await params;

  const widget = await prisma.dashboardWidget.findFirst({
    where: { id: wId, layout: { id, userId: session.user.id } },
  });
  if (!widget) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await prisma.dashboardWidget.delete({ where: { id: wId } });
  return NextResponse.json({ success: true });
}
