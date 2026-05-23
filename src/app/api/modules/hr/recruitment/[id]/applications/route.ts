import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: postingId } = await params;
  const applications = await prisma.jobApplication.findMany({
    where: { postingId, deletedAt: null },
    orderBy: { appliedAt: "desc" },
    include: { interviews: { where: { deletedAt: null }, orderBy: { scheduledAt: "asc" } } },
  });
  return NextResponse.json({ applications });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: postingId } = await params;
  const body = await req.json() as { name: string; email: string; phone?: string; notes?: string };
  if (!body.name || !body.email) return NextResponse.json({ error: "name and email required" }, { status: 400 });
  const app = await prisma.jobApplication.create({
    data: { postingId, name: body.name, email: body.email, phone: body.phone ?? null, notes: body.notes ?? null },
  });
  return NextResponse.json(app, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { id: string; status?: string; notes?: string };
  const app = await prisma.jobApplication.update({
    where: { id: body.id },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.notes  !== undefined ? { notes:  body.notes  } : {}),
    },
    include: { interviews: { orderBy: { scheduledAt: "asc" } } },
  });
  return NextResponse.json(app);
}
