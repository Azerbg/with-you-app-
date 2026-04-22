import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { email } = parsed.data;
    const user = await db.user.findUnique({ where: { email } });

    // Always return success to prevent user enumeration
    if (!user) {
      return NextResponse.json({ message: "If that email exists, a reset link was sent." });
    }

    // Delete any existing reset tokens for this user
    await db.verificationToken.deleteMany({ where: { userId: user.id } });

    // Create a new reset token (expires 1h)
    const token = randomBytes(32).toString("hex");
    await db.verificationToken.create({
      data: {
        token,
        userId: user.id,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ message: "If that email exists, a reset link was sent." });
  } catch (error) {
    console.error("[FORGOT_PASSWORD]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
