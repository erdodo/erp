import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdminApi();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;

  const where = {
    deletedAt: null,
    ...(search ? { name: { contains: search } } : {}),
  };

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { users: true, modules: true } },
      },
    }),
    prisma.tenant.count({ where }),
  ]);

  return NextResponse.json({ tenants, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSuperAdminApi();
  if (error) return error;

  const body = await req.json();
  const data = CreateSchema.parse(body);

  const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } });
  if (existing) return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 400 });

  const tenant = await prisma.tenant.create({ data });

  await prisma.auditLog.create({
    data: { userId: session!.user.id, action: "CREATE", module: "superadmin.tenant", recordId: tenant.id, newData: JSON.stringify(data) },
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
