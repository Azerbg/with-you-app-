import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/hr/document?url=<encodedBlobUrl>
 * Auth-gated proxy for HR documents (CV, letter, certificates).
 * Only HR and ADMIN roles can access. The actual Vercel Blob URL is never
 * exposed to the browser — all requests go through this endpoint.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url param", { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url); } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  // Only allow Vercel Blob storage URLs
  if (!parsed.hostname.endsWith(".blob.vercel-storage.com")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return new NextResponse("Document not found", { status: upstream.status });
  }

  const contentType = upstream.headers.get("Content-Type") ?? "application/octet-stream";
  const filename = decodeURIComponent(parsed.pathname.split("/").pop() ?? "document");

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
