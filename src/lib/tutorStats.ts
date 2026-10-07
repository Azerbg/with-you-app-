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
 *   - earnings  : use tutorPayoutAmount stored on booking
 */
export async function getTutorStats(
  tutorId: string,
  currency: string,
): Promise<TutorStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const bookings = await db.booking.findMany({
    where: { tutorId, status: { not: "CANCELLED" } },
    select: {
      scheduledAt: true,
      durationMins: true,
      status: true,
      tutorPayoutAmount: true,
      studentId: true,
    },
  });

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
      const earn = b.tutorPayoutAmount ?? 0;
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
