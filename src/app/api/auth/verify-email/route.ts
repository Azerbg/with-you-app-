import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST: verify with 6-digit code
export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    const token = `otp:${user.id}:${code}`;
    const record = await db.verificationToken.findUnique({ where: { token } });

    if (!record) {
      return NextResponse.json({ error: "Invalid code. Please check and try again." }, { status: 400 });
    }

    if (record.expires < new Date()) {
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: "Code has expired. Request a new one." }, { status: 400 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    await db.verificationToken.delete({ where: { token } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VERIFY-EMAIL]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
