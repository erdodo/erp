import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

export async function GET() {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session!.user.tenantId! },
    select: { id: true, name: true, slug: true, logo: true, primaryColor: true, secondaryColor: true, currency: true, timezone: true, language: true },
  });

  return NextResponse.json({ tenant });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const body = await req.json();
  const data = UpdateSchema.parse(body);

  const tenant = await prisma.tenant.update({
    where: { id: session!.user.tenantId! },
    data,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session!.user.tenantId!,
      userId: session!.user.id,
      action: "UPDATE",
      module: "admin.settings",
      newData: JSON.stringify(data),
    },
  });

  return NextResponse.json({ tenant });
}
