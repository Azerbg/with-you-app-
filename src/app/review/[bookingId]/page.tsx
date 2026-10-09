import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import ReviewClient from "./ReviewClient";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "en" ? "en" : "fr";
  return { title: lang === "en" ? "Leave a review — WithYou" : "Laisser un avis — WithYou" };
}

interface Props { params: Promise<{ bookingId: string }> }

export default async function ReviewPage({ params }: Props) {
  const { bookingId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/review/${bookingId}`);
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
      review: { select: { id: true } },
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
  if (booking.studentId !== session.user.id) notFound();
  if (booking.status !== "COMPLETED") redirect("/dashboard/student");
  if (booking.review) redirect("/dashboard/student?reviewed=1");

  const tutorName =
    booking.tutor.hrApplication?.fullName ||
    [booking.tutor.firstName, booking.tutor.lastName].filter(Boolean).join(" ") ||
    "Tuteur";

  return (
    <ReviewClient
      bookingId={bookingId}
      tutorName={tutorName}
      tutorPhoto={booking.tutor.tutorProfile?.profilePhotoUrl ?? null}
      scheduledAt={booking.scheduledAt.toISOString()}
    />
  );
}
