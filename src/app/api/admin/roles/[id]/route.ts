import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  permissions: z.array(z.object({ module: z.string(), action: z.string() })).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  const role = await prisma.role.findFirst({
    where: { id, tenantId: session!.user.tenantId! },
    include: { permissions: { include: { permission: true } } },
  });

  if (!role) return NextResponse.json({ error: "Rol bulunamadı" }, { status: 404 });
  return NextResponse.json({ role });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const tenantId = session!.user.tenantId!;

  const role = await prisma.role.findFirst({ where: { id, tenantId } });
  if (!role) return NextResponse.json({ error: "Rol bulunamadı" }, { status: 404 });

  const body = await req.json();
  const { permissions, ...data } = UpdateSchema.parse(body);

  await prisma.role.update({ where: { id }, data });

  if (permissions !== undefined) {
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    for (const p of permissions) {
      const perm = await prisma.permission.upsert({
        where: { module_action: { module: p.module, action: p.action } },
        create: { module: p.module, action: p.action },
        update: {},
      });
      await prisma.rolePermission.create({ data: { roleId: id, permissionId: perm.id } });
    }
  }

  await prisma.auditLog.create({
    data: { tenantId, userId: session!.user.id, action: "UPDATE", module: "admin.role", recordId: id },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const tenantId = session!.user.tenantId!;

  const role = await prisma.role.findFirst({ where: { id, tenantId } });
  if (!role) return NextResponse.json({ error: "Rol bulunamadı" }, { status: 404 });

  const userCount = await prisma.user.count({ where: { roleId: id, deletedAt: null } });
  if (userCount > 0) return NextResponse.json({ error: `Bu role atanmış ${userCount} kullanıcı var` }, { status: 400 });

  await prisma.role.update({ where: { id }, data: { deletedAt: new Date() } });

  await prisma.auditLog.create({
    data: { tenantId, userId: session!.user.id, action: "DELETE", module: "admin.role", recordId: id },
  });

  return NextResponse.json({ success: true });
}
