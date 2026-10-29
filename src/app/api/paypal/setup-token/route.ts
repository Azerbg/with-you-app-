import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createVaultSetupToken } from "@/lib/paypal";

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  process.env.AUTH_URL ??
  "https://with-you-app-red.vercel.app"
).replace(/\/$/, "");

/**
 * POST /api/paypal/setup-token
 * Creates a vault setup token that the PayPal JS SDK button uses to initiate
 * the payer-approval flow. Returns { setupTokenId }.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reuse an existing PayPal customer.id if the user already has a vaulted method
  const existing = await db.studentPaymentMethod.findFirst({
    where: { userId: session.user.id, provider: "paypal", deletedAt: null, paypalCustomerId: { not: null } },
    select: { paypalCustomerId: true },
  });

  try {
    const result = await createVaultSetupToken({
      returnUrl:        `${BASE_URL}/dashboard/student/billing?paypal=success`,
      cancelUrl:        `${BASE_URL}/dashboard/student/billing?paypal=cancel`,
      paypalCustomerId: existing?.paypalCustomerId ?? undefined,
    });

    return NextResponse.json({ setupTokenId: result.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[paypal/setup-token]", msg);
    return NextResponse.json({ error: "Could not create vault setup token" }, { status: 502 });
  }
}
