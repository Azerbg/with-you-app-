import { NextResponse } from "next/server";

/**
 * GET /api/config/paypal
 * Exposes the PayPal client ID to the frontend without needing NEXT_PUBLIC_PAYPAL_CLIENT_ID.
 * Returns only the client ID — no secrets.
 */
export async function GET() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "PayPal not configured" }, { status: 503 });
  }
  return NextResponse.json({ clientId });
}
