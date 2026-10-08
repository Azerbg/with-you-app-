import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import MyTutorsClient from "./MyTutorsClient";

export const dynamic = "force-dynamic";

export default async function MyTutorsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  // Get all unique tutors this student has booked
  const bookings = await db.booking.findMany({
    where: {
      studentId: session.user.id,
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    orderBy: { scheduledAt: "desc" },
    include: {
      tutor: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          hrApplication: { select: { fullName: true } },
          tutorProfile: {
            select: {
              id: true,
              bio: true,
              profilePhotoUrl: true,
              languagesTaught: true,
              specializations: true,
              certifications: true,
              averageRating: true,
              totalReviews: true,
              verificationTier: true,
            },
          },
        },
      },
    },
  });

  // Deduplicate tutors — keep first occurrence (most recent booking)
  const seen = new Set<string>();
  const tutors = bookings
    .filter(b => {
      if (seen.has(b.tutorId)) return false;
      seen.add(b.tutorId);
      return true;
    })
    .map(b => ({
      userId:       b.tutorId,
      email:        b.tutor.email,
      firstName:    b.tutor.firstName ?? null,
      lastName:     b.tutor.lastName ?? null,
      fullName:     b.tutor.hrApplication?.fullName ?? null,
      profile:      b.tutor.tutorProfile,
      sessionCount: bookings.filter(x => x.tutorId === b.tutorId).length,
      lastSession:  b.scheduledAt.toISOString(),
    }));

  return <MyTutorsClient tutors={tutors} />;
}
