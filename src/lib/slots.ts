// Tunisia is UTC+1 year-round (no DST since 2009)
const TUNISIA_OFFSET_HOURS = 1;

export interface AvailableSlot {
  utc: Date;
  tunisiaHour: number;
  dayOfWeek: number; // 0=Mon … 6=Sun
}

type AvailabilityRow = {
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  isRecurring: boolean;
  blockedDate: Date | null;
};

function hoursInWindow(startTime: string, endTime: string): number[] {
  const [startH] = startTime.split(":").map(Number);
  const [endH] = endTime.split(":").map(Number);
  const hours: number[] = [];
  for (let h = startH; h < endH; h++) hours.push(h);
  return hours;
}

export function generateAvailableSlots(
  availability: AvailabilityRow[],
  existingBookings: Date[],
  daysAhead = 14,
): AvailableSlot[] {
  const now = new Date();
  const minTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // at least 2h ahead

  const blockedDates = new Set(
    availability
      .filter(a => !a.isRecurring && a.blockedDate)
      .map(a => a.blockedDate!.toISOString().slice(0, 10)),
  );

  const bookedSet = new Set(existingBookings.map(d => d.toISOString()));
  const recurringRows = availability.filter(a => a.isRecurring && a.dayOfWeek !== null);

  const slots: AvailableSlot[] = [];

  for (let d = 0; d <= daysAhead; d++) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + d);
    const dateStr = date.toISOString().slice(0, 10);

    if (blockedDates.has(dateStr)) continue;

    // JS getUTCDay(): 0=Sun … 6=Sat → convert to 0=Mon … 6=Sun
    const jsDow = date.getUTCDay();
    const dow = jsDow === 0 ? 6 : jsDow - 1;

    for (const row of recurringRows) {
      if (row.dayOfWeek !== dow) continue;

      for (const h of hoursInWindow(row.startTime!, row.endTime!)) {
        const utcH = h - TUNISIA_OFFSET_HOURS;
        const slot = new Date(date);
        slot.setUTCHours(utcH, 0, 0, 0);

        if (slot <= minTime) continue;
        if (bookedSet.has(slot.toISOString())) continue;

        slots.push({ utc: slot, tunisiaHour: h, dayOfWeek: dow });
      }
    }
  }

  return slots.sort((a, b) => a.utc.getTime() - b.utc.getTime());
}

// ─── Match score (0–100) ──────────────────────────────────────────────────────

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const OBJ_TO_SPEC: Record<string, string> = {
  CONVERSATIONAL: "CONVERSATIONAL",
  PROFESSIONAL:   "PROFESSIONAL",
  ACADEMIC:       "ACADEMIC",
  EXAM_PREP:      "EXAM_PREP",
  TRAVEL:         "CONVERSATIONAL",
  CULTURAL:       "CONVERSATIONAL",
};

export function computeMatchScore(tutor: {
  languagesTaught: string[];
  specializations: string[];
  cefrTeachingMin: string | null;
  cefrTeachingMax: string | null;
  averageRating: number;
  avgResponseHours: number;
  verificationTier: string;
  availability: { dayOfWeek: number | null; isRecurring: boolean }[];
}, student: {
  targetLanguage: string | null;
  learningObjective: string | null;
  cefrLevel: string | null;
  availabilityDays: string[];
}): number {
  if (!student.targetLanguage) return 0;
  if (!tutor.languagesTaught.includes(student.targetLanguage)) return 0;

  let score = 0;

  // CEFR alignment (25 pts)
  const sIdx = CEFR_ORDER.indexOf(student.cefrLevel ?? "A1");
  const minIdx = CEFR_ORDER.indexOf(tutor.cefrTeachingMin ?? "A1");
  const maxIdx = CEFR_ORDER.indexOf(tutor.cefrTeachingMax ?? "C2");
  if (sIdx >= minIdx && sIdx <= maxIdx) {
    score += 25;
  } else {
    const dist = Math.min(Math.abs(sIdx - minIdx), Math.abs(sIdx - maxIdx));
    score += Math.max(0, 25 - dist * 8);
  }

  // Specialization match (15 pts)
  const targetSpec = OBJ_TO_SPEC[student.learningObjective ?? ""];
  if (targetSpec && tutor.specializations.includes(targetSpec)) score += 15;

  // Rating (20 pts)
  score += (tutor.averageRating / 5) * 20;

  // Availability overlap (20 pts)
  if (student.availabilityDays.length > 0) {
    const tutorDows = new Set(
      tutor.availability.filter(a => a.isRecurring).map(a => a.dayOfWeek),
    );
    const overlap = student.availabilityDays.filter(
      code => tutorDows.has(DAY_CODES.indexOf(code)),
    ).length;
    score += (overlap / student.availabilityDays.length) * 20;
  } else {
    score += 10;
  }

  // Response time (10 pts — lower hours = better)
  score += Math.max(0, 10 - (tutor.avgResponseHours / 24) * 10);

  // Verification tier (10 pts)
  if (tutor.verificationTier === "TOP_TUTOR") score += 10;
  else if (tutor.verificationTier === "VERIFIED") score += 8;

  return Math.round(score);
}
