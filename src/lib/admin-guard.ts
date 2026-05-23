import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin && !session?.user?.isSuperAdmin) {
    redirect("/dashboard");
  }
  return session;
}

export async function requireAdminApi() {
  const session = await auth();
  if (!session?.user?.isAdmin && !session?.user?.isSuperAdmin) {
    return { session: null, error: NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 }) };
  }
  if (!session.user.tenantId && !session.user.isSuperAdmin) {
    return { session: null, error: NextResponse.json({ error: "Tenant bulunamadı" }, { status: 403 }) };
  }
  return { session, error: null };
}
