import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { TIER_DESCRIPTIONS } from "@/lib/program-tier";
import { ProgramTier } from "@prisma/client";
import DashboardContent from "./DashboardContent";

const TIER_BADGE: Record<ProgramTier, { cls: string }> = {
  STARTER:   { cls: "bg-[#FFF3B0] text-[#C49200]" },
  CORE:      { cls: "bg-[#F5C400]/20 text-[#5C3D00]" },
  INTENSIVE: { cls: "bg-[#5C3D00]/10 text-[#5C3D00]" },
};

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { email: true, timezone: true } } },
  });

  if (!profile?.onboardingCompleted) redirect("/onboarding");

  const tier = profile.programTier as ProgramTier;
  const tierInfo = TIER_DESCRIPTIONS[tier];
  const initials = profile.user.email.slice(0, 2).toUpperCase();

  return (
    <DashboardContent
      email={profile.user.email}
      cefrLevel={profile.cefrLevel}
      tierLabel={tierInfo.label}
      tierSessions={tierInfo.sessions}
      tierDesc={tierInfo.desc}
      tierCls={TIER_BADGE[tier].cls}
      initials={initials}
      nativeLanguage={profile.nativeLanguage}
      targetLanguage={profile.targetLanguage}
      learningObjective={profile.learningObjective}
      sessionFrequency={profile.sessionFrequency}
      programDuration={profile.programDuration}
      timezone={profile.user.timezone}
      timeWindowPreference={profile.timeWindowPreference}
      availabilityDays={profile.availabilityDays}
    />
  );
}
