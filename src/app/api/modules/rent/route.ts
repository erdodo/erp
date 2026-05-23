import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const properties = await prisma.rentalProperty.findMany({
    where: { tenantId, deletedAt: null }, orderBy: { createdAt: "desc" },
    include: { _count: { select: { contracts: { where: { deletedAt: null } } } }, contracts: { where: { deletedAt: null, isActive: true }, include: { payments: { where: { deletedAt: null }, orderBy: { dueDate: "asc" } } } } },
  });
  return NextResponse.json({ properties });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { type: string; name?: string; tenantName?: string; amount?: number; currency?: string; startDate?: string; endDate?: string; propertyId?: string; address?: string };
  if (body.type === "property") {
    if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const p = await prisma.rentalProperty.create({ data: { tenantId, name: body.name, address: body.address ?? null } });
    return NextResponse.json(p, { status: 201 });
  }
  if (!body.propertyId || !body.tenantName || !body.amount || !body.startDate) return NextResponse.json({ error: "required fields missing" }, { status: 400 });
  const c = await prisma.rentalContract.create({ data: { propertyId: body.propertyId, tenantName: body.tenantName, amount: body.amount, currency: body.currency ?? "TRY", startDate: new Date(body.startDate), endDate: body.endDate ? new Date(body.endDate) : null } });
  return NextResponse.json(c, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { type: string; id: string; [key: string]: unknown };
  if (body.type === "payment") {
    const p = await prisma.rentalPayment.update({ where: { id: body.id }, data: { status: "paid", paidAt: new Date() } });
    return NextResponse.json(p);
  }
  const c = await prisma.rentalContract.update({ where: { id: body.id }, data: { isActive: false } });
  return NextResponse.json(c);
}
