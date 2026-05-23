import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name:      z.string().min(1).optional(),
  title:     z.string().optional().or(z.null()),
  email:     z.string().email().optional().or(z.literal("")).or(z.null()),
  phone:     z.string().optional().or(z.null()),
  isPrimary: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string; cId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cId } = await params;

  const contact = await prisma.customerContact.findFirst({
    where: { id: cId, customerId: id, customer: { tenantId: session.user.tenantId! } },
  });
  if (!contact) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  if (parsed.data.isPrimary) {
    await prisma.customerContact.updateMany({ where: { customerId: id }, data: { isPrimary: false } });
  }

  await prisma.customerContact.update({ where: { id: cId }, data: parsed.data });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cId } = await params;

  const contact = await prisma.customerContact.findFirst({
    where: { id: cId, customerId: id, customer: { tenantId: session.user.tenantId! } },
  });
  if (!contact) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await prisma.customerContact.update({ where: { id: cId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
