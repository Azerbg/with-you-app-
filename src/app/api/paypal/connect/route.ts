import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  process.env.AUTH_URL ??
  "https://with-you-app-red.vercel.app"
).replace(/\/$/, "");

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${BASE_URL}/auth/login`);
  }
  if (session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Tutors only" }, { status: 403 });
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/tutor/earnings?error=paypal_not_configured`
    );
  }

  const redirectUri = encodeURIComponent(`${BASE_URL}/api/paypal/callback`);
  const paypalBase =
    process.env.PAYPAL_MODE === "sandbox"
      ? "https://www.sandbox.paypal.com"
      : "https://www.paypal.com";

  const url = `${paypalBase}/signin/authorize?client_id=${clientId}&response_type=code&scope=openid%20email&redirect_uri=${redirectUri}`;

  return NextResponse.redirect(url);
}
