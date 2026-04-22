import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateStudentPricing } from "@/lib/pricing";
import { LearningObjective, SessionFrequency, ProgramDuration, Currency, ProgramTier } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  // Step 1
  timezone: z.string().min(1),
  // Step 2
  nativeLanguage: z.string().min(1),
  targetLanguage: z.enum(["French", "English"]), // Phase 1 only
  learningObjective: z.enum(["CONVERSATIONAL", "PROFESSIONAL", "ACADEMIC", "EXAM_PREP"]),
  // Step 3
  selfReportedLevel: z.string().min(1),
  availabilityDays: z.array(z.string()).min(1),
  timeWindowPreference: z.array(z.string()).min(1),
  sessionFrequency: z.enum(["ONCE", "TWICE", "THREE_TIMES"]),
  programDuration: z.enum(["PAY_PER_SESSION", "ONE_MONTH", "THREE_MONTHS", "SIX_MONTHS"]),
  preferredCurrency: z.enum(["USD", "CAD", "EUR"]).default("USD"),
  // Step 4 result
  cefrLevel: z.string().min(1),
});

function determineTier(cefrLevel: string): ProgramTier {
  if (["A1", "A2"].includes(cefrLevel)) return ProgramTier.STARTER;
  if (["B1", "B2"].includes(cefrLevel)) return ProgramTier.CORE;
  return ProgramTier.INTENSIVE; // C1, C2
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const tier = determineTier(d.cefrLevel);

    // Calculate personalized pricing
    const pricing = calculateStudentPricing(
      d.cefrLevel,
      d.learningObjective as LearningObjective,
      d.sessionFrequency as SessionFrequency,
      d.programDuration as ProgramDuration,
    );

    // Update user timezone
    await db.user.update({
      where: { id: session.user.id },
      data: { timezone: d.timezone },
    });

    // Update student profile
    await db.studentProfile.update({
      where: { userId: session.user.id },
      data: {
        nativeLanguage: d.nativeLanguage,
        targetLanguage: d.targetLanguage,
        learningObjective: d.learningObjective as LearningObjective,
        selfReportedLevel: d.selfReportedLevel,
        availabilityDays: d.availabilityDays,
        timeWindowPreference: d.timeWindowPreference,
        sessionFrequency: d.sessionFrequency as SessionFrequency,
        programDuration: d.programDuration as ProgramDuration,
        preferredCurrency: d.preferredCurrency as Currency,
        cefrLevel: d.cefrLevel,
        programTier: tier,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    });

    // Upsert student program pricing — stored in CAD (internal reporting currency)
    // per FRD §3.16.2. Confidential — never exposed to tutor API.
    await db.studentProgramPricing.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        programTier: tier,
        baseRateUsd: pricing.baseRateCad * 0.74,  // approximate USD equivalent for legacy field
        monthlyRateUsd: pricing.monthlyRateUsd,
        monthlyRateCad: pricing.monthlyRateCad,
        monthlyRateEur: pricing.monthlyRateEur,
        preferredCurrency: d.preferredCurrency as Currency,
      },
      update: {
        programTier: tier,
        baseRateUsd: pricing.baseRateCad * 0.74,
        monthlyRateUsd: pricing.monthlyRateUsd,
        monthlyRateCad: pricing.monthlyRateCad,
        monthlyRateEur: pricing.monthlyRateEur,
        preferredCurrency: d.preferredCurrency as Currency,
      },
    });

    return NextResponse.json({
      tier,
      cefrLevel: d.cefrLevel,
      pricing: {
        monthlyRateCad: pricing.monthlyRateCad,
        monthlyRateUsd: pricing.monthlyRateUsd,
        monthlyRateEur: pricing.monthlyRateEur,
        perSessionRateCad: pricing.perSessionRateCad,
        sessionsPerMonth: pricing.sessionsPerMonth,
        durationDiscount: pricing.durationDiscount,
      },
    });
  } catch (error) {
    console.error("[ONBOARDING]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
