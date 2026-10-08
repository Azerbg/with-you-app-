import { db } from "@/lib/db";

export interface TutorStats {
  completed: number;       // COMPLETED or (CONFIRMED + endAt < now)
  upcoming: number;        // scheduledAt > now, not cancelled
  activeStudents: number;  // unique students with ≥1 completed booking
  earningsThisMonth: number;
  earningsTotal: number;
  currency: string;
}

/**
 * Single source of truth for tutor statistics.
 * Rules:
 *   - upcoming  : scheduledAt > now AND status ≠ CANCELLED
 *   - completed : status = COMPLETED OR (status = CONFIRMED AND endAt < now)
 *   - endAt     : scheduledAt + durationMins (no extra column needed)
 *   - earnings  : tutorPayoutAmount if set; else durationMins/60 × hourlyRate
 */
export async function getTutorStats(
  tutorId: string,
  currency: string,
): Promise<TutorStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [bookings, compensation] = await Promise.all([
    db.booking.findMany({
      where: { tutorId, status: { not: "CANCELLED" } },
      select: {
        scheduledAt: true,
        durationMins: true,
        status: true,
        tutorPayoutAmount: true,
        studentId: true,
      },
    }),
    db.tutorCompensation.findUnique({
      where: { userId: tutorId },
      select: { hourlyRateTnd: true, hourlyRateCad: true },
    }).catch(() => null),
  ]);

  const hourlyRate = currency === "CAD"
    ? (compensation?.hourlyRateCad ?? 0)
    : (compensation?.hourlyRateTnd ?? 0);

  let completed = 0;
  let upcoming = 0;
  let earningsThisMonth = 0;
  let earningsTotal = 0;
  const activeStudentIds = new Set<string>();

  for (const b of bookings) {
    const endAt = new Date(b.scheduledAt.getTime() + b.durationMins * 60 * 1000);
    const isDone =
      b.status === "COMPLETED" ||
      (b.status === "CONFIRMED" && endAt < now);
    const isUpcoming = b.scheduledAt > now;

    if (isDone) {
      completed++;
      activeStudentIds.add(b.studentId);
      // Use stored payout amount; fall back to computed rate if missing/zero
      const earn = (b.tutorPayoutAmount && b.tutorPayoutAmount > 0)
        ? b.tutorPayoutAmount
        : Math.round((hourlyRate * (b.durationMins / 60)) * 100) / 100;
      earningsTotal += earn;
      if (b.scheduledAt >= startOfMonth) earningsThisMonth += earn;
    } else if (isUpcoming) {
      upcoming++;
    }
  }

  return {
    completed,
    upcoming,
    activeStudents: activeStudentIds.size,
    earningsThisMonth,
    earningsTotal,
    currency,
  };
}
