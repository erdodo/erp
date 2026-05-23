import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name:      z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const layout = await prisma.dashboardLayout.findFirst({
    where:   { id, userId: session.user.id },
    include: { widgets: { orderBy: [{ y: "asc" }, { x: "asc" }] } },
  });

  if (!layout) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json(layout);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as unknown;
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  if (parsed.data.isDefault) {
    await prisma.dashboardLayout.updateMany({
      where: { userId: session.user.id, tenantId: session.user.tenantId! },
      data:  { isDefault: false },
    });
  }

  await prisma.dashboardLayout.updateMany({
    where: { id, userId: session.user.id },
    data:  parsed.data,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await prisma.dashboardLayout.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ success: true });
}
