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

// Rate limit rules: [path pattern, max requests, window in seconds, key prefix]
const RATE_LIMIT_RULES: Array<[RegExp, number, number, string]> = [
  [/^\/api\/auth\/(register|forgot-password|resend-verification)/, 5, 600, "auth"],
  [/^\/api\/tutors\/(email-otp|phone-otp|email-verify|phone-verify)/, 3, 600, "otp"],
  [/^\/api\/auth\/verify-email/, 5, 600, "otp"],
  [/^\/api\/auth\/totp\/validate/, 5, 300, "totp"],
  [/^\/api\/messages\//, 30, 60, "msg"],
  [/^\/api\/bookings/, 10, 60, "book"],
  [/^\/api\/referral\/apply/, 5, 3600, "ref"],
];

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

async function applyRateLimit(req: NextRequest): Promise<NextResponse | null> {
  // Skip if Upstash not configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  // Only rate limit mutating requests
  if (req.method === "GET" || req.method === "HEAD") return null;

  const { pathname } = req.nextUrl;

  for (const [pattern, limit, windowSecs, keyPrefix] of RATE_LIMIT_RULES) {
    if (!pattern.test(pathname)) continue;

    try {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { Redis } = await import("@upstash/redis");

      const ratelimit = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(limit, `${windowSecs} s`),
        analytics: false,
      });

      const ip = getClientIP(req);
      const { success, reset } = await ratelimit.limit(`${keyPrefix}:${ip}`);

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return NextResponse.json(
          { error: "Trop de tentatives. Veuillez réessayer dans quelques minutes." },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }
    } catch {
      // If package not installed or Redis error, skip rate limiting silently
    }
    break;
  }

  return null;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Apply rate limiting to API routes
  if (pathname.startsWith("/api/")) {
    const rateLimitResponse = await applyRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;
    return NextResponse.next();
  }

  // Auth protection for page routes
  const isSecure = process.env.NODE_ENV === "production";
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName: isSecure ? "__Secure-authjs.session-token" : "authjs.session-token",
  });
  const isLoggedIn = !!token;

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
