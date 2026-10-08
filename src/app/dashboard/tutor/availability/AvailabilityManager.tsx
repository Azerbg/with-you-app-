"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";

// ── Constants ──────────────────────────────────────────────────────────────
const START_HOUR = 7;
const END_HOUR   = 23; // exclusive → hours 7..22
const HOURS      = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

const DAY_LABELS = {
  fr: ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"],
  en: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
};
const MONTHS = {
  fr: ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
};

// Curated IANA timezone list (tutor-facing)
const COMMON_ZONES = [
  "Africa/Tunis","Africa/Casablanca","Africa/Cairo","Africa/Algiers","Africa/Lagos",
  "Europe/Paris","Europe/London","Europe/Berlin","Europe/Madrid","Europe/Rome",
  "Europe/Amsterdam","Europe/Brussels","Europe/Zurich","Europe/Warsaw",
  "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "America/Toronto","America/Montreal","America/Sao_Paulo",
  "Asia/Dubai","Asia/Riyadh","Asia/Beirut","Asia/Jerusalem",
  "Asia/Karachi","Asia/Kolkata","Asia/Singapore","Asia/Tokyo",
  "Australia/Sydney","Pacific/Auckland","UTC",
];

interface Slot {
  dayOfWeek: number; // 0 = Mon … 6 = Sun
  startTime: string; // "HH:MM"
  endTime:   string; // "HH:MM"
}

interface Props {
  existingSlots:    Slot[];
  existingBlocked:  string[]; // "YYYY-MM-DD"
  tutorTimezone:    string;   // IANA, e.g. "Africa/Tunis"
}

// ── Grid helpers ────────────────────────────────────────────────────────────
function buildGrid(slots: Slot[]): boolean[][] {
  const g: boolean[][] = Array.from({ length: 7 }, () => Array(HOURS.length).fill(false));
  for (const slot of slots) {
    const startH = parseInt(slot.startTime.split(":")[0]);
    const endH   = parseInt(slot.endTime.split(":")[0]);
    for (let h = startH; h < endH; h++) {
      const idx = h - START_HOUR;
      if (idx >= 0 && idx < HOURS.length) g[slot.dayOfWeek][idx] = true;
    }
  }
  return g;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function slotsFromGrid(grid: boolean[][]): Slot[] {
  const slots: Slot[] = [];
  grid.forEach((row, day) => {
    row.forEach((on, hIdx) => {
      if (on) {
        const h = START_HOUR + hIdx;
        slots.push({ dayOfWeek: day, startTime: `${pad(h)}:00`, endTime: `${pad(h + 1)}:00` });
      }
    });
  });
  return slots;
}

// ── Calendar helpers ─────────────────────────────────────────────────────────
function calCells(year: number, month: number): (string | null)[] {
  const firstDay    = new Date(year, month, 1).getDay();
  const offset      = (firstDay + 6) % 7; // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  return cells;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AvailabilityManager({ existingSlots, existingBlocked, tutorTimezone }: Props) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;

  // ─ Timezone ─
  const [timezone, setTimezone] = useState(tutorTimezone || "Africa/Tunis");
  // Detect browser timezone on first render and suggest it if it differs
  useEffect(() => {
    if (!tutorTimezone || tutorTimezone === "UTC") {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─ Weekly grid ─
  const [grid, setGrid]         = useState<boolean[][]>(() => buildGrid(existingSlots));
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(false);

  useEffect(() => {
    const stop = () => setDragging(false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  function applyCell(day: number, hIdx: number, val: boolean) {
    setGrid(prev => { const n = prev.map(r => [...r]); n[day][hIdx] = val; return n; });
    setSaved(false);
  }

  function handleCellDown(e: React.MouseEvent, day: number, hIdx: number) {
    e.preventDefault();
    const newVal = !grid[day][hIdx];
    setDragging(true); setDragValue(newVal);
    applyCell(day, hIdx, newVal);
  }

  function handleCellEnter(day: number, hIdx: number) {
    if (dragging) applyCell(day, hIdx, dragValue);
  }

  function toggleDay(day: number) {
    const allOn = grid[day].every(Boolean);
    setGrid(prev => { const n = prev.map(r => [...r]); n[day] = n[day].map(() => !allOn); return n; });
    setSaved(false);
  }

  function toggleHour(hIdx: number) {
    const allOn = grid.every(row => row[hIdx]);
    setGrid(prev => { const n = prev.map(r => [...r]); n.forEach(row => { row[hIdx] = !allOn; }); return n; });
    setSaved(false);
  }

  const totalHours = grid.flat().filter(Boolean).length;

  // ─ Blocked dates ─
  const todayStr = new Date().toISOString().slice(0, 10);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(() => new Set(existingBlocked));
  const now = new Date();
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  function calPrev() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function calNext() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }
  function toggleBlocked(dateStr: string) {
    if (dateStr < todayStr) return;
    setBlockedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr);
      return next;
    });
    setSaved(false);
  }

  // ─ Save ─
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  async function handleSave() {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch("/api/tutors/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots:        slotsFromGrid(grid),
          blockedDates: [...blockedDates],
          timezone,
        }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  }

  const dayShort = DAY_LABELS[lang];
  const monthLabels = MONTHS[lang];
  const cells = calCells(calYear, calMonth);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      {/* Top bar */}
      <div className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-8 flex-shrink-0">
        <h1 className="text-base font-bold text-[#5C3D00]">
          {t("Disponibilités", "Availability")}
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition ${
            saved ? "bg-green-500 text-white" : "bg-[#F5C400] text-[#5C3D00] hover:bg-[#FFDE59] disabled:opacity-50"
          }`}
        >
          {saving ? t("Enregistrement…","Saving…") : saved ? t("Enregistré ✓","Saved ✓") : t("Enregistrer","Save")}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* ── TIMEZONE PICKER ────────────────────────────────────── */}
          <div className="bg-[#FFF3B0] border border-[#F5C400]/40 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#C49200] shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#5C3D00]">
                  {t("Fuseau horaire de vos créneaux", "Your availability timezone")}
                </p>
                <p className="text-xs text-[#6B5E44] mt-0.5">
                  {t(
                    "Les heures ci-dessous sont dans ce fuseau. Les étudiants voient l'heure convertie selon leur pays.",
                    "Slot times below are in this timezone. Students see times converted to their local zone."
                  )}
                </p>
              </div>
            </div>
            <select
              value={timezone}
              onChange={e => { setTimezone(e.target.value); setSaved(false); }}
              className="border border-[#F5C400]/60 rounded-xl px-3 py-2 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition shrink-0"
            >
              {COMMON_ZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
              {!COMMON_ZONES.includes(timezone) && (
                <option value={timezone}>{timezone}</option>
              )}
            </select>
          </div>

          {/* ── WEEKLY GRID ─────────────────────────────────────────── */}
          <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D1A00]">
                  {t("Planning hebdomadaire", "Weekly schedule")}
                </p>
                <p className="text-xs text-[#6B5E44] mt-0.5">
                  {t(
                    `Cliquez ou faites glisser pour marquer vos créneaux (${timezone}). Cliquez sur un jour ou une heure pour tout sélectionner.`,
                    `Click or drag to mark your slots (${timezone}). Click a day or hour to toggle all.`
                  )}
                </p>
              </div>
              <span className="text-xs font-semibold text-[#C49200] bg-[#FFF3B0] px-3 py-1.5 rounded-full whitespace-nowrap">
                {totalHours}h / {t("semaine","week")}
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="select-none p-5" style={{ minWidth: 520 }} onDragStart={e => e.preventDefault()}>
                {/* Day headers */}
                <div className="grid mb-1" style={{ gridTemplateColumns: "44px repeat(7, 1fr)", gap: "3px" }}>
                  <div />
                  {dayShort.map((d, day) => {
                    const allOn = grid[day].every(Boolean);
                    const someOn = grid[day].some(Boolean);
                    return (
                      <button key={d} onClick={() => toggleDay(day)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition ${
                          allOn ? "bg-[#F5C400] text-[#5C3D00]" : someOn ? "bg-[#FFF3B0] text-[#5C3D00]" : "text-[#9B8A6B] hover:bg-[#F5F0E8]"
                        }`}>
                        {d}
                      </button>
                    );
                  })}
                </div>

                {/* Hour rows */}
                {HOURS.map((h, hIdx) => (
                  <div key={h} className="grid mb-0.5" style={{ gridTemplateColumns: "44px repeat(7, 1fr)", gap: "3px" }}>
                    <button onClick={() => toggleHour(hIdx)}
                      className="flex items-center justify-end pr-2 text-[11px] text-[#9B8A6B] font-medium tabular-nums hover:text-[#5C3D00] transition">
                      {pad(h)}:00
                    </button>
                    {Array.from({ length: 7 }, (_, day) => {
                      const on = grid[day][hIdx];
                      return (
                        <div key={day}
                          onMouseDown={e => handleCellDown(e, day, hIdx)}
                          onMouseEnter={() => handleCellEnter(day, hIdx)}
                          className={`h-7 rounded cursor-pointer transition-colors ${on ? "bg-[#F5C400] hover:bg-[#FFDE59]" : "bg-[#F7F5F0] hover:bg-[#FFF3B0]"}`}
                        />
                      );
                    })}
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center gap-5 mt-4 pl-[44px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-[#F5C400]" />
                    <span className="text-[11px] text-[#6B5E44]">{t("Disponible","Available")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-[#F7F5F0] border border-[#E8E0D4]" />
                    <span className="text-[11px] text-[#6B5E44]">{t("Non disponible","Unavailable")}</span>
                  </div>
                  <span className="text-[11px] text-[#9B8A6B]">
                    {t("Cliquez sur un jour ou une heure pour tout basculer","Click a day or hour to toggle all")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── BLOCKED DATES ───────────────────────────────────────── */}
          <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5">
              <p className="font-bold text-[#2D1A00]">{t("Dates bloquées","Blocked dates")}</p>
              <p className="text-xs text-[#6B5E44] mt-0.5">
                {t(
                  "Vacances, jours fériés, indisponibilités ponctuelles. Cliquez sur une date pour la bloquer ou la débloquer.",
                  "Holidays, vacations, one-off unavailability. Click a date to block or unblock it."
                )}
              </p>
            </div>

            <div className="p-6 flex gap-10 flex-wrap">
              {/* Mini calendar */}
              <div className="flex-shrink-0">
                <div className="flex items-center justify-between mb-3 w-[252px]">
                  <button onClick={calPrev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F0E8] transition text-[#5C3D00]">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </button>
                  <span className="text-sm font-bold text-[#2D1A00] capitalize">
                    {monthLabels[calMonth]} {calYear}
                  </span>
                  <button onClick={calNext} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F0E8] transition text-[#5C3D00]">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                    </svg>
                  </button>
                </div>

                {/* Weekday labels */}
                <div className="grid grid-cols-7 w-[252px] mb-1">
                  {(lang === "fr"
                    ? ["Lu","Ma","Me","Je","Ve","Sa","Di"]
                    : ["Mo","Tu","We","Th","Fr","Sa","Su"]
                  ).map(d => (
                    <div key={d} className="text-center text-[11px] font-semibold text-[#9B8A6B] py-1">{d}</div>
                  ))}
                </div>

                {/* Date cells */}
                <div className="grid grid-cols-7 gap-0.5 w-[252px]">
                  {cells.map((dateStr, i) => {
                    if (!dateStr) return <div key={i} />;
                    const isPast    = dateStr < todayStr;
                    const isBlocked = blockedDates.has(dateStr);
                    const isToday   = dateStr === todayStr;
                    const dayNum    = parseInt(dateStr.split("-")[2]);
                    return (
                      <button key={dateStr} onClick={() => toggleBlocked(dateStr)} disabled={isPast}
                        className={`h-9 w-full rounded-lg text-xs font-medium transition ${
                          isPast    ? "text-[#C4BAA8]/50 cursor-default"
                          : isBlocked ? "bg-red-500 text-white hover:bg-red-600"
                          : isToday   ? "bg-[#FFF3B0] text-[#5C3D00] ring-1 ring-[#F5C400] hover:bg-red-100 hover:text-red-700 hover:ring-red-300"
                          :             "text-[#2D1A00] hover:bg-red-100 hover:text-red-700"
                        }`}>
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Blocked date pills */}
              <div className="flex-1 min-w-[180px]">
                {blockedDates.size === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F7F5F0] flex items-center justify-center text-2xl mb-3">📅</div>
                    <p className="text-sm font-semibold text-[#2D1A00] mb-1">
                      {t("Aucune date bloquée","No blocked dates")}
                    </p>
                    <p className="text-xs text-[#9B8A6B]">
                      {t("Cliquez sur des dates dans le calendrier pour les bloquer.","Click dates in the calendar to block them.")}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-[#6B5E44] uppercase tracking-wide mb-3">
                      {blockedDates.size} {t(
                        `date${blockedDates.size !== 1 ? "s" : ""} bloquée${blockedDates.size !== 1 ? "s" : ""}`,
                        `blocked date${blockedDates.size !== 1 ? "s" : ""}`
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[...blockedDates].sort().map(d => (
                        <div key={d} className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                          {new Date(d + "T12:00:00").toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                          <button onClick={() => toggleBlocked(d)} className="hover:text-red-900 ml-0.5 leading-none text-sm">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── BOTTOM SAVE ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9B8A6B]">
              {totalHours === 0
                ? t(
                    "Aucun créneau sélectionné — les étudiants ne pourront pas vous réserver.",
                    "No slots selected — students will not be able to book you."
                  )
                : t(
                    `${totalHours} créneau${totalHours !== 1 ? "x" : ""} par semaine · ${blockedDates.size} date${blockedDates.size !== 1 ? "s" : ""} bloquée${blockedDates.size !== 1 ? "s" : ""}`,
                    `${totalHours} slot${totalHours !== 1 ? "s" : ""} per week · ${blockedDates.size} blocked date${blockedDates.size !== 1 ? "s" : ""}`
                  )}
            </p>
            <button onClick={handleSave} disabled={saving}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${
                saved ? "bg-green-500 text-white" : "bg-[#F5C400] text-[#5C3D00] hover:bg-[#FFDE59] disabled:opacity-50"
              }`}>
              {saving
                ? t("Enregistrement…","Saving…")
                : saved
                ? t("Enregistré ✓","Saved ✓")
                : t("Enregistrer les disponibilités","Save availability")}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
