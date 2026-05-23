import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  sku:         z.string().optional().or(z.null()),
  name:        z.string().min(1).optional(),
  category:    z.string().optional().or(z.null()),
  unit:        z.string().optional(),
  quantity:    z.number().min(0).optional(),
  minQuantity: z.number().min(0).optional(),
  cost:        z.number().min(0).optional().or(z.null()),
  currency:    z.string().optional(),
  isActive:    z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const product = await prisma.stockItem.findFirst({
    where: { id, tenantId: session.user.tenantId!, deletedAt: null },
    include: {
      movements: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!product) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const product = await prisma.stockItem.findFirst({ where: { id, tenantId: session.user.tenantId!, deletedAt: null } });
  if (!product) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const updated = await prisma.stockItem.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const product = await prisma.stockItem.findFirst({ where: { id, tenantId: session.user.tenantId!, deletedAt: null } });
  if (!product) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await prisma.stockItem.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  return NextResponse.json({ success: true });
}
