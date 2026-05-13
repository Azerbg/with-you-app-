import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AvailabilityManager from "./AvailabilityManager";

export default async function AvailabilityPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "TUTOR") redirect("/dashboard");

  const app = await db.hrApplication.findUnique({
    where: { userId: session.user.id },
    select: { status: true },
  });
  if (app?.status !== "ACTIVE") redirect("/dashboard/tutor");

  const profile = await db.tutorProfile.findUnique({
    where: { userId: session.user.id },
    include: { availability: true },
  });
  if (!profile) redirect("/dashboard/tutor");

  const existingSlots = profile.availability
    .filter(a => a.isRecurring && a.dayOfWeek !== null)
    .map(a => ({ dayOfWeek: a.dayOfWeek as number, startTime: a.startTime as string, endTime: a.endTime as string }));

  const existingBlocked = profile.availability
    .filter(a => !a.isRecurring && a.blockedDate !== null)
    .map(a => a.blockedDate!.toISOString().slice(0, 10));

  return <AvailabilityManager existingSlots={existingSlots} existingBlocked={existingBlocked} />;
}
