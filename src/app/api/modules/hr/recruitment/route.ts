import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const where  = { tenantId, deletedAt: null, ...(status ? { status } : {}) };
  const postings = await prisma.jobPosting.findMany({
    where, orderBy: { openedAt: "desc" },
    include: { _count: { select: { applications: { where: { deletedAt: null } } } } },
  });
  return NextResponse.json({ postings });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { title: string; departmentId?: string; description?: string; requirements?: string };
  if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const p = await prisma.jobPosting.create({
    data: { tenantId, title: body.title, departmentId: body.departmentId ?? null, description: body.description ?? null, requirements: body.requirements ?? null },
    include: { _count: { select: { applications: true } } },
  });
  return NextResponse.json(p, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const body = await req.json() as { id: string; [key: string]: unknown };
  const { id, ...rest } = body;
  const p = await prisma.jobPosting.update({
    where: { id, tenantId },
    data: {
      ...(rest.title        !== undefined ? { title: rest.title as string } : {}),
      ...(rest.status       !== undefined ? { status: rest.status as string } : {}),
      ...(rest.description  !== undefined ? { description: rest.description as string | null } : {}),
      ...(rest.requirements !== undefined ? { requirements: rest.requirements as string | null } : {}),
      ...(rest.status === "closed"        ? { closedAt: new Date() } : {}),
    },
  });
  return NextResponse.json(p);
}
