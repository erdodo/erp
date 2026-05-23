import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkQuota } from "@/lib/quota";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ allowed: true, current: 0, max: -1, remaining: -1, isUnlimited: true });
  }

  const { resource } = await params;
  const quota = await checkQuota(session.user.tenantId, resource);
  return NextResponse.json(quota);
}
