import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const body = await req.json() as {
    code?: string; name?: string; description?: string; category?: string; unit?: string;
    specifications?: string; suppliers?: string; minOrderQty?: number;
    leadTimeDays?: number; cost?: number; currency?: string; isActive?: boolean;
  };

  const material = await prisma.material.update({
    where: { id, tenantId },
    data: {
      ...(body.code           !== undefined ? { code: body.code } : {}),
      ...(body.name           !== undefined ? { name: body.name } : {}),
      ...(body.description    !== undefined ? { description: body.description } : {}),
      ...(body.category       !== undefined ? { category: body.category } : {}),
      ...(body.unit           !== undefined ? { unit: body.unit } : {}),
      ...(body.specifications !== undefined ? { specifications: body.specifications } : {}),
      ...(body.suppliers      !== undefined ? { suppliers: body.suppliers } : {}),
      ...(body.minOrderQty    !== undefined ? { minOrderQty: body.minOrderQty } : {}),
      ...(body.leadTimeDays   !== undefined ? { leadTimeDays: body.leadTimeDays } : {}),
      ...(body.cost           !== undefined ? { cost: body.cost } : {}),
      ...(body.currency       !== undefined ? { currency: body.currency } : {}),
      ...(body.isActive       !== undefined ? { isActive: body.isActive } : {}),
    },
  });
  return NextResponse.json(material);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;
  await prisma.material.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
