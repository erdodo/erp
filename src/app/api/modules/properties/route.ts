import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(_req: NextRequest) {
  const guard = await requireModule("rental");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;

  const properties = await prisma.rentalProperty.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contracts: { where: { deletedAt: null } } } },
      store: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
      contracts: {
        where: { deletedAt: null, isActive: true },
        select: { id: true, tenantName: true, amount: true, currency: true },
      },
    },
  });

  return NextResponse.json({ properties });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("rental");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;

  const body = await req.json() as {
    name: string;
    type: string;
    ownershipType?: string;
    address?: string;
    area?: number;
    storeId?: string;
    warehouseId?: string;
    autoCreateStore?: boolean;
    autoCreateWarehouse?: boolean;
  };

  if (!body.name) return NextResponse.json({ error: "İsim zorunludur" }, { status: 400 });

  let storeId = body.storeId || null;
  let warehouseId = body.warehouseId || null;

  // Auto-create Retail Store if toggled
  if (body.type === "retail" && body.autoCreateStore && !storeId) {
    const store = await prisma.retailStore.create({
      data: {
        tenantId,
        name: body.name,
        address: body.address || null,
        isActive: true,
      },
    });
    storeId = store.id;
  }

  // Auto-create Warehouse if toggled
  if (body.type === "warehouse" && body.autoCreateWarehouse && !warehouseId) {
    const warehouse = await prisma.warehouse.create({
      data: {
        tenantId,
        name: body.name,
        location: body.address || null,
        isActive: true,
      },
    });
    warehouseId = warehouse.id;
  }

  const property = await prisma.rentalProperty.create({
    data: {
      tenantId,
      name: body.name,
      type: body.type || "office",
      ownershipType: body.ownershipType || "leased_to_tenant",
      address: body.address || null,
      area: body.area ? Number(body.area) : null,
      storeId,
      warehouseId,
      isActive: true,
    },
    include: {
      store: true,
      warehouse: true,
    },
  });

  await auditLog(guard.session, "create", "rental", property.id, {
    newData: body as Record<string, unknown>,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json(property, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule("rental");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;

  const body = await req.json() as {
    id: string;
    name?: string;
    type?: string;
    ownershipType?: string;
    address?: string;
    area?: number;
    storeId?: string | null;
    warehouseId?: string | null;
    isActive?: boolean;
  };

  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "ID gereklidir" }, { status: 400 });

  const dataToUpdate: Record<string, any> = { ...rest };
  if (rest.area !== undefined) dataToUpdate.area = rest.area ? Number(rest.area) : null;

  const property = await prisma.rentalProperty.update({
    where: { id, tenantId },
    data: dataToUpdate,
    include: {
      store: true,
      warehouse: true,
    },
  });

  await auditLog(guard.session, "update", "rental", id, {
    newData: rest as Record<string, unknown>,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json(property);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireModule("rental");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "ID gereklidir" }, { status: 400 });

  await prisma.rentalProperty.update({
    where: { id, tenantId },
    data: { deletedAt: new Date() },
  });

  await auditLog(guard.session, "delete", "rental", id, {
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json({ ok: true });
}
