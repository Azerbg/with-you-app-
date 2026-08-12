import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProgramTier } from "@prisma/client";
import DashboardContent from "./DashboardContent";

export const dynamic = "force-dynamic";

const TIER_BADGE: Record<ProgramTier, { cls: string }> = {
  STARTER:   { cls: "bg-[#FFF3B0] text-[#C49200]" },
  CORE:      { cls: "bg-[#F5C400]/20 text-[#5C3D00]" },
  INTENSIVE: { cls: "bg-[#5C3D00]/10 text-[#5C3D00]" },
};

// weekly target minutes by frequency
const FREQ_TARGET: Record<string, number> = {
  ONCE:        45,
  TWICE:       90,
  THREE_TIMES: 135,
  INTENSIVE:   225,
};

function getWeekStart(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay() || 7; // 1=Mon … 7=Sun
  copy.setDate(copy.getDate() - day + 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; reviewed?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: {
        select: {
          email: true, timezone: true, firstName: true,
          lastName: true, image: true, nickname: true, pendingImage: true,
        },
      },
    },
  });

  if (!profile?.onboardingCompleted) redirect("/onboarding");

  const tier = (profile.programTier ?? "STARTER") as ProgramTier;
  const firstName = profile.user.firstName ?? null;
  const lastName  = profile.user.lastName  ?? null;
  const initials  = firstName && lastName
    ? (firstName[0] + lastName[0]).toUpperCase()
    : firstName
    ? firstName.slice(0, 2).toUpperCase()
    : profile.user.email.slice(0, 2).toUpperCase();

  // ── Upcoming bookings (next 3) ────────────────────────────────────────────
  const upcomingBookings = await db.booking.findMany({
    where: {
      studentId: session.user.id,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { scheduledAt: "asc" },
    take: 3,
    include: {
      tutor: {
        select: {
          id: true, firstName: true, lastName: true, image: true,
          hrApplication: { select: { fullName: true } },
          tutorProfile: { select: { profilePhotoUrl: true } },
        },
      },
    },
  });

  const serializedBookings = upcomingBookings.map((b) => {
    const tutorName =
      b.tutor.firstName && b.tutor.lastName
        ? `${b.tutor.firstName} ${b.tutor.lastName}`
        : b.tutor.hrApplication?.fullName ?? "Tuteur";
    return {
      id: b.id,
      tutorId: b.tutor.id,
      tutorName,
      tutorPhoto: b.tutor.image ?? b.tutor.tutorProfile?.profilePhotoUrl ?? null,
      scheduledAt: b.scheduledAt.toISOString(),
      status: b.status,
      durationMins: b.durationMins,
    };
  });

  // ── All completed bookings (for streak + count) ───────────────────────────
  const completedBookings = await db.booking.findMany({
    where: { studentId: session.user.id, status: "COMPLETED" },
    select: { scheduledAt: true, durationMins: true },
    orderBy: { scheduledAt: "desc" },
  });

  const completedCount = completedBookings.length;

  // Streak: consecutive calendar weeks (Mon–Sun) with >= 1 completed session
  const weekSet = new Set(
    completedBookings.map((b) => getWeekStart(b.scheduledAt).toISOString())
  );
  let streakWeeks = 0;
  const cursor = getWeekStart(new Date());
  while (weekSet.has(cursor.toISOString())) {
    streakWeeks++;
    cursor.setDate(cursor.getDate() - 7);
  }

  // Weekly minutes (current Mon–now)
  const weekStart = getWeekStart(new Date());
  const weeklyMinutes = completedBookings
    .filter((b) => b.scheduledAt >= weekStart)
    .reduce((sum, b) => sum + b.durationMins, 0);

  const weeklyTargetMins = FREQ_TARGET[profile.sessionFrequency ?? ""] ?? 45;

  // ── Recent completed sessions (last 5) ────────────────────────────────────
  const recentSessions = await db.booking.findMany({
    where: { studentId: session.user.id, status: "COMPLETED" },
    orderBy: { scheduledAt: "desc" },
    take: 5,
    include: {
      tutor: {
        select: {
          id: true, firstName: true, lastName: true, image: true,
          hrApplication: { select: { fullName: true } },
          tutorProfile: { select: { profilePhotoUrl: true } },
        },
      },
    },
  });

  const serializedRecent = recentSessions.map((b) => {
    const tutorName =
      b.tutor.firstName && b.tutor.lastName
        ? `${b.tutor.firstName} ${b.tutor.lastName}`
        : b.tutor.hrApplication?.fullName ?? "Tuteur";
    return {
      id: b.id,
      tutorName,
      tutorPhoto: b.tutor.image ?? b.tutor.tutorProfile?.profilePhotoUrl ?? null,
      scheduledAt: b.scheduledAt.toISOString(),
      durationMins: b.durationMins,
    };
  });

  return (
    <DashboardContent
      email={profile.user.email}
      firstName={firstName}
      lastName={lastName}
      nickname={profile.user.nickname ?? null}
      hasPendingImage={!!profile.user.pendingImage}
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
      targetLanguageCode={profile.targetLanguage ?? null}
      upcomingBookings={serializedBookings}
      showReviewedBanner={sp.reviewed === "1"}
      completedCount={completedCount}
      streakWeeks={streakWeeks}
      weeklyMinutes={weeklyMinutes}
      weeklyTargetMins={weeklyTargetMins}
      recentSessions={serializedRecent}
    />
  );
}
