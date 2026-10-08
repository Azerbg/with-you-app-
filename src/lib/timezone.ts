/**
 * Convert a recurring weekly slot from the tutor's timezone to the viewer's local timezone.
 *
 * Slots are stored as (dayOfWeek 0=Mon…6=Sun, startTime "HH:MM") in tutorTz.
 * We pick an anchor date (next occurrence of that weekday) and convert via Intl.
 */
export function convertSlotTime(
  dayOfWeek: number,  // 0 = Mon … 6 = Sun
  timeHHMM:  string,  // "HH:MM" in tutorTz
  tutorTz:   string,  // IANA, e.g. "Africa/Tunis"
  viewerTz:  string,  // IANA, e.g. "America/New_York"
): { dayOfWeek: number; time: string } {
  // Build a concrete UTC date for "next occurrence of dayOfWeek at timeHHMM in tutorTz"
  const [hh, mm] = timeHHMM.split(":").map(Number);

  // Start from today in UTC, find the next matching weekday
  const base = new Date();
  // Shift to tutorTz to determine the current weekday there
  const tutorWeekday = new Date(
    base.toLocaleString("en-US", { timeZone: tutorTz })
  ).getDay(); // 0=Sun, but we use 0=Mon for our dayOfWeek
  const isoWeekdayNow = (tutorWeekday + 6) % 7; // convert Sun=0 → Sun=6
  const daysAhead = ((dayOfWeek - isoWeekdayNow) + 7) % 7 || 7;

  const anchor = new Date(base);
  anchor.setDate(anchor.getDate() + daysAhead);

  // Build a date string in tutorTz with the slot time
  const [year, month, day] = anchor.toLocaleDateString("en-CA", { timeZone: tutorTz }).split("-").map(Number);
  // Create a UTC instant from that local time in tutorTz
  const local = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`
  );
  // Adjust for UTC offset of tutorTz at that moment
  const tutorOffset = new Date(local.toLocaleString("en-US", { timeZone: tutorTz })).getTime() - local.getTime();
  const utc = new Date(local.getTime() - tutorOffset);

  // Format in viewerTz
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone:  viewerTz,
    weekday:   "short",
    hour:      "2-digit",
    minute:    "2-digit",
    hour12:    false,
  }).formatToParts(utc);

  const viewerHour  = parts.find(p => p.type === "hour")?.value ?? "00";
  const viewerMin   = parts.find(p => p.type === "minute")?.value ?? "00";
  const viewerDay   = parts.find(p => p.type === "weekday")?.value ?? "";

  // Convert short weekday back to 0=Mon index
  const dayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const viewerDayOfWeek = dayMap[viewerDay] ?? dayOfWeek;

  return { dayOfWeek: viewerDayOfWeek, time: `${viewerHour}:${viewerMin}` };
}

/**
 * Format an IANA timezone as a short human label, e.g. "GMT+1 Paris"
 */
export function formatTimezoneLabel(tz: string): string {
  try {
    const now = new Date();
    const offsetStr = new Intl.DateTimeFormat("en-US", {
      timeZone:      tz,
      timeZoneName:  "shortOffset",
    }).formatToParts(now).find(p => p.type === "timeZoneName")?.value ?? "";
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
    return `${offsetStr} ${city}`;
  } catch {
    return tz;
  }
}
