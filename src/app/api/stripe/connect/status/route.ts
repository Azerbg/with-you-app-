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
    // Accounts v2 — no details_submitted / payouts_enabled; use requirements + applied_configurations
    const account = await stripe.v2.core.accounts.retrieve(user.stripeConnectAccountId);
    const hasOutstandingRequirements =
      Array.isArray(account.requirements?.entries) && account.requirements.entries.length > 0;
    const payoutsEnabled = account.applied_configurations.includes("recipient");
    const chargesEnabled = account.applied_configurations.includes("merchant");

    return NextResponse.json({
      connected: true,
      accountId: user.stripeConnectAccountId,
      detailsSubmitted: !hasOutstandingRequirements,
      payoutsEnabled,
      chargesEnabled,
    });
  } catch {
    return NextResponse.json({ connected: false, detailsSubmitted: false, payoutsEnabled: false });
  }
}
