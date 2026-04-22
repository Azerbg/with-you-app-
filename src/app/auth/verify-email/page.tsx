"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const { lang } = useLanguage();
  const t = T[lang].auth.verify;

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);

  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  function handleInput(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? "";
    setDigits(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) return;

    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? t.invalid);
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      return;
    }

    router.push("/auth/login?verified=1");
  }

  async function handleResend() {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setError("");

    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setResendLoading(false);
    setDigits(["", "", "", "", "", ""]);
    inputs.current[0]?.focus();
    setResendCooldown(60);
  }

  const code = digits.join("");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(92,61,0,0.13)] p-8 border border-[#F5C400]/30">

        {/* Icon */}
        <div className="w-16 h-16 bg-[#FFF3B0] border-2 border-[#F5C400] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-[#5C3D00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#5C3D00] text-center mb-2">{t.title}</h1>

        <p className="text-sm text-[#8B7355] text-center mb-7">
          {t.sub}{" "}
          {email && <span className="font-semibold text-[#5C3D00] break-all">{email}</span>}
        </p>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 6 OTP boxes */}
          <div className="flex gap-2 justify-center mb-7" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-white text-[#5C3D00] focus:outline-none transition
                  ${d
                    ? "border-[#F5C400] bg-[#FFFBEA]"
                    : "border-[#D9CDBA] focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/25"
                  }`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full bg-[#F5C400] text-[#5C3D00] py-3 rounded-xl font-bold text-sm hover:bg-[#FFDE59] disabled:opacity-40 transition shadow-sm"
          >
            {loading ? t.submitting : t.submit}
          </button>
        </form>

        {/* Resend */}
        <div className="text-center mt-5">
          {resendCooldown > 0 ? (
            <p className="text-sm text-[#9B8A6B]">
              {t.resendIn} <span className="font-semibold text-[#5C3D00]">{resendCooldown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-sm font-semibold text-[#C49200] hover:text-[#5C3D00] transition disabled:opacity-50"
            >
              {resendLoading ? "…" : t.resend}
            </button>
          )}
        </div>

        {email && (
          <p className="text-center text-sm text-[#9B8A6B] mt-4">
            {t.wrongEmail}{" "}
            <Link href="/auth/register" className="text-[#C49200] hover:text-[#5C3D00] font-semibold transition">
              {t.goBack}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
