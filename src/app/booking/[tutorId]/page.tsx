import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateAvailableSlots } from "@/lib/slots";
import type { Metadata } from "next";
import BookingFlowClient from "./BookingFlowClient";

interface Props { params: Promise<{ tutorId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tutorId } = await params;
  const profile = await db.tutorProfile.findUnique({
    where: { userId: tutorId },
    include: { user: { select: { hrApplication: { select: { fullName: true } } } } },
  });
  if (!profile) return { title: "Réservation — WithYou" };
  const name = profile.user.hrApplication?.fullName ?? "Tuteur";
  return { title: `Réserver avec ${name} — WithYou` };
}

export default async function BookingPage({ params }: Props) {
  const { tutorId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/booking/${tutorId}`);
  }

  if (session.user.role !== "STUDENT") {
    redirect("/dashboard/tutor");
  }

  const profile = await db.tutorProfile.findUnique({
    where: { userId: tutorId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          image: true,
          hrApplication: { select: { fullName: true, status: true } },
        },
      },
      availability: true,
    },
  });

  if (!profile || profile.user.hrApplication?.status !== "ACTIVE") notFound();

  // Check if student already has a discovery session with this tutor
  const [existingDiscovery, studentProfile] = await Promise.all([
    db.booking.findFirst({
      where: {
        studentId: session.user.id,
        tutorId,
        sessionType: "DISCOVERY",
        status: { not: "CANCELLED" },
      },
    }),
    db.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { country: true },
    }),
  ]);

  const bookings = await db.booking.findMany({
    where: { tutorId, status: { in: ["PENDING", "CONFIRMED"] }, scheduledAt: { gte: new Date() } },
    select: { scheduledAt: true },
  });

  const slots = generateAvailableSlots(profile.availability, bookings.map((b) => b.scheduledAt), 14);

  const displayName =
    profile.user.firstName && profile.user.lastName
      ? `${profile.user.firstName} ${profile.user.lastName}`
      : profile.user.hrApplication?.fullName ?? "Tuteur";

  const photoUrl = profile.user.image ?? profile.profilePhotoUrl;

  // Session price for 50-min full session, based on tutor verification tier
  const SINGLE_PRICES: Record<string, number> = { BASIC: 25, VERIFIED: 30, TOP_TUTOR: 35 };
  const sessionPriceUsd = SINGLE_PRICES[profile.verificationTier] ?? 25;

  return (
    <BookingFlowClient
      tutorId={tutorId}
      tutorName={displayName}
      tutorPhoto={photoUrl ?? null}
      availableSlots={slots.map((s) => s.utc.toISOString())}
      stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
      alreadyHadDiscovery={!!existingDiscovery}
      tutorTier={profile.verificationTier}
      sessionPriceUsd={sessionPriceUsd}
      studentCountry={studentProfile?.country ?? "US"}
    />
  );
}
