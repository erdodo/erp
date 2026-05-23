import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const body = await req.json() as {
    name?: string; sku?: string; barcode?: string; category?: string;
    unit?: string; quantity?: number; minQuantity?: number; location?: string; isActive?: boolean;
  };

  const item = await prisma.inventoryItem.update({
    where: { id, tenantId },
    data: {
      ...(body.name        !== undefined ? { name: body.name } : {}),
      ...(body.sku         !== undefined ? { sku: body.sku } : {}),
      ...(body.barcode     !== undefined ? { barcode: body.barcode } : {}),
      ...(body.category    !== undefined ? { category: body.category } : {}),
      ...(body.unit        !== undefined ? { unit: body.unit } : {}),
      ...(body.quantity    !== undefined ? { quantity: body.quantity } : {}),
      ...(body.minQuantity !== undefined ? { minQuantity: body.minQuantity } : {}),
      ...(body.location    !== undefined ? { location: body.location } : {}),
      ...(body.isActive    !== undefined ? { isActive: body.isActive } : {}),
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;
  await prisma.inventoryItem.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
