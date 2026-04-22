"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { lang, setLang } = useLanguage();
  const t = T[lang].auth.forgot;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    if (!res.ok) { setError(t.error); return; }
    setSent(true);
  }

  const langToggle = (
    <button
      onClick={() => setLang(lang === "fr" ? "en" : "fr")}
      className="text-xs font-bold text-[#6B5E44] border border-[#6B5E44]/20 px-2.5 py-1 rounded-full hover:bg-[#FFF3B0] hover:border-[#F5C400] transition"
    >
      {lang === "fr" ? "EN" : "FR"}
    </button>
  );

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(92,61,0,0.12)] border border-[#F5C400]/30 p-8 text-center">
          <div className="flex justify-end mb-2">{langToggle}</div>
          <div className="w-12 h-12 bg-[#FFF3B0] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#C49200]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#5C3D00] mb-2">{t.checkTitle}</h1>
          <p className="text-[#6B5E44] text-sm mb-6">
            {t.checkSub1} <strong>{email}</strong>{t.checkSub2}
          </p>
          <Link href="/auth/login" className="text-[#C49200] hover:text-[#5C3D00] text-sm font-semibold transition">
            {t.back}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(92,61,0,0.12)] border border-[#F5C400]/30 p-8">
        <div className="flex items-center justify-between mb-1">
          <Link href="/" className="text-xl font-bold text-[#5C3D00]">WithYou</Link>
          {langToggle}
        </div>
        <h1 className="text-2xl font-bold text-center mb-2 text-[#5C3D00]">{t.title}</h1>
        <p className="text-center text-sm text-[#6B5E44] mb-6">{t.sub}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#5C3D00] mb-1">{t.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition"
              placeholder={t.emailPlaceholder}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F5C400] text-[#5C3D00] py-2.5 rounded-full font-bold hover:bg-[#FFDE59] disabled:opacity-50 transition"
          >
            {loading ? t.submitting : t.submit}
          </button>
        </form>

        <p className="text-center text-sm text-[#6B5E44] mt-6">
          <Link href="/auth/login" className="text-[#C49200] hover:text-[#5C3D00] font-semibold transition">
            {t.back}
          </Link>
        </p>
      </div>
    </div>
  );
}
