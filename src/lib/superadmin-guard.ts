import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    redirect("/dashboard");
  }
  return session;
}

export async function requireSuperAdminApi() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return { session: null, error: NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 }) };
  }
  return { session, error: null };
}
