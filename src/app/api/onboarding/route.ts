import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LearningObjective, SessionFrequency, ProgramDuration, Currency } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  timezone: z.string().min(1),
  nativeLanguage: z.string().min(1),
  targetLanguage: z.enum(["French", "English"]),
  learningObjective: z.enum(["CONVERSATIONAL", "PROFESSIONAL", "TRAVEL", "ACADEMIC", "EXAM_PREP", "CULTURAL"]),
  selfReportedLevel: z.string().min(1),
  availabilityDays: z.array(z.string()).min(1),
  timeWindowPreference: z.array(z.string()).min(1),
  sessionFrequency: z.enum(["ONCE", "TWICE", "THREE_TIMES", "INTENSIVE"]),
  programDuration: z.enum(["PAY_PER_SESSION", "ONE_MONTH", "THREE_MONTHS", "SIX_MONTHS"]),
  preferredCurrency: z.enum(["USD", "CAD", "EUR"]).default("USD"),
  country: z.string().optional(),
  tutorLanguages: z.array(z.string()).optional(),
  budgetPerSession: z.number().optional(),
  examTarget: z.string().optional(),
});

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

    await db.user.update({
      where: { id: session.user.id },
      data: { timezone: d.timezone },
    });

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
        country: d.country ?? null,
        tutorLanguages: d.tutorLanguages ?? [],
        budgetPerSession: d.budgetPerSession ?? null,
        examTarget: d.examTarget ?? null,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ONBOARDING]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
