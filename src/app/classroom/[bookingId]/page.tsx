import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import ClassroomClient from "./ClassroomClient";

export const metadata: Metadata = { title: "Salle de classe — WithYou" };

interface Props { params: Promise<{ bookingId: string }> }

export default async function ClassroomPage({ params }: Props) {
  const { bookingId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/classroom/${bookingId}`);
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      studentId: true,
      tutorId: true,
      status: true,
      scheduledAt: true,
      durationMins: true,
      student: { select: { firstName: true, lastName: true } },
      tutor: {
        select: {
          firstName: true,
          lastName: true,
          hrApplication: { select: { fullName: true } },
          tutorProfile: { select: { profilePhotoUrl: true } },
        },
      },
    },
  });

  if (!booking) notFound();

  const userId = session.user.id;
  const isStudent = booking.studentId === userId;
  const isTutor = booking.tutorId === userId;

  if (!isStudent && !isTutor) notFound();

  if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") {
    redirect("/dashboard/student");
  }

  const tutorName =
    booking.tutor.hrApplication?.fullName ||
    [booking.tutor.firstName, booking.tutor.lastName].filter(Boolean).join(" ") ||
    "Tuteur";

  const studentName =
    [booking.student.firstName, booking.student.lastName].filter(Boolean).join(" ") ||
    "Étudiant";

  return (
    <ClassroomClient
      bookingId={bookingId}
      role={isStudent ? "student" : "tutor"}
      tutorName={tutorName}
      studentName={studentName}
      scheduledAt={booking.scheduledAt.toISOString()}
      durationMins={booking.durationMins}
      status={booking.status}
    />
  );
}
