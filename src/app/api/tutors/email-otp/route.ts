import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmailOtpCode } from "@/lib/email";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Reuse TempPhoneVerification table — store email as the "phone" key
    await db.tempPhoneVerification.upsert({
      where:  { phone: email },
      create: { phone: email, otp, expires, verified: false },
      update: { otp, expires, verified: false },
    });

    const isProd = process.env.NODE_ENV === "production";
    const hasEmailServer = !!process.env.EMAIL_SERVER_HOST;

    if (hasEmailServer) {
      try {
        await sendEmailOtpCode(email, otp);
        return NextResponse.json({ success: true });
      } catch (emailErr) {
        if (isProd) {
          // In production, a failing email is a real error
          const detail = emailErr instanceof Error ? emailErr.message : String(emailErr);
          console.error("[email-otp] SMTP failed:", emailErr);
          return NextResponse.json({ error: "email_send_failed", detail }, { status: 500 });
        }
        // In dev, fall through to return the OTP directly even if SMTP fails
        console.warn("[email-otp] SMTP failed in dev, returning OTP directly:", emailErr);
      }
    }

    // Dev fallback: no email server configured, or SMTP failed in dev
    return NextResponse.json({ success: true, devMode: true, otp });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_email" }, { status: 422 });
    }
    console.error("[email-otp]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
