import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboardPage = pathname.startsWith("/dashboard");
  const isSuperAdminPage = pathname.startsWith("/dashboard/superadmin");
  const isApiAuthRoute = pathname.startsWith("/api/auth");
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/locales");

  if (isPublicAsset || isApiAuthRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isAuthenticated = !!token;
  const isSuperAdmin = token?.isSuperAdmin === true;
  const isActive = token?.isActive !== false;

  console.log("[PROXY]", { pathname, isAuthenticated, isSuperAdmin, isActive, token: !!token });

  if (isDashboardPage && !isAuthenticated) {
    console.log("[PROXY] Redirecting to login - not authenticated");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isDashboardPage && isAuthenticated && !isActive) {
    console.log("[PROXY] Redirecting to login - inactive user");
    return NextResponse.redirect(new URL("/login?error=inactive", request.url));
  }

  if (isSuperAdminPage && !isSuperAdmin) {
    console.log("[PROXY] Redirecting to dashboard - not superadmin");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isAuthPage && isAuthenticated) {
    console.log("[PROXY] Redirecting to callbackUrl - already authenticated");
    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
  ],
};
