import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";
import { checkQuota, incrementQuota } from "@/lib/quota";

const CreateSchema = z.object({
  type:          z.enum(["corporate", "individual"]).default("corporate"),
  name:          z.string().min(1),
  email:         z.string().email().optional().or(z.literal("")),
  phone:         z.string().optional(),
  address:       z.string().optional(),
  city:          z.string().optional(),
  country:       z.string().default("TR"),
  taxNumber:     z.string().optional(),
  taxOffice:     z.string().optional(),
  website:       z.string().optional(),
  pipelineStage: z.string().default("lead"),
  assignedTo:    z.string().optional(),
  tags:          z.string().optional(),
  notes:         z.string().optional(),
});

export async function GET(req: NextRequest) {
  const guard = await requireModule("crm");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const stage  = searchParams.get("stage")  ?? "";
  const type   = searchParams.get("type")   ?? "";
  const assigned = searchParams.get("assignedTo") ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit  = Math.min(100, Number(searchParams.get("limit") ?? 25));
  const sortField = searchParams.get("sort") ?? "createdAt";
  const sortDir   = searchParams.get("dir")  === "asc" ? "asc" : "desc";

  const where: Record<string, unknown> = { tenantId, deletedAt: null };
  if (search)   where.name = { contains: search };
  if (stage)    where.pipelineStage = stage;
  if (type)     where.type = type;
  if (assigned) where.assignedTo = assigned;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip:  (page - 1) * limit,
      take:  limit,
      include: {
        _count:       { select: { contacts: true, interactions: true, sales: true } },
        // assignedUser not a direct relation — fetched separately if needed
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("crm");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;

  const quota = await checkQuota(tenantId, "customers");
  if (!quota.allowed) return NextResponse.json({ error: `Müşteri kotası doldu (${quota.current}/${quota.max})` }, { status: 429 });

  const body = await req.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const data = parsed.data;
  const customer = await prisma.customer.create({
    data: {
      tenantId,
      type:          data.type,
      name:          data.name,
      email:         data.email || null,
      phone:         data.phone || null,
      address:       data.address || null,
      city:          data.city || null,
      country:       data.country,
      taxNumber:     data.taxNumber || null,
      taxOffice:     data.taxOffice || null,
      website:       data.website || null,
      pipelineStage: data.pipelineStage,
      assignedTo:    data.assignedTo || null,
      tags:          data.tags || null,
      notes:         data.notes || null,
    },
  });

  await incrementQuota(tenantId, "customers");
  await auditLog(guard.session, "create", "crm", customer.id, { newData: data as Record<string, unknown>, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(customer, { status: 201 });
}
