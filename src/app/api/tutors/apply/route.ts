import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTutorApplicationConfirmation } from "@/lib/email";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  // Step 1 — Personal
  fullName:  z.string().min(2),
  email:     z.string().email(),
  password:  z.string().min(10),
  phone:     z.string().min(8),
  birthday:  z.string().min(1), // ISO date string
  country:   z.string().min(1),
  city:      z.string().optional().default(""),

  // Step 2 — Teaching
  languagesTaught: z.array(z.string()).min(1),
  specializations: z.array(z.string()).min(1),
  yearsExperience: z.number().int().min(0),
  certifications:  z.array(z.string()),
  certificateUrls: z.array(z.string()).default([]),

  // Step 3 — About
  bio:      z.string().min(100),
  videoUrl: z.string().url().optional().or(z.literal("")),

  // Step 4 — Availability
  availabilityDays:    z.array(z.string()).min(1),
  timeWindowPreference: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Check if email already in use
    const existing = await db.user.findUnique({
      where: { email: data.email },
      include: { hrApplication: { select: { reapplyAfter: true, status: true } } },
    });
    if (existing) {
      // Check 90-day reapplication block
      const app = existing.hrApplication;
      if (app?.reapplyAfter && app.reapplyAfter > new Date()) {
        return NextResponse.json(
          { error: "reapply_blocked", reapplyAfter: app.reapplyAfter },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(data.password, 12);

    // Check if phone was verified via OTP
    const phoneVerified = data.phone
      ? await db.tempPhoneVerification
          .findUnique({ where: { phone: data.phone } })
          .then(r => r?.verified === true)
          .catch(() => false)
      : false;

    // Create user + application in one transaction
    const user = await db.user.create({
      data: {
        email:    data.email,
        password: hashed,
        role:     "TUTOR",
        hrApplication: {
          create: {
            fullName:            data.fullName,
            phone:               data.phone,
            birthday:            new Date(data.birthday),
            country:             data.country,
            city:                data.city || null,
            languagesTaught:     data.languagesTaught,
            specializations:     data.specializations,
            yearsExperience:     data.yearsExperience,
            certifications:      data.certifications,
            certificateUrls:     data.certificateUrls,
            bio:                 data.bio,
            videoUrl:            data.videoUrl || null,
            availabilityDays:    data.availabilityDays,
            timeWindowPreference: data.timeWindowPreference,
            status:              "NEW",
            phoneVerified,
          },
        },
      },
    });

    // Clean up temp OTP record
    if (data.phone) {
      db.tempPhoneVerification.deleteMany({ where: { phone: data.phone } }).catch(() => {});
    }

    // Send confirmation email (non-blocking)
    sendTutorApplicationConfirmation(data.email, data.fullName).catch(() => {});

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 422 });
    }
    console.error("[tutors/apply]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
