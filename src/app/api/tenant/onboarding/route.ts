import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ done: true });
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { onboardingDone: true },
  });
  return NextResponse.json({ done: tenant?.onboardingDone ?? true });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ ok: false }, { status: 403 });
  await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: { onboardingDone: true },
  });
  return NextResponse.json({ ok: true });
}
