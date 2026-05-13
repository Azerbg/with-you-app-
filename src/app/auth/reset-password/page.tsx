"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { lang, setLang } = useLanguage();
  const t = T[lang].auth.reset;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) { setError(t.mismatch); return; }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? t.failed); return; }
    router.push("/auth/login?reset=1");
  }

  const langToggle = (
    <button
      onClick={() => setLang(lang === "fr" ? "en" : "fr")}
      className="text-xs font-bold text-[#6B5E44] border border-[#6B5E44]/20 px-2.5 py-1 rounded-full hover:bg-[#FFF3B0] hover:border-[#F5C400] transition"
    >
      {lang === "fr" ? "EN" : "FR"}
    </button>
  );

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="flex justify-end mb-2">{langToggle}</div>
          <p className="text-[#6B5E44]">{t.invalid}</p>
          <Link href="/auth/forgot-password" className="text-[#C49200] hover:text-[#5C3D00] font-semibold text-sm mt-2 block transition">
            {t.requestNew}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(92,61,0,0.12)] border border-[#F5C400]/30 p-8">
        <div className="flex items-center justify-between mb-1">
          <Link href="/"><img src="/logo.svg" alt="WithYou" className="h-9 w-auto" /></Link>
          {langToggle}
        </div>
        <h1 className="text-2xl font-bold text-center mb-6 text-[#5C3D00]">{t.title}</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#5C3D00] mb-1">{t.newPassword}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition"
              placeholder={t.placeholder}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5C3D00] mb-1">{t.confirm}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition"
              placeholder="••••••••••"
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
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
