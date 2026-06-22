"use client";

import { useState, useMemo } from "react";

interface WeeklyCalendarProps {
  slotsUtc: string[]; // UTC ISO strings
  bookingHref: string;
}

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function WeeklyCalendar({ slotsUtc, bookingHref }: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = next, 2 = week after

  const userTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  // Local date key: YYYY-MM-DD in user's timezone (en-CA gives ISO-like format)
  const toLocalKey = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone: userTz });

  // Today's local key
  const todayKey = useMemo(() => toLocalKey(new Date()), [userTz]);

  // 7 days of the displayed week (Sunday = col 0)
  const weekDays = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - dayOfWeek + weekOffset * 7);
    sunday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  // Range label
  const rangeLabel = useMemo(() => {
    const fmt = (d: Date) =>
      d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: userTz });
    return `${fmt(weekDays[0])} – ${fmt(weekDays[6])}`;
  }, [weekDays, userTz]);

  // Group slots by local date key
  const slotsByDay = useMemo(() => {
    const map: Record<string, Date[]> = {};
    for (const iso of slotsUtc) {
      const d = new Date(iso);
      const key = toLocalKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(d);
    }
    // Sort each day's slots chronologically
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.getTime() - b.getTime());
    }
    return map;
  }, [slotsUtc, userTz]);

  return (
    <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">

      {/* Section title + week navigation */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest">Disponibilites</p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
            disabled={weekOffset === 0}
            aria-label="Semaine precedente"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#D9D0C3] text-[#5C3D00] text-base hover:bg-[#F0EBE0] disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            ‹
          </button>
          <span className="text-xs font-semibold text-[#5C3D00] text-center" style={{ minWidth: "7.5rem" }}>
            {rangeLabel}
          </span>
          <button
            onClick={() => setWeekOffset(o => Math.min(2, o + 1))}
            disabled={weekOffset === 2}
            aria-label="Semaine suivante"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#D9D0C3] text-[#5C3D00] text-base hover:bg-[#F0EBE0] disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            ›
          </button>
        </div>
      </div>

      {/* Timezone notice */}
      <p className="text-[11px] text-[#9B8A6B] mb-4">
        Heures affichees selon votre fuseau :{" "}
        <span className="font-semibold text-[#6B5E44]">{userTz}</span>
      </p>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">

        {/* Day headers */}
        {weekDays.map((d, i) => {
          const key = toLocalKey(d);
          const isToday = key === todayKey;
          const dayNum = d.toLocaleDateString("fr-FR", { day: "numeric", timeZone: userTz });
          return (
            <div key={`h-${i}`} className="text-center mb-1">
              <p className="text-[10px] font-bold text-[#9B8A6B] uppercase leading-tight">
                {DAY_LABELS[i]}
              </p>
              <div className={`mx-auto w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold
                ${isToday ? "bg-[#5C3D00] text-[#F5C400]" : "text-[#5C3D00]"}`}>
                {dayNum}
              </div>
            </div>
          );
        })}

        {/* Slot cells */}
        {weekDays.map((d, i) => {
          const key = toLocalKey(d);
          const daySlots = slotsByDay[key] ?? [];
          const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
          const hasSlots = daySlots.length > 0;

          return (
            <div
              key={`s-${i}`}
              className={`rounded-lg p-1 min-h-16 transition-opacity
                ${isPast ? "opacity-40" : ""}
                ${hasSlots ? "bg-green-50" : "bg-[#F8F6F0]"}`}
            >
              {hasSlots ? (
                <div className="space-y-0.5">
                  {daySlots.slice(0, 5).map((slot, j) => (
                    <a
                      key={j}
                      href={bookingHref}
                      className="block text-center font-semibold text-green-800 bg-green-100 hover:bg-green-200 rounded px-0.5 py-0.5 transition leading-tight"
                      style={{ fontSize: "9px" }}
                    >
                      {slot.toLocaleTimeString("fr-FR", {
                        timeZone: userTz,
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </a>
                  ))}
                  {daySlots.length > 5 && (
                    <a
                      href={bookingHref}
                      className="block text-center text-green-700 font-bold leading-tight"
                      style={{ fontSize: "9px" }}
                    >
                      +{daySlots.length - 5}
                    </a>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center min-h-12">
                  <span className="text-[#D9D0C3]" style={{ fontSize: "10px" }}>—</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA hint */}
      {Object.values(slotsByDay).some(s => s.length > 0) && (
        <p className="text-[10px] text-[#9B8A6B] text-center mt-3">
          Cliquez sur un creneau pour choisir votre heure exacte lors de la reservation.
        </p>
      )}
    </div>
  );
}
