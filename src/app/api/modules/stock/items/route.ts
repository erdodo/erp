import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requireModule("stock");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;

  const { searchParams } = req.nextUrl;
  const search      = searchParams.get("search") ?? "";
  const warehouseId = searchParams.get("warehouseId") ?? "";
  const category    = searchParams.get("category") ?? "";
  const lowStock    = searchParams.get("lowStock") === "1";
  const page        = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit       = Math.min(100, Number(searchParams.get("limit") ?? 25));
  const skip        = (page - 1) * limit;

  const where = {
    tenantId, deletedAt: null,
    ...(search      ? { name: { contains: search } } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(category    ? { category } : {}),
  };

  const [all, total] = await Promise.all([
    prisma.stockItem.findMany({
      where, skip, take: limit, orderBy: { name: "asc" },
      include: { warehouse: { select: { id: true, name: true } } },
    }),
    prisma.stockItem.count({ where }),
  ]);

  const items = lowStock
    ? all.filter((i) => i.quantity <= i.minQuantity)
    : all;

  return NextResponse.json({ items, total, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("stock");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;

  const body = await req.json() as {
    name: string; sku?: string; category?: string; unit?: string;
    quantity?: number; minQuantity?: number; cost?: number; currency?: string;
    warehouseId?: string;
  };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const item = await prisma.stockItem.create({
    data: {
      tenantId,
      name:        body.name,
      sku:         body.sku         ?? null,
      category:    body.category    ?? null,
      unit:        body.unit        ?? "adet",
      quantity:    body.quantity    ?? 0,
      minQuantity: body.minQuantity ?? 0,
      cost:        body.cost        ?? null,
      currency:    body.currency    ?? "TRY",
      warehouseId: body.warehouseId ?? null,
    },
    include: { warehouse: { select: { id: true, name: true } } },
  });
  await auditLog(guard.session, "create", "stock", item.id, { newData: body as Record<string, unknown>, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(item, { status: 201 });
}
