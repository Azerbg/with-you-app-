"use client";

import { useState, useRef } from "react";

interface Student {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
  cefrLevel: string | null;
  targetLanguage: string | null;
  totalSessions: number;
  completedSessions: number;
  lastSessionAt: string | null;
  firstSessionAt: string | null;
  note: { content: string; updatedAt: string } | null;
}

function getInitials(s: Student) {
  if (s.firstName && s.lastName) return (s.firstName[0] + s.lastName[0]).toUpperCase();
  if (s.firstName) return s.firstName.slice(0, 2).toUpperCase();
  return s.email.slice(0, 2).toUpperCase();
}

function getDisplayName(s: Student) {
  if (s.firstName && s.lastName) return `${s.firstName} ${s.lastName}`;
  if (s.firstName) return s.firstName;
  return s.email;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function NoteEditor({ student, onNoteChange }: { student: Student; onNoteChange: (studentId: string, note: { content: string; updatedAt: string } | null) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(student.note?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleOpen() {
    setDraft(student.note?.content ?? "");
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tutor/students/${student.id}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      if (!res.ok) { setError("Erreur lors de la sauvegarde"); return; }
      const data = await res.json();
      if (data.deleted) {
        onNoteChange(student.id, null);
      } else {
        onNoteChange(student.id, { content: data.content, updatedAt: data.updatedAt });
      }
      setOpen(false);
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(student.note?.content ?? "");
    setOpen(false);
    setError("");
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={handleOpen}
          className="w-full text-left group"
        >
          {student.note ? (
            <div className="bg-[#FFFBEA] border border-[#F5C400]/40 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#6B5E44] line-clamp-2 leading-relaxed">{student.note.content}</p>
                  <p className="text-[10px] text-[#9B8A6B] mt-1">
                    Modifié le {formatDate(student.note.updatedAt)}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[#C49200] bg-[#F5C400]/20 px-2 py-0.5 rounded-full flex-shrink-0 group-hover:bg-[#F5C400]/40 transition">
                  Modifier
                </span>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#E8E0D4] rounded-xl px-4 py-3 flex items-center gap-2 hover:border-[#F5C400] hover:bg-[#FFFBEA] transition group-hover:border-[#F5C400]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#C4BAA8] group-hover:text-[#C49200] transition flex-shrink-0">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
              </svg>
              <span className="text-xs text-[#9B8A6B] group-hover:text-[#5C3D00] transition">Ajouter une note privée…</span>
            </div>
          )}
        </button>
      ) : (
        <div className="bg-white border-2 border-[#F5C400] rounded-xl overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold text-[#C49200] uppercase tracking-widest mb-2">Note privée (visible uniquement par vous)</p>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Points forts, axes d'amélioration, vocabulaire à revoir, objectifs personnels…"
              rows={4}
              className="w-full text-sm text-[#2D1A00] bg-transparent resize-none focus:outline-none placeholder:text-[#C4BAA8] leading-relaxed"
            />
          </div>
          {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[#F5C400]/20 bg-[#FFFBEA]">
            {draft.trim() && draft.trim() !== (student.note?.content ?? "") && (
              <span className="text-[10px] text-[#9B8A6B] flex-1">Modifications non sauvegardées</span>
            )}
            <div className="flex gap-2 ml-auto">
              {student.note && (
                <button
                  onClick={() => { setDraft(""); }}
                  className="text-xs text-red-500 hover:text-red-700 transition px-2 py-1"
                >
                  Supprimer
                </button>
              )}
              <button
                onClick={handleCancel}
                className="text-xs font-semibold text-[#6B5E44] hover:text-[#5C3D00] transition px-3 py-1.5 rounded-lg hover:bg-white"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs font-bold bg-[#5C3D00] text-[#F5C400] px-4 py-1.5 rounded-lg hover:bg-[#3d2900] disabled:opacity-50 transition"
              >
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentCard({ student, onNoteChange }: { student: Student; onNoteChange: (id: string, note: { content: string; updatedAt: string } | null) => void }) {
  const initials = getInitials(student);
  const name = getDisplayName(student);

  return (
    <div className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow">
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#F5C400]/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {student.image ? (
            <img src={student.image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-[#5C3D00]">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#2D1A00] truncate">{name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {student.cefrLevel && (
              <span className="text-[10px] font-bold bg-[#5C3D00]/10 text-[#5C3D00] px-2 py-0.5 rounded-full">
                {student.cefrLevel}
              </span>
            )}
            {student.targetLanguage && (
              <span className="text-[10px] text-[#9B8A6B]">{student.targetLanguage}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-lg font-bold text-[#2D1A00]">{student.completedSessions}</p>
            <p className="text-[10px] text-[#9B8A6B] leading-tight">séances</p>
          </div>
          {student.lastSessionAt && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-[#6B5E44]">{formatDate(student.lastSessionAt)}</p>
              <p className="text-[10px] text-[#9B8A6B]">dernière séance</p>
            </div>
          )}
        </div>
      </div>

      {/* Note section */}
      <div className="px-5 pb-4">
        <NoteEditor student={student} onNoteChange={onNoteChange} />
      </div>
    </div>
  );
}

export default function StudentsClient({ initialStudents }: { initialStudents: Student[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [search, setSearch] = useState("");

  function handleNoteChange(studentId: string, note: { content: string; updatedAt: string } | null) {
    setStudents((prev) =>
      prev.map((s) => s.id === studentId ? { ...s, note } : s)
    );
  }

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = getDisplayName(s).toLowerCase();
    return name.includes(q) || s.email.toLowerCase().includes(q);
  });

  const withSessions = filtered.filter((s) => s.completedSessions > 0);
  const withoutSessions = filtered.filter((s) => s.completedSessions === 0);

  return (
    <div className="flex-1 overflow-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D1A00]">Mes Étudiants</h1>
          <p className="text-sm text-[#9B8A6B] mt-0.5">
            {students.length} étudiant{students.length > 1 ? "s" : ""} au total ·{" "}
            {students.filter(s => s.completedSessions > 0).length} avec séances complétées
          </p>
        </div>

        {/* Search */}
        {students.length > 0 && (
          <div className="relative flex-shrink-0 w-64">
            <svg viewBox="0 0 20 20" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4BAA8]">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un étudiant…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C400]/40 focus:border-[#F5C400] transition text-[#2D1A00] placeholder:text-[#C4BAA8]"
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {students.length === 0 && (
        <div className="bg-white rounded-2xl border border-black/5 px-8 py-16 text-center">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-base font-bold text-[#2D1A00]">Aucun étudiant pour l'instant</p>
          <p className="text-sm text-[#9B8A6B] mt-2">Vos étudiants apparaîtront ici dès qu'une réservation sera confirmée.</p>
        </div>
      )}

      {/* Search no results */}
      {students.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-black/5 px-8 py-12 text-center">
          <p className="text-sm font-semibold text-[#5C3D00]">Aucun résultat pour « {search} »</p>
        </div>
      )}

      {/* Students with completed sessions */}
      {withSessions.length > 0 && (
        <div className="space-y-4 mb-6">
          {withSessions.map((s) => (
            <StudentCard key={s.id} student={s} onNoteChange={handleNoteChange} />
          ))}
        </div>
      )}

      {/* Students with only upcoming/confirmed bookings */}
      {withoutSessions.length > 0 && (
        <div>
          <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-3">
            Réservations à venir ({withoutSessions.length})
          </p>
          <div className="space-y-4">
            {withoutSessions.map((s) => (
              <StudentCard key={s.id} student={s} onNoteChange={handleNoteChange} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
