"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

interface BookingDetail {
  id: string;
  status: string;
  sessionType: string;
  durationMins: number;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  studentPriceUsd: number | null;
  studentCurrency: string;
  tutorPayoutAmount: number | null;
  tutorCurrency: string;
  platformMargin: number | null;
  paymentProvider: string | null;
  stripePaymentIntentId: string | null;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  noShowReportedAt: string | null;
  noShowReportedBy: string | null;
  creditAppliedTnd: number;
  student: { id: string; email: string; firstName: string | null; lastName: string | null };
  tutor:   { id: string; email: string; firstName: string | null; lastName: string | null; hrApplication?: { fullName: string | null } | null };
  disputes: { id: string; type: string; status: string; description: string; createdAt: string }[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:   "bg-gray-100 text-gray-600",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW:   "bg-orange-100 text-orange-700",
};

function tutorName(b: BookingDetail) {
  return b.tutor.hrApplication?.fullName ??
    [b.tutor.firstName, b.tutor.lastName].filter(Boolean).join(" ") ||
    b.tutor.email;
}
function studentName(b: BookingDetail) {
  return [b.student.firstName, b.student.lastName].filter(Boolean).join(" ") || b.student.email;
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/bookings/${id}`)
      .then(r => r.json())
      .then(d => { setBooking(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function doAction(action: string) {
    setActionLoading(action);
    setActionError("");
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: reason.trim() || undefined }),
    });
    if (res.ok) {
      const refreshed = await fetch(`/api/admin/bookings/${id}`);
      if (refreshed.ok) setBooking(await refreshed.json());
    } else {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? t("Erreur serveur", "Server error"));
    }
    setActionLoading("");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-[#9B8A6B]">
      {t("Chargement…", "Loading…")}
    </div>
  );

  if (!booking) return (
    <div className="flex items-center justify-center h-64 text-red-600">
      {t("Réservation introuvable", "Booking not found")}
    </div>
  );

  const fmtDate = (iso: string | null) => iso
    ? new Date(iso).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  const canCancel  = !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status);
  const canNoShow  = booking.status === "CONFIRMED";
  const canRefund  = ["CONFIRMED", "CANCELLED"].includes(booking.status) &&
    (booking.stripePaymentIntentId || booking.paypalCaptureId);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-8">
        {/* Back */}
        <button onClick={() => router.back()}
          className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition mb-6 flex items-center gap-1">
          ← {t("Retour aux réservations", "Back to bookings")}
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-black text-xl text-[#1A0F00]">{t("Réservation", "Booking")}</h1>
            <p className="text-xs text-[#9B8A6B] font-mono mt-0.5">{booking.id}</p>
          </div>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${STATUS_COLOR[booking.status] ?? "bg-gray-100 text-gray-600"}`}>
            {booking.status}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Session info */}
          <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm space-y-3">
            <h2 className="font-bold text-[#2D1A00] text-sm border-b border-black/5 pb-2">{t("Séance", "Session")}</h2>
            <Row label={t("Type", "Type")}         value={booking.sessionType} />
            <Row label={t("Durée", "Duration")}    value={`${booking.durationMins} min`} />
            <Row label={t("Date séance", "Session date")} value={fmtDate(booking.scheduledAt)} />
            <Row label={t("Début réel", "Actual start")} value={fmtDate(booking.startedAt)} />
            <Row label={t("Fin réelle", "Actual end")}   value={fmtDate(booking.endedAt)} />
            <Row label={t("Réservé le", "Booked on")}    value={fmtDate(booking.createdAt)} />
          </div>

          {/* Parties */}
          <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm space-y-3">
            <h2 className="font-bold text-[#2D1A00] text-sm border-b border-black/5 pb-2">{t("Participants", "Parties")}</h2>
            <div>
              <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-1">{t("Étudiant", "Student")}</p>
              <a href={`/dashboard/admin/users/${booking.student.id}`} className="text-sm font-semibold text-[#5C3D00] hover:underline">{studentName(booking)}</a>
              <p className="text-xs text-[#9B8A6B]">{booking.student.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-1">{t("Tuteur", "Tutor")}</p>
              <a href={`/dashboard/admin/users/${booking.tutor.id}`} className="text-sm font-semibold text-[#5C3D00] hover:underline">{tutorName(booking)}</a>
              <p className="text-xs text-[#9B8A6B]">{booking.tutor.email}</p>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm space-y-3">
            <h2 className="font-bold text-[#2D1A00] text-sm border-b border-black/5 pb-2">{t("Finances", "Financials")}</h2>
            <Row label={t("Prix étudiant", "Student price")} value={booking.studentPriceUsd != null ? `$${booking.studentPriceUsd.toFixed(2)} ${booking.studentCurrency}` : "—"} />
            <Row label={t("Paiement tuteur", "Tutor payout")} value={booking.tutorPayoutAmount != null ? `${booking.tutorPayoutAmount.toFixed(2)} ${booking.tutorCurrency}` : "—"} />
            <Row label={t("Marge plateforme", "Platform margin")} value={booking.platformMargin != null ? `$${booking.platformMargin.toFixed(2)}` : "—"} />
            <Row label={t("Crédits utilisés", "Credits used")} value={booking.creditAppliedTnd > 0 ? `${booking.creditAppliedTnd.toFixed(2)} TND` : "—"} />
            <div className="pt-2 border-t border-black/5">
              <Row label={t("Fournisseur", "Provider")} value={booking.paymentProvider === "stripe" ? "💳 Stripe" : booking.paymentProvider === "paypal" ? "🅿️ PayPal" : "—"} />
              {booking.stripePaymentIntentId && <Row label="Payment Intent" value={booking.stripePaymentIntentId} mono />}
              {booking.paypalOrderId && <Row label="PayPal Order" value={booking.paypalOrderId} mono />}
            </div>
          </div>

          {/* Cancellation / no-show info */}
          {(booking.cancelledAt || booking.noShowReportedAt) && (
            <div className="bg-red-50 rounded-2xl border border-red-200 p-6 shadow-sm space-y-3">
              <h2 className="font-bold text-red-700 text-sm border-b border-red-200 pb-2">
                {booking.cancelledAt ? t("Annulation", "Cancellation") : t("Absence", "No-show")}
              </h2>
              {booking.cancelledAt && (
                <>
                  <Row label={t("Annulé le", "Cancelled on")} value={fmtDate(booking.cancelledAt)} />
                  <Row label={t("Par", "By")} value={booking.cancelledBy ?? "—"} />
                  <Row label={t("Raison", "Reason")} value={booking.cancellationReason ?? "—"} />
                </>
              )}
              {booking.noShowReportedAt && (
                <>
                  <Row label={t("Signalé le", "Reported on")} value={fmtDate(booking.noShowReportedAt)} />
                  <Row label={t("Par", "By")} value={booking.noShowReportedBy ?? "—"} />
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
          <h2 className="font-bold text-[#2D1A00] text-sm mb-4">{t("Actions admin", "Admin actions")}</h2>
          <div className="mb-4">
            <label className="text-xs font-semibold text-[#5C3D00] mb-1 block">{t("Raison (optionnel)", "Reason (optional)")}</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder={t("Motif de l'action…", "Action reason…")}
              className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F5C400] transition" />
          </div>
          {actionError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{actionError}</p>}
          <div className="flex flex-wrap gap-3">
            {canCancel && (
              <button onClick={() => doAction("CANCEL")} disabled={!!actionLoading}
                className="px-4 py-2 border-2 border-orange-300 text-orange-700 rounded-full text-sm font-bold hover:bg-orange-50 disabled:opacity-50 transition">
                {actionLoading === "CANCEL" ? "…" : t("Annuler la séance", "Cancel session")}
              </button>
            )}
            {canNoShow && (
              <button onClick={() => doAction("NO_SHOW")} disabled={!!actionLoading}
                className="px-4 py-2 border-2 border-red-300 text-red-700 rounded-full text-sm font-bold hover:bg-red-50 disabled:opacity-50 transition">
                {actionLoading === "NO_SHOW" ? "…" : t("Marquer absent", "Mark no-show")}
              </button>
            )}
            {canRefund && (
              <button onClick={() => doAction("REFUND")} disabled={!!actionLoading}
                className="px-4 py-2 border-2 border-[#F5C400] text-[#5C3D00] rounded-full text-sm font-bold hover:bg-[#FFF3B0] disabled:opacity-50 transition">
                {actionLoading === "REFUND" ? "…" : t("Rembourser", "Refund")}
              </button>
            )}
            {!canCancel && !canNoShow && !canRefund && (
              <p className="text-sm text-[#9B8A6B]">{t("Aucune action disponible pour ce statut.", "No actions available for this status.")}</p>
            )}
          </div>
        </div>

        {/* Disputes */}
        {booking.disputes.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
            <h2 className="font-bold text-[#2D1A00] text-sm mb-4">{t("Litiges", "Disputes")} ({booking.disputes.length})</h2>
            <div className="space-y-3">
              {booking.disputes.map(d => (
                <div key={d.id} className="bg-[#FAF8F0] rounded-xl p-4 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#5C3D00]">{d.type}</span>
                    <span className="text-xs text-[#9B8A6B]">{d.status}</span>
                  </div>
                  <p className="text-[#2D1A00]">{d.description}</p>
                  <p className="text-xs text-[#9B8A6B] mt-1">{fmtDate(d.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 border-b border-black/5 last:border-0 text-sm">
      <span className="text-[#9B8A6B] flex-shrink-0">{label}</span>
      <span className={`text-[#2D1A00] font-semibold text-right break-all ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</span>
    </div>
  );
}
