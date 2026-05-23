import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { searchParams } = req.nextUrl;
  const status     = searchParams.get("status")     ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";
  const page       = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit      = 25;
  const where = {
    tenantId,
    deletedAt: null,
    ...(status     ? { status }     : {}),
    ...(employeeId ? { employeeId } : {}),
  };
  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where, skip: (page-1)*limit, take: limit, orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { id: true, name: true, employeeNo: true } },
        approver: { select: { id: true, name: true } },
      },
    }),
    prisma.leaveRequest.count({ where }),
  ]);
  return NextResponse.json({ requests, total, pages: Math.ceil(total/limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as {
    employeeId: string; leaveType: string; startDate: string; endDate: string;
    days: number; reason?: string;
  };
  if (!body.employeeId || !body.startDate || !body.endDate) return NextResponse.json({ error: "required fields missing" }, { status: 400 });
  const req2 = await prisma.leaveRequest.create({
    data: {
      tenantId, employeeId: body.employeeId, leaveType: body.leaveType ?? "annual",
      startDate: new Date(body.startDate), endDate: new Date(body.endDate),
      days: body.days ?? 1, reason: body.reason ?? null,
      requestedBy: session.user.id,
    },
    include: { employee: { select: { id: true, name: true, employeeNo: true } } },
  });
  return NextResponse.json(req2, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { id: string; status: string; notes?: string };
  const updated = await prisma.leaveRequest.update({
    where: { id: body.id },
    data: {
      status: body.status,
      ...(body.status === "approved" ? { approvedBy: session.user.id, approvedAt: new Date() } : {}),
      ...(body.notes !== undefined   ? { notes: body.notes }  : {}),
    },
    include: { employee: { select: { id: true, name: true, employeeNo: true } } },
  });
  return NextResponse.json(updated);
}
