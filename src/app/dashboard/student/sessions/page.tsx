import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import StudentSidebar from "@/components/StudentSidebar";
import SessionsClient from "./SessionsClient";

export const dynamic = "force-dynamic";

export default async function StudentSessionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const [profile, bookings] = await Promise.all([
    db.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, image: true } },
      },
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

  const firstName = profile.user.firstName ?? null;
  const lastName = profile.user.lastName ?? null;
  const initials =
    firstName && lastName
      ? (firstName[0] + lastName[0]).toUpperCase()
      : firstName
      ? firstName.slice(0, 2).toUpperCase()
      : profile.user.email.slice(0, 2).toUpperCase();

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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F2EFE9" }}>
      <StudentSidebar
        email={profile.user.email}
        name={firstName && lastName ? `${firstName} ${lastName}` : firstName ?? null}
        cefrLevel={profile.cefrLevel}
        tier=""
        initials={initials}
        image={profile.user.image ?? null}
        activePage="sessions"
      />
      <SessionsClient bookings={serialized} currentUserId={session.user.id} />
    </div>
  );
}
