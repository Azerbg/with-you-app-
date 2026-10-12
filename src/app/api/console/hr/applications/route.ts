import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applications = await db.hrApplication.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        country: true,
        city: true,
        phone: true,
        languagesTaught: true,
        specializations: true,
        certifications: true,
        englishLevel: true,
        yearsExperience: true,
        bio: true,
        // cvUrl, motivationLetterUrl, certificateUrls, videoSubmissionUrl omitted — fetch via /[id]
        availabilityDays: true,
        timeWindowPreference: true,
        status: true,
        createdAt: true,
        interviewSlots: true,
        // interviewToken omitted — sensitive, fetch via /[id] only
        interviewSelectedAt: true,
        interviewScheduledAt: true,
        interviewMeetingUrl: true,
        videoSubmittedAt: true,
        offerCurrency: true,
        offerHourlyRateTnd: true,
        offerHourlyRateCad: true,
        offerMaxWeeklyHours: true,
        reapplyAfter: true,
        user: { select: { email: true } },
        notes: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            isFromCandidate: true,
            visibleToCandidate: true,
            createdAt: true,
            author: { select: { email: true } },
          },
        },
      },
    });

    return NextResponse.json(applications);
  } catch (err) {
    console.error("[hr/applications GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
