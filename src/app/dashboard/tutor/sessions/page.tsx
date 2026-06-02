import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import SessionsClient from "./SessionsClient";

export default async function TutorSessionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "TUTOR" && session.user.role !== "ADMIN") redirect("/dashboard");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      hrApplication: {
        select: {
          fullName: true,
          offerCurrency: true,
          offerHourlyRateTnd: true,
          offerHourlyRateCad: true,
        },
      },
      tutorProfile: {
        select: {
          profilePhotoUrl: true,
          bio: true,
          cefrTeachingMin: true,
          cefrTeachingMax: true,
        },
      },
    },
  });

  if (!user || user.hrApplication?.status !== "ACTIVE") redirect("/dashboard/tutor");

  const app = user.hrApplication!;
  const profile = user.tutorProfile;

  const fullName = app.fullName ?? user.email;
  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const profileComplete = !!(profile?.bio && profile?.cefrTeachingMin && profile?.cefrTeachingMax);

  const bookings = await db.booking.findMany({
    where: { tutorId: session.user.id },
    orderBy: { scheduledAt: "desc" },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  const currency = app.offerCurrency ?? "TND";
  const hourlyRate =
    currency === "TND" ? (app.offerHourlyRateTnd ?? 0) : (app.offerHourlyRateCad ?? 0);

  const sessions = bookings.map((b) => {
    const name =
      b.student.firstName && b.student.lastName
        ? `${b.student.firstName} ${b.student.lastName}`
        : b.student.email;
    const initials = name
      .split(" ")
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    const earnings = b.status === "CONFIRMED" || b.status === "COMPLETED"
      ? Math.round((b.durationMins / 60) * hourlyRate)
      : null;
    return {
      id: b.id,
      studentName: name,
      studentInitials: initials,
      scheduledAt: b.scheduledAt.toISOString(),
      durationMins: b.durationMins,
      status: b.status,
      earnings,
      currency,
    };
  });

  const totalEarnings = sessions.reduce((sum, s) => sum + (s.earnings ?? 0), 0);

  return (
    <SessionsClient
      fullName={fullName}
      initials={initials}
      photo={profile?.profilePhotoUrl ?? null}
      profileComplete={profileComplete}
      sessions={sessions}
      totalEarnings={totalEarnings}
      currency={currency}
    />
  );
}
