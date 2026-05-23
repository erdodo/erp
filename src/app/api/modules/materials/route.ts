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
    ...(search   ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {}),
    ...(category ? { category } : {}),
  };

  const [materials, total] = await Promise.all([
    prisma.material.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
    prisma.material.count({ where }),
  ]);

  const cats = await prisma.material.findMany({
    where: { tenantId, deletedAt: null, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });

  return NextResponse.json({ materials, total, pages: Math.ceil(total / limit), categories: cats.map((c) => c.category) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as {
    code: string; name: string; description?: string; category?: string; unit?: string;
    specifications?: string; suppliers?: string; minOrderQty?: number;
    leadTimeDays?: number; cost?: number; currency?: string;
  };
  if (!body.code || !body.name) return NextResponse.json({ error: "code and name required" }, { status: 400 });

  const material = await prisma.material.create({
    data: {
      tenantId,
      code:           body.code,
      name:           body.name,
      description:    body.description    ?? null,
      category:       body.category       ?? null,
      unit:           body.unit           ?? "kg",
      specifications: body.specifications ?? null,
      suppliers:      body.suppliers      ?? null,
      minOrderQty:    body.minOrderQty    ?? null,
      leadTimeDays:   body.leadTimeDays   ?? null,
      cost:           body.cost           ?? null,
      currency:       body.currency       ?? "TRY",
    },
  });
  return NextResponse.json(material, { status: 201 });
}
