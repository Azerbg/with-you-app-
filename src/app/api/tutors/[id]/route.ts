import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAvailableSlots } from "@/lib/slots";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const profile = await db.tutorProfile.findUnique({
    where: { userId: id },
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

  if (!profile || profile.user.hrApplication?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get existing bookings for this tutor to exclude booked slots
  const bookings = await db.booking.findMany({
    where: {
      tutorId: id,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: { gte: new Date() },
    },
    select: { scheduledAt: true },
  });

  const existingDates = bookings.map(b => b.scheduledAt);
  const slots = generateAvailableSlots(profile.availability, existingDates, 14);

  const displayName =
    profile.user.firstName && profile.user.lastName
      ? `${profile.user.firstName} ${profile.user.lastName}`
      : profile.user.hrApplication?.fullName ?? "Tutor";

  return NextResponse.json({
    userId: profile.user.id,
    profileId: profile.id,
    displayName,
    image: profile.user.image ?? profile.profilePhotoUrl,
    bio: profile.bio,
    videoIntroUrl: profile.videoIntroUrl,
    profilePhotoUrl: profile.profilePhotoUrl,
    languagesTaught: profile.languagesTaught,
    specializations: profile.specializations,
    certifications: profile.certifications,
    yearsExperience: profile.yearsExperience,
    cefrTeachingMin: profile.cefrTeachingMin,
    cefrTeachingMax: profile.cefrTeachingMax,
    averageRating: profile.averageRating,
    totalReviews: profile.totalReviews,
    verificationTier: profile.verificationTier,
    availableSlots: slots.map(s => s.utc.toISOString()),
  });
}
