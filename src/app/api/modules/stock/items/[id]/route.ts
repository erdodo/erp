import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const item = await prisma.stockItem.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      warehouse: true,
      movements: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const body = await req.json() as {
    name?: string; sku?: string; category?: string; unit?: string;
    quantity?: number; minQuantity?: number; cost?: number; currency?: string;
    warehouseId?: string | null; isActive?: boolean;
  };

  const item = await prisma.stockItem.update({
    where: { id, tenantId },
    data: {
      ...(body.name        !== undefined ? { name: body.name } : {}),
      ...(body.sku         !== undefined ? { sku: body.sku } : {}),
      ...(body.category    !== undefined ? { category: body.category } : {}),
      ...(body.unit        !== undefined ? { unit: body.unit } : {}),
      ...(body.quantity    !== undefined ? { quantity: body.quantity } : {}),
      ...(body.minQuantity !== undefined ? { minQuantity: body.minQuantity } : {}),
      ...(body.cost        !== undefined ? { cost: body.cost } : {}),
      ...(body.currency    !== undefined ? { currency: body.currency } : {}),
      ...(body.warehouseId !== undefined ? { warehouseId: body.warehouseId } : {}),
      ...(body.isActive    !== undefined ? { isActive: body.isActive } : {}),
    },
    include: { warehouse: { select: { id: true, name: true } } },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;
  await prisma.stockItem.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
