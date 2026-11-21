"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  stripePaymentIntentId: string | null;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  cancelledAt: string | null;
  student: BookingUser; tutor: BookingUser;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:   "bg-gray-100 text-gray-500",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW:   "bg-orange-100 text-orange-700",
  REFUNDED:  "bg-purple-100 text-purple-700",
};

const STATUS_LABELS: Record<string, { fr: string; en: string }> = {
  PENDING:   { fr: "En attente", en: "Pending" },
  CONFIRMED: { fr: "Confirmé",   en: "Confirmed" },
  COMPLETED: { fr: "Terminé",    en: "Completed" },
  CANCELLED: { fr: "Annulé",     en: "Cancelled" },
  NO_SHOW:   { fr: "Absent",     en: "No-show" },
  REFUNDED:  { fr: "Remboursé",  en: "Refunded" },
};

const TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  DISCOVERY:    { fr: "Découverte", en: "Discovery" },
  SINGLE:       { fr: "Unique",     en: "Single" },
  PROGRAM:      { fr: "Programme",  en: "Program" },
  SUBSCRIPTION: { fr: "Abonnement", en: "Subscription" },
};

const DISPUTE_TYPES = [
  { value: "NO_SHOW",             fr: "Absence",           en: "No-show" },
  { value: "TECHNICAL_FAILURE",   fr: "Problème technique", en: "Technical failure" },
  { value: "QUALITY_COMPLAINT",   fr: "Qualité",           en: "Quality complaint" },
  { value: "BILLING_ERROR",       fr: "Erreur de facturation", en: "Billing error" },
  { value: "CONDUCT_VIOLATION",   fr: "Violation de conduite", en: "Conduct violation" },
  { value: "OTHER",               fr: "Autre",             en: "Other" },
];

function userName(u: BookingUser) {
  if (u.hrApplication?.fullName) return u.hrApplication.fullName;
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return n || u.email;
}

// ── Inline action modal ───────────────────────────────────────────────────────
type ModalMode = "CANCEL" | "REFUND" | "DISPUTE";

function ActionModal({
  booking,
  mode,
  lang,
  onClose,
  onDone,
}: {
  booking: Booking;
  mode: ModalMode;
  lang: "fr" | "en";
  onClose: () => void;
  onDone: () => void;
}) {
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;
  const [reason, setReason]           = useState("");
  const [disputeType, setDisputeType] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const overlayRef                    = useRef<HTMLDivElement>(null);

  async function submit() {
    if (mode !== "DISPUTE" && !reason.trim()) {
      setError(t("Une raison est requise.", "A reason is required."));
      return;
    }
    if (mode === "DISPUTE" && (!disputeType || !reason.trim())) {
      setError(t("Type et description requis.", "Type and description are required."));
      return;
    }
    setLoading(true);
    setError("");

    let res: Response;
    if (mode === "DISPUTE") {
      res = await fetch("/api/admin/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, type: disputeType, description: reason }),
      });
    } else {
      const action = mode === "CANCEL" ? "CANCEL" : "REFUND";
      res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() }),
      });
    }

    if (res.ok) {
      onDone();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? t("Erreur serveur.", "Server error."));
    }
    setLoading(false);
  }

  const title =
    mode === "CANCEL"  ? t("Annuler la réservation", "Cancel booking") :
    mode === "REFUND"  ? t("Rembourser la réservation", "Refund booking") :
                         t("Ouvrir un litige", "Open a dispute");

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="font-black text-lg text-[#1A0F00] mb-1">{title}</h2>
        <p className="text-xs text-[#9B8A6B] mb-4 font-mono truncate">{booking.id}</p>

        {mode === "DISPUTE" && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-[#5C3D00] mb-1 block">
              {t("Type de litige", "Dispute type")} <span className="text-red-500">*</span>
            </label>
            <select
              value={disputeType}
              onChange={e => { setDisputeType(e.target.value); setError(""); }}
              className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] bg-white"
            >
              <option value="">{t("Choisir…", "Choose…")}</option>
              {DISPUTE_TYPES.map(dt => (
                <option key={dt.value} value={dt.value}>{lang === "fr" ? dt.fr : dt.en}</option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-3">
          <label className="text-xs font-semibold text-[#5C3D00] mb-1 block">
            {mode === "DISPUTE" ? t("Description", "Description") : t("Raison", "Reason")}
            {" "}<span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => { setReason(e.target.value); setError(""); }}
            rows={3}
            placeholder={
              mode === "DISPUTE"
                ? t("Décrivez le problème…", "Describe the issue…")
                : t("Motif de l'action…", "Action reason…")
            }
            className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#6B5E44]/30 text-sm text-[#9B8A6B] hover:bg-black/5 transition"
          >
            {t("Annuler", "Cancel")}
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 ${
              mode === "CANCEL"  ? "bg-orange-500 hover:bg-orange-600" :
              mode === "REFUND"  ? "bg-[#F5C400] hover:bg-[#e0b200] !text-[#1A0F00]" :
                                   "bg-red-600 hover:bg-red-700"
            }`}
          >
            {loading ? "…" : (
              mode === "CANCEL"  ? t("Confirmer l'annulation", "Confirm cancel") :
              mode === "REFUND"  ? t("Confirmer le remboursement", "Confirm refund") :
                                   t("Ouvrir le litige", "Open dispute")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BookingsClient() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("ALL");
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<{ booking: Booking; mode: ModalMode } | null>(null);

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

  function openModal(e: React.MouseEvent, booking: Booking, mode: ModalMode) {
    e.stopPropagation();
    setModal({ booking, mode });
  }

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
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-8 py-3">{t("Étudiant", "Student")}</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Tuteur", "Tutor")}</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Type</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Statut", "Status")}</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Prix", "Price")}</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Paiement", "Payment")}</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Date", "Date")}</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {bookings.map(b => {
                const canCancel = !["CANCELLED", "COMPLETED", "NO_SHOW", "REFUNDED"].includes(b.status);
                const canRefund = ["CONFIRMED", "CANCELLED"].includes(b.status) &&
                  !!(b.stripePaymentIntentId || b.paypalCaptureId);
                const canDispute = !["CANCELLED", "REFUNDED"].includes(b.status);

                return (
                  <tr key={b.id}
                    onClick={() => router.push(`/dashboard/admin/bookings/${b.id}`)}
                    className="hover:bg-[#FAF8F0] transition cursor-pointer">
                    <td className="px-8 py-3 min-w-0">
                      <p className="text-sm font-medium text-[#2D1A00] truncate">{userName(b.student)}</p>
                      <p className="text-[10px] text-[#9B8A6B] truncate" title={b.student.email}>{b.student.email}</p>
                    </td>
                    <td className="px-4 py-3 min-w-0">
                      <p className="text-sm text-[#2D1A00] truncate">{userName(b.tutor)}</p>
                      <p className="text-[10px] text-[#9B8A6B] truncate" title={b.tutor.email}>{b.tutor.email}</p>
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
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => router.push(`/dashboard/admin/bookings/${b.id}`)}
                          className="px-2 py-1 rounded-lg bg-[#F5C400]/20 text-[#5C3D00] text-[10px] font-semibold hover:bg-[#F5C400]/40 transition"
                        >
                          {t("Détails", "Details")}
                        </button>
                        {canDispute && (
                          <button
                            onClick={e => openModal(e, b, "DISPUTE")}
                            className="px-2 py-1 rounded-lg bg-red-50 text-red-700 text-[10px] font-semibold hover:bg-red-100 transition"
                          >
                            {t("Litige", "Dispute")}
                          </button>
                        )}
                        {canCancel && (
                          <button
                            onClick={e => openModal(e, b, "CANCEL")}
                            className="px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-[10px] font-semibold hover:bg-orange-100 transition"
                          >
                            {t("Annuler", "Cancel")}
                          </button>
                        )}
                        {canRefund && (
                          <button
                            onClick={e => openModal(e, b, "REFUND")}
                            className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-[10px] font-semibold hover:bg-purple-100 transition"
                          >
                            {t("Rembourser", "Refund")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* Action modal */}
      {modal && (
        <ActionModal
          booking={modal.booking}
          mode={modal.mode}
          lang={lang}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
