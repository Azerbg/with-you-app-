import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import SessionsClient from "./SessionsClient";

export const dynamic = "force-dynamic";

export default async function StudentSessionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const [profile, bookings] = await Promise.all([
    db.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { onboardingCompleted: true },
    }),
    db.booking.findMany({
      where: { studentId: session.user.id },
      orderBy: { scheduledAt: "desc" },
      include: {
        tutor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true,
            hrApplication: { select: { fullName: true } },
            tutorProfile: { select: { profilePhotoUrl: true } },
          },
        },
      },
    }),
  ]);

  if (!profile?.onboardingCompleted) redirect("/onboarding");

  const serialized = bookings.map((b) => ({
    id: b.id,
    tutorId: b.tutor.id,
    tutorName:
      b.tutor.firstName && b.tutor.lastName
        ? `${b.tutor.firstName} ${b.tutor.lastName}`
        : b.tutor.hrApplication?.fullName ?? "Tuteur",
    tutorPhoto: b.tutor.image ?? b.tutor.tutorProfile?.profilePhotoUrl ?? null,
    scheduledAt: b.scheduledAt.toISOString(),
    status: b.status as string,
    durationMins: b.durationMins,
    sessionType: b.sessionType as string,
    studentPriceUsd: b.studentPriceUsd,
    cancelledAt: b.cancelledAt?.toISOString() ?? null,
    cancelledBy: b.cancelledBy ?? null,
  }));

  return <SessionsClient bookings={serialized} currentUserId={session.user.id} />;
}
