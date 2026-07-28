"use client";

import { useState, useEffect } from "react";

// ── Constants ──────────────────────────────────────────────────────────────
const START_HOUR = 7;
const END_HOUR = 23; // exclusive → hours 7..22
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

interface Slot {
  dayOfWeek: number; // 0 = Mon … 6 = Sun
  startTime: string; // "HH:MM"
  endTime:   string; // "HH:MM"
}

interface Props {
  existingSlots:   Slot[];
  existingBlocked: string[]; // "YYYY-MM-DD"
}

// ── Grid helpers ──────────────────────────────────────────────────────────
// grid[day][hourIndex] where hourIndex = hour − START_HOUR
function buildGrid(slots: Slot[]): boolean[][] {
  const g: boolean[][] = Array.from({ length: 7 }, () =>
    Array(HOURS.length).fill(false)
  );
  for (const slot of slots) {
    const startH = parseInt(slot.startTime.split(":")[0]);
    const endH   = parseInt(slot.endTime.split(":")[0]);
    // Handles both hourly (07:00–08:00) and broad (07:00–12:00) legacy slots
    for (let h = startH; h < endH; h++) {
      const idx = h - START_HOUR;
      if (idx >= 0 && idx < HOURS.length) g[slot.dayOfWeek][idx] = true;
    }
  }
  return g;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

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

// ── Calendar helpers ──────────────────────────────────────────────────────
function calCells(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = (firstDay + 6) % 7;                  // shift to Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${year}-${pad(month + 1)}-${pad(d)}`
    );
  }
  return cells;
}

// ── Component ─────────────────────────────────────────────────────────────
export default function AvailabilityManager({ existingSlots, existingBlocked }: Props) {
  // ─ Weekly grid state ─
  const [grid, setGrid] = useState<boolean[][]>(() => buildGrid(existingSlots));
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(false);

  useEffect(() => {
    const stop = () => setDragging(false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  function applyCell(day: number, hIdx: number, val: boolean) {
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      next[day][hIdx] = val;
      return next;
    });
    setSaved(false);
  }

  function handleCellDown(e: React.MouseEvent, day: number, hIdx: number) {
    e.preventDefault();
    const newVal = !grid[day][hIdx];
    setDragging(true);
    setDragValue(newVal);
    applyCell(day, hIdx, newVal);
  }

  function handleCellEnter(day: number, hIdx: number) {
    if (dragging) applyCell(day, hIdx, dragValue);
  }

  // Quick-select: click a day header → toggle all hours for that day
  function toggleDay(day: number) {
    const allOn = grid[day].every(Boolean);
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      next[day] = next[day].map(() => !allOn);
      return next;
    });
    setSaved(false);
  }

  // Quick-select: click an hour label → toggle that hour for all days
  function toggleHour(hIdx: number) {
    const allOn = grid.every(row => row[hIdx]);
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      next.forEach(row => { row[hIdx] = !allOn; });
      return next;
    });
    setSaved(false);
  }

  const totalHours = grid.flat().filter(Boolean).length;

  // ─ Blocked dates state ─
  const todayStr = new Date().toISOString().slice(0, 10);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(
    () => new Set(existingBlocked)
  );

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
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
    setSaved(false);
  }

  // ─ Save ─
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/tutors/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: slotsFromGrid(grid),
          blockedDates: [...blockedDates],
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  const cells = calCells(calYear, calMonth);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      {/* Top bar */}
      <div className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-8 flex-shrink-0">
        <h1 className="text-base font-bold text-[#5C3D00]">Disponibilités</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition ${
            saved
              ? "bg-green-500 text-white"
              : "bg-[#F5C400] text-[#5C3D00] hover:bg-[#FFDE59] disabled:opacity-50"
          }`}
        >
          {saving ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* ── WEEKLY GRID ─────────────────────────────────────────── */}
          <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D1A00]">Planning hebdomadaire</p>
                <p className="text-xs text-[#6B5E44] mt-0.5">
                  Cliquez ou faites glisser pour marquer vos créneaux (heure de Tunis). Cliquez sur un jour ou une heure pour tout sélectionner.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#C49200] bg-[#FFF3B0] px-3 py-1.5 rounded-full whitespace-nowrap">
                {totalHours}h / semaine
              </span>
            </div>

            <div className="overflow-x-auto">
              <div
                className="select-none p-5"
                style={{ minWidth: 520 }}
                onDragStart={e => e.preventDefault()}
              >
                {/* Day header row */}
                <div
                  className="grid mb-1"
                  style={{ gridTemplateColumns: "44px repeat(7, 1fr)", gap: "3px" }}
                >
                  <div /> {/* hour-label spacer */}
                  {DAY_SHORT.map((d, day) => {
                    const allOn = grid[day].every(Boolean);
                    const someOn = grid[day].some(Boolean);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDay(day)}
                        title={`Tout sélectionner : ${d}`}
                        className={`py-1.5 rounded-lg text-xs font-bold transition ${
                          allOn
                            ? "bg-[#F5C400] text-[#5C3D00]"
                            : someOn
                            ? "bg-[#FFF3B0] text-[#5C3D00]"
                            : "text-[#9B8A6B] hover:bg-[#F5F0E8]"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                {/* Hour rows */}
                {HOURS.map((h, hIdx) => (
                  <div
                    key={h}
                    className="grid mb-0.5"
                    style={{ gridTemplateColumns: "44px repeat(7, 1fr)", gap: "3px" }}
                  >
                    {/* Hour label — click to toggle whole row */}
                    <button
                      onClick={() => toggleHour(hIdx)}
                      title={`Tout sélectionner : ${pad(h)}h`}
                      className="flex items-center justify-end pr-2 text-[11px] text-[#9B8A6B] font-medium tabular-nums hover:text-[#5C3D00] transition"
                    >
                      {pad(h)}:00
                    </button>

                    {/* Day cells */}
                    {Array.from({ length: 7 }, (_, day) => {
                      const on = grid[day][hIdx];
                      return (
                        <div
                          key={day}
                          onMouseDown={e => handleCellDown(e, day, hIdx)}
                          onMouseEnter={() => handleCellEnter(day, hIdx)}
                          className={`h-7 rounded cursor-pointer transition-colors ${
                            on
                              ? "bg-[#F5C400] hover:bg-[#FFDE59]"
                              : "bg-[#F7F5F0] hover:bg-[#FFF3B0]"
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center gap-5 mt-4 pl-[44px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-[#F5C400]" />
                    <span className="text-[11px] text-[#6B5E44]">Disponible</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-[#F7F5F0] border border-[#E8E0D4]" />
                    <span className="text-[11px] text-[#6B5E44]">Non disponible</span>
                  </div>
                  <span className="text-[11px] text-[#9B8A6B]">
                    Cliquez sur un jour ou une heure pour tout basculer
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── BLOCKED DATES ───────────────────────────────────────── */}
          <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5">
              <p className="font-bold text-[#2D1A00]">Dates bloquées</p>
              <p className="text-xs text-[#6B5E44] mt-0.5">
                Vacances, jours fériés, indisponibilités ponctuelles. Cliquez sur une date pour la bloquer ou la débloquer.
              </p>
            </div>

            <div className="p-6 flex gap-10 flex-wrap">
              {/* Mini calendar */}
              <div className="flex-shrink-0">
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-3 w-[252px]">
                  <button
                    onClick={calPrev}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F0E8] transition text-[#5C3D00]"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="text-sm font-bold text-[#2D1A00] capitalize">
                    {MONTHS_FR[calMonth]} {calYear}
                  </span>
                  <button
                    onClick={calNext}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F0E8] transition text-[#5C3D00]"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {/* Weekday labels */}
                <div className="grid grid-cols-7 w-[252px] mb-1">
                  {["Lu","Ma","Me","Je","Ve","Sa","Di"].map(d => (
                    <div key={d} className="text-center text-[11px] font-semibold text-[#9B8A6B] py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Date cells */}
                <div className="grid grid-cols-7 gap-0.5 w-[252px]">
                  {cells.map((dateStr, i) => {
                    if (!dateStr) return <div key={i} />;
                    const isPast     = dateStr < todayStr;
                    const isBlocked  = blockedDates.has(dateStr);
                    const isToday    = dateStr === todayStr;
                    const dayNum     = parseInt(dateStr.split("-")[2]);
                    return (
                      <button
                        key={dateStr}
                        onClick={() => toggleBlocked(dateStr)}
                        disabled={isPast}
                        className={`h-9 w-full rounded-lg text-xs font-medium transition ${
                          isPast
                            ? "text-[#C4BAA8]/50 cursor-default"
                            : isBlocked
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : isToday
                            ? "bg-[#FFF3B0] text-[#5C3D00] ring-1 ring-[#F5C400] hover:bg-red-100 hover:text-red-700 hover:ring-red-300"
                            : "text-[#2D1A00] hover:bg-red-100 hover:text-red-700"
                        }`}
                      >
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
                    <p className="text-sm font-semibold text-[#2D1A00] mb-1">Aucune date bloquée</p>
                    <p className="text-xs text-[#9B8A6B]">Cliquez sur des dates dans le calendrier pour les bloquer.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-[#6B5E44] uppercase tracking-wide mb-3">
                      {blockedDates.size} date{blockedDates.size !== 1 ? "s" : ""} bloquée{blockedDates.size !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[...blockedDates].sort().map(d => (
                        <div
                          key={d}
                          className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full"
                        >
                          {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                          <button
                            onClick={() => toggleBlocked(d)}
                            className="hover:text-red-900 ml-0.5 leading-none text-sm"
                          >
                            ×
                          </button>
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
                ? "Aucun créneau sélectionné — les étudiants ne pourront pas vous réserver."
                : `${totalHours} créneau${totalHours !== 1 ? "x" : ""} par semaine · ${blockedDates.size} date${blockedDates.size !== 1 ? "s" : ""} bloquée${blockedDates.size !== 1 ? "s" : ""}`}
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${
                saved
                  ? "bg-green-500 text-white"
                  : "bg-[#F5C400] text-[#5C3D00] hover:bg-[#FFDE59] disabled:opacity-50"
              }`}
            >
              {saving ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer les disponibilités"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
