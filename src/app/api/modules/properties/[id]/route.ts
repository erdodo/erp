import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireModule("rental");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await params;

  const property = await prisma.rentalProperty.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      store: true,
      warehouse: true,
    },
  });

  if (!property) {
    return NextResponse.json({ error: "Mülk bulunamadı" }, { status: 404 });
  }

  // Fetch contracts & payments
  const contracts = await prisma.rentalContract.findMany({
    where: { propertyId: id, deletedAt: null },
    orderBy: { startDate: "desc" },
    include: {
      payments: {
        where: { deletedAt: null },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  // Fetch connected module summaries
  let employees: any[] = [];
  let expenses: any[] = [];
  let subscriptions: any[] = [];
  let transactions: any[] = [];
  let sales: any[] = [];
  let stockItems: any[] = [];
  let stockMovements: any[] = [];

  // 1. Retail Store connection
  if (property.storeId) {
    const storeId = property.storeId;
    [employees, expenses, subscriptions, transactions, sales] = await Promise.all([
      prisma.employee.findMany({
        where: { tenantId, storeId, deletedAt: null, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, position: true, email: true, phone: true, employeeNo: true },
      }),
      prisma.expense.findMany({
        where: { tenantId, storeId, deletedAt: null },
        orderBy: { expenseDate: "desc" },
        take: 20,
        select: { id: true, title: true, amount: true, currency: true, status: true, expenseDate: true },
      }),
      prisma.subscription.findMany({
        where: { tenantId, storeId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, plan: true, amount: true, currency: true, status: true, nextRenewal: true },
      }),
      prisma.retailTransaction.findMany({
        where: { storeId, deletedAt: null },
        orderBy: { transactedAt: "desc" },
        take: 30,
      }),
      prisma.sale.findMany({
        where: { tenantId, retailStoreId: storeId, deletedAt: null },
        orderBy: { orderDate: "desc" },
        take: 20,
        include: { customer: { select: { name: true } } },
      }),
    ]);
  }

  // 2. Warehouse connection
  const warehouseId = property.warehouseId;
  if (warehouseId) {
    [stockItems, stockMovements] = await Promise.all([
      prisma.stockItem.findMany({
        where: { tenantId, warehouseId, deletedAt: null },
        orderBy: { name: "asc" },
      }),
      prisma.stockMovement.findMany({
        where: { warehouseId },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { item: { select: { name: true } } },
      }),
    ]);
  } else if (property.type === "warehouse") {
    // If no direct warehouse is linked but type is warehouse, try finding one by name
    const w = await prisma.warehouse.findFirst({
      where: { tenantId, name: property.name, deletedAt: null },
    });
    if (w) {
      [stockItems, stockMovements] = await Promise.all([
        prisma.stockItem.findMany({
          where: { tenantId, warehouseId: w.id, deletedAt: null },
          orderBy: { name: "asc" },
        }),
        prisma.stockMovement.findMany({
          where: { warehouseId: w.id },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { item: { select: { name: true } } },
        }),
      ]);
    }
  }

  // 3. Equipments (location matches property name)
  const equipments = await prisma.equipment.findMany({
    where: {
      tenantId,
      deletedAt: null,
      location: {
        contains: property.name,
      },
    },
    orderBy: { code: "asc" },
  });

  // 4. Production (Factory) - Fetch lines & orders
  let productionLines: any[] = [];
  let productionOrders: any[] = [];
  if (property.type === "factory" || property.type === "production") {
    [productionLines, productionOrders] = await Promise.all([
      prisma.productionLine.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.productionOrder.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { line: { select: { name: true } } },
      }),
    ]);
  }

  // Calculate quick stats
  const activeContracts = contracts.filter((c) => c.isActive);
  const monthlyRevenue = activeContracts.reduce((sum, c) => sum + c.amount, 0);
  
  const retailSales = transactions.filter((t) => t.type === "sale").reduce((sum, t) => sum + t.totalAmount, 0);
  const orderSales = sales.filter((s) => s.status === "completed" || s.status === "approved").reduce((sum, s) => sum + s.totalAmount, 0);
  const totalRevenue = retailSales + orderSales;

  return NextResponse.json({
    property,
    contracts,
    employees,
    expenses,
    subscriptions,
    transactions,
    sales,
    stockItems,
    stockMovements,
    equipments,
    productionLines,
    productionOrders,
    stats: {
      monthlyRevenue,
      totalRevenue,
      contractsCount: contracts.length,
      employeesCount: employees.length,
      stockCount: stockItems.length,
      equipmentsCount: equipments.length,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await requireModule("rental");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await params;

  const body = await req.json() as Record<string, unknown>;

  const property = await prisma.rentalProperty.update({
    where: { id, tenantId },
    data: body,
  });

  await auditLog(guard.session, "update", "rental", id, {
    newData: body,
    ipAddress: getIpFromRequest(req),
  });

  return NextResponse.json(property);
}
