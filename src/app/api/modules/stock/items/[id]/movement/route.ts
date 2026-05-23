import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const body = await req.json() as {
    type: string; quantity: number; reason?: string; reference?: string; warehouseId?: string;
  };

  if (!body.type || !body.quantity) return NextResponse.json({ error: "type and quantity required" }, { status: 400 });

  const item = await prisma.stockItem.findFirst({ where: { id, tenantId, deletedAt: null } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const outTypes = ["out", "reserve", "sale"];
  const delta = outTypes.includes(body.type) ? -Math.abs(body.quantity) : Math.abs(body.quantity);

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        tenantId,
        itemId:      id,
        warehouseId: body.warehouseId ?? item.warehouseId,
        type:        body.type,
        quantity:    body.quantity,
        reason:      body.reason    ?? null,
        reference:   body.reference ?? null,
      },
    }),
    prisma.stockItem.update({
      where: { id },
      data:  { quantity: { increment: delta } },
    }),
  ]);

  return NextResponse.json(movement, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const movements = await prisma.stockMovement.findMany({
    where: { itemId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ movements });
}
