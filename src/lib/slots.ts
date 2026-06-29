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
const WINDOW_HOURS: Record<string, [number, number]> = {
  MORNING:   [6, 12],
  AFTERNOON: [12, 18],
  EVENING:   [18, 24],
};

// Convert a Tunisia-local hour (UTC+1) to the student's local hour in their timezone
function tunisiaHourToStudentHour(tunisiaH: number, studentTz: string): number {
  const now = new Date();
  const utcH = ((tunisiaH - TUNISIA_OFFSET_HOURS) % 24 + 24) % 24;
  const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcH));
  const localStr = ref.toLocaleString("en-US", { timeZone: studentTz, hour: "numeric", hour12: false });
  return parseInt(localStr, 10) % 24;
}

export function computeMatchScore(tutor: {
  languagesTaught: string[];
  specializations: string[];
  cefrTeachingMin: string | null;
  cefrTeachingMax: string | null;
  averageRating: number;
  totalReviews: number;
  yearsExperience: number | null;
  avgResponseHours: number;
  verificationTier: string;
  availability: { dayOfWeek: number | null; startTime: string | null; endTime: string | null; isRecurring: boolean }[];
}, student: {
  targetLanguage: string | null;
  learningObjective: string | null;
  cefrLevel: string | null;
  availabilityDays: string[];
  timeWindowPreference: string[];
  timezone: string | null;
}): number {
  if (!student.targetLanguage) return 0;
  if (!tutor.languagesTaught.includes(student.targetLanguage)) return 0;

  let score = 0;

  // 1. CEFR alignment (25 pts)
  const sIdx = CEFR_ORDER.indexOf(student.cefrLevel ?? "A1");
  const minIdx = CEFR_ORDER.indexOf(tutor.cefrTeachingMin ?? "A1");
  const maxIdx = CEFR_ORDER.indexOf(tutor.cefrTeachingMax ?? "C2");
  if (sIdx >= minIdx && sIdx <= maxIdx) {
    score += 25;
  } else {
    const dist = Math.min(Math.abs(sIdx - minIdx), Math.abs(sIdx - maxIdx));
    score += Math.max(0, 25 - dist * 8);
  }

  // 2. Specialization match (15 pts)
  const targetSpec = OBJ_TO_SPEC[student.learningObjective ?? ""];
  if (targetSpec && tutor.specializations.includes(targetSpec)) score += 15;

  // 3. Bayesian rating (18 pts)
  // Prior: 3.0 stars weighted at 5 virtual reviews — penalises unreviewed tutors less harshly
  const n = tutor.totalReviews ?? 0;
  const bayesianRating = (5 * 3.0 + n * tutor.averageRating) / (5 + n);
  score += (bayesianRating / 5) * 18;

  // 4. Availability day overlap (10 pts)
  if (student.availabilityDays.length > 0) {
    const tutorDows = new Set(
      tutor.availability.filter(a => a.isRecurring).map(a => a.dayOfWeek),
    );
    const overlap = student.availabilityDays.filter(
      code => tutorDows.has(DAY_CODES.indexOf(code)),
    ).length;
    score += (overlap / student.availabilityDays.length) * 10;
  } else {
    score += 5; // neutral: student has no preference set
  }

  // 5. Time-window match — timezone-aware (12 pts)
  if (student.timeWindowPreference.length > 0 && student.timezone) {
    const tutorHoursInStudentTz = new Set<number>();
    for (const row of tutor.availability) {
      if (!row.isRecurring || !row.startTime || !row.endTime) continue;
      for (const h of hoursInWindow(row.startTime, row.endTime)) {
        tutorHoursInStudentTz.add(tunisiaHourToStudentHour(h, student.timezone));
      }
    }
    let windowMatch = false;
    outer: for (const pref of student.timeWindowPreference) {
      const [wStart, wEnd] = WINDOW_HOURS[pref] ?? [0, 0];
      for (const h of tutorHoursInStudentTz) {
        if (h >= wStart && h < wEnd) { windowMatch = true; break outer; }
      }
    }
    if (windowMatch) score += 12;
  } else {
    score += 6; // neutral: no time preference set
  }

  // 6. Response time (8 pts — lower hours = better)
  score += Math.max(0, 8 - (tutor.avgResponseHours / 24) * 8);

  // 7. Verification tier (7 pts)
  if (tutor.verificationTier === "TOP_TUTOR") score += 7;
  else if (tutor.verificationTier === "VERIFIED") score += 5;

  // 8. Experience bonus (5 pts — caps at 10 years)
  const exp = tutor.yearsExperience ?? 0;
  score += Math.min(5, (exp / 10) * 5);

  return Math.round(score);
}
