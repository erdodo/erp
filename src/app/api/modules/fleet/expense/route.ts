import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requireModule("fleet");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  
  const vehicleId = req.nextUrl.searchParams.get("vehicleId");
  if (!vehicleId) return NextResponse.json({ error: "vehicleId required" }, { status: 400 });

  // Verify vehicle belongs to tenant
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, tenantId, deletedAt: null },
  });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  const [fuelRecords, expenses] = await Promise.all([
    prisma.fuelRecord.findMany({
      where: { vehicleId, deletedAt: null },
      orderBy: { filledAt: "desc" },
    }),
    prisma.expense.findMany({
      where: { vehicleId, tenantId, deletedAt: null },
      orderBy: { expenseDate: "desc" },
      include: {
        category: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({ fuelRecords, expenses });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("fleet");
  if (!guard.ok) return guard.res;
  const { tenantId, userId } = guard.session;

  const body = await req.json() as {
    vehicleId: string;
    type: "fuel" | "maintenance" | "inspection" | "other";
    amount: number;
    currency?: string;
    date: string;
    notes?: string;
    liters?: number;
    station?: string;
    odometer?: number;
  };

  if (!body.vehicleId || !body.type || !body.amount || !body.date) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  // Verify vehicle belongs to tenant
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: body.vehicleId, tenantId, deletedAt: null },
  });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  // 1. Find or create the "Taşıt Giderleri" expense category for the tenant
  let category = await prisma.expenseCategory.findFirst({
    where: { tenantId, name: "Taşıt Giderleri", deletedAt: null },
  });
  if (!category) {
    category = await prisma.expenseCategory.create({
      data: {
        tenantId,
        name: "Taşıt Giderleri",
        isActive: true,
      },
    });
  }

  // 2. Set title based on type
  const typeLabels: Record<string, string> = {
    fuel: "Benzin/Yakıt Alımı",
    maintenance: "Araç Bakım / Onarım",
    inspection: "Araç Muayene Gideri",
    other: "Diğer Araç Gideri",
  };
  const title = `${typeLabels[body.type]} - ${vehicle.plate}`;

  // 3. Create the Expense entry (automatically approved since registered through fleet)
  const expense = await prisma.expense.create({
    data: {
      tenantId,
      vehicleId: body.vehicleId,
      categoryId: category.id,
      userId,
      title,
      amount: Number(body.amount),
      currency: body.currency ?? "TRY",
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date(),
      expenseDate: new Date(body.date),
      notes: body.notes ?? null,
    },
  });

  // 4. If type is fuel, also create a FuelRecord
  let fuelRecord = null;
  if (body.type === "fuel") {
    fuelRecord = await prisma.fuelRecord.create({
      data: {
        vehicleId: body.vehicleId,
        liters: body.liters ? Number(body.liters) : 0,
        cost: Number(body.amount),
        currency: body.currency ?? "TRY",
        odometer: body.odometer ? Number(body.odometer) : null,
        station: body.station ?? null,
        filledAt: new Date(body.date),
      },
    });
  }

  await auditLog(guard.session, "create", "fleet", body.vehicleId, {
    newData: { expenseId: expense.id, fuelRecordId: fuelRecord?.id },
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json({ expense, fuelRecord }, { status: 201 });
}
