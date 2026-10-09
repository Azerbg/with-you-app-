import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateAvailableSlots } from "@/lib/slots";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import BookingFlowClient from "./BookingFlowClient";
import { DISCOVERY_SESSION_USD, STANDARD_SESSION_USD } from "@/lib/pricing";

interface Props { params: Promise<{ tutorId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tutorId } = await params;
  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "en" ? "en" : "fr";
  const profile = await db.tutorProfile.findUnique({
    where: { userId: tutorId },
    include: { user: { select: { hrApplication: { select: { fullName: true } } } } },
  });
  if (!profile) return { title: lang === "en" ? "Booking — WithYou" : "Réservation — WithYou" };
  const name = profile.user.hrApplication?.fullName ?? (lang === "en" ? "Tutor" : "Tuteur");
  return { title: lang === "en" ? `Book with ${name} — WithYou` : `Réserver avec ${name} — WithYou` };
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

  // Check if student already has any session with this tutor (blocks discovery)
  const [existingSession, studentProfile] = await Promise.all([
    db.booking.findFirst({
      where: {
        studentId: session.user.id,
        tutorId,
        status: { not: "CANCELLED" },
      },
      select: { id: true },
    }),
    db.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { country: true, user: { select: { timezone: true } } },
    }),
  ]);

  const bookings = await db.booking.findMany({
    where: { tutorId, status: { in: ["PENDING", "CONFIRMED"] }, scheduledAt: { gte: new Date() } },
    select: { scheduledAt: true },
  });

  const slots = generateAvailableSlots(profile.availability, bookings.map((b) => b.scheduledAt), 28);

  const displayName =
    profile.user.firstName && profile.user.lastName
      ? `${profile.user.firstName} ${profile.user.lastName}`
      : profile.user.hrApplication?.fullName ?? "Tuteur";

  const photoUrl = profile.user.image ?? profile.profilePhotoUrl;

  // USD amounts charged by Stripe — shared with payment-intent route via lib/pricing.ts
  const sessionPriceUsd   = STANDARD_SESSION_USD;
  const discoveryPriceUsd = DISCOVERY_SESSION_USD;

  const pubKey = process.env.STRIPE_PUBLISHABLE_KEY ?? "";
  if (!pubKey) console.error("[Booking] STRIPE_PUBLISHABLE_KEY is not set.");
  else if (!pubKey.startsWith("pk_")) console.error(`[Booking] STRIPE_PUBLISHABLE_KEY doesn't start with pk_ — Payment Element will reject it.`);

  return (
    <BookingFlowClient
      tutorId={tutorId}
      tutorName={displayName}
      tutorPhoto={photoUrl ?? null}
      availableSlots={slots.map((s) => s.utc.toISOString())}
      stripePublishableKey={process.env.STRIPE_PUBLISHABLE_KEY ?? ""}
      alreadyHadSession={!!existingSession}
      sessionPriceUsd={sessionPriceUsd}
      discoveryPriceUsd={discoveryPriceUsd}
      studentCountry={studentProfile?.country ?? "US"}
      studentTimezone={studentProfile?.user?.timezone ?? null}
    />
  );
}
