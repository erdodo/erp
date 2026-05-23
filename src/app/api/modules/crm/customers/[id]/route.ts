import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  type:          z.enum(["corporate", "individual"]).optional(),
  name:          z.string().min(1).optional(),
  email:         z.string().email().optional().or(z.literal("")).or(z.null()),
  phone:         z.string().optional().or(z.null()),
  address:       z.string().optional().or(z.null()),
  city:          z.string().optional().or(z.null()),
  country:       z.string().optional(),
  taxNumber:     z.string().optional().or(z.null()),
  taxOffice:     z.string().optional().or(z.null()),
  website:       z.string().optional().or(z.null()),
  pipelineStage: z.string().optional(),
  assignedTo:    z.string().optional().or(z.null()),
  tags:          z.string().optional().or(z.null()),
  notes:         z.string().optional().or(z.null()),
});

type Ctx = { params: Promise<{ id: string }> };

async function getCustomer(id: string, tenantId: string) {
  return prisma.customer.findFirst({ where: { id, tenantId, deletedAt: null } });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: session.user.tenantId!, deletedAt: null },
    include: {
      contacts:     { where: { deletedAt: null }, orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      interactions: {
        where: { deletedAt: null },
        orderBy: { date: "desc" },
        take: 50,
      },
      _count: { select: { contacts: true, interactions: true, sales: true } },
    },
  });

  if (!customer) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  // Fetch assignedUser separately if assignedTo exists
  let assignedUser = null;
  if (customer.assignedTo) {
    assignedUser = await prisma.user.findUnique({
      where: { id: customer.assignedTo },
      select: { id: true, name: true, email: true },
    });
  }

  return NextResponse.json({ ...customer, assignedUser });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const customer = await getCustomer(id, session.user.tenantId!);
  if (!customer) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const updated = await prisma.customer.update({
    where: { id },
    data:  parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const customer = await getCustomer(id, session.user.tenantId!);
  if (!customer) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
