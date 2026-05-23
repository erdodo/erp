import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getUnreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const tenantId = session.user.tenantId!;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial count
      const initial = await getUnreadCount(userId, tenantId);
      send({ unread: initial });

      // Poll every 15 seconds
      const interval = setInterval(async () => {
        try {
          const count = await getUnreadCount(userId, tenantId);
          send({ unread: count });
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 15_000);

      // Clean up on disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
