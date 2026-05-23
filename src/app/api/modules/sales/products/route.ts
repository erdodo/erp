import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  sku:         z.string().optional(),
  name:        z.string().min(1),
  category:    z.string().optional(),
  unit:        z.string().default("adet"),
  quantity:    z.number().min(0).default(0),
  minQuantity: z.number().min(0).default(0),
  cost:        z.number().min(0).optional(),
  currency:    z.string().default("TRY"),
  warehouseId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const { searchParams } = req.nextUrl;
  const search   = searchParams.get("search")   ?? "";
  const category = searchParams.get("category") ?? "";
  const lowStock = searchParams.get("lowStock")  === "true";
  const page     = Math.max(1, Number(searchParams.get("page")  ?? 1));
  const limit    = Math.min(100, Number(searchParams.get("limit") ?? 50));

  const where: Record<string, unknown> = { tenantId, deletedAt: null, isActive: true };
  if (search)   where.OR = [{ name: { contains: search } }, { sku: { contains: search } }];
  if (category) where.category = category;
  // lowStock filter applied post-query (SQLite doesn't support field-to-field comparison)

  let [products, total] = await Promise.all([
    prisma.stockItem.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * limit, take: limit }),
    prisma.stockItem.count({ where }),
  ]);

  if (lowStock) {
    products = products.filter((p) => p.quantity <= p.minQuantity);
    total    = products.length;
  }

  return NextResponse.json({ products, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const product = await prisma.stockItem.create({
    data: {
      tenantId,
      sku:         parsed.data.sku    || null,
      name:        parsed.data.name,
      category:    parsed.data.category || null,
      unit:        parsed.data.unit,
      quantity:    parsed.data.quantity,
      minQuantity: parsed.data.minQuantity,
      cost:        parsed.data.cost    ?? null,
      currency:    parsed.data.currency,
      warehouseId: parsed.data.warehouseId || null,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
