"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Standard time windows (Tunisia time CET/CEST)
const TIME_WINDOWS = [
  { label: "Matin",       startTime: "07:00", endTime: "12:00" },
  { label: "Après-midi",  startTime: "12:00", endTime: "18:00" },
  { label: "Soir",        startTime: "18:00", endTime: "23:00" },
];

export default function AvailabilityManager({
  existingSlots,
  existingBlocked,
}: {
  existingSlots: Slot[];
  existingBlocked: string[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>(existingBlocked);
  const [newBlockedDate, setNewBlockedDate] = useState("");

  // Grid: [dayOfWeek][windowIndex] = true/false
  function buildGrid(slots: Slot[]) {
    const grid: boolean[][] = Array.from({ length: 7 }, () => Array(3).fill(false));
    for (const slot of slots) {
      const wIdx = TIME_WINDOWS.findIndex(
        w => w.startTime === slot.startTime && w.endTime === slot.endTime
      );
      if (wIdx >= 0) grid[slot.dayOfWeek][wIdx] = true;
    }
    return grid;
  }

  const [grid, setGrid] = useState<boolean[][]>(buildGrid(existingSlots));

  function toggle(day: number, window: number) {
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      next[day][window] = !next[day][window];
      return next;
    });
    setSaved(false);
  }

  function slotsFromGrid(): Slot[] {
    const slots: Slot[] = [];
    grid.forEach((row, day) => {
      row.forEach((on, wi) => {
        if (on) slots.push({ dayOfWeek: day, startTime: TIME_WINDOWS[wi].startTime, endTime: TIME_WINDOWS[wi].endTime });
      });
    });
    return slots;
  }

  function addBlockedDate() {
    if (!newBlockedDate || blockedDates.includes(newBlockedDate)) return;
    setBlockedDates(prev => [...prev, newBlockedDate].sort());
    setNewBlockedDate("");
    setSaved(false);
  }

  function removeBlockedDate(d: string) {
    setBlockedDates(prev => prev.filter(x => x !== d));
    setSaved(false);
  }

  const totalSlots = grid.flat().filter(Boolean).length;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/tutors/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: slotsFromGrid(), blockedDates }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => router.push("/dashboard/tutor"), 1200);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-[#FAF8F0]">
      {/* Top bar */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tutor"><img src="/logo.svg" alt="WithYou" className="h-8 w-auto" /></Link>
          <span className="text-[#6B5E44] text-sm font-semibold">Mes disponibilités</span>
        </div>
        <Link href="/dashboard/tutor" className="text-xs text-[#6B5E44] hover:text-[#5C3D00]">← Retour</Link>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-[#2D1A00]">Mes disponibilités</h1>
          <p className="text-sm text-[#6B5E44] mt-1">
            Indiquez vos créneaux disponibles (heure de Tunis). Les étudiants pourront réserver dans ces plages.
          </p>
        </div>

        {/* Weekly grid */}
        <div className="bg-white border border-[#C4BAA8] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#D9D0C3] flex items-center justify-between">
            <p className="font-bold text-[#2D1A00]">Créneaux hebdomadaires récurrents</p>
            <span className="text-xs text-[#6B5E44]">{totalSlots} créneau{totalSlots !== 1 ? "x" : ""} sélectionné{totalSlots !== 1 ? "s" : ""}</span>
          </div>

          <div className="p-5">
            {/* Header row */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div /> {/* empty corner */}
              {TIME_WINDOWS.map(w => (
                <div key={w.label} className="text-center">
                  <p className="text-xs font-bold text-[#5C3D00]">{w.label}</p>
                  <p className="text-[10px] text-[#9B8A6B]">{w.startTime}–{w.endTime}</p>
                </div>
              ))}
            </div>

            {/* Day rows */}
            {DAYS.map((day, di) => (
              <div key={day} className="grid grid-cols-4 gap-2 mb-2">
                <div className="flex items-center">
                  <span className="text-sm font-semibold text-[#5C3D00] w-8">{DAY_SHORT[di]}</span>
                </div>
                {TIME_WINDOWS.map((_, wi) => (
                  <button key={wi} type="button" onClick={() => toggle(di, wi)}
                    className={`h-10 rounded-xl border-2 text-xs font-bold transition ${
                      grid[di][wi]
                        ? "bg-[#F5C400] border-[#F5C400] text-[#5C3D00] shadow-[0_2px_8px_rgba(245,196,0,0.3)]"
                        : "bg-[#FAF8F0] border-[#E8E0D4] text-[#9B8A6B] hover:border-[#F5C400]/50 hover:bg-[#FFFBEA]"
                    }`}>
                    {grid[di][wi] ? "✓" : "+"}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Blocked dates */}
        <div className="bg-white border border-[#C4BAA8] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#D9D0C3]">
            <p className="font-bold text-[#2D1A00]">Dates bloquées</p>
            <p className="text-xs text-[#6B5E44] mt-0.5">Vacances, jours fériés, indisponibilités ponctuelles.</p>
          </div>
          <div className="p-5 space-y-3">
            {/* Add date */}
            <div className="flex gap-2">
              <input type="date" value={newBlockedDate} onChange={e => setNewBlockedDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="flex-1 border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#5C3D00] focus:outline-none focus:border-[#F5C400]"
              />
              <button onClick={addBlockedDate} disabled={!newBlockedDate}
                className="px-4 py-2 bg-[#5C3D00] text-[#F5C400] rounded-xl text-sm font-bold hover:bg-[#3d2900] disabled:opacity-40 transition">
                Bloquer
              </button>
            </div>

            {blockedDates.length === 0 && (
              <p className="text-xs text-[#9B8A6B]">Aucune date bloquée.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {blockedDates.map(d => (
                <div key={d} className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  <button onClick={() => removeBlockedDate(d)} className="hover:text-red-900 ml-1">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving || totalSlots === 0}
          className={`w-full py-3 rounded-2xl text-sm font-bold transition ${
            saved
              ? "bg-green-500 text-white"
              : "bg-[#F5C400] text-[#5C3D00] hover:bg-[#FFDE59] disabled:opacity-50"
          }`}>
          {saving ? "Enregistrement…" : saved ? "Disponibilités enregistrées ✓" : `Enregistrer (${totalSlots} créneau${totalSlots !== 1 ? "x" : ""})`}
        </button>

        {totalSlots === 0 && (
          <p className="text-xs text-center text-[#9B8A6B]">Sélectionnez au moins un créneau pour enregistrer.</p>
        )}

      </div>
    </div>
  );
}
