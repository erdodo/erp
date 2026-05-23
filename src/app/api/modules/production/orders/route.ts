import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function pad(n: number, len = 6) { return String(n).padStart(len, "0"); }

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const { searchParams } = req.nextUrl;
  const search  = searchParams.get("search") ?? "";
  const status  = searchParams.get("status") ?? "";
  const lineId  = searchParams.get("lineId") ?? "";
  const page    = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit   = Math.min(100, Number(searchParams.get("limit") ?? 25));
  const skip    = (page - 1) * limit;

  const where = {
    tenantId, deletedAt: null,
    ...(search  ? { productName: { contains: search } } : {}),
    ...(status  ? { status } : {}),
    ...(lineId  ? { lineId } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.productionOrder.findMany({
      where, skip, take: limit, orderBy: { createdAt: "desc" },
      include: {
        line:   { select: { id: true, name: true } },
        method: { select: { id: true, name: true, version: true } },
      },
    }),
    prisma.productionOrder.count({ where }),
  ]);

  return NextResponse.json({ orders, total, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as {
    productName: string; quantity: number; unit?: string;
    lineId?: string; methodId?: string; saleId?: string;
    plannedStart?: string; plannedEnd?: string; notes?: string; status?: string;
  };

  if (!body.productName || !body.quantity) {
    return NextResponse.json({ error: "productName and quantity required" }, { status: 400 });
  }

  const count = await prisma.productionOrder.count({ where: { tenantId } });
  const orderNo = `ÜE-${pad(count + 1)}`;

  const order = await prisma.productionOrder.create({
    data: {
      tenantId, orderNo,
      productName: body.productName,
      quantity: body.quantity,
      unit: body.unit ?? "adet",
      lineId:   body.lineId   || null,
      methodId: body.methodId || null,
      saleId:   body.saleId   || null,
      status:   body.status   ?? "planned",
      plannedStart: body.plannedStart ? new Date(body.plannedStart) : null,
      plannedEnd:   body.plannedEnd   ? new Date(body.plannedEnd)   : null,
      notes: body.notes ?? null,
    },
    include: {
      line:   { select: { id: true, name: true } },
      method: { select: { id: true, name: true, version: true } },
    },
  });

  return NextResponse.json(order, { status: 201 });
}
