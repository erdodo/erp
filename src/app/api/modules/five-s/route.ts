import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const { searchParams } = req.nextUrl;
  const page  = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 25;
  const skip  = (page - 1) * limit;

  const where = { tenantId, deletedAt: null };
  const [audits, total] = await Promise.all([
    prisma.fiveSAudit.findMany({ where, skip, take: limit, orderBy: { auditDate: "desc" } }),
    prisma.fiveSAudit.count({ where }),
  ]);

  const avg = audits.length > 0
    ? audits.reduce((s, a) => s + a.totalScore, 0) / audits.length
    : 0;

  return NextResponse.json({ audits, total, pages: Math.ceil(total / limit), avgScore: avg });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  const body = await req.json() as {
    title: string; location?: string; auditor?: string;
    sort: number; setInOrder: number; shine: number; standardize: number; sustain: number;
    notes?: string; actions?: string; auditDate?: string;
  };

  if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const totalScore = ((body.sort + body.setInOrder + body.shine + body.standardize + body.sustain) / 5);

  const audit = await prisma.fiveSAudit.create({
    data: {
      tenantId,
      title: body.title,
      location:  body.location  ?? null,
      auditor:   body.auditor   ?? null,
      sort:        body.sort,
      setInOrder:  body.setInOrder,
      shine:       body.shine,
      standardize: body.standardize,
      sustain:     body.sustain,
      totalScore:  Math.round(totalScore * 100) / 100,
      notes:   body.notes   ?? null,
      actions: body.actions ?? null,
      auditDate: body.auditDate ? new Date(body.auditDate) : new Date(),
    },
  });
  return NextResponse.json(audit, { status: 201 });
}
