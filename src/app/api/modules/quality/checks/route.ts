import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const type   = searchParams.get("type")   ?? "";
  const result = searchParams.get("result") ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit  = 25;

  const where = {
    tenantId, deletedAt: null,
    ...(search ? { productName: { contains: search } } : {}),
    ...(type   ? { type }   : {}),
    ...(result ? { result } : {}),
  };

  const [checks, total] = await Promise.all([
    prisma.qualityCheck.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { checkedAt: "desc" },
      include: { standard: { select: { id: true, name: true, maxPpm: true } } },
    }),
    prisma.qualityCheck.count({ where }),
  ]);

  return NextResponse.json({ checks, total, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as {
    type: string; productName: string; batchNo?: string; quantity: number;
    defectCount?: number; result?: string; standardId?: string;
    inspector?: string; notes?: string; checkedAt?: string;
  };
  if (!body.productName || !body.quantity) return NextResponse.json({ error: "productName and quantity required" }, { status: 400 });

  const qty    = body.quantity;
  const defect = body.defectCount ?? 0;
  const ppm    = qty > 0 ? (defect / qty) * 1_000_000 : 0;

  const check = await prisma.qualityCheck.create({
    data: {
      tenantId,
      type:        body.type        ?? "incoming",
      productName: body.productName,
      batchNo:     body.batchNo     ?? null,
      quantity:    qty,
      defectCount: defect,
      ppm,
      result:      body.result      ?? "pending",
      standardId:  body.standardId  ?? null,
      inspector:   body.inspector   ?? null,
      notes:       body.notes       ?? null,
      checkedAt:   body.checkedAt   ? new Date(body.checkedAt) : new Date(),
    },
    include: { standard: true },
  });
  return NextResponse.json(check, { status: 201 });
}
