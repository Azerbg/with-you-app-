import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const publicOnlyRoutes = ["/auth/login", "/auth/register", "/auth/forgot-password"];

const roleProtectedRoutes: Record<string, string[]> = {
  "/dashboard/admin":   ["ADMIN"],
  "/console/admin":     ["ADMIN"],
  "/dashboard/hr":      ["ADMIN", "HR"],
  "/console/hr":        ["ADMIN", "HR"],
  "/dashboard/tutor":   ["ADMIN", "HR", "TUTOR"],
  "/dashboard/student": ["ADMIN", "HR", "TUTOR", "STUDENT"],
  "/onboarding":        ["ADMIN", "HR", "TUTOR", "STUDENT"],
};

const authRequiredPrefixes = ["/dashboard", "/console", "/onboarding", "/booking", "/classroom", "/messages"];

export async function middleware(req: NextRequest) {
  const isSecure = process.env.NODE_ENV === "production";
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName: isSecure ? "__Secure-authjs.session-token" : "authjs.session-token",
  });
  const isLoggedIn = !!token;
  const pathname = req.nextUrl.pathname;

  if (isLoggedIn && !pathname.startsWith("/auth/totp") && publicOnlyRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  const needsAuth = authRequiredPrefixes.some((p) => pathname.startsWith(p));
  if (needsAuth && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn) {
    const role = token.role as string;
    const totpVerified = token.totpVerified as boolean;
    const totpEnabled = token.totpEnabled as boolean;
    const isHrOrAdmin = role === "HR" || role === "ADMIN";
    const isTotpPage = pathname.startsWith("/auth/totp") || pathname.startsWith("/console/hr/setup-2fa");

    if (isHrOrAdmin && !isTotpPage) {
      if (totpEnabled && !totpVerified) {
        return NextResponse.redirect(new URL("/auth/totp", req.nextUrl));
      }
      if (!totpEnabled && pathname.startsWith("/console/hr")) {
        return NextResponse.redirect(new URL("/console/hr/setup-2fa", req.nextUrl));
      }
    }

    for (const [prefix, allowedRoles] of Object.entries(roleProtectedRoutes)) {
      if (pathname.startsWith(prefix) && !allowedRoles.includes(role ?? "")) {
        return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
      }
    }
  }
       
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
 