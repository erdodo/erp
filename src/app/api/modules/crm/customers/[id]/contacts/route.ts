import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ContactSchema = z.object({
  name:      z.string().min(1),
  title:     z.string().optional(),
  email:     z.string().optional(),
  phone:     z.string().optional(),
  isPrimary: z.boolean().default(false),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: session.user.tenantId!, deletedAt: null },
  });
  if (!customer) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const contacts = await prisma.customerContact.findMany({
    where:   { customerId: id, deletedAt: null },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: session.user.tenantId!, deletedAt: null },
  });
  if (!customer) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  // If new contact is primary, un-primary others
  if (parsed.data.isPrimary) {
    await prisma.customerContact.updateMany({
      where: { customerId: id },
      data:  { isPrimary: false },
    });
  }

  const contact = await prisma.customerContact.create({
    data: {
      customerId: id,
      name:      parsed.data.name,
      title:     parsed.data.title || null,
      email:     parsed.data.email || null,
      phone:     parsed.data.phone || null,
      isPrimary: parsed.data.isPrimary,
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
