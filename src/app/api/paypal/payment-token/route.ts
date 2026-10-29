import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPaymentToken } from "@/lib/paypal";

/** Mask an email for display: "buyer@example.com" → "b•••@example.com" */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}•••@${domain}`;
}

/**
 * POST /api/paypal/payment-token
 * Body: { setupTokenId: string }
 *
 * Exchanges an approved vault setup token for a permanent payment token
 * and stores it in student_payment_methods.
 * Returns the saved method record.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { setupTokenId } = await req.json() as { setupTokenId?: string };
  if (!setupTokenId?.trim()) {
    return NextResponse.json({ error: "setupTokenId is required" }, { status: 400 });
  }

  let vaultToken: Awaited<ReturnType<typeof createPaymentToken>>;
  try {
    vaultToken = await createPaymentToken(setupTokenId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[paypal/payment-token] exchange failed:", msg);
    return NextResponse.json({ error: "Could not create payment token" }, { status: 502 });
  }

  const { id: providerRef, customerId, payerEmail } = vaultToken;
  const displayLabel = payerEmail ? maskEmail(payerEmail) : "PayPal";

  // If user has no default yet, this becomes the default
  const hasDefault = await db.studentPaymentMethod.findFirst({
    where: { userId: session.user.id, deletedAt: null, isDefault: true },
  });

  const saved = await db.studentPaymentMethod.create({
    data: {
      userId:          session.user.id,
      provider:        "paypal",
      type:            "paypal",
      providerRef,
      paypalCustomerId: customerId || null,
      displayLabel,
      isDefault:       !hasDefault,
    },
  });

  return NextResponse.json({
    id:           saved.id,
    provider:     saved.provider,
    displayLabel: saved.displayLabel,
    isDefault:    saved.isDefault,
    createdAt:    saved.createdAt.toISOString(),
  }, { status: 201 });
}
