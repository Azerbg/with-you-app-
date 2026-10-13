"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { formatUsd } from "@/lib/adminSettings";

interface MonthData { label: string; revenue: number; margin: number; payouts: number; count: number }
interface FinanceData {
  usdToTnd: number;
  monthly: MonthData[];
  totals: { revenue: number; payoutsUsd: number; margin: number; bookings: number };
  payoutsOwed: { amountLocal: number; amountUsd: number; count: number };
  payoutsPaid: { amountLocal: number; amountUsd: number; count: number };
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
      <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-black ${color ?? "text-[#2D1A00]"}`}>{value}</p>
      {sub && <p className="text-xs text-[#9B8A6B] mt-1">{sub}</p>}
    </div>
  );
}

export default function FinancePage() {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [fxRate, setFxRate] = useState("");
  const [fxSaving, setFxSaving] = useState(false);
  const [fxMsg, setFxMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/admin/finance?lang=${lang}`)
      .then(r => r.json())
      .then(d => { setData(d); setFxRate(String(d.usdToTnd ?? 3.1)); setLoading(false); })
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

        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-[#1A0F00]">{t("Finance", "Finance")}</h1>
            <p className="text-sm text-[#9B8A6B] mt-1">{t("Revenus, marges et virements tuteurs", "Revenue, margins and tutor payouts")}</p>
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

        {/* Totals */}
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
            sub={`${data.payoutsOwed.count} ${t("en attente", "pending")} · ${data.payoutsOwed.amountLocal.toFixed(0)} TND`}
            color="text-orange-700"
          />
          <StatCard
            label={t("Virements payés (mois)", "Payouts paid (month)")}
            value={formatUsd(data.payoutsPaid.amountUsd, 0)}
            sub={`${data.payoutsPaid.count} ${t("effectués", "paid")}`}
            color="text-blue-700"
          />
        </div>

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

        {/* FX note */}
        <p className="text-xs text-[#9B8A6B] mb-6">
          {t(`Taux actuel : 1 USD = ${data.usdToTnd} TND. Marge = Revenu étudiant (USD) − Paiement tuteur (converti en USD).`,
             `Current rate: 1 USD = ${data.usdToTnd} TND. Margin = Student price (USD) − Tutor payout (converted to USD).`)}
        </p>
      </div>
    </div>
  );
}
