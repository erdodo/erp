import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNotifications, getUnreadCount, markAllAsRead, getAllNotifications } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const full = searchParams.get("full") === "1";
  const userId = session.user.id;
  const tenantId = session.user.tenantId!;

  if (full) {
    const data = await getAllNotifications(userId, tenantId, {
      page: Number(searchParams.get("page") ?? 1),
      module: searchParams.get("module") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });
    return NextResponse.json(data);
  }

  const [items, unread] = await Promise.all([
    getNotifications(userId, tenantId, 20),
    getUnreadCount(userId, tenantId),
  ]);

  return NextResponse.json({ items, unread });
}

export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await markAllAsRead(session.user.id, session.user.tenantId!);
  return NextResponse.json({ success: true });
}
