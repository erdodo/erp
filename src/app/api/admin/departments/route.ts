import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(2),
  managerId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

export async function GET() {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const tenantId = session!.user.tenantId!;

  const departments = await prisma.department.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true } } },
  });

  return NextResponse.json({ departments });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const tenantId = session!.user.tenantId!;

  const body = await req.json();
  const data = Schema.parse(body);

  const dept = await prisma.department.create({ data: { ...data, tenantId } });

  await prisma.auditLog.create({
    data: { tenantId, userId: session!.user.id, action: "CREATE", module: "admin.department", recordId: dept.id },
  });

  return NextResponse.json({ department: dept }, { status: 201 });
}
