import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name:      z.string().min(1).default("Ana Dashboard"),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const layouts = await prisma.dashboardLayout.findMany({
    where:   { userId: session.user.id, tenantId: session.user.tenantId! },
    include: { widgets: { orderBy: [{ y: "asc" }, { x: "asc" }] } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(layouts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  // If new layout is default, unset others
  if (parsed.data.isDefault) {
    await prisma.dashboardLayout.updateMany({
      where: { userId: session.user.id, tenantId: session.user.tenantId! },
      data:  { isDefault: false },
    });
  }

  const layout = await prisma.dashboardLayout.create({
    data: {
      userId:    session.user.id,
      tenantId:  session.user.tenantId!,
      name:      parsed.data.name,
      isDefault: parsed.data.isDefault ?? false,
    },
  });

  return NextResponse.json(layout, { status: 201 });
}
