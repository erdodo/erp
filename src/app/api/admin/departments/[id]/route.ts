import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  managerId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const tenantId = session!.user.tenantId!;

  const dept = await prisma.department.findFirst({ where: { id, tenantId } });
  if (!dept) return NextResponse.json({ error: "Departman bulunamadı" }, { status: 404 });

  const body = await req.json();
  const data = UpdateSchema.parse(body);
  await prisma.department.update({ where: { id }, data });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const tenantId = session!.user.tenantId!;

  const dept = await prisma.department.findFirst({ where: { id, tenantId } });
  if (!dept) return NextResponse.json({ error: "Departman bulunamadı" }, { status: 404 });

  await prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });

  await prisma.auditLog.create({
    data: { tenantId, userId: session!.user.id, action: "DELETE", module: "admin.department", recordId: id },
  });

  return NextResponse.json({ success: true });
}
