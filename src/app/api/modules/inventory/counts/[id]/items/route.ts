import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: countId } = await params;

  const body = await req.json() as { itemId: string; expected?: number };

  const ci = await prisma.inventoryCountItem.create({
    data: {
      countId,
      itemId:   body.itemId,
      expected: body.expected ?? 0,
    },
    include: { item: true },
  });
  return NextResponse.json(ci, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: countId } = await params;

  const body = await req.json() as { id: string; actual: number; notes?: string };
  const diff = body.actual - (await prisma.inventoryCountItem.findUnique({ where: { id: body.id } }))!.expected;

  const ci = await prisma.inventoryCountItem.update({
    where: { id: body.id },
    data: { actual: body.actual, difference: diff, notes: body.notes ?? null },
    include: { item: true },
  });
  return NextResponse.json(ci);
  void countId;
}
