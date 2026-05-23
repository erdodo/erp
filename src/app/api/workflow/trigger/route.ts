import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { triggerWorkflows } from "@/lib/workflow-engine";
import { z } from "zod";

const TriggerSchema = z.object({
  module: z.string().min(1),
  event:  z.string().min(1),
  data:   z.record(z.string(), z.unknown()).default({}),
});

/**
 * Internal trigger endpoint.
 * Called by module APIs after state changes to fire matching workflows.
 * Usage: POST /api/workflow/trigger { module, event, data }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 403 });

  const body = await req.json() as unknown;
  const parsed = TriggerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  void triggerWorkflows({
    tenantId,
    module: parsed.data.module,
    event:  parsed.data.event,
    data:   parsed.data.data,
    userId: session.user.id,
  });

  return NextResponse.json({ queued: true });
}
