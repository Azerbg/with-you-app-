import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });

    // Don't reveal whether email exists
    if (!user) {
      return NextResponse.json({ success: true });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    // Delete old tokens and create fresh OTP
    await db.verificationToken.deleteMany({ where: { userId: user.id } });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = `otp:${user.id}:${code}`;

    await db.verificationToken.create({
      data: {
        token,
        userId: user.id,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    try {
      await sendVerificationEmail(email, code);
    } catch (err) {
      console.warn("[RESEND] Email send failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESEND-VERIFICATION]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
