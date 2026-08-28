import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TUTOR") return NextResponse.json({ error: "Tutors only" }, { status: 403 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (!user?.stripeConnectAccountId) {
    return NextResponse.json({ connected: false, detailsSubmitted: false, payoutsEnabled: false });
  }

  try {
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    return NextResponse.json({
      connected: true,
      accountId: user.stripeConnectAccountId,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
    });
  } catch {
    return NextResponse.json({ connected: false, detailsSubmitted: false, payoutsEnabled: false });
  }
}
