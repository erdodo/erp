import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const { searchParams } = req.nextUrl;
  const search   = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit    = 25;
  const skip     = (page - 1) * limit;

  const where = {
    tenantId, deletedAt: null,
    ...(search   ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }, { barcode: { contains: search } }] } : {}),
    ...(category ? { category } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
    prisma.inventoryItem.count({ where }),
  ]);

  return NextResponse.json({ items, total, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as {
    name: string; sku?: string; barcode?: string; category?: string;
    unit?: string; quantity?: number; minQuantity?: number; location?: string;
  };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const item = await prisma.inventoryItem.create({
    data: {
      tenantId,
      name:        body.name,
      sku:         body.sku         ?? null,
      barcode:     body.barcode     ?? null,
      category:    body.category    ?? null,
      unit:        body.unit        ?? "adet",
      quantity:    body.quantity    ?? 0,
      minQuantity: body.minQuantity ?? 0,
      location:    body.location    ?? null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
