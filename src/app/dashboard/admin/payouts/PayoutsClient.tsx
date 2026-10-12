"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethod {
  type: string;
  accountHolder: string | null;
  rib: string | null;
  iban: string | null;
  swift: string | null;
  bankNameTn: string | null;
  bankNameIntl: string | null;
  email: string | null;
  phone: string | null;
}

interface BookingRow {
  id: string;
  scheduledAt: string | null;
  sessionType: string;
  durationMins: number;
  tutorPayoutAmount: number | null;
  tutorCurrency: string;
  studentPriceUsd: number | null;
  paymentProvider: string;
}

interface TutorRow {
  tutorId: string;
  tutorName: string;
  currency: string;
  totalOwed: number;
  paymentMethod: PaymentMethod | null;
  bookings: BookingRow[];
}

interface Summary {
  pendingTutorCount: number;
  pendingBookingCount: number;
  paidThisMonthAmount: number;
  paidThisMonthCount: number;
  platformRevenueUsd: number;
  platformGrossUsd: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  BANK_TN:   "Virement TN",
  BANK_INTL: "Virement Intl",
  PAYPAL:    "PayPal",
  WISE:      "Wise",
  D17:       "D17 / Mobile",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  TND: "TND", CAD: "CA$", USD: "$", EUR: "€",
};

function formatAmount(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  return currency === "USD" || currency === "CAD" || currency === "EUR"
    ? `${sym}${amount.toFixed(2)}`
    : `${amount.toFixed(2)} ${sym}`;
}

function paymentMethodDetail(pm: PaymentMethod | null, lang: "fr" | "en" = "fr"): string {
  if (!pm) return lang === "fr" ? "Aucun moyen de paiement enregistré" : "No payment method on file";
  switch (pm.type) {
    case "BANK_TN":   return `${pm.bankNameTn ?? "Banque"} — RIB: ${pm.rib ?? "—"} (${pm.accountHolder ?? "—"})`;
    case "BANK_INTL": return `${pm.bankNameIntl ?? "Banque"} — IBAN: ${pm.iban ?? "—"} / SWIFT: ${pm.swift ?? "—"}`;
    case "PAYPAL":    return `PayPal: ${pm.email ?? "—"}`;
    case "WISE":      return `Wise: ${pm.email ?? "—"}`;
    case "D17":       return `D17 / Mobile: ${pm.phone ?? "—"}`;
    default:          return pm.type;
  }
}

// ─── Mark-paid modal ──────────────────────────────────────────────────────────

function MarkPaidModal({
  tutor,
  onClose,
  onConfirm,
}: {
  tutor: TutorRow;
  onClose: () => void;
  onConfirm: (bookingIds: string[], reference: string) => Promise<void>;
}) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(tutor.bookings.map((b) => b.id)),
  );

  function toggleBooking(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function handleConfirm() {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      await onConfirm(Array.from(selectedIds), reference);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const selectedTotal = tutor.bookings
    .filter((b) => selectedIds.has(b.id))
    .reduce((sum, b) => sum + (b.tutorPayoutAmount ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-black/5">
          <h2 className="font-bold text-[#2D1A00] text-lg">{t("Marquer comme payé", "Mark as paid")}</h2>
          <p className="text-sm text-[#9B8A6B] mt-0.5">{tutor.tutorName}</p>
        </div>

        {/* Payment method info */}
        <div className="px-6 py-4 bg-[#FAF8F0] border-b border-black/5">
          <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-1">
            {t("Moyen de paiement du tuteur", "Tutor payment method")}
          </p>
          {tutor.paymentMethod ? (
            <>
              <p className="text-xs font-semibold text-[#5C3D00]">
                {TYPE_LABELS[tutor.paymentMethod.type] ?? tutor.paymentMethod.type}
              </p>
              <p className="text-xs text-[#6B5E44] mt-0.5 font-mono">
                {paymentMethodDetail(tutor.paymentMethod, lang)}
              </p>
            </>
          ) : (
            <p className="text-xs text-red-500 font-semibold">
              {t("Aucun moyen de paiement enregistré — contactez le tuteur", "No payment method on file — contact the tutor")}
            </p>
          )}
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-3">
            {t("Séances à inclure", "Sessions to include")}
          </p>
          <div className="space-y-2">
            {tutor.bookings.map((b) => {
              const date = b.scheduledAt
                ? new Date(b.scheduledAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
                : "—";
              return (
                <label key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E0D4] hover:bg-[#FAF8F0] cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(b.id)}
                    onChange={() => toggleBooking(b.id)}
                    className="w-4 h-4 accent-[#F5C400] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#2D1A00] font-medium">{date}</p>
                    <p className="text-xs text-[#9B8A6B]">
                      {b.sessionType === "DISCOVERY" ? t("Découverte", "Discovery") : t("Séance", "Session")} · {b.durationMins} min
                      {b.paymentProvider === "paypal" && (
                        <span className="ml-1.5 text-blue-500 font-semibold">PayPal</span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#5C3D00] flex-shrink-0">
                    {formatAmount(b.tutorPayoutAmount ?? 0, b.tutorCurrency)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Reference + total */}
        <div className="px-6 py-4 border-t border-black/5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-1.5">
              {t("Référence de virement (optionnel)", "Transfer reference (optional)")}
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: PAYPAL-TX-123456, VIR-20251012…"
              className="w-full border border-[#D9D0C3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400]/40"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#9B8A6B]">{selectedIds.size} {lang === "fr" ? `séance${selectedIds.size !== 1 ? "s" : ""} sélectionnée${selectedIds.size !== 1 ? "s" : ""}` : `session${selectedIds.size !== 1 ? "s" : ""} selected`}</p>
              <p className="text-lg font-black text-[#2D1A00]">
                {formatAmount(selectedTotal, tutor.currency)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-[#9B8A6B] hover:text-[#5C3D00] transition font-semibold"
              >
                {t("Annuler", "Cancel")}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || selectedIds.size === 0}
                className="px-5 py-2 bg-[#F5C400] text-[#5C3D00] font-bold text-sm rounded-xl hover:bg-[#FFDE59] transition disabled:opacity-50"
              >
                {loading ? t("En cours…", "Processing…") : t("Confirmer le paiement", "Confirm payment")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PayoutsClient() {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;
  const [tutors, setTutors] = useState<TutorRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [markingTutor, setMarkingTutor] = useState<TutorRow | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payouts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Erreur", "Error"));
      setTutors(data.tutors);
      setSummary(data.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Erreur de chargement", "Loading error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(tutorId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tutorId)) { next.delete(tutorId); } else { next.add(tutorId); }
      return next;
    });
  }

  async function handleMarkPaid(bookingIds: string[], reference: string) {
    const res = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingIds, reference }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? t("Erreur", "Error"));
    setSuccessMsg(lang === "fr"
      ? `${data.count} séance${data.count !== 1 ? "s" : ""} marquée${data.count !== 1 ? "s" : ""} comme payée${data.count !== 1 ? "s" : ""}. Référence : ${data.reference}`
      : `${data.count} session${data.count !== 1 ? "s" : ""} marked as paid. Reference: ${data.reference}`);
    setTimeout(() => setSuccessMsg(null), 6000);
    load();
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#1A0F00]">{t("Virements tuteurs", "Tutor payouts")}</h1>
        <p className="text-sm text-[#9B8A6B] mt-1">
          {t("Séances terminées en attente de paiement tuteur.", "Completed sessions pending tutor payment.")}
        </p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-600 flex-shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-green-800">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-green-500 hover:text-green-700">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
            <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">{t("Tuteurs à payer", "Tutors to pay")}</p>
            <p className="text-3xl font-black text-[#2D1A00]">{summary.pendingTutorCount}</p>
            <p className="text-xs text-[#9B8A6B] mt-1">{summary.pendingBookingCount} {lang === "fr" ? `séance${summary.pendingBookingCount !== 1 ? "s" : ""}` : `session${summary.pendingBookingCount !== 1 ? "s" : ""}`}</p>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
            <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">{t("Payés ce mois", "Paid this month")}</p>
            <p className="text-3xl font-black text-[#2D1A00]">{summary.paidThisMonthCount}</p>
            <p className="text-xs text-[#9B8A6B] mt-1">{t("séances virées", "sessions paid out")}</p>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
            <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">{t("Revenus bruts (mois)", "Gross revenue (month)")}</p>
            <p className="text-3xl font-black text-[#2D1A00]">${summary.platformGrossUsd.toFixed(0)}</p>
            <p className="text-xs text-[#9B8A6B] mt-1">{t("USD perçus", "USD collected")}</p>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
            <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">{t("Marge plateforme (mois)", "Platform margin (month)")}</p>
            <p className="text-3xl font-black text-green-700">${summary.platformRevenueUsd.toFixed(0)}</p>
            <p className="text-xs text-[#9B8A6B] mt-1">{t("après paiement tuteurs", "after tutor payouts")}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-700">{error}</div>
      ) : tutors.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-2xl p-12 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-bold text-[#2D1A00]">{t("Aucun virement en attente", "No pending payouts")}</p>
          <p className="text-sm text-[#9B8A6B] mt-1">{t("Tous les tuteurs ont été payés.", "All tutors have been paid.")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tutors.map((tutor) => {
            const isExpanded = expanded.has(tutor.tutorId);
            const hasPaymentMethod = !!tutor.paymentMethod;
            return (
              <div key={tutor.tutorId} className="bg-white border border-black/5 rounded-2xl shadow-sm overflow-hidden">

                {/* Tutor row */}
                <div className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F5C400]/20 flex items-center justify-center text-[#5C3D00] font-bold text-sm flex-shrink-0">
                    {tutor.tutorName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#2D1A00]">{tutor.tutorName}</p>
                    <p className="text-xs text-[#9B8A6B] mt-0.5 truncate">
                      {hasPaymentMethod ? (
                        <>
                          <span className="font-semibold text-[#6B5E44]">
                            {TYPE_LABELS[tutor.paymentMethod!.type] ?? tutor.paymentMethod!.type}
                          </span>
                          {" — "}
                          <span className="font-mono">{paymentMethodDetail(tutor.paymentMethod, lang)}</span>
                        </>
                      ) : (
                        <span className="text-red-500 font-semibold">{t("Aucun moyen de paiement", "No payment method")}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 mr-2">
                    <p className="text-xl font-black text-[#2D1A00]">
                      {formatAmount(tutor.totalOwed, tutor.currency)}
                    </p>
                    <p className="text-xs text-[#9B8A6B]">
                      {tutor.bookings.length} {lang === "fr" ? `séance${tutor.bookings.length !== 1 ? "s" : ""}` : `session${tutor.bookings.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleExpand(tutor.tutorId)}
                      className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition font-semibold px-3 py-1.5 rounded-lg hover:bg-[#FAF8F0]"
                    >
                      {isExpanded ? t("Masquer", "Hide") : t("Détails", "Details")}
                    </button>
                    <button
                      onClick={() => setMarkingTutor(tutor)}
                      className="text-xs bg-[#F5C400] text-[#5C3D00] font-bold px-4 py-1.5 rounded-xl hover:bg-[#FFDE59] transition"
                    >
                      {t("Marquer payé", "Mark paid")}
                    </button>
                  </div>
                </div>

                {/* Expanded session list */}
                {isExpanded && (
                  <div className="border-t border-black/5">
                    <div className="divide-y divide-black/4">
                      {tutor.bookings.map((b) => {
                        const date = b.scheduledAt
                          ? new Date(b.scheduledAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "—";
                        return (
                          <div key={b.id} className="flex items-center gap-4 px-6 py-3 bg-[#FAF8F0]">
                            <p className="text-xs text-[#6B5E44] w-24 flex-shrink-0">{date}</p>
                            <p className="text-xs text-[#9B8A6B] flex-1">
                              {b.sessionType === "DISCOVERY" ? t("Découverte", "Discovery") : t("Séance", "Session")} · {b.durationMins} min
                              {b.paymentProvider === "paypal" && (
                                <span className="ml-1.5 text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">PayPal</span>
                              )}
                            </p>
                            <p className="text-xs text-[#9B8A6B] flex-shrink-0">
                              {t("Étudiant", "Student")}: <span className="font-semibold">${b.studentPriceUsd?.toFixed(2) ?? "—"}</span>
                            </p>
                            <p className="text-sm font-bold text-[#2D1A00] flex-shrink-0">
                              {formatAmount(b.tutorPayoutAmount ?? 0, b.tutorCurrency)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-6 py-3 bg-[#F7F4EE] flex justify-end">
                      <p className="text-sm font-bold text-[#5C3D00]">
                        {t("Total dû", "Total owed")} : {formatAmount(tutor.totalOwed, tutor.currency)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mark-paid modal */}
      {markingTutor && (
        <MarkPaidModal
          tutor={markingTutor}
          onClose={() => setMarkingTutor(null)}
          onConfirm={handleMarkPaid}
        />
      )}
    </div>
  );
}
