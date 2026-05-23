import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/sales-types";

const Schema = z.object({
  status: z.enum(["draft","quote","pending_approval","approved","preparing","shipped","delivered","invoiced","cancelled","returned"]),
  notes:  z.string().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const tenantId = session.user.tenantId!;

  const order = await prisma.sale.findFirst({
    where:   { id, tenantId, deletedAt: null },
    include: { items: { include: { stockItem: true } } },
  });
  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { status: newStatus } = parsed.data;

  // Validate allowed transitions
  const currentCfg = ORDER_STATUSES.find((s) => s.id === order.status);
  if (currentCfg && currentCfg.next && !currentCfg.next.includes(newStatus as never)) {
    return NextResponse.json({ error: `${order.status} → ${newStatus} geçişi izinli değil` }, { status: 400 });
  }

  // Stock integration
  if (newStatus === "approved") {
    // Reserve stock for each item
    for (const item of order.items) {
      if (!item.stockItemId) continue;
      await prisma.stockMovement.create({
        data: {
          itemId:      item.stockItemId,
          warehouseId: item.stockItem?.warehouseId ?? null,
          tenantId,
          type:        "reserve",
          quantity:    -item.quantity,
          reason:      `Sipariş rezervasyonu: ${order.saleNo}`,
          reference:   order.id,
        },
      });
    }
  }

  if (newStatus === "invoiced") {
    // Deduct from stock (commit reservation)
    for (const item of order.items) {
      if (!item.stockItemId) continue;
      await prisma.$transaction([
        prisma.stockMovement.create({
          data: {
            itemId:      item.stockItemId,
            warehouseId: item.stockItem?.warehouseId ?? null,
            tenantId,
            type:        "sale",
            quantity:    -item.quantity,
            reason:      `Fatura çıkışı: ${order.saleNo}`,
            reference:   order.id,
          },
        }),
        prisma.stockItem.update({
          where: { id: item.stockItemId },
          data:  { quantity: { decrement: item.quantity } },
        }),
      ]);
    }
    // Generate invoice reference
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    await prisma.sale.update({ where: { id }, data: { status: newStatus, invoiceUrl: invoiceNo } });
    return NextResponse.json({ success: true, invoiceNo });
  }

  if (newStatus === "cancelled") {
    // Release any reservations
    for (const item of order.items) {
      if (!item.stockItemId) continue;
      await prisma.stockMovement.create({
        data: {
          itemId:      item.stockItemId,
          warehouseId: item.stockItem?.warehouseId ?? null,
          tenantId,
          type:        "reserve_release",
          quantity:    item.quantity,
          reason:      `Sipariş iptali: ${order.saleNo}`,
          reference:   order.id,
        },
      });
    }
  }

  await prisma.sale.update({ where: { id }, data: { status: newStatus } });
  return NextResponse.json({ success: true });
}
