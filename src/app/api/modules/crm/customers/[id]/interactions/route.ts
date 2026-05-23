import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const InteractionSchema = z.object({
  type:    z.enum(["call", "email", "meeting", "note", "visit"]),
  subject: z.string().min(1),
  body:    z.string().optional(),
  date:    z.string().optional(),
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

  const interactions = await prisma.customerInteraction.findMany({
    where:   { customerId: id, deletedAt: null },
    orderBy: { date: "desc" },
    take:    100,
  });

  // Fetch user names for interactions
  const userIds = [...new Set(interactions.map((i) => i.userId).filter(Boolean))] as string[];
  const users   = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const result = interactions.map((i) => ({
    ...i,
    user: i.userId ? (userMap[i.userId] ?? null) : null,
  }));

  return NextResponse.json(result);
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
  const parsed = InteractionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const interaction = await prisma.customerInteraction.create({
    data: {
      customerId: id,
      userId:     session.user.id,
      type:       parsed.data.type,
      subject:    parsed.data.subject,
      body:       parsed.data.body || null,
      date:       parsed.data.date ? new Date(parsed.data.date) : new Date(),
    },
  });

  return NextResponse.json(interaction, { status: 201 });
}
