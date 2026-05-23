import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRODUCTION_STATUSES, type ProductionStatus } from "@/lib/production-types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;
  const { id } = await params;

  const { status: newStatus } = await req.json() as { status: ProductionStatus };

  const order = await prisma.productionOrder.findFirst({ where: { id, tenantId, deletedAt: null } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const current = PRODUCTION_STATUSES.find((s) => s.id === order.status);
  if (!current?.next.includes(newStatus)) {
    return NextResponse.json({ error: `${order.status} → ${newStatus} geçişi geçersiz` }, { status: 422 });
  }

  const now = new Date();
  const data: Record<string, unknown> = { status: newStatus };

  if (newStatus === "in_progress" && !order.actualStart) data.actualStart = now;
  if (newStatus === "completed")                          data.actualEnd   = now;

  const updated = await prisma.productionOrder.update({
    where: { id, tenantId },
    data,
    include: { line: true, method: true },
  });

  return NextResponse.json(updated);
}
