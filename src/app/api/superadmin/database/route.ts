import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";

const TABLE_MAP: Record<string, string> = {
  Tenant: "tenant",
  User: "user",
  Role: "role",
  Permission: "permission",
  RolePermission: "rolePermission",
  TenantModule: "tenantModule",
  TenantQuota: "tenantQuota",
  AuditLog: "auditLog",
  Notification: "notification",
  Customer: "customer",
  Sale: "sale",
  Project: "project",
  Task: "task",
  Employee: "employee",
  Department: "department",
  StockItem: "stockItem",
  Warehouse: "warehouse",
  Equipment: "equipment",
  Vehicle: "vehicle",
};

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdminApi();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table") ?? "Tenant";
  const page = parseInt(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const limit = 50;

  const model = TABLE_MAP[table];
  if (!model) return NextResponse.json({ error: "Geçersiz tablo" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (prisma as any)[model];
  if (!delegate) return NextResponse.json({ error: "Model bulunamadı" }, { status: 400 });

  const where = search ? {
    OR: [
      { id: { contains: search } },
      ...(["name", "email", "slug", "title"].map((f) => ({ [f]: { contains: search } })).filter(Boolean)),
    ],
  } : {};

  try {
    const [rows, total] = await Promise.all([
      delegate.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }).catch(() =>
        delegate.findMany({ where, skip: (page - 1) * limit, take: limit })
      ),
      delegate.count({ where }).catch(() => 0),
    ]);

    const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];
    return NextResponse.json({ rows, columns, total, page });
  } catch {
    return NextResponse.json({ rows: [], columns: [], total: 0, page: 1 });
  }
}
