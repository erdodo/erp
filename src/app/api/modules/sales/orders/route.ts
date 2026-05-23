import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";
import { checkQuota, incrementQuota } from "@/lib/quota";

const ItemSchema = z.object({
  stockItemId: z.string().optional(),
  name:        z.string().min(1),
  quantity:    z.number().positive(),
  unit:        z.string().default("adet"),
  unitPrice:   z.number().min(0),
  notes:       z.string().optional(),
});

const CreateSchema = z.object({
  customerId:    z.string().optional(),
  retailStoreId: z.string().optional(),
  status:       z.string().default("draft"),
  currency:     z.string().default("TRY"),
  discount:     z.number().min(0).default(0),
  tax:          z.number().min(0).default(0),
  notes:        z.string().optional(),
  deliveryDate: z.string().optional(),
  items:        z.array(ItemSchema).min(1),
});

function nextSaleNo(count: number) {
  return `SP-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
}

export async function GET(req: NextRequest) {
  const guard = await requireModule("sales");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;

  const { searchParams } = req.nextUrl;
  const search   = searchParams.get("search")   ?? "";
  const status   = searchParams.get("status")   ?? "";
  const customer = searchParams.get("customer") ?? "";
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit    = Math.min(100, Number(searchParams.get("limit") ?? 25));
  const sort     = searchParams.get("sort") ?? "createdAt";
  const dir      = searchParams.get("dir")  === "asc" ? "asc" : "desc";

  const where: Record<string, unknown> = { tenantId, deletedAt: null };
  if (search)   where.OR = [{ saleNo: { contains: search } }, { notes: { contains: search } }];
  if (status)   where.status = status;
  if (customer) where.customerId = customer;

  const [orders, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { [sort]: dir },
      skip:    (page - 1) * limit,
      take:    limit,
      include: {
        customer: { select: { id: true, name: true, type: true } },
        _count:   { select: { items: true } },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("sales");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;

  const quota = await checkQuota(tenantId, "sales");
  if (!quota.allowed) return NextResponse.json({ error: `Satış kotası doldu (${quota.current}/${quota.max})` }, { status: 429 });

  const body = await req.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { items, ...rest } = parsed.data;
  const count = await prisma.sale.count({ where: { tenantId } });
  const saleNo = nextSaleNo(count);

  // Calculate totals
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmt = subtotal * (rest.discount / 100);
  const taxBase     = subtotal - discountAmt;
  const taxAmt      = taxBase * (rest.tax / 100);
  const totalAmount = taxBase + taxAmt;

  const order = await prisma.sale.create({
    data: {
      tenantId,
      saleNo,
      customerId:    rest.customerId || null,
      retailStoreId: rest.retailStoreId || null,
      status:       rest.status,
      currency:     rest.currency,
      discount:     rest.discount,
      tax:          rest.tax,
      totalAmount,
      notes:        rest.notes || null,
      deliveryDate: rest.deliveryDate ? new Date(rest.deliveryDate) : null,
      items: {
        create: items.map((item) => ({
          stockItemId: item.stockItemId || null,
          name:        item.name,
          quantity:    item.quantity,
          unit:        item.unit,
          unitPrice:   item.unitPrice,
          totalPrice:  item.quantity * item.unitPrice,
          notes:       item.notes || null,
        })),
      },
    },
    include: { items: true },
  });

  await incrementQuota(tenantId, "sales");
  await auditLog(guard.session, "create", "sales", order.id, { newData: { saleNo: order.saleNo, totalAmount }, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(order, { status: 201 });
}
