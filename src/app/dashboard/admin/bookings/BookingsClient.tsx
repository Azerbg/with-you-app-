"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

interface BookingUser {
  id: string; email: string; firstName: string | null; lastName: string | null;
  hrApplication?: { fullName: string | null } | null;
}
interface Booking {
  id: string; status: string; sessionType: string;
  studentPriceUsd: number | null; studentCurrency: string;
  durationMins: number;
  scheduledAt: string | null; createdAt: string;
  paymentProvider: string | null;
  student: BookingUser; tutor: BookingUser;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:   "bg-gray-100 text-gray-500",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW:   "bg-orange-100 text-orange-700",
};

const STATUS_LABELS: Record<string, { fr: string; en: string }> = {
  PENDING:   { fr: "En attente", en: "Pending" },
  CONFIRMED: { fr: "Confirmé",   en: "Confirmed" },
  COMPLETED: { fr: "Terminé",    en: "Completed" },
  CANCELLED: { fr: "Annulé",     en: "Cancelled" },
  NO_SHOW:   { fr: "Absent",     en: "No-show" },
};

const TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  DISCOVERY:    { fr: "Découverte", en: "Discovery" },
  SINGLE:       { fr: "Unique",     en: "Single" },
  PROGRAM:      { fr: "Programme",  en: "Program" },
  SUBSCRIPTION: { fr: "Abonnement", en: "Subscription" },
};

function userName(u: BookingUser) {
  if (u.hrApplication?.fullName) return u.hrApplication.fullName;
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return n || u.email;
}

export default function BookingsClient() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;
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
            <h1 className="font-black text-xl text-[#1A0F00]">{t("Réservations", "Bookings")}</h1>
            <p className="text-xs text-[#9B8A6B] mt-0.5">{total.toLocaleString()} {t("au total", "total")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("Rechercher par étudiant ou tuteur…", "Search by student or tutor…")}
            className="flex-1 border border-[#6B5E44]/30 rounded-xl px-4 py-2 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20 transition" />
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] transition bg-white">
            <option value="ALL">{t("Tous les statuts", "All statuses")}</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l[lang]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-[#9B8A6B]">{t("Chargement…", "Loading…")}</div>
        ) : bookings.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-[#9B8A6B]">{t("Aucune réservation trouvée", "No bookings found")}</div>
        ) : (
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-8 py-3">{t("Étudiant", "Student")}</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Tuteur", "Tutor")}</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Type</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Statut", "Status")}</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Prix", "Price")}</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Paiement", "Payment")}</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Date séance", "Session date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {bookings.map(b => (
                <tr key={b.id}
                  onClick={() => router.push(`/dashboard/admin/bookings/${b.id}`)}
                  className="hover:bg-[#FAF8F0] transition cursor-pointer">
                  <td className="px-8 py-3 min-w-0">
                    <p className="text-sm font-medium text-[#2D1A00] truncate">{userName(b.student)}</p>
                    <p className="text-[10px] text-[#9B8A6B] truncate">{b.student.email}</p>
                  </td>
                  <td className="px-4 py-3 min-w-0">
                    <p className="text-sm text-[#2D1A00] truncate">{userName(b.tutor)}</p>
                    <p className="text-[10px] text-[#9B8A6B] truncate">{b.tutor.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9B8A6B]">{TYPE_LABELS[b.sessionType]?.[lang] ?? b.sessionType}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[b.status] ?? ""}`}>
                      {STATUS_LABELS[b.status]?.[lang] ?? b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#2D1A00]">
                    {b.studentPriceUsd != null ? `$${b.studentPriceUsd.toFixed(0)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9B8A6B]">
                    {b.paymentProvider === "stripe" ? "Stripe" : b.paymentProvider === "paypal" ? "PayPal" : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9B8A6B]">
                    {b.scheduledAt
                      ? new Date(b.scheduledAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
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
          <p className="text-xs text-[#9B8A6B]">{t(`Page ${page} sur ${pages}`, `Page ${page} of ${pages}`)}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-semibold text-[#9B8A6B] disabled:opacity-40 hover:bg-black/5 transition">
              {t("← Précédent", "← Previous")}
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-semibold text-[#9B8A6B] disabled:opacity-40 hover:bg-black/5 transition">
              {t("Suivant →", "Next →")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
