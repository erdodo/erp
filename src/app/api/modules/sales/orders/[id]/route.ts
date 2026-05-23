import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  customerId:   z.string().optional().or(z.null()),
  currency:     z.string().optional(),
  discount:     z.number().min(0).optional(),
  tax:          z.number().min(0).optional(),
  notes:        z.string().optional().or(z.null()),
  deliveryDate: z.string().optional().or(z.null()),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const order = await prisma.sale.findFirst({
    where: { id, tenantId: session.user.tenantId!, deletedAt: null },
    include: {
      customer: { select: { id: true, name: true, type: true, email: true, phone: true, address: true, city: true } },
      items: {
        include: { stockItem: { select: { id: true, name: true, sku: true, quantity: true, unit: true } } },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const order = await prisma.sale.findFirst({ where: { id, tenantId: session.user.tenantId!, deletedAt: null } });
  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const updated = await prisma.sale.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const order = await prisma.sale.findFirst({ where: { id, tenantId: session.user.tenantId!, deletedAt: null } });
  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  if (["invoiced"].includes(order.status)) return NextResponse.json({ error: "Faturalandırılmış sipariş silinemez" }, { status: 400 });

  await prisma.sale.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
