import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveModules } from "@/lib/modules";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId && !session?.user?.isSuperAdmin) {
    return NextResponse.json({ modules: [] });
  }

  if (session.user.isSuperAdmin) {
    const { ALL_MODULES } = await import("@/lib/modules-data");
    return NextResponse.json({ modules: ALL_MODULES });
  }

  const modules = await getActiveModules(session.user.tenantId!);
  return NextResponse.json({ modules });
}
