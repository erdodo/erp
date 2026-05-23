import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  isActive: z.boolean().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, modules: true, quotas: true } },
      modules: { where: { isActive: true }, select: { module: true } },
      quotas: true,
    },
  });

  if (!tenant) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
  return NextResponse.json({ tenant });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSuperAdminApi();
  if (error) return error;
  const { id } = await params;

  const body = await req.json();
  const data = UpdateSchema.parse(body);

  const old = await prisma.tenant.findUnique({ where: { id } });
  if (!old) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const tenant = await prisma.tenant.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: { userId: session!.user.id, action: "UPDATE", module: "superadmin.tenant", recordId: id, oldData: JSON.stringify(old), newData: JSON.stringify(data) },
  });

  return NextResponse.json({ tenant });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSuperAdminApi();
  if (error) return error;
  const { id } = await params;

  await prisma.tenant.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await prisma.auditLog.create({
    data: { userId: session!.user.id, action: "DELETE", module: "superadmin.tenant", recordId: id },
  });

  return NextResponse.json({ success: true });
}
