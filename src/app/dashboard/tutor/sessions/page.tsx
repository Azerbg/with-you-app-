import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import SessionsClient from "./SessionsClient";
import { getTutorStats } from "@/lib/tutorStats";
import { getDisplayName, getInitials } from "@/lib/userUtils";
import { cookies } from "next/headers";

export async function generateMetadata() {
  const lang = (await cookies()).get("wy_lang")?.value === "en" ? "en" : "fr";
  return { title: lang === "en" ? "Sessions — WithYou" : "Mes séances — WithYou" };
}

export default async function TutorSessionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "TUTOR" && session.user.role !== "ADMIN") redirect("/dashboard");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      hrApplication: {
        select: {
          status: true,
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
          image: true,
        },
      },
      lesson: { select: { whiteboardData: true } },
    },
  });

  const currency = app.offerCurrency ?? "TND";

  const [tutorStats, sessions_raw] = await Promise.all([
    getTutorStats(session.user.id, currency),
    Promise.resolve(bookings),
  ]);

  const now = new Date();
  const sessions = sessions_raw.map((b) => {
    const name = getDisplayName(b.student);
    const studentInitials = getInitials(name);

    // Compute effective status: CONFIRMED sessions whose end time has passed → COMPLETED
    const endAt = new Date(b.scheduledAt.getTime() + Math.min(240, b.durationMins) * 60_000);
    const effectiveStatus =
      b.status === "CONFIRMED" && endAt < now ? "COMPLETED" : b.status;

    // Guard: never show an image that is the tutor's own user image
    const rawStudentImage = (b.student as { image?: string | null }).image ?? null;
    const studentImage = rawStudentImage && rawStudentImage !== user.image
      ? rawStudentImage
      : null;

    return {
      id: b.id,
      studentId: b.studentId,
      studentName: name,
      studentInitials,
      studentImage,
      scheduledAt: b.scheduledAt.toISOString(),
      durationMins: b.durationMins,
      status: effectiveStatus,
      earnings: b.tutorPayoutAmount ?? null,
      currency,
      hasCanvas: !!(() => {
        const wd = b.lesson?.whiteboardData as { snapshot?: { elements?: unknown[] }; pages?: { objects?: unknown[]; pageHtml?: string }[]; objects?: unknown[]; pageHtml?: string } | null | undefined;
        if (!wd) return false;
        if ((wd.snapshot?.elements as unknown[])?.length) return true;
        if (Array.isArray(wd.pages)) return wd.pages.some(p => p.objects?.length || p.pageHtml?.trim());
        return !!(wd.objects?.length || wd.pageHtml?.trim());
      })(),
    };
  });

  return (
    <SessionsClient
      fullName={fullName}
      initials={initials}
      photo={profile?.profilePhotoUrl ?? null}
      profileComplete={profileComplete}
      sessions={sessions}
      tutorStats={tutorStats}
      currency={currency}
    />
  );
}
