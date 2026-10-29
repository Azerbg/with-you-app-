import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { deletePaymentToken } from "@/lib/paypal";

type Params = { params: Promise<{ id: string }> };

/**
 * DELETE /api/payment-methods/:id
 * Removes a payment method (Stripe card or PayPal vault token).
 * If it was the default, automatically promotes the oldest remaining method.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  // ── PayPal vault token ───────────────────────────────────────────────────────
  if (!id.startsWith("pm_")) {
    const method = await db.studentPaymentMethod.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!method) {
      return NextResponse.json({ error: "Method not found" }, { status: 404 });
    }

    // Delete from PayPal vault (best-effort — if already gone, proceed)
    try {
      await deletePaymentToken(method.providerRef);
    } catch (err) {
      console.error("[payment-methods/delete] PayPal vault delete failed:", err instanceof Error ? err.message : err);
    }

    // Soft-delete in DB
    await db.studentPaymentMethod.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
    });

    // Promote another PayPal method as default if this was the default
    if (method.isDefault) {
      const next = await db.studentPaymentMethod.findFirst({
        where: { userId, provider: "paypal", deletedAt: null, id: { not: id } },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await db.studentPaymentMethod.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }

    return NextResponse.json({ success: true });
  }

  // ── Stripe card ──────────────────────────────────────────────────────────────
  const user = await db.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer" }, { status: 400 });
  }

  try {
    const pm = await stripe.paymentMethods.retrieve(id);
    if (pm.customer !== user.stripeCustomerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await stripe.paymentMethods.detach(id);
  } catch (err) {
    console.error("[payment-methods/delete] Stripe detach failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Stripe error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * PATCH /api/payment-methods/:id
 * Body: { action: "set_default" }
 * Sets a PayPal vault token as the default payment method.
 * (Stripe "default" is handled in Stripe directly — not applicable here.)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;
  const { action } = await req.json() as { action?: string };

  if (action !== "set_default") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const method = await db.studentPaymentMethod.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!method) {
    return NextResponse.json({ error: "Method not found" }, { status: 404 });
  }

  // Clear all other defaults for this user, then set this one
  await db.$transaction([
    db.studentPaymentMethod.updateMany({
      where: { userId, isDefault: true },
      data:  { isDefault: false },
    }),
    db.studentPaymentMethod.update({
      where: { id },
      data:  { isDefault: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}
