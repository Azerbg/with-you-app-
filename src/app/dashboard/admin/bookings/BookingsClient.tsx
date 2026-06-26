"use client";

import { useCallback, useEffect, useState } from "react";

interface BookingUser {
  id: string; email: string; firstName: string | null; lastName: string | null;
  hrApplication?: { fullName: string | null } | null;
}
interface Booking {
  id: string; status: string; sessionType: string;
  studentPriceUsd: number | null; studentCurrency: string;
  durationMins: number;
  scheduledAt: string | null; createdAt: string;
  student: BookingUser; tutor: BookingUser;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:   "bg-gray-100 text-gray-500",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW:   "bg-orange-100 text-orange-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente", CONFIRMED: "Confirmé", COMPLETED: "Terminé",
  CANCELLED: "Annulé", NO_SHOW: "Absent",
};

const TYPE_LABELS: Record<string, string> = {
  DISCOVERY: "Découverte", SINGLE: "Unique", PROGRAM: "Programme", SUBSCRIPTION: "Abonnement",
};

function userName(u: BookingUser) {
  if (u.hrApplication?.fullName) return u.hrApplication.fullName;
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return n || u.email;
}

export default function BookingsClient() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, status, page: String(page) });
    const res = await fetch(`/api/admin/bookings?${params}`);
    if (res.ok) {
      const data = await res.json();
      setBookings(data.bookings);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-black/5 px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-black text-xl text-[#1A0F00]">Réservations</h1>
            <p className="text-xs text-[#9B8A6B] mt-0.5">{total.toLocaleString()} au total</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par étudiant ou tuteur…"
            className="flex-1 border border-[#6B5E44]/30 rounded-xl px-4 py-2 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20 transition" />
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] transition bg-white">
            <option value="ALL">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-[#9B8A6B]">Chargement…</div>
        ) : bookings.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-[#9B8A6B]">Aucune réservation trouvée</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-8 py-3">Étudiant</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Tuteur</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Type</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Statut</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Prix</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Date séance</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Réservé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-[#FAF8F0] transition">
                  <td className="px-8 py-3">
                    <a href={`/dashboard/admin/users/${b.student.id}`}
                      className="text-sm font-medium text-[#2D1A00] hover:text-[#5C3D00] transition truncate block max-w-[140px]">
                      {userName(b.student)}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/dashboard/admin/users/${b.tutor.id}`}
                      className="text-sm text-[#2D1A00] hover:text-[#5C3D00] transition truncate block max-w-[140px]">
                      {userName(b.tutor)}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9B8A6B]">{TYPE_LABELS[b.sessionType] ?? b.sessionType}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[b.status] ?? ""}`}>
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#2D1A00]">
                    {b.studentPriceUsd != null ? `$${b.studentPriceUsd.toFixed(0)} ${b.studentCurrency}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9B8A6B]">
                    {b.scheduledAt
                      ? new Date(b.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9B8A6B]">
                    {new Date(b.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
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
    </div>
  );
}
