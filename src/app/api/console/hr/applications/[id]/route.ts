import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApplicationStatus } from "@prisma/client";
import { sendRejectionEmail, sendInterviewEmail } from "@/lib/email";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
    status,
    // Interview
    interviewScheduledAt,
    interviewMeetingUrl,
    // Rejection
    rejectionReason,
    // Rubric scores
    scoreLanguageProficiency,
    scoreAudioVideoQuality,
    scoreProfessionalPresentation,
    scoreTeachingPhilosophy,
    scoreCulturalFit,
    // Offer
    offerHourlyRateTnd,
    offerHourlyRateCad,
    offerCurrency,
    offerMaxWeeklyHours,
  } = body;

  // Allow rubric-only saves (no status change)
  const isRubricOnlySave = !status && (
    scoreLanguageProficiency !== undefined ||
    scoreAudioVideoQuality !== undefined ||
    scoreProfessionalPresentation !== undefined ||
    scoreTeachingPhilosophy !== undefined ||
    scoreCulturalFit !== undefined
  );

  if (!isRubricOnlySave && !Object.values(ApplicationStatus).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 });
  }

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;

  // ── Rubric scores ──────────────────────────────────────────────────────────
  if (scoreLanguageProficiency !== undefined) updateData.scoreLanguageProficiency = scoreLanguageProficiency;
  if (scoreAudioVideoQuality !== undefined)   updateData.scoreAudioVideoQuality   = scoreAudioVideoQuality;
  if (scoreProfessionalPresentation !== undefined) updateData.scoreProfessionalPresentation = scoreProfessionalPresentation;
  if (scoreTeachingPhilosophy !== undefined)  updateData.scoreTeachingPhilosophy  = scoreTeachingPhilosophy;
  if (scoreCulturalFit !== undefined)         updateData.scoreCulturalFit         = scoreCulturalFit;

  // ── Status-specific fields ─────────────────────────────────────────────────
  if (status === "REJECTED") {
    updateData.rejectedAt    = new Date();
    updateData.reapplyAfter  = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    if (rejectionReason) updateData.rejectionReason = rejectionReason;
  }

  if (status === "INTERVIEW_SCHEDULED") {
    if (interviewScheduledAt) updateData.interviewScheduledAt = new Date(interviewScheduledAt);
    if (interviewMeetingUrl)  updateData.interviewMeetingUrl  = interviewMeetingUrl;
  }

  if (status === "INTERVIEW_COMPLETE") {
    updateData.interviewCompletedAt = new Date();
  }

  if (status === "OFFER_PENDING") {
    updateData.offerSentAt = new Date();
    if (offerHourlyRateTnd  !== undefined) updateData.offerHourlyRateTnd  = offerHourlyRateTnd;
    if (offerHourlyRateCad  !== undefined) updateData.offerHourlyRateCad  = offerHourlyRateCad;
    if (offerCurrency       !== undefined) updateData.offerCurrency        = offerCurrency;
    if (offerMaxWeeklyHours !== undefined) updateData.offerMaxWeeklyHours  = offerMaxWeeklyHours;
  }

  if (status === "SIGNED") {
    updateData.offerSignedAt = new Date();
  }

  if (status === "ACTIVE") {
    updateData.activatedAt = new Date();
  }

  const updated = await db.hrApplication.update({
    where: { id },
    data: updateData,
    include: { user: { select: { email: true } } },
  });

  // ── On ACTIVE: create TutorProfile + TutorCompensation + stub Stripe Connect ─
  if (status === "ACTIVE") {
    const app = await db.hrApplication.findUnique({
      where: { id },
      select: {
        userId: true,
        languagesTaught: true,
        specializations: true,
        certifications: true,
        yearsExperience: true,
        bio: true,
        videoUrl: true,
        city: true,
        availabilityDays: true,
        timeWindowPreference: true,
        offerHourlyRateTnd: true,
        offerHourlyRateCad: true,
        offerCurrency: true,
        offerMaxWeeklyHours: true,
      },
    });

    if (app) {
      const maxWeekly = app.offerMaxWeeklyHours ?? 20;

      // Create TutorProfile (upsert in case it already exists)
      await db.tutorProfile.upsert({
        where: { userId: app.userId },
        create: {
          userId:           app.userId,
          languagesTaught:  app.languagesTaught,
          specializations:  app.specializations,
          certifications:   app.certifications,
          yearsExperience:  app.yearsExperience,
          bio:              app.bio,
          videoIntroUrl:    app.videoUrl,
          city:             app.city,
          maxWeeklyHours:   maxWeekly,
          verificationTier:   "VERIFIED",
          verificationStatus: "VERIFIED",
        },
        update: {
          verificationTier:   "VERIFIED",
          verificationStatus: "VERIFIED",
          maxWeeklyHours:     maxWeekly,
        },
      });

      // Create TutorCompensation (upsert)
      await db.tutorCompensation.upsert({
        where: { userId: app.userId },
        create: {
          userId:         app.userId,
          hourlyRateTnd:  app.offerHourlyRateTnd,
          hourlyRateCad:  app.offerHourlyRateCad,
          currencyPref:   (app.offerCurrency as "TND" | "CAD") ?? "TND",
          maxWeeklyHours: maxWeekly,
        },
        update: {
          hourlyRateTnd:  app.offerHourlyRateTnd,
          hourlyRateCad:  app.offerHourlyRateCad,
          currencyPref:   (app.offerCurrency as "TND" | "CAD") ?? "TND",
          maxWeeklyHours: maxWeekly,
        },
      });

      // Stub Stripe Connect account ID
      await db.user.update({
        where: { id: app.userId },
        data: { stripeConnectAccountId: `stub_${app.userId}` },
      });
    }
  }

  // ── Send emails (non-blocking) ──────────────────────────────────────────────
  const appForEmail = await db.hrApplication.findUnique({
    where: { id },
    select: {
      fullName: true,
      preferredLanguage: true,
      interviewScheduledAt: true,
      interviewMeetingUrl: true,
    },
  });

  if (appForEmail) {
    const lang = appForEmail.preferredLanguage ?? "fr";

    if (status === "REJECTED") {
      sendRejectionEmail(
        updated.user.email,
        appForEmail.fullName,
        rejectionReason ?? "",
        lang
      ).catch(() => {});
    }

    if (
      status === "INTERVIEW_SCHEDULED" &&
      appForEmail.interviewScheduledAt &&
      appForEmail.interviewMeetingUrl
    ) {
      sendInterviewEmail(
        updated.user.email,
        appForEmail.fullName,
        appForEmail.interviewScheduledAt,
        appForEmail.interviewMeetingUrl,
        lang
      ).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}
