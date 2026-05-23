import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  permissions: z.array(z.object({ module: z.string(), action: z.string() })).optional(),
});

export async function GET() {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const tenantId = session!.user.tenantId!;

  const roles = await prisma.role.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { users: true } },
      permissions: { include: { permission: true } },
    },
  });

  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const tenantId = session!.user.tenantId!;

  const body = await req.json();
  const { permissions, ...data } = CreateSchema.parse(body);

  const role = await prisma.role.create({ data: { ...data, tenantId } });

  if (permissions?.length) {
    for (const p of permissions) {
      const perm = await prisma.permission.upsert({
        where: { module_action: { module: p.module, action: p.action } },
        create: { module: p.module, action: p.action },
        update: {},
      });
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
    }
  }

  await prisma.auditLog.create({
    data: { tenantId, userId: session!.user.id, action: "CREATE", module: "admin.role", recordId: role.id },
  });

  return NextResponse.json({ role }, { status: 201 });
}
