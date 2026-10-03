"use client";

import { useEffect, useState } from "react";

interface ReferralData {
  code: string;
  creditBalance: number;
  totalReferred: number;
  rewarded: number;
  pending: number;
  referrals: { status: string; createdAt: string; name: string }[];
  hasBeenReferred: boolean;
  myReferralStatus: string | null;
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/referral").then(r => r.json()).then(setData);
  }, []);

  function copyCode() {
    if (!data?.code) return;
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyLink() {
    if (!data?.code) return;
    const url = `${window.location.origin}/auth/register?ref=${data.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleApply() {
    if (!applyCode.trim()) return;
    setApplying(true);
    setApplyMsg(null);
    const res = await fetch("/api/referral/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: applyCode.trim().toUpperCase() }),
    });
    const d = await res.json();
    if (res.ok) {
      setApplyMsg({ type: "success", text: `Code appliqué ! Vous recevrez +10 TND après votre première séance.` });
      setApplyCode("");
      const fresh = await fetch("/api/referral").then(r => r.json());
      setData(fresh);
    } else {
      const msgs: Record<string, string> = {
        ALREADY_APPLIED: "Vous avez déjà appliqué un code de parrainage.",
        INVALID_CODE: "Code invalide. Vérifiez et réessayez.",
        SELF_REFERRAL: "Vous ne pouvez pas utiliser votre propre code.",
      };
      setApplyMsg({ type: "error", text: msgs[d.error] ?? "Erreur. Réessayez." });
    }
    setApplying(false);
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <h1 className="text-2xl font-bold text-[#2D1A00]">Parrainage</h1>

        {/* Hero card */}
        <div className="bg-[#5C3D00] rounded-3xl p-7 text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#F5C400]/10" />
          <div className="absolute bottom-0 left-16 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative z-10">
            <p className="text-[#F5C400]/70 text-xs font-bold uppercase tracking-widest mb-1">Programme de parrainage</p>
            <h2 className="text-2xl font-bold mb-1">Invitez un ami</h2>
            <p className="text-white/60 text-sm mb-5">
              Partagez votre code. Quand votre filleul complète sa première séance :<br />
              <strong className="text-[#F5C400]">+15 TND</strong> pour vous · <strong className="text-[#F5C400]">+10 TND</strong> pour lui
            </p>

            {/* Code display */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-center">
                <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Votre code</p>
                <p className="text-2xl font-black tracking-widest text-[#F5C400]">{data.code}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={copyCode}
                  className="bg-[#F5C400] text-[#5C3D00] font-bold text-xs px-4 py-2 rounded-xl hover:bg-[#FFDE59] transition">
                  {copied ? "Copié !" : "Copier"}
                </button>
                <button onClick={copyLink}
                  className="bg-white/10 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-white/20 transition border border-white/20">
                  Lien
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Invités", value: data.totalReferred },
            { label: "Récompensés", value: data.rewarded },
            { label: "Solde crédits", value: `${data.creditBalance.toFixed(0)} TND` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-black/5 p-5 text-center">
              <p className="text-2xl font-bold text-[#2D1A00]">{s.value}</p>
              <p className="text-xs text-[#9B8A6B] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Apply a code (if not yet referred) */}
        {!data.hasBeenReferred && (
          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <p className="font-bold text-[#2D1A00] mb-1">Vous avez un code de parrainage ?</p>
            <p className="text-xs text-[#9B8A6B] mb-4">Entrez le code d&apos;un ami pour recevoir +10 TND après votre première séance.</p>
            <div className="flex gap-3">
              <input
                value={applyCode}
                onChange={e => setApplyCode(e.target.value.toUpperCase())}
                placeholder="Ex: AZERBR-X4K2"
                className="flex-1 border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm font-mono tracking-wider text-[#5C3D00] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition"
              />
              <button onClick={handleApply} disabled={applying || !applyCode.trim()}
                className="bg-[#F5C400] text-[#5C3D00] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#FFDE59] disabled:opacity-50 transition">
                {applying ? "…" : "Appliquer"}
              </button>
            </div>
            {applyMsg && (
              <p className={`text-xs mt-3 px-3 py-2 rounded-xl ${
                applyMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
              }`}>{applyMsg.text}</p>
            )}
          </div>
        )}

        {data.hasBeenReferred && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
            <p className="text-sm font-semibold text-emerald-700">
              ✓ Vous avez été parrainé.
              {data.myReferralStatus === "REWARDED"
                ? " Votre bonus de +10 TND a été crédité !"
                : " Complétez votre première séance pour recevoir +10 TND."}
            </p>
          </div>
        )}

        {/* Referral history */}
        {data.referrals.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5">
              <p className="font-bold text-[#2D1A00]">Vos filleuls</p>
            </div>
            <div className="divide-y divide-black/4">
              {data.referrals.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2D1A00]">{r.name}</p>
                    <p className="text-xs text-[#9B8A6B]">
                      {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    r.status === "REWARDED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {r.status === "REWARDED" ? "+15 TND crédité" : "En attente"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
