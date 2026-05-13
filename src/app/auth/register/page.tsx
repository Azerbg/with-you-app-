"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";

// ── Password checklist (2.5) ──────────────────────────────────────────────
function PasswordChecklist({ password, visible }: { password: string; visible: boolean }) {
  if (!visible) return null;
  const checks = [
    { label: { en: "At least 10 characters", fr: "Minimum 10 caractères" },   ok: password.length >= 10 },
    { label: { en: "Uppercase letter (A–Z)",  fr: "Lettre majuscule (A–Z)" },  ok: /[A-Z]/.test(password) },
    { label: { en: "Number (0–9)",             fr: "Chiffre (0–9)" },           ok: /[0-9]/.test(password) },
    { label: { en: "Symbol (!@#…)",            fr: "Symbole (!@#…)" },          ok: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <div className="mt-2 p-3 bg-[#FFFBEA] border border-[#F5C400]/40 rounded-xl space-y-1.5">
      {checks.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${c.ok ? "bg-green-500" : "bg-gray-200"}`}>
            {c.ok ? "✓" : ""}
          </span>
          <span className={`text-xs ${c.ok ? "text-green-700 font-medium" : "text-gray-400"}`}>
            {c.label.en}
          </span>
        </div>
      ))}
    </div>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

// Left panel features (2.6)
const FEATURES = [
  { icon: "🎯", text: { en: "Find your level in minutes",                fr: "Trouvez votre niveau en quelques minutes" } },
  { icon: "🧑‍🏫", text: { en: "Find the right tutor",                  fr: "Trouvez le bon tuteur" } },
  { icon: "📅", text: { en: "Learn on a schedule that suits you",        fr: "Apprenez à des horaires qui vous conviennent" } },
];

export default function RegisterPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const t = T[lang].auth.register;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "STUDENT" as "STUDENT" | "TUTOR",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError(t.mismatch); return; }
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: form.role,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const msgs = data.details ? (Object.values(data.details).flat() as string[]).join(" · ") : null;
      setError(msgs || data.error || t.failed);
      return;
    }

    router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex rounded-3xl overflow-hidden shadow-[0_24px_80px_rgba(92,61,0,0.22)]">

        {/* ── Left panel (2.6) ── */}
        <div className="hidden lg:flex flex-col justify-between w-[44%] bg-[#2D1F0E] p-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(#F5C400 1px,transparent 1px),linear-gradient(90deg,#F5C400 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, #F5C400 0%, transparent 70%)" }} />

          <div className="relative z-10">
            <Link href="/" className="inline-block mb-12">
              <img src="/logo.svg" alt="WithYou" className="h-9 w-auto brightness-0 invert" />
            </Link>

            <h2 className="text-white font-bold text-3xl leading-snug mb-3">
              {lang === "fr"
                ? "Apprenez une langue avec le bon tuteur."
                : "Learn a language with the right tutor."}
            </h2>
            <p className="text-[#C4A96B] text-sm leading-relaxed mb-10">
              {lang === "fr"
                ? "Trouvez des tuteurs experts et commencez à apprendre avec des cours individuels simples, à des horaires qui vous conviennent."
                : "Find expert tutors and start learning with simple one-on-one sessions, on a schedule that works for you."}
            </p>

            <div className="space-y-4">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#F5C400]/15 rounded-lg flex items-center justify-center shrink-0 text-base">
                    {f.icon}
                  </div>
                  <p className="text-[#E8D9BC] text-sm leading-relaxed pt-1">{f.text[lang]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              {["SB", "AK", "NF", "MO"].map((initials) => (
                <div key={initials} className="w-8 h-8 rounded-full bg-[#F5C400]/30 border-2 border-[#F5C400]/50 flex items-center justify-center -ml-2 first:ml-0">
                  <span className="text-[#F5C400] text-[9px] font-bold">{initials}</span>
                </div>
              ))}
              <span className="text-[#C4A96B] text-xs font-medium ml-1">+500</span>
            </div>
            <p className="text-[#8A7558] text-xs">
              {lang === "fr" ? "Apprenants actifs cette semaine" : "Active learners this week"}
            </p>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 bg-white/95 backdrop-blur-xl p-8 lg:p-10 flex flex-col justify-center overflow-y-auto">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="lg:hidden"><img src="/logo.svg" alt="WithYou" className="h-8 w-auto" /></Link>
            <div className="lg:hidden flex-1" />
            <button
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="text-xs font-bold text-[#6B5E44] border border-[#D9CDBA] px-3 py-1.5 rounded-full hover:bg-[#FFF3B0] hover:border-[#F5C400] transition"
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
          </div>

          <h1 className="text-2xl font-bold text-[#1A1208] mb-1">{t.title}</h1>
          <p className="text-sm text-[#8B7355] mb-6">
            {t.hasAccount}{" "}
            <Link href="/auth/login" className="text-[#C49200] hover:text-[#5C3D00] font-semibold transition">{t.signin}</Link>
          </p>

          {/* Google (2.4) */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-[#E2D9C8] rounded-xl py-3 text-sm font-semibold text-[#3D2F00] hover:bg-[#FFFBF0] hover:border-[#F5C400] transition-all shadow-sm disabled:opacity-60 mb-3"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {googleLoading ? "…" : t.google}
          </button>

          {/* Apple (2.1) */}
          <button
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-3 bg-black border border-black rounded-xl py-3 text-sm font-semibold text-white opacity-40 cursor-not-allowed mb-5"
            title="Apple Sign-In — coming soon"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-white">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            {t.apple}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#EDE4D4]" />
            <span className="text-xs text-[#A89878] font-medium px-1">{t.orEmail}</span>
            <div className="flex-1 h-px bg-[#EDE4D4]" />
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Role cards */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { role: "STUDENT", icon: "🎓", label: t.learn, sub: lang === "fr" ? "Apprendre une langue" : "Learn a language" },
                { role: "TUTOR",   icon: "🧑‍🏫", label: t.teach, sub: lang === "fr" ? "Enseigner et gagner" : "Teach and earn" },
              ] as const).map(({ role, icon, label, sub }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, role }))}
                  className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all ${
                    form.role === role
                      ? "border-[#F5C400] bg-[#FFFBEA] shadow-sm"
                      : "border-[#E8DDD0] bg-white hover:border-[#F5C400]/50"
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className={`text-sm font-bold ${form.role === role ? "text-[#5C3D00]" : "text-[#3D2F00]"}`}>{label}</span>
                  <span className="text-xs text-[#9B8A6B]">{sub}</span>
                </button>
              ))}
            </div>

            {/* Prénom + Nom (2.2 + 2.3) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C3D00] uppercase tracking-wide mb-1.5">
                  {(t as unknown as {firstName: string}).firstName}
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  className="w-full border border-[#D9CDBA] rounded-xl px-4 py-2.5 text-sm text-[#1A1208] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20 transition placeholder:text-[#C4B49A]"
                  placeholder={(t as unknown as {firstNamePlaceholder: string}).firstNamePlaceholder}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C3D00] uppercase tracking-wide mb-1.5">
                  {(t as unknown as {lastName: string}).lastName}
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  className="w-full border border-[#D9CDBA] rounded-xl px-4 py-2.5 text-sm text-[#1A1208] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20 transition placeholder:text-[#C4B49A]"
                  placeholder={(t as unknown as {lastNamePlaceholder: string}).lastNamePlaceholder}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#5C3D00] uppercase tracking-wide mb-1.5">{t.email}</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full border border-[#D9CDBA] rounded-xl px-4 py-2.5 text-sm text-[#1A1208] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20 transition placeholder:text-[#C4B49A]"
                placeholder={t.emailPlaceholder}
              />
            </div>

            {/* Password with checklist (2.5) */}
            <div>
              <label className="block text-xs font-semibold text-[#5C3D00] uppercase tracking-wide mb-1.5">{t.password}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  className="w-full border border-[#D9CDBA] rounded-xl px-4 py-2.5 pr-12 text-sm text-[#1A1208] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20 transition placeholder:text-[#C4B49A]"
                  placeholder="Min 10 chars, A–Z, 0–9, !@#"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A89878] hover:text-[#5C3D00] transition">
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              <PasswordChecklist password={form.password} visible={passwordFocused || form.password.length > 0} />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-semibold text-[#5C3D00] uppercase tracking-wide mb-1.5">{t.confirmPassword}</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`w-full border rounded-xl px-4 py-2.5 pr-12 text-sm text-[#1A1208] bg-white focus:outline-none focus:ring-2 transition ${
                    form.confirmPassword && form.confirmPassword !== form.password
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : "border-[#D9CDBA] focus:border-[#F5C400] focus:ring-[#F5C400]/20"
                  }`}
                  placeholder="••••••••••"
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A89878] hover:text-[#5C3D00] transition">
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {t.mismatch}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F5C400] text-[#3D2000] py-3 rounded-xl font-bold text-sm hover:bg-[#FFD426] active:bg-[#E8B800] disabled:opacity-50 transition-all shadow-md hover:shadow-lg mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {t.submitting}
                </span>
              ) : t.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
