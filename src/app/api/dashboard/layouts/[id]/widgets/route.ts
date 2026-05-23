import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const WidgetSchema = z.object({
  title:      z.string().min(1),
  type:       z.enum(["stat", "chart", "table", "list"]),
  dataSource: z.string().min(1),
  config:     z.record(z.string(), z.unknown()),
  x:          z.number().int().min(0).default(0),
  y:          z.number().int().min(0).default(0),
  w:          z.number().int().min(1).max(12).default(4),
  h:          z.number().int().min(1).max(12).default(3),
});

const BulkUpdateSchema = z.object({
  widgets: z.array(z.object({
    id: z.string(),
    x:  z.number(),
    y:  z.number(),
    w:  z.number().optional(),
    h:  z.number().optional(),
  })),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const layout = await prisma.dashboardLayout.findFirst({ where: { id, userId: session.user.id } });
  if (!layout) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const widgets = await prisma.dashboardWidget.findMany({
    where:   { layoutId: id },
    orderBy: [{ y: "asc" }, { x: "asc" }],
  });

  return NextResponse.json(widgets);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const layout = await prisma.dashboardLayout.findFirst({ where: { id, userId: session.user.id } });
  if (!layout) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json() as unknown;

  // Bulk position update
  if (typeof body === "object" && body !== null && "widgets" in body) {
    const parsed = BulkUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    await Promise.all(parsed.data.widgets.map((w) =>
      prisma.dashboardWidget.update({ where: { id: w.id }, data: { x: w.x, y: w.y, ...(w.w ? { w: w.w } : {}), ...(w.h ? { h: w.h } : {}) } })
    ));
    return NextResponse.json({ success: true });
  }

  // Create widget
  const parsed = WidgetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const widget = await prisma.dashboardWidget.create({
    data: {
      layoutId:   id,
      title:      parsed.data.title,
      type:       parsed.data.type,
      dataSource: parsed.data.dataSource,
      config:     JSON.stringify(parsed.data.config),
      x:          parsed.data.x,
      y:          parsed.data.y,
      w:          parsed.data.w,
      h:          parsed.data.h,
    },
  });

  return NextResponse.json(widget, { status: 201 });
}
