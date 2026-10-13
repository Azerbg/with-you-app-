import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { issueSignedToken, presignUrl } from "@vercel/blob";

/**
 * GET /api/hr/document?url=<encodedBlobUrl>
 *
 * Auth-gated gateway for HR documents (CV, letter, certificates).
 * - Private blobs (access:"private"): issues a 5-min presigned URL and redirects.
 *   No file bytes pass through this server — Vercel CDN serves it directly.
 * - Legacy public blobs: redirects straight to the public URL (still requires
 *   a valid HR/ADMIN session to get the redirect).
 *
 * Only HR and ADMIN roles can access.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) return new NextResponse("Missing url param", { status: 400 });

  // Reject non-blob URLs (SSRF guard)
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }
  if (!parsed.hostname.endsWith(".blob.vercel-storage.com")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Distinguish private vs public blobs by hostname
  // Public:  <store>.public.blob.vercel-storage.com
  // Private: <store>.blob.vercel-storage.com  (no ".public." segment)
  const isPrivate = !parsed.hostname.includes(".public.");

  if (!isPrivate) {
    // Legacy public blob — redirect directly (session cookie is still required to reach here)
    return NextResponse.redirect(rawUrl);
  }

  // Private blob — generate a 5-minute presigned GET URL
  const pathname = parsed.pathname.slice(1); // strip leading "/"
  const validUntil = Date.now() + 5 * 60 * 1000;

  const signedToken = await issueSignedToken({
    pathname,
    operations: ["get"],
    validUntil,
  });

  const { presignedUrl } = await presignUrl(signedToken, {
    operation: "get",
    pathname,
    validUntil,
    access: "private",
  });

  return NextResponse.redirect(presignedUrl);
}
