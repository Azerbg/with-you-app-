"use client";

import { useCallback, useEffect, useState } from "react";

interface DisputeUser {
  id: string; email: string; firstName: string | null; lastName: string | null;
  hrApplication?: { fullName: string | null } | null;
}
interface Dispute {
  id: string; type: string; status: string;
  description: string | null; resolution: string | null;
  createdAt: string; resolvedAt: string | null;
  student: DisputeUser; tutor: DisputeUser;
  booking: { id: string; scheduledAt: string | null; sessionType: string; studentPriceUsd: number | null } | null;
}

const STATUS_BADGE: Record<string, string> = {
  OPEN:         "bg-red-100 text-red-600",
  UNDER_REVIEW: "bg-orange-100 text-orange-700",
  RESOLVED:     "bg-green-100 text-green-700",
  CLOSED:       "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Ouvert", UNDER_REVIEW: "En cours", RESOLVED: "Résolu", CLOSED: "Fermé",
};

const TYPE_LABELS: Record<string, string> = {
  NO_SHOW: "Absence", TECHNICAL_FAILURE: "Problème technique",
  QUALITY_COMPLAINT: "Qualité", BILLING_ERROR: "Facturation",
  CONDUCT_VIOLATION: "Comportement", OTHER: "Autre",
};

function userName(u: DisputeUser) {
  if (u.hrApplication?.fullName) return u.hrApplication.fullName;
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return n || u.email;
}

interface ResolveModalProps {
  dispute: Dispute;
  onClose: () => void;
  onDone: () => void;
}

function ResolveModal({ dispute, onClose, onDone }: ResolveModalProps) {
  const [status, setStatus] = useState(dispute.status);
  const [resolution, setResolution] = useState(dispute.resolution ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (loading) return;
    setLoading(true); setError(null);
    const res = await fetch("/api/admin/disputes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dispute.id, status, resolution }),
    });
    if (res.ok) { onDone(); onClose(); }
    else { setError("Échec de la mise à jour."); setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-[#2D1A00]">Gérer le litige</h2>
            <p className="text-xs text-[#9B8A6B] mt-0.5">{TYPE_LABELS[dispute.type] ?? dispute.type}</p>
          </div>
          <button onClick={onClose} className="text-[#9B8A6B] hover:text-[#5C3D00]">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Dispute info */}
        <div className="bg-[#FAF8F0] rounded-xl p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#9B8A6B]">Étudiant</span>
            <a href={`/dashboard/admin/users/${dispute.student.id}`} className="font-medium text-[#2D1A00] hover:text-[#5C3D00]">
              {userName(dispute.student)}
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9B8A6B]">Tuteur</span>
            <a href={`/dashboard/admin/users/${dispute.tutor.id}`} className="font-medium text-[#2D1A00] hover:text-[#5C3D00]">
              {userName(dispute.tutor)}
            </a>
          </div>
          {dispute.booking && (
            <div className="flex justify-between">
              <span className="text-[#9B8A6B]">Réservation</span>
              <span className="font-medium text-[#2D1A00]">
                {dispute.booking.scheduledAt
                  ? new Date(dispute.booking.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                  : "—"}
                {dispute.booking.studentPriceUsd != null && ` · $${dispute.booking.studentPriceUsd.toFixed(0)}`}
              </span>
            </div>
          )}
          {dispute.description && (
            <div className="pt-2 border-t border-black/5">
              <p className="text-[#9B8A6B] text-xs mb-1">Description</p>
              <p className="text-[#2D1A00] text-xs leading-relaxed">{dispute.description}</p>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-[#5C3D00] mb-2">Statut</p>
          <div className="grid grid-cols-4 gap-2">
            {["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"].map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`py-2 rounded-xl text-[10px] font-bold border-2 transition ${
                  status === s ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]" : "border-transparent bg-black/5 text-[#9B8A6B]"
                }`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution note */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-[#5C3D00] mb-2">Note de résolution</p>
          <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={3}
            placeholder="Décision prise, remboursement, avertissement…"
            className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] resize-none transition" />
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-black/10 rounded-xl text-sm font-semibold text-[#9B8A6B] hover:bg-black/5 transition">
            Annuler
          </button>
          <button onClick={save} disabled={loading}
            className="flex-1 py-2.5 bg-[#F5C400] text-[#5C3D00] rounded-xl font-bold text-sm hover:bg-[#FFDE59] disabled:opacity-50 transition">
            {loading ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DisputesClient() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Dispute | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status, page: String(page) });
    const res = await fetch(`/api/admin/disputes?${params}`);
    if (res.ok) {
      const data = await res.json();
      setDisputes(data.disputes);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-black/5 px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-black text-xl text-[#1A0F00]">Litiges</h1>
            <p className="text-xs text-[#9B8A6B] mt-0.5">{total} au total</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {["ALL", "OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                status === s
                  ? "bg-[#F5C400] text-[#5C3D00]"
                  : "bg-black/5 text-[#9B8A6B] hover:bg-black/10"
              }`}>
              {s === "ALL" ? "Tous" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-[#9B8A6B]">Chargement…</div>
        ) : disputes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm font-semibold text-[#5C3D00]">Aucun litige</p>
            <p className="text-xs text-[#9B8A6B] mt-1">pour le filtre sélectionné</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-8 py-3">Étudiant</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Tuteur</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Type</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Statut</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {disputes.map(d => (
                <tr key={d.id} className="hover:bg-[#FAF8F0] transition group">
                  <td className="px-8 py-3">
                    <a href={`/dashboard/admin/users/${d.student.id}`}
                      className="text-sm font-medium text-[#2D1A00] hover:text-[#5C3D00] transition">
                      {userName(d.student)}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/dashboard/admin/users/${d.tutor.id}`}
                      className="text-sm text-[#2D1A00] hover:text-[#5C3D00] transition">
                      {userName(d.tutor)}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9B8A6B]">{TYPE_LABELS[d.type] ?? d.type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[d.status] ?? ""}`}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9B8A6B]">
                    {new Date(d.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(d)}
                      className="text-xs font-semibold text-[#5C3D00] hover:text-[#1A0F00] opacity-0 group-hover:opacity-100 transition px-2 py-1 rounded-lg hover:bg-[#F5C400]/20">
                      Gérer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="bg-white border-t border-black/5 px-8 py-3 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-[#9B8A6B]">Page {page} sur {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-semibold text-[#9B8A6B] disabled:opacity-40 hover:bg-black/5 transition">
              ← Précédent
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-semibold text-[#9B8A6B] disabled:opacity-40 hover:bg-black/5 transition">
              Suivant →
            </button>
          </div>
        </div>
      )}

      {selected && (
        <ResolveModal dispute={selected} onClose={() => setSelected(null)} onDone={load} />
      )}
    </div>
  );
}
