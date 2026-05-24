import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  
  const [warehouses, properties] = await Promise.all([
    prisma.warehouse.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        _count: { select: { stockItems: { where: { deletedAt: null } } } },
        rentals: {
          where: { deletedAt: null },
          select: { id: true, name: true, ownershipType: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.rentalProperty.findMany({
      where: { tenantId, deletedAt: null, type: "warehouse" },
      select: { id: true, name: true, warehouseId: true },
    }),
  ]);
  
  return NextResponse.json({ warehouses, properties });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as {
    name: string;
    location?: string;
    propertyId?: string;
    autoCreateProperty?: boolean;
    propertyOwnershipType?: string;
  };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  
  const w = await prisma.warehouse.create({ data: { tenantId, name: body.name, location: body.location ?? null } });
  
  if (body.propertyId) {
    await prisma.rentalProperty.update({
      where: { id: body.propertyId, tenantId },
      data: { warehouseId: w.id }
    });
  } else if (body.autoCreateProperty) {
    await prisma.rentalProperty.create({
      data: {
        tenantId,
        name: body.name,
        type: "warehouse",
        ownershipType: body.propertyOwnershipType || "owned_by_us",
        address: body.location || null,
        warehouseId: w.id,
        isActive: true,
      }
    });
  }
  
  return NextResponse.json(w, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as {
    id: string;
    name?: string;
    location?: string;
    isActive?: boolean;
    propertyId?: string | null;
  };
  
  const w = await prisma.warehouse.update({
    where: { id: body.id, tenantId },
    data: {
      ...(body.name     !== undefined ? { name: body.name } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });
  
  if (body.propertyId !== undefined) {
    await prisma.rentalProperty.updateMany({
      where: { warehouseId: body.id, tenantId },
      data: { warehouseId: null }
    });
    if (body.propertyId) {
      await prisma.rentalProperty.update({
        where: { id: body.propertyId, tenantId },
        data: { warehouseId: body.id }
      });
    }
  }
  
  return NextResponse.json(w);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await req.json() as { id: string };
  await prisma.warehouse.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

