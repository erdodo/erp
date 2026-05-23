import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  roleId: z.string().nullable().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const tenantId = session!.user.tenantId!;

  const target = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!target) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  const body = await req.json();
  const { newPassword, ...rest } = UpdateSchema.parse(body);
  const updateData: Record<string, unknown> = { ...rest };
  if (newPassword) updateData.password = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({ where: { id }, data: updateData });

  await prisma.auditLog.create({
    data: { tenantId, userId: session!.user.id, action: "UPDATE", module: "admin.user", recordId: id, newData: JSON.stringify(rest) },
  });

  return NextResponse.json({ user: { id: user.id, name: user.name, isActive: user.isActive } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const tenantId = session!.user.tenantId!;

  const target = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!target) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  if (id === session!.user.id) return NextResponse.json({ error: "Kendinizi silemezsiniz" }, { status: 400 });

  await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await prisma.auditLog.create({
    data: { tenantId, userId: session!.user.id, action: "DELETE", module: "admin.user", recordId: id },
  });

  return NextResponse.json({ success: true });
}
