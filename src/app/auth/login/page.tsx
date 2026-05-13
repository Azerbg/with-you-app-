"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const verified = searchParams.get("verified") === "1";
  const reset = searchParams.get("reset") === "1";

  const { lang, setLang } = useLanguage();
  const t = T[lang].auth.login;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signIn("credentials", { email, password, redirect: false });
      window.location.href = callbackUrl;
    } catch {
      setError(t.error);
      setLoading(false);
    }
  }

  async function handleGoogle() {
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(92,61,0,0.12)] p-8 border border-[#F5C400]/30">
        <div className="flex items-center justify-between mb-1">
          <Link href="/"><img src="/logo.svg" alt="WithYou" className="h-9 w-auto" /></Link>
          <button
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            className="text-xs font-bold text-[#6B5E44] border border-[#6B5E44]/20 px-2.5 py-1 rounded-full hover:bg-[#FFF3B0] hover:border-[#F5C400] transition"
          >
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
        <h1 className="text-2xl font-bold text-center mb-6 text-[#5C3D00]">{t.title}</h1>

        {verified && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
            {t.emailVerified}
          </div>
        )}
        {reset && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
            {t.passwordReset}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
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

          <div>
            <label className="block text-sm font-semibold text-[#5C3D00] mb-1">{t.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition"
              placeholder="••••••••••"
            />
            <div className="text-right mt-1">
              <Link href="/auth/forgot-password" className="text-sm text-[#C49200] hover:text-[#5C3D00] font-medium transition">
                {t.forgot}
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F5C400] text-[#5C3D00] py-2.5 rounded-full font-bold hover:bg-[#FFDE59] disabled:opacity-50 transition"
          >
            {loading ? t.submitting : t.submit}
          </button>
        </form>

        <div className="my-4 flex items-center gap-2">
          <div className="flex-1 h-px bg-[#F5C400]/30" />
          <span className="text-xs text-[#6B5E44]">{t.or}</span>
          <div className="flex-1 h-px bg-[#F5C400]/30" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-2 border border-[#6B5E44]/30 rounded-full py-2.5 text-sm font-semibold text-[#5C3D00] hover:bg-[#FFF3B0] transition"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t.google}
        </button>

        <p className="text-center text-sm text-[#6B5E44] mt-6">
          {t.noAccount}{" "}
          <Link href="/auth/register" className="text-[#C49200] hover:text-[#5C3D00] font-semibold transition">
            {t.signup}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
