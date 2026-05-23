import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit  = 25;
  const skip   = (page - 1) * limit;

  const where = {
    tenantId, deletedAt: null,
    ...(search ? { name: { contains: search } } : {}),
    ...(status ? { status } : {}),
  };

  const [methods, total] = await Promise.all([
    prisma.productionMethod.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.productionMethod.count({ where }),
  ]);

  return NextResponse.json({ methods, total, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as {
    name: string; version?: string; description?: string;
    steps?: string; materials?: string; equipment?: string;
  };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const method = await prisma.productionMethod.create({
    data: {
      tenantId,
      name: body.name,
      version:     body.version     ?? "1.0",
      description: body.description ?? null,
      steps:       body.steps       ?? null,
      materials:   body.materials   ?? null,
      equipment:   body.equipment   ?? null,
      status: "draft",
    },
  });
  return NextResponse.json(method, { status: 201 });
}
