import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/** GET — list saved payment methods for current user */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user?.stripeCustomerId) return NextResponse.json({ paymentMethods: [] });

    const list = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    const paymentMethods = list.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? "card",
      last4: pm.card?.last4 ?? "••••",
      expMonth: pm.card?.exp_month ?? 0,
      expYear: pm.card?.exp_year ?? 0,
    }));

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error("[STRIPE_PAYMENT_METHODS_GET]", error);
    return NextResponse.json({ error: "Stripe error" }, { status: 500 });
  }
}

/** DELETE — detach a payment method */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) return NextResponse.json({ error: "Missing paymentMethodId" }, { status: 400 });

    // Verify this PM belongs to the current customer before detaching
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== user?.stripeCustomerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await stripe.paymentMethods.detach(paymentMethodId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STRIPE_PAYMENT_METHODS_DELETE]", error);
    return NextResponse.json({ error: "Stripe error" }, { status: 500 });
  }
}
