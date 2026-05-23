import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COUNT_STATUSES } from "@/lib/inventory-types";
import type { CountStatus } from "@/lib/inventory-types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const count = await prisma.inventoryCount.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      items: {
        include: { item: true },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(count);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const body = await req.json() as { status?: CountStatus; notes?: string };

  const count = await prisma.inventoryCount.findFirst({ where: { id, tenantId, deletedAt: null } });
  if (!count) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status) {
    const cfg = COUNT_STATUSES.find((s) => s.id === count.status);
    if (!cfg?.next.includes(body.status)) {
      return NextResponse.json({ error: `${count.status} → ${body.status} geçişi geçersiz` }, { status: 422 });
    }
  }

  const now = new Date();
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.notes  !== undefined) data.notes  = body.notes;
  if (body.status === "in_progress") data.startedAt   = now;
  if (body.status === "approved")    data.completedAt  = now;

  const updated = await prisma.inventoryCount.update({
    where: { id, tenantId },
    data,
    include: { items: { include: { item: true } } },
  });
  return NextResponse.json(updated);
}
