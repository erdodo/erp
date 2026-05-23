import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant yok" }, { status: 403 });

  const customers = await prisma.customer.findMany({
    where:   { tenantId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id:            true,
      name:          true,
      type:          true,
      email:         true,
      phone:         true,
      city:          true,
      pipelineStage: true,
      assignedTo:    true,
      tags:          true,
      createdAt:     true,
      updatedAt:     true,
      _count: { select: { interactions: true } },
    },
  });

  // Group by pipeline stage
  const grouped: Record<string, typeof customers> = {};
  for (const c of customers) {
    if (!grouped[c.pipelineStage]) grouped[c.pipelineStage] = [];
    grouped[c.pipelineStage].push(c);
  }

  return NextResponse.json({ customers, grouped });
}
