import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Routes accessible only when NOT authenticated
const publicOnlyRoutes = ["/auth/login", "/auth/register", "/auth/forgot-password"];

// Route prefix → required roles (empty array = any authenticated user)
const roleProtectedRoutes: Record<string, string[]> = {
  "/dashboard/admin":  ["ADMIN"],
  "/console/admin":    ["ADMIN"],
  "/dashboard/hr":     ["ADMIN", "HR"],
  "/console/hr":       ["ADMIN", "HR"],
  "/dashboard/tutor":  ["ADMIN", "HR", "TUTOR"],
  "/dashboard/student":["ADMIN", "HR", "TUTOR", "STUDENT"],
  "/onboarding":       ["ADMIN", "HR", "TUTOR", "STUDENT"],
};

// Routes that require login (any role)
const authRequiredPrefixes = ["/dashboard", "/console", "/onboarding", "/booking", "/classroom", "/messages"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const pathname = nextUrl.pathname;

  // Redirect logged-in users away from auth pages (but allow /auth/totp)
  if (isLoggedIn && !pathname.startsWith("/auth/totp") && publicOnlyRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Require login for protected prefixes
  const needsAuth = authRequiredPrefixes.some((p) => pathname.startsWith(p));
  if (needsAuth && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // TOTP enforcement for HR/ADMIN users
  if (isLoggedIn) {
    const role = session?.user?.role;
    const totpVerified = (session?.user as { totpVerified?: boolean })?.totpVerified;
    const totpEnabled = (session?.user as { totpEnabled?: boolean })?.totpEnabled;
    const isHrOrAdmin = role === "HR" || role === "ADMIN";

    // Skip TOTP pages themselves to avoid redirect loops
    const isTotpPage = pathname.startsWith("/auth/totp") || pathname.startsWith("/console/hr/setup-2fa");

    if (isHrOrAdmin && !isTotpPage) {
      if (totpEnabled && !totpVerified) {
        // Has TOTP enabled but not yet verified this session → verify page
        return NextResponse.redirect(new URL("/auth/totp", nextUrl));
      }
      if (!totpEnabled && pathname.startsWith("/console/hr") && !pathname.startsWith("/console/hr/setup-2fa")) {
        // TOTP not set up yet → force setup
        return NextResponse.redirect(new URL("/console/hr/setup-2fa", nextUrl));
      }
    }
  }

  // Role-based access control
  if (isLoggedIn) {
    const userRole = session?.user?.role;
    for (const [prefix, allowedRoles] of Object.entries(roleProtectedRoutes)) {
      if (pathname.startsWith(prefix) && !allowedRoles.includes(userRole ?? "")) {
        return NextResponse.redirect(new URL("/unauthorized", nextUrl));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
