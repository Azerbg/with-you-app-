import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
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
    include: { user: { select: { email: true, timezone: true, firstName: true, lastName: true, image: true, nickname: true } } },
  });

  if (!profile?.onboardingCompleted) redirect("/onboarding");

  const tier = profile.programTier as ProgramTier;

  const firstName = profile.user.firstName ?? null;
  const lastName  = profile.user.lastName  ?? null;
  const initials  = firstName && lastName
    ? (firstName[0] + lastName[0]).toUpperCase()
    : firstName
    ? firstName.slice(0, 2).toUpperCase()
    : profile.user.email.slice(0, 2).toUpperCase();

  return (
    <DashboardContent
      email={profile.user.email}
      firstName={firstName}
      nickname={profile.user.nickname ?? null}
      image={profile.user.image ?? null}
      cefrLevel={profile.cefrLevel}
      tierKey={tier}
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
      country={profile.country ?? null}
    />
  );
}
