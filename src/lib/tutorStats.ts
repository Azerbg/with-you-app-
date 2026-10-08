import { db } from "@/lib/db";

export interface TutorStats {
  completed: number;       // COMPLETED or (CONFIRMED + endAt < now)
  upcoming: number;        // scheduledAt > now, not cancelled
  activeStudents: number;  // unique students with ≥1 completed booking
  earningsThisMonth: number;
  earningsTotal: number;
  currency: string;
}

export interface TutorEarnings {
  thisMonth: number;
  total: number;
  currency: string;
}

/**
 * Accrued earnings from completed bookings (not payouts table).
 * Shared by Dashboard, Sessions and Earnings pages.
 */
export async function getTutorEarnings(
  tutorId: string,
  currency: string,
): Promise<TutorEarnings> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [bookings, compensation] = await Promise.all([
    db.booking.findMany({
      where: { tutorId, status: { not: "CANCELLED" } },
      select: {
        scheduledAt:      true,
        durationMins:     true,
        status:           true,
        tutorPayoutAmount: true,
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

  let thisMonth = 0;
  let total = 0;

  for (const b of bookings) {
    const durationMins = Math.min(240, b.durationMins);
    const endAt = new Date(b.scheduledAt.getTime() + durationMins * 60_000);
    const isDone =
      b.status === "COMPLETED" ||
      (b.status === "CONFIRMED" && endAt < now);

    if (!isDone) continue;

    const earn = (b.tutorPayoutAmount && b.tutorPayoutAmount > 0)
      ? b.tutorPayoutAmount
      : Math.round((hourlyRate * (durationMins / 60)) * 100) / 100;

    total += earn;
    if (b.scheduledAt >= startOfMonth) thisMonth += earn;
  }

  return { thisMonth, total, currency };
}

/**
 * Single source of truth for tutor statistics.
 * Rules:
 *   - upcoming  : scheduledAt > now AND status ≠ CANCELLED
 *   - completed : status = COMPLETED OR (status = CONFIRMED AND endAt < now)
 *   - endAt     : scheduledAt + min(240, durationMins)
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
        scheduledAt:       true,
        durationMins:      true,
        status:            true,
        tutorPayoutAmount: true,
        studentId:         true,
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
    const durationMins = Math.min(240, b.durationMins);
    const endAt = new Date(b.scheduledAt.getTime() + durationMins * 60_000);
    const isDone =
      b.status === "COMPLETED" ||
      (b.status === "CONFIRMED" && endAt < now);
    const isUpcoming = b.scheduledAt > now;

    if (isDone) {
      completed++;
      activeStudentIds.add(b.studentId);
      const earn = (b.tutorPayoutAmount && b.tutorPayoutAmount > 0)
        ? b.tutorPayoutAmount
        : Math.round((hourlyRate * (durationMins / 60)) * 100) / 100;
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
