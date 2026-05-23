import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requireModule("field-services");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { searchParams } = req.nextUrl;
  const status   = searchParams.get("status")   ?? "";
  const type     = searchParams.get("type")     ?? "";
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit    = 25;
  const where    = { tenantId, deletedAt: null, ...(status ? { status } : {}), ...(type ? { type } : {}) };
  const [services, total] = await Promise.all([
    prisma.fieldService.findMany({ where, skip: (page-1)*limit, take: limit, orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true } } } }),
    prisma.fieldService.count({ where }),
  ]);
  return NextResponse.json({ services, total, pages: Math.ceil(total/limit) });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("field-services");
  if (!guard.ok) return guard.res;
  const { tenantId, userId } = guard.session;
  const body = await req.json() as { title: string; type?: string; description?: string; customerId?: string; priority?: string; scheduledAt?: string };
  if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const s = await prisma.fieldService.create({ data: { tenantId, title: body.title, type: body.type ?? "repair", description: body.description ?? null, customerId: body.customerId ?? null, priority: body.priority ?? "medium", scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null, assignedTo: userId } });
  await auditLog(guard.session, "create", "field-services", s.id, { newData: body as Record<string, unknown>, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(s, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule("field-services");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { id: string; [key: string]: unknown };
  const { id, ...rest } = body;
  const s = await prisma.fieldService.update({ where: { id, tenantId }, data: {
    ...(rest.status      !== undefined ? { status: rest.status as string } : {}),
    ...(rest.notes       !== undefined ? { notes: rest.notes as string | null } : {}),
    ...(rest.status === "completed"    ? { completedAt: new Date() } : {}),
    ...(rest.status === "in_progress"  ? { startedAt: new Date() } : {}),
  } });
  await auditLog(guard.session, "update", "field-services", id, { newData: rest, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(s);
}
