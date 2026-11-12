"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { formatUsd } from "@/lib/adminSettings";

// ─── Types ─────────────────────────────────────────────────────────────────

interface MonthData { label: string; revenue: number; margin: number; payouts: number; count: number }
interface PaymentRow {
  id: string;
  createdAt: string;
  scheduledAt: string | null;
  sessionType: string;
  durationMins: number;
  amountUsd: number;
  marginUsd: number;
  provider: string;
  status: string;
  studentName: string;
  tutorName: string;
}
interface PlatformAccount {
  paypalEmail: string;
  accountHolder: string;
  note: string;
}
interface FinanceData {
  usdToTnd: number;
  platformAccount: PlatformAccount;
  monthly: MonthData[];
  totals: { revenue: number; payoutsUsd: number; margin: number; bookings: number };
  payoutsOwed: { amountLocal: number; amountUsd: number; count: number };
  payoutsPaid: { amountLocal: number; amountUsd: number; count: number };
  recentPayments: PaymentRow[];
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
      <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-black ${color ?? "text-[#2D1A00]"}`}>{value}</p>
      {sub && <p className="text-xs text-[#9B8A6B] mt-1">{sub}</p>}
    </div>
  );
}

function Badge({ provider }: { provider: string }) {
  if (provider === "paypal")
    return <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">PayPal</span>;
  if (provider === "stripe")
    return <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">Stripe</span>;
  return <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{provider}</span>;
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "transactions" | "account";

// ─── Main component ─────────────────────────────────────────────────────────

export default function FinancePage() {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;

  const [data, setData]       = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tab, setTab]         = useState<Tab>("overview");

  // FX rate
  const [fxRate, setFxRate]   = useState("");
  const [fxSaving, setFxSaving] = useState(false);
  const [fxMsg, setFxMsg]     = useState<string | null>(null);

  // Platform account form
  const [acctHolder, setAcctHolder] = useState("");
  const [acctEmail,  setAcctEmail]  = useState("");
  const [acctNote,   setAcctNote]   = useState("");
  const [acctSaving, setAcctSaving] = useState(false);
  const [acctMsg,    setAcctMsg]    = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/admin/finance?lang=${lang}`)
      .then(r => r.json())
      .then((d: FinanceData) => {
        setData(d);
        setFxRate(String(d.usdToTnd ?? 3.1));
        setAcctHolder(d.platformAccount.accountHolder ?? "");
        setAcctEmail(d.platformAccount.paypalEmail ?? "");
        setAcctNote(d.platformAccount.note ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  async function saveFxRate() {
    const v = parseFloat(fxRate);
    if (isNaN(v) || v <= 0) return;
    setFxSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usdToTnd: fxRate }),
    });
    setFxMsg(t("Taux mis à jour.", "Rate updated."));
    setTimeout(() => setFxMsg(null), 3000);
    setFxSaving(false);
    load();
  }

  async function saveAccount() {
    setAcctSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformAccountHolder: acctHolder,
        platformPaypalEmail:   acctEmail,
        platformAccountNote:   acctNote,
      }),
    });
    setAcctMsg(t("Compte enregistré.", "Account saved."));
    setTimeout(() => setAcctMsg(null), 3000);
    setAcctSaving(false);
  }

  async function downloadCsv() {
    setExporting(true);
    const res = await fetch(`/api/admin/finance?format=csv&lang=${lang}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-[#9B8A6B]">{t("Chargement…", "Loading…")}</div>
  );
  if (!data) return (
    <div className="flex items-center justify-center h-64 text-red-600">{t("Erreur de chargement", "Load error")}</div>
  );

  const maxRevenue = Math.max(...data.monthly.map(m => m.revenue), 1);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-[#1A0F00]">{t("Finance", "Finance")}</h1>
            <p className="text-sm text-[#9B8A6B] mt-1">{t("Revenus entrants, marges et virements tuteurs", "Incoming revenue, margins and tutor payouts")}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* FX rate editor */}
            <div className="flex items-center gap-2 bg-white border border-[#D9D0C3] rounded-xl px-3 py-1.5">
              <span className="text-xs font-semibold text-[#9B8A6B] whitespace-nowrap">1 USD =</span>
              <input type="number" step="0.01" min="0.1" value={fxRate}
                onChange={e => setFxRate(e.target.value)}
                className="w-16 text-sm text-[#2D1A00] font-mono focus:outline-none bg-transparent"
              />
              <span className="text-xs font-semibold text-[#9B8A6B]">TND</span>
              <button onClick={saveFxRate} disabled={fxSaving}
                className="text-xs font-bold text-[#5C3D00] hover:text-[#F5C400] transition disabled:opacity-50">
                {fxSaving ? "…" : t("Sauv.", "Save")}
              </button>
            </div>
            {fxMsg && <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">{fxMsg}</span>}
            <button onClick={downloadCsv} disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-[#F5C400] text-[#5C3D00] font-bold rounded-full text-sm hover:bg-[#FFDE59] disabled:opacity-50 transition">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              {exporting ? t("Export…", "Exporting…") : t("Exporter CSV", "Export CSV")}
            </button>
          </div>
        </div>

        {/* ── Stat cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label={t("Revenu brut", "Gross revenue")}
            value={formatUsd(data.totals.revenue, 0)}
            sub="USD · all time"
            color="text-green-700"
          />
          <StatCard
            label={t("Marge plateforme", "Platform margin")}
            value={formatUsd(data.totals.margin, 0)}
            sub={data.totals.revenue > 0 ? `${((data.totals.margin / data.totals.revenue) * 100).toFixed(1)}%` : "—"}
            color={data.totals.margin < 0 ? "text-red-600" : "text-[#5C3D00]"}
          />
          <StatCard
            label={t("Virements dus", "Payouts owed")}
            value={formatUsd(data.payoutsOwed.amountUsd, 0)}
            sub={`${data.payoutsOwed.count} ${t("en attente", "pending")}`}
            color="text-orange-700"
          />
          <StatCard
            label={t("Virements payés (mois)", "Payouts paid (month)")}
            value={formatUsd(data.payoutsPaid.amountUsd, 0)}
            sub={`${data.payoutsPaid.count} ${t("effectués", "paid")}`}
            color="text-blue-700"
          />
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 border-b border-black/5">
          {(["overview", "transactions", "account"] as Tab[]).map((id) => {
            const labels: Record<Tab, [string, string]> = {
              overview:     [t("Aperçu", "Overview"),     t("Aperçu", "Overview")],
              transactions: [t("Transactions", "Transactions"), t("Transactions", "Transactions")],
              account:      [t("Compte de réception", "Receiving account"), t("Compte de réception", "Receiving account")],
            };
            return (
              <button key={id} onClick={() => setTab(id)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition -mb-px ${tab === id ? "border-[#F5C400] text-[#5C3D00]" : "border-transparent text-[#9B8A6B] hover:text-[#5C3D00]"}`}>
                {labels[id][0]}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW TAB ────────────────────────────────────────────── */}
        {tab === "overview" && (
          <>
            {/* Revenue + margin chart */}
            <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm mb-6">
              <h2 className="font-bold text-[#2D1A00] text-sm mb-4">{t("Revenus — 6 derniers mois (date séance)", "Revenue — last 6 months (session date)")}</h2>
              <div className="flex items-end gap-3 h-52 overflow-hidden">
                {data.monthly.map(m => {
                  const revenueH = (m.revenue / maxRevenue) * 100;
                  const marginH  = m.revenue > 0 ? Math.max(0, (m.margin / maxRevenue) * 100) : 0;
                  const isNegativeMargin = m.margin < 0;
                  return (
                    <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col items-center justify-end h-32 gap-0.5">
                        <div className="relative w-full" style={{ height: `${Math.max(revenueH, 2)}%` }}>
                          <div className="absolute inset-0 bg-[#F5C400]/30 rounded-t-md" />
                          <div className={`absolute bottom-0 left-0 right-0 rounded-t-md ${isNegativeMargin ? "bg-red-400/70" : "bg-[#5C3D00]/80"}`}
                            style={{ height: `${revenueH > 0 ? (marginH / revenueH) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-[#9B8A6B]">{m.label}</p>
                      <p className="text-[10px] text-[#2D1A00] font-mono">{formatUsd(m.revenue, 0)}</p>
                      <p className={`text-[10px] font-mono ${m.margin < 0 ? "text-red-500" : "text-[#9B8A6B]"}`}>{formatUsd(m.margin, 0)}</p>
                      <p className="text-[10px] text-[#9B8A6B]">{m.count} {t("séances", "sess.")}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-[10px] text-[#9B8A6B]">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#F5C400]/30 inline-block" />{t("Revenu brut", "Gross revenue")}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#5C3D00]/80 inline-block" />{t("Marge", "Margin")}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400/70 inline-block" />{t("Marge négative", "Negative margin")}</span>
              </div>
            </div>

            {/* Payouts owed banner */}
            {data.payoutsOwed.count > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-orange-800 text-sm">{t("Virements tuteurs en attente", "Tutor payouts pending")}</p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    {data.payoutsOwed.count} {t("séance(s) à payer", "session(s) to pay")} —{" "}
                    <span className="font-bold">{formatUsd(data.payoutsOwed.amountUsd, 2)}</span>
                  </p>
                </div>
                <a href="/dashboard/admin/payouts"
                  className="flex-shrink-0 px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition">
                  {t("Gérer les virements", "Manage payouts")}
                </a>
              </div>
            )}

            <p className="text-xs text-[#9B8A6B] mt-6">
              {t(`Taux actuel : 1 USD = ${data.usdToTnd} TND. Marge = Revenu étudiant (USD) − Paiement tuteur (converti en USD).`,
                 `Current rate: 1 USD = ${data.usdToTnd} TND. Margin = Student price (USD) − Tutor payout (converted to USD).`)}
            </p>
          </>
        )}

        {/* ── TRANSACTIONS TAB ────────────────────────────────────────── */}
        {tab === "transactions" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#9B8A6B]">{t("50 derniers paiements reçus", "Last 50 payments received")}</p>
              <span className="text-xs font-semibold text-[#9B8A6B] bg-[#F2EFE9] px-2 py-1 rounded-lg">{data.recentPayments.length}</span>
            </div>

            {data.recentPayments.length === 0 ? (
              <div className="bg-white border border-black/5 rounded-2xl p-12 text-center">
                <p className="font-bold text-[#2D1A00]">{t("Aucun paiement reçu", "No payments received yet")}</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-5 py-3">{t("Date", "Date")}</th>
                      <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Étudiant", "Student")}</th>
                      <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Tuteur", "Tutor")}</th>
                      <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Séance", "Session")}</th>
                      <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Méthode", "Method")}</th>
                      <th className="text-right text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-5 py-3">{t("Montant", "Amount")}</th>
                      <th className="text-right text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-5 py-3">{t("Marge", "Margin")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {data.recentPayments.map(p => (
                      <tr key={p.id} className="hover:bg-[#FAF8F0] transition">
                        <td className="px-5 py-3 text-xs text-[#6B5E44] whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-[#2D1A00] max-w-[120px] truncate">{p.studentName}</td>
                        <td className="px-4 py-3 text-xs text-[#6B5E44] max-w-[120px] truncate">{p.tutorName}</td>
                        <td className="px-4 py-3 text-xs text-[#9B8A6B]">
                          {p.sessionType === "DISCOVERY" ? t("Découverte", "Discovery") : t("Séance", "Session")}
                          <span className="ml-1">· {p.durationMins} min</span>
                        </td>
                        <td className="px-4 py-3"><Badge provider={p.provider} /></td>
                        <td className="px-5 py-3 text-right font-bold text-green-700">{formatUsd(p.amountUsd, 2)}</td>
                        <td className={`px-5 py-3 text-right font-semibold text-sm ${p.marginUsd < 0 ? "text-red-500" : "text-[#9B8A6B]"}`}>{formatUsd(p.marginUsd, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ACCOUNT TAB ─────────────────────────────────────────────── */}
        {tab === "account" && (
          <div className="max-w-xl">
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                {/* PayPal logo placeholder */}
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-600">
                    <path d="M20.067 8.478c.492.315.844.825.983 1.39.09.372.09.752.045 1.126-.494 3.542-3.07 4.763-6.084 4.763h-.394c-.37 0-.681.272-.736.638l-.608 3.858a.74.74 0 01-.73.638H9.812a.428.428 0 01-.422-.494l1.254-7.942C11.206 8.766 14.11 8 16.74 8c1.26 0 2.49.158 3.327.478z"/>
                    <path d="M4.154 5.549C4.823 4.588 6.038 4 7.498 4h5.863c3.258 0 4.898 1.516 4.738 4.207-.003.056-.008.113-.013.169C17.632 11.52 15.37 13 12.456 13H10.75a.737.737 0 00-.727.624l-.79 5.012a.556.556 0 01-.548.472H6.15a.428.428 0 01-.422-.494L7.49 6.248a1.822 1.822 0 00-.418-.094C6.274 6.063 5.137 6.287 4.154 5.549z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-[#2D1A00]">{t("Compte de réception PayPal", "PayPal receiving account")}</h2>
                  <p className="text-xs text-[#9B8A6B]">{t("Le compte qui reçoit les paiements étudiants", "The account that receives student payments")}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-1.5">
                    {t("Nom du titulaire", "Account holder name")}
                  </label>
                  <input
                    type="text"
                    value={acctHolder}
                    onChange={e => setAcctHolder(e.target.value)}
                    placeholder={t("Votre nom complet", "Your full name")}
                    className="w-full border border-[#D9D0C3] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-1.5">
                    {t("Email PayPal", "PayPal email")}
                  </label>
                  <input
                    type="email"
                    value={acctEmail}
                    onChange={e => setAcctEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    className="w-full border border-[#D9D0C3] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F5C400]/40"
                  />
                  <p className="text-xs text-[#9B8A6B] mt-1">{t("L'email associé à votre compte PayPal personnel", "The email linked to your personal PayPal account")}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-1.5">
                    {t("Note / instructions (optionnel)", "Note / instructions (optional)")}
                  </label>
                  <textarea
                    value={acctNote}
                    onChange={e => setAcctNote(e.target.value)}
                    rows={3}
                    placeholder={t("Ex: Vérifier les transactions chaque lundi matin…", "E.g.: Check transactions every Monday morning…")}
                    className="w-full border border-[#D9D0C3] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400]/40 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {acctMsg
                    ? <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">{acctMsg}</span>
                    : <span />
                  }
                  <button onClick={saveAccount} disabled={acctSaving}
                    className="px-5 py-2.5 bg-[#F5C400] text-[#5C3D00] font-bold text-sm rounded-xl hover:bg-[#FFDE59] disabled:opacity-50 transition">
                    {acctSaving ? t("Enregistrement…", "Saving…") : t("Enregistrer", "Save")}
                  </button>
                </div>
              </div>
            </div>

            {/* Summary of saved account */}
            {data.platformAccount.paypalEmail && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">{t("Compte enregistré", "Saved account")}</p>
                <p className="text-sm font-semibold text-[#2D1A00]">{data.platformAccount.accountHolder || "—"}</p>
                <p className="text-sm font-mono text-blue-600">{data.platformAccount.paypalEmail}</p>
                {data.platformAccount.note && (
                  <p className="text-xs text-[#9B8A6B] mt-1">{data.platformAccount.note}</p>
                )}
              </div>
            )}

            {/* Guide */}
            <div className="mt-6 bg-[#FAF8F0] border border-[#E8E0D4] rounded-2xl p-5">
              <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-3">{t("Comment ça marche", "How it works")}</p>
              <ol className="space-y-2 text-xs text-[#6B5E44]">
                <li className="flex gap-2"><span className="font-bold text-[#5C3D00]">1.</span>{t("L'étudiant paie via PayPal sur ton profil app.", "The student pays via PayPal on your app profile.")}</li>
                <li className="flex gap-2"><span className="font-bold text-[#5C3D00]">2.</span>{t("L'argent arrive directement sur ce compte PayPal.", "The money lands directly in this PayPal account.")}</li>
                <li className="flex gap-2"><span className="font-bold text-[#5C3D00]">3.</span>{t('Tu vois chaque transaction dans l\'onglet "Transactions".', 'You see each transaction in the "Transactions" tab.')}</li>
                <li className="flex gap-2"><span className="font-bold text-[#5C3D00]">4.</span>{t("Tu paies les tuteurs manuellement depuis ton dashboard PayPal.", "You pay tutors manually from your PayPal dashboard.")}</li>
                <li className="flex gap-2"><span className="font-bold text-[#5C3D00]">5.</span>{t('Tu enregistres le paiement dans "Virements tuteurs" → "Marquer payé".', 'You record the payment in "Tutor payouts" → "Mark paid".')}</li>
              </ol>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
