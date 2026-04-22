import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/email";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, role } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role as Role,
      },
      select: { id: true, email: true, role: true },
    });

    // Create profile based on role
    if (role === "STUDENT") {
      await db.studentProfile.create({ data: { userId: user.id } });
    } else if (role === "TUTOR") {
      await db.tutorProfile.create({ data: { userId: user.id } });
    }

    // Delete any existing tokens for this user, then create 6-digit OTP (expires 10 min)
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
      await sendVerificationEmail(user.email, code);
    } catch (emailError) {
      console.warn("[REGISTER] Email send failed (check SMTP config):", emailError);
    }

    return NextResponse.json(
      {
        message: "Account created. Check your email for the 6-digit verification code.",
        email: user.email,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
