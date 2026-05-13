import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeMatchScore } from "@/lib/slots";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);

  const lang    = searchParams.get("lang")   ?? "";
  const spec    = searchParams.get("spec")   ?? "";
  const cefr    = searchParams.get("cefr")   ?? "";

  // Fetch all active tutors with their profiles
  const profiles = await db.tutorProfile.findMany({
    where: {
      verificationStatus: "VERIFIED",
      ...(lang ? { languagesTaught: { has: lang } } : {}),
      ...(spec ? { specializations: { has: spec } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          image: true,
          hrApplication: { select: { fullName: true, status: true } },
        },
      },
      availability: {
        where: { isRecurring: true },
        select: { dayOfWeek: true, isRecurring: true },
      },
    },
  });

  // Only show tutors whose HR application is ACTIVE
  const active = profiles.filter(
    p => p.user.hrApplication?.status === "ACTIVE",
  );

  // Get student profile for match scoring (if logged in as STUDENT)
  let student: {
    targetLanguage: string | null;
    learningObjective: string | null;
    cefrLevel: string | null;
    availabilityDays: string[];
  } | null = null;

  if (session?.user?.role === "STUDENT") {
    const sp = await db.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        targetLanguage: true,
        learningObjective: true,
        cefrLevel: true,
        availabilityDays: true,
      },
    });
    if (sp) student = sp;
  }

  // CEFR filter (post-fetch since it needs index comparison)
  const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const filtered = cefr
    ? active.filter(p => {
        const minIdx = CEFR_ORDER.indexOf(p.cefrTeachingMin ?? "A1");
        const maxIdx = CEFR_ORDER.indexOf(p.cefrTeachingMax ?? "C2");
        const targetIdx = CEFR_ORDER.indexOf(cefr);
        return targetIdx >= minIdx && targetIdx <= maxIdx;
      })
    : active;

  const results = filtered.map(p => {
    const displayName =
      p.user.firstName && p.user.lastName
        ? `${p.user.firstName} ${p.user.lastName}`
        : p.user.hrApplication?.fullName ?? "Tutor";

    const matchScore = student
      ? computeMatchScore(
          {
            languagesTaught: p.languagesTaught,
            specializations: p.specializations,
            cefrTeachingMin: p.cefrTeachingMin,
            cefrTeachingMax: p.cefrTeachingMax,
            averageRating: p.averageRating,
            avgResponseHours: p.avgResponseHours,
            verificationTier: p.verificationTier,
            availability: p.availability,
          },
          student,
        )
      : null;

    return {
      userId: p.user.id,
      profileId: p.id,
      displayName,
      image: p.user.image ?? p.profilePhotoUrl,
      bio: p.bio,
      languagesTaught: p.languagesTaught,
      specializations: p.specializations,
      certifications: p.certifications,
      yearsExperience: p.yearsExperience,
      cefrTeachingMin: p.cefrTeachingMin,
      cefrTeachingMax: p.cefrTeachingMax,
      averageRating: p.averageRating,
      totalReviews: p.totalReviews,
      verificationTier: p.verificationTier,
      matchScore,
    };
  });

  // Sort by match score desc, then rating desc
  results.sort((a, b) => {
    if (a.matchScore !== null && b.matchScore !== null) {
      return b.matchScore - a.matchScore;
    }
    return b.averageRating - a.averageRating;
  });

  return NextResponse.json(results);
}
