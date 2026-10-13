"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface HistoryEntry {
  reference: string;
  paidAt: string;
  tutorId: string;
  tutorName: string;
  method: string | null;
  amount: number;
  currency: string;
  bookingCount: number;
  paidByEmail: string;
}

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

const PAYOUT_METHODS = [
  { value: "WISE",      label: "Wise" },
  { value: "BANK_TN",   label: "Virement TN (RIB)" },
  { value: "BANK_INTL", label: "Virement Intl (IBAN)" },
  { value: "PAYPAL",    label: "PayPal" },
  { value: "D17",       label: "D17 / Mobile" },
];

// ─── Mark-paid modal ──────────────────────────────────────────────────────────

function MarkPaidModal({
  tutor,
  onClose,
  onConfirm,
}: {
  tutor: TutorRow;
  onClose: () => void;
  onConfirm: (bookingIds: string[], reference: string, method: string) => Promise<void>;
}) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState(tutor.paymentMethod?.type ?? PAYOUT_METHODS[0].value);
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
      await onConfirm(Array.from(selectedIds), reference, method);
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

        {/* Method + Reference + total */}
        <div className="px-6 py-4 border-t border-black/5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-1.5">
                {t("Méthode de paiement", "Payment method")}
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full border border-[#D9D0C3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400]/40 bg-white"
              >
                {PAYOUT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-1.5">
                {t("Référence (optionnel)", "Reference (optional)")}
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: WISE-TX-123456…"
                className="w-full border border-[#D9D0C3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400]/40"
              />
            </div>
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
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [tutors, setTutors] = useState<TutorRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [markingTutor, setMarkingTutor] = useState<TutorRow | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  // History tab state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/payouts/history");
      const data = await res.json();
      if (res.ok) setHistory(data.history ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, loadHistory]);

  function toggleExpand(tutorId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tutorId)) { next.delete(tutorId); } else { next.add(tutorId); }
      return next;
    });
  }

  async function handleMarkPaid(bookingIds: string[], reference: string, method: string) {
    const res = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingIds, reference, method }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? t("Erreur", "Error"));
    setSuccessMsg(lang === "fr"
      ? `${data.count} séance${data.count !== 1 ? "s" : ""} marquée${data.count !== 1 ? "s" : ""} comme payée${data.count !== 1 ? "s" : ""}. Référence : ${data.reference}`
      : `${data.count} session${data.count !== 1 ? "s" : ""} marked as paid. Reference: ${data.reference}`);
    setTimeout(() => setSuccessMsg(null), 6000);
    load();
  }

  async function downloadHistoryCsv() {
    setExportingCsv(true);
    const res = await fetch("/api/admin/payouts/history?format=csv");
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payout_history_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportingCsv(false);
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-[#1A0F00]">{t("Virements tuteurs", "Tutor payouts")}</h1>
          <p className="text-sm text-[#9B8A6B] mt-1">
            {t("Séances terminées en attente de paiement tuteur.", "Completed sessions pending tutor payment.")}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 border-b border-black/5">
        <button onClick={() => setTab("pending")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition -mb-px ${tab === "pending" ? "border-[#F5C400] text-[#5C3D00]" : "border-transparent text-[#9B8A6B] hover:text-[#5C3D00]"}`}>
          {t("En attente", "Pending")}
          {summary && summary.pendingBookingCount > 0 && (
            <span className="ml-2 bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{summary.pendingBookingCount}</span>
          )}
        </button>
        <button onClick={() => setTab("history")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition -mb-px ${tab === "history" ? "border-[#F5C400] text-[#5C3D00]" : "border-transparent text-[#9B8A6B] hover:text-[#5C3D00]"}`}>
          {t("Historique", "History")}
        </button>
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

      {/* Summary cards — always visible */}
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
            <p className="text-xs text-[#9B8A6B] mt-1">{t("payés ce mois (createdAt)", "booked this month")}</p>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
            <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">{t("Marge plateforme (mois)", "Platform margin (month)")}</p>
            <p className="text-3xl font-black text-green-700">${summary.platformRevenueUsd.toFixed(0)}</p>
            <p className="text-xs text-[#9B8A6B] mt-1">{t("après paiement tuteurs", "after tutor payouts")}</p>
          </div>
        </div>
      )}

      {/* ── PENDING TAB ── */}
      {tab === "pending" && (
        loading ? (
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
                      <p className="text-xl font-black text-[#2D1A00]">{formatAmount(tutor.totalOwed, tutor.currency)}</p>
                      <p className="text-xs text-[#9B8A6B]">
                        {tutor.bookings.length} {lang === "fr" ? `séance${tutor.bookings.length !== 1 ? "s" : ""}` : `session${tutor.bookings.length !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => toggleExpand(tutor.tutorId)}
                        className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition font-semibold px-3 py-1.5 rounded-lg hover:bg-[#FAF8F0]">
                        {isExpanded ? t("Masquer", "Hide") : t("Détails", "Details")}
                      </button>
                      <button onClick={() => setMarkingTutor(tutor)}
                        className="text-xs bg-[#F5C400] text-[#5C3D00] font-bold px-4 py-1.5 rounded-xl hover:bg-[#FFDE59] transition">
                        {t("Marquer payé", "Mark paid")}
                      </button>
                    </div>
                  </div>
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
        )
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#9B8A6B]">
              {historyLoading ? t("Chargement…", "Loading…") : `${history.length} ${t("virement(s)", "payout(s)")}`}
            </p>
            <button onClick={downloadHistoryCsv} disabled={exportingCsv || history.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#F5C400] text-[#5C3D00] font-bold text-xs rounded-xl hover:bg-[#FFDE59] disabled:opacity-50 transition">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {exportingCsv ? t("Export…", "Exporting…") : t("Exporter CSV", "Export CSV")}
            </button>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white border border-black/5 rounded-2xl p-12 text-center">
              <p className="font-bold text-[#2D1A00]">{t("Aucun virement enregistré", "No payout history yet")}</p>
              <p className="text-sm text-[#9B8A6B] mt-1">{t("Les virements marqués comme payés apparaîtront ici.", "Payouts marked as paid will appear here.")}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-5 py-3">{t("Date", "Date")}</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Tuteur", "Tutor")}</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Méthode", "Method")}</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Référence", "Reference")}</th>
                    <th className="text-right text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Montant", "Amount")}</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Admin", "Admin")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {history.map((h, i) => (
                    <tr key={i} className="hover:bg-[#FAF8F0] transition">
                      <td className="px-5 py-3 text-xs text-[#6B5E44]">
                        {new Date(h.paidAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#2D1A00]">{h.tutorName}</td>
                      <td className="px-4 py-3 text-xs text-[#9B8A6B]">
                        {h.method ? (TYPE_LABELS[h.method] ?? h.method) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#9B8A6B] max-w-[160px] truncate">{h.reference}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#2D1A00]">
                        {formatAmount(h.amount, h.currency)}
                        <span className="block text-[10px] font-normal text-[#9B8A6B]">{h.bookingCount} {lang === "fr" ? "séance(s)" : "session(s)"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#9B8A6B]">{h.paidByEmail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
