import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const UpdateSchema = z.object({
  isActive: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSuperAdminApi();
  if (error) return error;
  const { id } = await params;

  const body = await req.json();
  const { newPassword, ...rest } = UpdateSchema.parse(body);

  const updateData: Record<string, unknown> = { ...rest };
  if (newPassword) {
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  const user = await prisma.user.update({ where: { id }, data: updateData });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "UPDATE",
      module: "superadmin.user",
      recordId: id,
      newData: JSON.stringify(rest),
    },
  });

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, isActive: user.isActive } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSuperAdminApi();
  if (error) return error;
  const { id } = await params;

  await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await prisma.auditLog.create({
    data: { userId: session!.user.id, action: "DELETE", module: "superadmin.user", recordId: id },
  });

  return NextResponse.json({ success: true });
}
