"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface MonthData { label: string; revenue: number; margin: number; count: number }
interface FinanceData {
  monthly: MonthData[];
  totals: { revenue: number; payouts: number; margin: number; bookings: number };
  payouts: { status: string; amount: number; count: number }[];
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
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/finance")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function runBackfill() {
    setBackfilling(true);
    const res = await fetch("/api/admin/bookings/backfill", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBackfillMsg(d.message ?? (res.ok ? t("Terminé.", "Done.") : t("Erreur.", "Error.")));
    setTimeout(() => setBackfillMsg(null), 6000);
    if (res.ok) fetch("/api/admin/finance").then(r => r.json()).then(d => setData(d));
    setBackfilling(false);
  }

  async function downloadCsv() {
    setExporting(true);
    const res = await fetch("/api/admin/finance?format=csv");
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

  const pendingPayout = data.payouts.find(p => p.status === "PENDING");
  const paidPayout    = data.payouts.find(p => p.status === "PAID");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-[#1A0F00]">{t("Finance", "Finance")}</h1>
            <p className="text-sm text-[#9B8A6B] mt-1">{t("Revenus, marges et virements tuteurs", "Revenue, margins and tutor payouts")}</p>
          </div>
          <div className="flex items-center gap-2">
            {backfillMsg && (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">{backfillMsg}</span>
            )}
            <button onClick={runBackfill} disabled={backfilling}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D9D0C3] text-[#5C3D00] font-bold rounded-full text-sm hover:bg-[#FAF8F0] disabled:opacity-50 transition">
              {backfilling ? t("Correction…", "Backfilling…") : t("Corriger prix nuls", "Backfill null prices")}
            </button>
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
            value={`$${data.totals.revenue.toFixed(0)}`}
            sub="USD · all time"
            color="text-green-700"
          />
          <StatCard
            label={t("Marge plateforme", "Platform margin")}
            value={`$${data.totals.margin.toFixed(0)}`}
            sub={data.totals.revenue > 0 ? `${((data.totals.margin / data.totals.revenue) * 100).toFixed(1)}%` : "—"}
            color="text-[#5C3D00]"
          />
          <StatCard
            label={t("Virements dus", "Payouts owed")}
            value={`${pendingPayout?.amount.toFixed(0) ?? "0"}`}
            sub={`${pendingPayout?.count ?? 0} ${t("en attente", "pending")}`}
            color="text-orange-700"
          />
          <StatCard
            label={t("Virements payés", "Payouts paid")}
            value={`${paidPayout?.amount.toFixed(0) ?? "0"}`}
            sub={`${paidPayout?.count ?? 0} ${t("effectués", "paid")}`}
            color="text-blue-700"
          />
        </div>

        {/* Revenue chart */}
        <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm mb-6">
          <h2 className="font-bold text-[#2D1A00] text-sm mb-6">{t("Revenus — 6 derniers mois", "Revenue — last 6 months")}</h2>
          <div className="flex items-end gap-3 h-40">
            {data.monthly.map(m => {
              const revenueH = (m.revenue / maxRevenue) * 100;
              const marginH  = m.revenue > 0 ? (m.margin  / maxRevenue) * 100 : 0;
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-32 gap-0.5">
                    {/* Revenue bar */}
                    <div className="relative w-full" style={{ height: `${revenueH}%` }}>
                      <div className="absolute inset-0 bg-[#F5C400]/30 rounded-t-md" />
                      {/* Margin overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-[#5C3D00]/80 rounded-t-md"
                        style={{ height: `${marginH > 0 ? (marginH / revenueH) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-[#9B8A6B]">{m.label}</p>
                  <p className="text-[10px] text-[#2D1A00] font-mono">${m.revenue.toFixed(0)}</p>
                  <p className="text-[10px] text-[#9B8A6B]">{m.count} {t("séances", "sessions")}</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-[10px] text-[#9B8A6B]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#F5C400]/30 inline-block" />{t("Revenu brut", "Gross revenue")}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#5C3D00]/80 inline-block" />{t("Marge plateforme", "Platform margin")}</span>
          </div>
        </div>

        {/* Payout breakdown */}
        <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
          <h2 className="font-bold text-[#2D1A00] text-sm mb-4">{t("Virements tuteurs", "Tutor payouts")}</h2>
          {data.payouts.length === 0 ? (
            <p className="text-sm text-[#9B8A6B]">{t("Aucun virement", "No payouts")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest py-2">{t("Statut", "Status")}</th>
                  <th className="text-right text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest py-2">{t("Montant", "Amount")}</th>
                  <th className="text-right text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest py-2">{t("Nb. virements", "Count")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {data.payouts.map(p => (
                  <tr key={p.status}>
                    <td className="py-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === "PAID" ? "bg-green-50 text-green-700" :
                        p.status === "PENDING" ? "bg-orange-50 text-orange-700" :
                        p.status === "FAILED" ? "bg-red-50 text-red-600" :
                        "bg-gray-50 text-gray-500"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold text-[#2D1A00]">{p.amount.toFixed(2)}</td>
                    <td className="py-2 text-right text-[#9B8A6B]">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-[#9B8A6B] mt-4">
            {t("Pour marquer un virement comme payé, utilisez la page Virements.", "To mark a payout as paid, use the Payouts page.")}
            {" "}<a href="/dashboard/admin/payouts" className="text-[#5C3D00] hover:underline">{t("Aller aux virements →", "Go to payouts →")}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
