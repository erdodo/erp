import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const CreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.string().optional(),
  isAdmin: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const tenantId = session!.user.tenantId!;

  const where = {
    tenantId,
    deletedAt: null,
    ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, isActive: true, isAdmin: true,
      createdAt: true, lastLoginAt: true,
      role: { select: { id: true, name: true } },
    },
  });

  const roles = await prisma.role.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, name: true } });

  return NextResponse.json({ users, roles });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const tenantId = session!.user.tenantId!;

  const body = await req.json();
  const data = CreateSchema.parse(body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return NextResponse.json({ error: "Bu e-posta zaten kullanılıyor" }, { status: 400 });

  const hashed = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId,
      name: data.name,
      email: data.email,
      password: hashed,
      roleId: data.roleId,
      isAdmin: data.isAdmin ?? false,
    },
  });

  await prisma.auditLog.create({
    data: { tenantId, userId: session!.user.id, action: "CREATE", module: "admin.user", recordId: user.id },
  });

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
}
