import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendTutorApplicationConfirmation } from "@/lib/email";
import { z } from "zod";
import bcrypt from "bcryptjs";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const baseSchema = z.object({
  // Step 1 — Personal
  fullName:  z.string().min(2),
  phone:     z.string().min(8),
  birthday:  z.string().min(1),
  gender:    z.enum(["M", "F", "PREFER_NOT_TO_SAY"]).optional(),
  country:   z.string().min(1),
  city:      z.string().optional().default(""),
  useExistingAccount: z.boolean().optional().default(false),

  // Step 2 — Teaching
  languagesTaught: z.array(z.string()).min(1),
  specializations: z.array(z.string()).min(1),
  yearsExperience: z.number().int().min(0),
  certifications:  z.array(z.string()),
  certificateUrls: z.array(z.string()).default([]),

  // Step 3 — About
  bio:                 z.string().min(100),
  cvUrl:               z.string().min(1),
  motivationLetterUrl: z.string().min(1),

  // Step 4 — Availability
  availabilityDays:    z.array(z.string()).min(1),
  timeWindowPreference: z.array(z.string()).min(1),
});

const guestSchema = baseSchema.extend({
  email:    z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await auth();

    // ── Logged-in user submitting application ──────────────────────────────
    if (body.useExistingAccount && session?.user?.id) {
      const data = baseSchema.parse(body);
      const userId = session.user.id;

      // Check if already has an application
      const existing = await db.hrApplication.findUnique({ where: { userId } });
      if (existing) {
        if (existing.reapplyAfter && existing.reapplyAfter > new Date()) {
          return NextResponse.json(
            { error: "reapply_blocked", reapplyAfter: existing.reapplyAfter },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: "already_applied" }, { status: 409 });
      }

      const phoneVerified = data.phone
        ? await db.tempPhoneVerification
            .findUnique({ where: { phone: data.phone } })
            .then(r => r?.verified === true).catch(() => false)
        : false;

      await db.$transaction([
        db.hrApplication.create({
          data: {
            userId,
            fullName:            data.fullName,
            phone:               data.phone,
            birthday:            new Date(data.birthday),
            gender:              data.gender ?? null,
            country:             data.country,
            city:                data.city || null,
            languagesTaught:     data.languagesTaught,
            specializations:     data.specializations,
            yearsExperience:     data.yearsExperience,
            certifications:      data.certifications,
            certificateUrls:     data.certificateUrls,
            bio:                 data.bio,
            motivationLetterUrl: data.motivationLetterUrl || null,
            cvUrl:               data.cvUrl,
            availabilityDays:    data.availabilityDays,
            timeWindowPreference: data.timeWindowPreference,
            status:              "NEW",
            phoneVerified,
          },
        }),
        db.user.update({ where: { id: userId }, data: { role: "TUTOR" } }),
      ]);

      if (data.phone) db.tempPhoneVerification.deleteMany({ where: { phone: data.phone } }).catch(() => {});
      sendTutorApplicationConfirmation(session.user.email!, data.fullName).catch(() => {});
      return NextResponse.json({ success: true, userId }, { status: 201 });
    }

    // ── Guest (not logged in) — create new account ─────────────────────────
    const data = guestSchema.parse(body);

    const existing = await db.user.findUnique({
      where: { email: data.email },
      include: { hrApplication: { select: { reapplyAfter: true } } },
    });
    if (existing) {
      const app = existing.hrApplication;
      if (app?.reapplyAfter && app.reapplyAfter > new Date()) {
        return NextResponse.json({ error: "reapply_blocked", reapplyAfter: app.reapplyAfter }, { status: 409 });
      }
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(data.password, 12);
    const phoneVerified = data.phone
      ? await db.tempPhoneVerification
          .findUnique({ where: { phone: data.phone } })
          .then(r => r?.verified === true).catch(() => false)
      : false;

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
            gender:              data.gender ?? null,
            country:             data.country,
            city:                data.city || null,
            languagesTaught:     data.languagesTaught,
            specializations:     data.specializations,
            yearsExperience:     data.yearsExperience,
            certifications:      data.certifications,
            certificateUrls:     data.certificateUrls,
            bio:                 data.bio,
            motivationLetterUrl: data.motivationLetterUrl || null,
            cvUrl:               data.cvUrl,
            availabilityDays:    data.availabilityDays,
            timeWindowPreference: data.timeWindowPreference,
            status:              "NEW",
            phoneVerified,
          },
        },
      },
    });

    if (data.phone) db.tempPhoneVerification.deleteMany({ where: { phone: data.phone } }).catch(() => {});
    sendTutorApplicationConfirmation(data.email, data.fullName).catch(() => {});
    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 422 });
    }
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[tutors/apply]", err);
    return NextResponse.json({ error: "server_error", detail }, { status: 500 });
  }
}
