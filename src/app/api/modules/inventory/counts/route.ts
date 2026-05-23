import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const page  = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
  const limit = 25;
  const skip  = (page - 1) * limit;

  const where = { tenantId, deletedAt: null };
  const [counts, total] = await Promise.all([
    prisma.inventoryCount.findMany({
      where, skip, take: limit, orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } },
    }),
    prisma.inventoryCount.count({ where }),
  ]);
  return NextResponse.json({ counts, total, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as { name: string; notes?: string };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const count = await prisma.inventoryCount.create({
    data: { tenantId, name: body.name, notes: body.notes ?? null },
  });
  return NextResponse.json(count, { status: 201 });
}
