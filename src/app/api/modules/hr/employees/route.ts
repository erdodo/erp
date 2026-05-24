import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";
import { checkQuota, incrementQuota } from "@/lib/quota";

export async function GET(req: NextRequest) {
  const guard = await requireModule("employees");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const deptId = searchParams.get("departmentId") ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit  = 25;
  const where = {
    tenantId, deletedAt: null,
    ...(search ? { OR: [{ name: { contains: search } }, { employeeNo: { contains: search } }, { position: { contains: search } }] } : {}),
    ...(deptId ? { departmentId: deptId } : {}),
  };
  const [employees, total, departments, stores] = await Promise.all([
    prisma.employee.findMany({ where, skip: (page-1)*limit, take: limit, orderBy: { name: "asc" },
      include: {
        department: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
        vehicles: { where: { deletedAt: null }, select: { id: true, plate: true, brand: true, model: true } },
      } }),
    prisma.employee.count({ where }),
    prisma.department.findMany({ where: { tenantId, deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.retailStore.findMany({ where: { tenantId, deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json({ employees, total, pages: Math.ceil(total/limit), departments, stores });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("employees");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const quota = await checkQuota(tenantId, "employees");
  if (!quota.allowed) return NextResponse.json({ error: `Çalışan kotası doldu (${quota.current}/${quota.max})` }, { status: 429 });
  const body = await req.json() as {
    employeeNo: string; name: string; email?: string; phone?: string; departmentId?: string; storeId?: string;
    position?: string; managerId?: string; salary?: number; currency?: string;
    hireDate?: string; birthDate?: string; address?: string;
  };
  if (!body.employeeNo || !body.name) return NextResponse.json({ error: "employeeNo and name required" }, { status: 400 });
  const emp = await prisma.employee.create({
    data: {
      tenantId, employeeNo: body.employeeNo, name: body.name, email: body.email ?? null,
      phone: body.phone ?? null, departmentId: body.departmentId ?? null, storeId: body.storeId ?? null,
      position: body.position ?? null, managerId: body.managerId ?? null,
      salary: body.salary ?? null, currency: body.currency ?? "TRY",
      hireDate: body.hireDate ? new Date(body.hireDate) : null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      address: body.address ?? null,
    },
    include: {
      department: { select: { id: true, name: true } },
      store: { select: { id: true, name: true } },
    },
  });
  await incrementQuota(tenantId, "employees");
  await auditLog(guard.session, "create", "employees", emp.id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json(emp, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule("employees");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { id: string; [key: string]: unknown };
  const { id, ...rest } = body;
  const emp = await prisma.employee.update({
    where: { id, tenantId },
    data: {
      ...(rest.name         !== undefined ? { name: rest.name as string } : {}),
      ...(rest.email        !== undefined ? { email: rest.email as string | null } : {}),
      ...(rest.phone        !== undefined ? { phone: rest.phone as string | null } : {}),
      ...(rest.departmentId !== undefined ? { departmentId: rest.departmentId as string | null } : {}),
      ...(rest.storeId      !== undefined ? { storeId: rest.storeId as string | null } : {}),
      ...(rest.position     !== undefined ? { position: rest.position as string | null } : {}),
      ...(rest.managerId    !== undefined ? { managerId: rest.managerId as string | null } : {}),
      ...(rest.salary       !== undefined ? { salary: rest.salary as number | null } : {}),
      ...(rest.isActive     !== undefined ? { isActive: rest.isActive as boolean } : {}),
      ...(rest.hireDate     !== undefined ? { hireDate: rest.hireDate ? new Date(rest.hireDate as string) : null } : {}),
    },
  });
  await auditLog(guard.session, "update", "employees", id, { newData: rest, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(emp);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireModule("employees");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await req.json() as { id: string };
  await prisma.employee.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  await auditLog(guard.session, "delete", "employees", id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json({ ok: true });
}
