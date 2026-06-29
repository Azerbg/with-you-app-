"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import CountryCitySelect from "@/components/CountryCitySelect";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1
  firstName: string;
  lastName:  string;
  fullName:  string; // computed: firstName + lastName
  email:     string;
  password:  string;
  confirmPassword: string;
  phone:     string;
  birthday:  string;
  gender:    string;
  country:   string;
  city:      string;
  // Step 2
  languagesTaught: string[];
  specializations: string[];
  yearsExperience: number;
  certifications:  string[];
  englishLevel:    string;
  // Step 3
  bio:                       string;
  cvUrl:                     string;
  cvFileName:                string;
  motivationLetterUrl:       string;
  motivationLetterFileName:  string;
  certificateFiles:          { type: string; name: string; dataUrl: string }[];
  // Step 4
  availabilityDays:     string[];
  timeWindowPreference: string[];
}

const TOTAL_STEPS = 5;
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// ─── Country dial codes ────────────────────────────────────────────────────────
const DIAL_CODES: Record<string, string> = {
  "Tunisia": "+216", "Algeria": "+213", "Morocco": "+212", "Libya": "+218",
  "Egypt": "+20", "France": "+33", "Belgium": "+32", "Switzerland": "+41",
  "Luxembourg": "+352", "Canada": "+1", "United States": "+1",
  "United Kingdom": "+44", "Germany": "+49", "Spain": "+34", "Italy": "+39",
  "Netherlands": "+31", "Portugal": "+351", "Sweden": "+46", "Norway": "+47",
  "Denmark": "+45", "Finland": "+358", "Austria": "+43", "Poland": "+48",
  "Saudi Arabia": "+966", "United Arab Emirates": "+971", "Qatar": "+974",
  "Kuwait": "+965", "Jordan": "+962", "Lebanon": "+961", "Turkey": "+90",
  "Senegal": "+221", "Ivory Coast": "+225", "Cameroon": "+237",
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls = "w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition";
const btnPrimary = "bg-[#F5C400] text-[#5C3D00] font-bold rounded-full hover:bg-[#FFDE59] disabled:opacity-50 transition";
const btnSecondary = "border-2 border-[#6B5E44]/30 text-[#5C3D00] font-bold rounded-full hover:bg-[#FFF3B0] transition";
const activeCard = "border-[#F5C400] bg-[#FFF3B0]";
const inactiveCard = "border-[#6B5E44]/20 hover:border-[#F5C400]/50";

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const { lang } = useLanguage();
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between text-xs text-[#6B5E44] mb-2">
        <span>{lang === "fr" ? "Étape" : "Step"} {step} {lang === "fr" ? "sur" : "of"} {TOTAL_STEPS}</span>
        <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
      </div>
      <div className="w-full bg-[#FAF8F0] rounded-full h-2">
        <div className="bg-[#F5C400] h-2 rounded-full transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>
    </div>
  );
}

// ─── Step 1: Personal Info ────────────────────────────────────────────────────

function StepPersonal({ data, onChange, onNext, phoneVerified, onPhoneVerified, emailVerified, onEmailVerified, isLoggedIn, loggedInEmail }: {
  data: FormData;
  onChange: (k: keyof FormData, v: string) => void;
  onNext: () => void;
  phoneVerified: boolean;
  onPhoneVerified: () => void;
  emailVerified: boolean;
  onEmailVerified: () => void;
  isLoggedIn: boolean;
  loggedInEmail: string;
}) {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Phone OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const prevPhone = useRef("");
  // Email OTP
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpValue, setEmailOtpValue] = useState("");
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState("");
  const [devEmailOtp, setDevEmailOtp] = useState("");
  const prevEmail = useRef("");

  // Phone prefix helpers
  const dialCode = DIAL_CODES[data.country] ?? "";
  const [localPhone, setLocalPhone] = useState(() =>
    data.phone.startsWith("+") ? data.phone.replace(/^\+\d{1,4}\s?/, "") : data.phone
  );

  function handleCountryChange(name: string) {
    onChange("country", name);
    const code = DIAL_CODES[name] ?? "";
    const full = localPhone ? code + localPhone : "";
    onChange("phone", full);
    if (full !== prevPhone.current) { setOtpSent(false); setOtpValue(""); setDevOtp(""); }
  }

  function handleLocalPhoneChange(val: string) {
    setLocalPhone(val);
    const full = val ? dialCode + val : "";
    onChange("phone", full);
    if (full !== prevPhone.current) { setOtpSent(false); setOtpValue(""); setDevOtp(""); }
  }

  // Password strength checks
  const pw = data.password;
  const checks = {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    number:  /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  const pwStrong = Object.values(checks).every(Boolean);
  const pwMatch  = data.password === data.confirmPassword && data.confirmPassword !== "";

  const isValid = data.firstName && data.lastName && localPhone && data.birthday && data.gender && data.country &&
    (isLoggedIn || (data.email && pwStrong && pwMatch && emailVerified));

  async function sendEmailOtp() {
    if (!data.email) return;
    setEmailOtpLoading(true);
    setEmailOtpError("");
    setDevEmailOtp("");
    try {
      const res = await fetch("/api/tutors/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error === "email_send_failed"
          ? `SMTP: ${json.detail ?? "erreur inconnue"}`
          : (fr ? "Erreur serveur. Veuillez réessayer." : "Server error. Please try again.");
        setEmailOtpError(msg);
        return;
      }
      setEmailOtpSent(true);
      prevEmail.current = data.email;
      if (json.devMode && json.otp) setDevEmailOtp(json.otp);
    } finally {
      setEmailOtpLoading(false);
    }
  }

  async function verifyEmailOtp() {
    setEmailOtpLoading(true);
    setEmailOtpError("");
    try {
      const res = await fetch("/api/tutors/email-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: prevEmail.current || data.email, otp: emailOtpValue }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msgs: Record<string, string> = {
          invalid_otp: fr ? "Code incorrect." : "Incorrect code.",
          expired: fr ? "Code expiré. Renvoyez un code." : "Code expired. Resend code.",
        };
        setEmailOtpError(msgs[json.error] ?? (fr ? "Erreur de vérification." : "Verification error."));
        return;
      }
      onEmailVerified();
      setEmailOtpError("");
    } finally {
      setEmailOtpLoading(false);
    }
  }

  async function sendOtp() {
    if (!data.phone) return;
    setOtpLoading(true);
    setOtpError("");
    setDevOtp("");
    try {
      const res = await fetch("/api/tutors/phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.phone }),
      });
      const json = await res.json();
      if (!res.ok) { setOtpError(fr ? "Échec de l'envoi du SMS." : "Failed to send SMS."); return; }
      setOtpSent(true);
      prevPhone.current = data.phone;
      if (json.devMode && json.otp) setDevOtp(json.otp);
    } finally {
      setOtpLoading(false);
    }
  }

  async function verifyOtp() {
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await fetch("/api/tutors/phone-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: prevPhone.current || data.phone, otp: otpValue }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msgs: Record<string, string> = {
          invalid_otp: fr ? "Code incorrect." : "Incorrect code.",
          expired: fr ? "Code expiré. Renvoyez un SMS." : "Code expired. Resend SMS.",
        };
        setOtpError(msgs[json.error] ?? (fr ? "Erreur de vérification." : "Verification error."));
        return;
      }
      onPhoneVerified();
      setOtpError("");
    } finally {
      setOtpLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">
        {fr ? "Informations personnelles" : "Personal Information"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {fr ? "Dites-nous qui vous êtes." : "Tell us who you are."}
      </p>

      <div className="space-y-4">
        {/* Google sign-in — shown only to non-logged-in users */}
        {!isLoggedIn && (
          <>
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/tutors/apply" })}
              className="w-full flex items-center justify-center gap-3 border-2 border-[#6B5E44]/20 rounded-xl py-3 text-sm font-bold text-[#2D1A00] hover:bg-[#FFF3B0] hover:border-[#F5C400] transition"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {fr ? "Continuer avec Google" : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#6B5E44]/15" />
              <span className="text-xs text-[#9B8A6B] font-medium">{fr ? "ou remplissez le formulaire" : "or fill in the form"}</span>
              <div className="flex-1 h-px bg-[#6B5E44]/15" />
            </div>
          </>
        )}

        {/* Show account info banner if already logged in */}
        {isLoggedIn && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-green-600 flex-shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
            <div>
              <p className="text-xs font-semibold text-green-800">
                {fr ? "Connecté en tant que" : "Logged in as"} <span className="font-bold">{loggedInEmail}</span>
              </p>
              <p className="text-[11px] text-green-600 mt-0.5">
                {fr ? "Votre compte existant sera utilisé pour cette candidature." : "Your existing account will be used for this application."}
              </p>
            </div>
          </div>
        )}

        {/* Prénom + Nom */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
              {fr ? "Prénom" : "First name"} <span className="text-red-400">*</span>
            </label>
            <input value={data.firstName} onChange={e => { onChange("firstName", e.target.value); onChange("fullName", `${e.target.value} ${data.lastName}`.trim()); }}
              placeholder={fr ? "Votre prénom" : "Your first name"}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
              {fr ? "Nom de famille" : "Last name"} <span className="text-red-400">*</span>
            </label>
            <input value={data.lastName} onChange={e => { onChange("lastName", e.target.value); onChange("fullName", `${data.firstName} ${e.target.value}`.trim()); }}
              placeholder={fr ? "Votre nom" : "Your last name"}
              className={inputCls} />
          </div>
        </div>

        {!isLoggedIn && (
          <>
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
                {fr ? "Adresse e-mail" : "Email address"} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={data.email}
                  onChange={e => {
                    onChange("email", e.target.value);
                    if (e.target.value !== prevEmail.current) {
                      setEmailOtpSent(false);
                      setEmailOtpValue("");
                      setDevEmailOtp("");
                    }
                  }}
                  placeholder="vous@exemple.com"
                  className={inputCls + (emailVerified ? " border-green-400 pr-28" : "")}
                />
                {emailVerified && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-700 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M20 6L9 17l-5-5"/></svg>
                    {fr ? "Vérifié" : "Verified"}
                  </span>
                )}
              </div>

              {/* Email OTP block */}
              {!emailVerified && data.email && (
                <div className={`mt-2 rounded-xl border-2 p-3 transition border-[#6B5E44]/20 bg-[#FAFAF8]`}>
                  <p className="text-xs font-semibold text-[#5C3D00] mb-0.5">
                    {fr ? "Vérification de l'e-mail" : "Email verification"}
                  </p>
                  <p className="text-[11px] text-[#9B8A6B] mb-2">
                    {fr ? "Un code vous sera envoyé pour confirmer votre adresse." : "A code will be sent to confirm your address."}
                  </p>
                  {!emailOtpSent ? (
                    <button
                      type="button"
                      onClick={sendEmailOtp}
                      disabled={emailOtpLoading}
                      className={`w-full py-2 rounded-xl text-sm font-bold transition ${btnPrimary} disabled:opacity-50`}
                    >
                      {emailOtpLoading ? "…" : (fr ? "Envoyer le code" : "Send code")}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={emailOtpValue}
                        onChange={e => setEmailOtpValue(e.target.value.replace(/\D/g, ""))}
                        placeholder={fr ? "Code à 6 chiffres" : "6-digit code"}
                        className={inputCls + " text-center tracking-widest text-lg font-bold"}
                      />
                      {devEmailOtp && (
                        <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-800">
                          <span className="font-bold">[DEV]</span> {fr ? "Code de test :" : "Test code:"} <span className="font-mono font-bold">{devEmailOtp}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={verifyEmailOtp} disabled={emailOtpValue.length !== 6 || emailOtpLoading}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${btnPrimary} disabled:opacity-50`}>
                          {emailOtpLoading ? "…" : (fr ? "Vérifier" : "Verify")}
                        </button>
                        <button type="button" onClick={sendEmailOtp} disabled={emailOtpLoading}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${btnSecondary}`}>
                          {fr ? "Renvoyer" : "Resend"}
                        </button>
                      </div>
                    </div>
                  )}
                  {emailOtpError && <p className="text-xs text-red-500 mt-2">{emailOtpError}</p>}
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
                {fr ? "Mot de passe" : "Password"} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={data.password}
                  onChange={e => onChange("password", e.target.value)}
                  placeholder={fr ? "Créez un mot de passe fort" : "Create a strong password"}
                  className={inputCls + " pr-20"} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5E44] text-xs font-semibold">
                  {showPass ? (fr ? "Masquer" : "Hide") : (fr ? "Afficher" : "Show")}
                </button>
              </div>
              {/* Strength indicators */}
              {data.password && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {[
                    { ok: checks.length,  label: fr ? "8 caractères min." : "8+ characters" },
                    { ok: checks.upper,   label: fr ? "1 majuscule"        : "1 uppercase letter" },
                    { ok: checks.number,  label: fr ? "1 chiffre"          : "1 number" },
                    { ok: checks.special, label: fr ? "1 caractère spécial": "1 special character" },
                  ].map(({ ok, label }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-[11px] font-medium ${ok ? "text-green-600" : "text-[#9B8A6B]"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${ok ? "bg-green-100 text-green-600" : "bg-[#F2EFE9] text-[#9B8A6B]"}`}>
                        {ok ? "✓" : "·"}
                      </span>
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
                {fr ? "Confirmer le mot de passe" : "Confirm password"} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} value={data.confirmPassword}
                  onChange={e => onChange("confirmPassword", e.target.value)}
                  placeholder={fr ? "Répétez le mot de passe" : "Repeat your password"}
                  className={inputCls + " pr-20 " + (data.confirmPassword ? (pwMatch ? "border-green-400" : "border-red-400") : "")} />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5E44] text-xs font-semibold">
                  {showConfirm ? (fr ? "Masquer" : "Hide") : (fr ? "Afficher" : "Show")}
                </button>
              </div>
              {data.confirmPassword && !pwMatch && (
                <p className="text-xs text-red-500 mt-1">
                  {fr ? "Les mots de passe ne correspondent pas." : "Passwords do not match."}
                </p>
              )}
            </div>
          </>
        )}

        {/* Gender */}
        <div>
          <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
            {fr ? "Sexe" : "Gender"} <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-3">
            {[
              { val: "M",               labelFr: "Homme",              labelEn: "Male" },
              { val: "F",               labelFr: "Femme",              labelEn: "Female" },
              { val: "PREFER_NOT_TO_SAY", labelFr: "Préfère ne pas dire", labelEn: "Prefer not to say" },
            ].map(opt => (
              <button
                key={opt.val}
                type="button"
                onClick={() => onChange("gender", opt.val)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition ${
                  data.gender === opt.val ? activeCard : `${inactiveCard} text-[#5C3D00]`
                }`}
              >
                {fr ? opt.labelFr : opt.labelEn}
              </button>
            ))}
          </div>
        </div>

        <CountryCitySelect
          country={data.country}
          city={data.city}
          onCountryChange={handleCountryChange}
          onCityChange={(name) => onChange("city", name)}
          fr={fr}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
              {fr ? "Date de naissance" : "Date of birth"}
            </label>
            <input type="date" value={data.birthday} onChange={e => onChange("birthday", e.target.value)}
              max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
              {fr ? "Téléphone" : "Phone"}
            </label>
            <div className="flex gap-2">
              {dialCode && (
                <span className="flex items-center px-3 py-2.5 border border-[#6B5E44]/30 rounded-xl bg-[#FAF8F0] text-sm font-bold text-[#5C3D00] shrink-0 select-none">
                  {dialCode}
                </span>
              )}
              <input
                value={localPhone}
                onChange={e => handleLocalPhoneChange(e.target.value)}
                placeholder={dialCode ? "XX XXX XXX" : "+216 XX XXX XXX"}
                className={inputCls + (dialCode ? " flex-1" : "")}
                type="tel"
                inputMode="numeric"
              />
            </div>
          </div>
        </div>

        {/* Phone OTP verification — optional */}
        <div className={`rounded-xl border-2 p-4 transition ${phoneVerified ? "border-green-400 bg-green-50" : "border-[#6B5E44]/20 bg-[#FAFAF8]"}`}>
          {phoneVerified ? (
            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M20 6L9 17l-5-5"/></svg>
              {fr ? "Numéro vérifié ✓" : "Phone number verified ✓"}
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-[#5C3D00] mb-0.5">
                {fr ? "Vérification du numéro" : "Phone verification"}
              </p>
              <p className="text-[11px] text-[#9B8A6B] mb-3">
                {fr ? "Optionnel — vous pouvez continuer sans vérifier." : "Optional — you can continue without verifying."}
              </p>
              {!otpSent ? (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={!localPhone || otpLoading}
                  className={`w-full py-2 rounded-xl text-sm font-bold transition ${btnPrimary} disabled:opacity-50`}
                >
                  {otpLoading ? "…" : (fr ? "Envoyer le code SMS" : "Send SMS code")}
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpValue}
                    onChange={e => setOtpValue(e.target.value.replace(/\D/g, ""))}
                    placeholder={fr ? "Code à 6 chiffres" : "6-digit code"}
                    className={inputCls + " text-center tracking-widest text-lg font-bold"}
                  />
                  {devOtp && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-800">
                      <span className="font-bold">[DEV]</span> {fr ? "Code de test :" : "Test code:"} <span className="font-mono font-bold">{devOtp}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={verifyOtp} disabled={otpValue.length !== 6 || otpLoading}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${btnPrimary} disabled:opacity-50`}>
                      {otpLoading ? "…" : (fr ? "Vérifier" : "Verify")}
                    </button>
                    <button type="button" onClick={sendOtp} disabled={otpLoading}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition ${btnSecondary}`}>
                      {fr ? "Renvoyer" : "Resend"}
                    </button>
                  </div>
                </div>
              )}
              {otpError && <p className="text-xs text-red-500 mt-2">{otpError}</p>}
            </>
          )}
        </div>
      </div>

      <button onClick={onNext} disabled={!isValid} className={`w-full py-2.5 mt-6 ${btnPrimary}`}>
        {fr ? "Continuer" : "Continue"}
      </button>
    </div>
  );
}

// ─── Step 2: Teaching Info ────────────────────────────────────────────────────

function StepTeaching({ data, onChange, onNext, onBack }: {
  data: FormData;
  onChange: (k: keyof FormData, v: string[] | number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { lang } = useLanguage();
  const fr = lang === "fr";

  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openLang, setOpenLang] = useState<string | null>(null);

  function toggle(field: "languagesTaught" | "specializations" | "certifications", val: string) {
    const cur = data[field] as string[];
    onChange(field, cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]);
  }

  const langs = ["Arabic", "French", "English"];
  const specs = [
    { val: "CONVERSATIONAL", label: fr ? "Conversationnel" : "Conversational" },
    { val: "PROFESSIONAL",   label: fr ? "Professionnel"   : "Professional" },
    { val: "ACADEMIC",       label: fr ? "Académique"       : "Academic" },
    { val: "EXAM_PREP",      label: fr ? "Prépa examens"    : "Exam Prep" },
  ];

  const certStructure = [
    {
      key: "linguistic",
      label: fr ? "Certifications linguistiques" : "Language certifications",
      children: [
        {
          key: "fr",
          label: "Français",
          items: [
            { val: "DELF_A1", label: "DELF A1" },
            { val: "DELF_A2", label: "DELF A2" },
            { val: "DELF_B1", label: "DELF B1" },
            { val: "DELF_B2", label: "DELF B2" },
            { val: "DALF_C1", label: "DALF C1" },
            { val: "DALF_C2", label: "DALF C2" },
            { val: "TCF",     label: "TCF" },
            { val: "TEF",     label: "TEF" },
          ],
        },
        {
          key: "en",
          label: "Anglais",
          items: [
            { val: "TOEFL",          label: "TOEFL" },
            { val: "IELTS",          label: "IELTS" },
            { val: "CAMBRIDGE_FCE",  label: "Cambridge FCE" },
            { val: "CAMBRIDGE_CAE",  label: "Cambridge CAE" },
            { val: "CAMBRIDGE_CPE",  label: "Cambridge CPE" },
          ],
        },
      ],
    },
    {
      key: "teaching",
      label: fr ? "Certifications en enseignement" : "Teaching certifications",
      items: [
        { val: "CELTA", label: "CELTA" },
        { val: "TESOL", label: "TESOL" },
        { val: "TEFL",  label: "TEFL" },
        { val: "DELTA", label: "DELTA" },
      ],
    },
    {
      key: "academic",
      label: fr ? "Diplômes académiques" : "Academic degrees",
      items: [
        { val: "DIPLOME_UNIV", label: fr ? "Diplôme universitaire"        : "University diploma" },
        { val: "LICENCE",      label: fr ? "Premier cycle universitaire"  : "Bachelor's degree" },
        { val: "MASTER",       label: fr ? "Deuxième cycle universitaire" : "Master's degree" },
        { val: "DOCTORAT",     label: fr ? "Doctorat (PhD)"               : "Doctorate (PhD)" },
        { val: "AUTRES",       label: fr ? "Autres diplômes équivalents"  : "Other equivalent degrees" },
      ],
    },
  ];

  const ENGLISH_LEVELS = [
    { val: "BEGINNER",     labelFr: "Débutant",                labelEn: "Beginner" },
    { val: "INTERMEDIATE", labelFr: "Intermédiaire",           labelEn: "Intermediate" },
    { val: "ADVANCED",     labelFr: "Avancé",                  labelEn: "Advanced" },
    { val: "VERY_ADVANCED",labelFr: "Très avancé",             labelEn: "Very advanced" },
    { val: "PROFESSIONAL", labelFr: "Maîtrise professionnelle",labelEn: "Professional proficiency" },
  ];

  const englishOk = data.englishLevel !== "" && data.englishLevel !== "BEGINNER";
  const isValid = data.languagesTaught.length > 0 && data.specializations.length > 0 && data.certifications.length > 0 && englishOk;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">
        {fr ? "Votre profil d'enseignant" : "Your Teaching Profile"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {fr ? "Dites-nous ce que vous enseignez." : "Tell us what you teach."}
      </p>

      {/* Languages */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Langues enseignées" : "Languages you teach"}
        </label>
        <div className="flex gap-3">
          {langs.map(l => (
            <button key={l} type="button" onClick={() => toggle("languagesTaught", l)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition ${
                data.languagesTaught.includes(l) ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}>
              {l === "French" ? "Français" : l === "Arabic" ? "عربي" : "English"}
            </button>
          ))}
        </div>
      </div>

      {/* Specializations */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Spécialisations" : "Specializations"}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {specs.map(s => (
            <button key={s.val} type="button" onClick={() => toggle("specializations", s.val)}
              className={`py-2.5 px-3 rounded-xl border-2 text-sm font-bold transition ${
                data.specializations.includes(s.val) ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Années d'expérience" : "Years of experience"}
        </label>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 5, 7, 10].map(n => (
            <button key={n} type="button" onClick={() => onChange("yearsExperience", n)}
              className={`px-3 py-1.5 rounded-full border-2 text-sm font-bold transition ${
                data.yearsExperience === n ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}>
              {n === 10 ? "10+" : n === 0 ? (fr ? "Moins d'1 an" : "<1 yr") : `${n}`}
            </button>
          ))}
        </div>
      </div>

      {/* English level */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Niveau en anglais" : "English level"} <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-col gap-2">
          {ENGLISH_LEVELS.map(lvl => (
            <button
              key={lvl.val}
              type="button"
              onClick={() => onChange("englishLevel" as keyof FormData, lvl.val as unknown as string[])}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition ${
                data.englishLevel === lvl.val ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}
            >
              <span>{fr ? lvl.labelFr : lvl.labelEn}</span>
              {data.englishLevel === lvl.val && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#5C3D00]">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              )}
            </button>
          ))}
        </div>
        {data.englishLevel === "BEGINNER" && (
          <p className="text-xs text-red-500 mt-2">
            {fr
              ? "Un niveau minimum Intermédiaire en anglais est requis pour enseigner sur notre plateforme."
              : "A minimum Intermediate English level is required to teach on our platform."}
          </p>
        )}
        {data.englishLevel === "" && (
          <p className="text-xs text-[#9B8A6B] mt-2">
            {fr ? "Sélectionnez votre niveau en anglais pour continuer." : "Select your English level to continue."}
          </p>
        )}
      </div>

      {/* Certifications */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Certifications" : "Certifications"}
          {data.certifications.length > 0 && (
            <span className="ml-2 text-xs bg-[#F5C400] text-[#5C3D00] px-2 py-0.5 rounded-full font-bold">
              {data.certifications.length}
            </span>
          )}
        </label>

        <div className="border-2 border-[#E8DFC8] rounded-2xl overflow-hidden divide-y divide-[#E8DFC8]">
          {certStructure.map((section) => (
            <div key={section.key}>
              {/* Section header */}
              <button
                type="button"
                onClick={() => setOpenSection(openSection === section.key ? null : section.key)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#FFFBEA] transition"
              >
                <span className="text-sm font-bold text-[#5C3D00]">{section.label}</span>
                <svg
                  viewBox="0 0 20 20" fill="currentColor"
                  className={`w-4 h-4 text-[#9B8A6B] transition-transform ${openSection === section.key ? "rotate-180" : ""}`}
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Section body */}
              {openSection === section.key && (
                <div className="px-4 pb-4 pt-2 bg-[#FFFDF5]">

                  {/* Linguistic: sub-languages */}
                  {"children" in section ? (
                    <div className="space-y-3">
                      {section.children!.map((lang) => (
                        <div key={lang.key}>
                          <button
                            type="button"
                            onClick={() => setOpenLang(openLang === lang.key ? null : lang.key)}
                            className="flex items-center gap-2 text-xs font-bold text-[#6B5E44] uppercase tracking-widest mb-2 hover:text-[#5C3D00] transition"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor"
                              className={`w-3 h-3 transition-transform ${openLang === lang.key ? "rotate-90" : ""}`}>
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            {lang.label}
                          </button>
                          {openLang === lang.key && (
                            <div className="flex flex-wrap gap-2 pl-4">
                              {lang.items.map((item) => (
                                <button key={item.val} type="button"
                                  onClick={() => toggle("certifications", item.val)}
                                  className={`px-3 py-1.5 rounded-full border-2 text-xs font-bold transition ${
                                    data.certifications.includes(item.val) ? activeCard : `${inactiveCard} text-[#5C3D00]`
                                  }`}>
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {section.items!.map((item) => (
                        <button key={item.val} type="button"
                          onClick={() => toggle("certifications", item.val)}
                          className={`px-3 py-1.5 rounded-full border-2 text-xs font-bold transition ${
                            data.certifications.includes(item.val) ? activeCard : `${inactiveCard} text-[#5C3D00]`
                          }`}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>
          ))}
        </div>

        {data.certifications.length === 0 && (
          <p className="text-xs text-[#9B8A6B] mt-2">
            {fr ? "Sélectionnez au moins une certification pour continuer." : "Select at least one certification to continue."}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>
          {fr ? "Retour" : "Back"}
        </button>
        <button onClick={onNext} disabled={!isValid} className={`flex-1 py-2.5 ${btnPrimary}`}>
          {fr ? "Continuer" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: About You ────────────────────────────────────────────────────────

function FileUploadZone({ label, required, hint, accept, value, savedFileName, onChange, fr }: {
  label: string; required?: boolean; hint: string; accept: string;
  value: string; savedFileName?: string; onChange: (name: string, dataUrl: string) => void; fr: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(savedFileName ?? "");
  const [error, setError] = useState("");

  function handleFile(file: File) {
    const allowed = accept.split(",").map(a => a.trim());
    const ok = allowed.some(a => file.name.toLowerCase().endsWith(a.replace(".", "").replace("*", "")));
    if (file.size > 10 * 1024 * 1024) { setError(fr ? "Fichier trop lourd (max 10 Mo)" : "File too large (max 10 MB)"); return; }
    if (!file.name.match(/\.(pdf|doc|docx)$/i)) { setError(fr ? "Format non accepté. PDF ou Word uniquement." : "Invalid format. PDF or Word only."); return; }
    setError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => onChange(file.name, reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className={`border-2 border-dashed rounded-2xl px-5 py-6 text-center cursor-pointer transition ${
          dragging ? "border-[#F5C400] bg-[#FFF3B0]" :
          value ? "border-green-400 bg-green-50" : "border-[#6B5E44]/25 hover:border-[#F5C400]/60 hover:bg-[#FFFBEA]"
        }`}
      >
        {value ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" className="w-5 h-5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 18 15 15"/><line x1="12" y1="10" x2="12" y2="18"/></svg>
            </div>
            <p className="text-sm font-semibold text-green-700">{fileName || savedFileName || (fr ? "Fichier chargé" : "File loaded")}</p>
            <p className="text-xs text-green-600">{fr ? "Fichier ajouté ✓ — cliquez pour changer" : "File added ✓ — click to change"}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#F2EFE9] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#6B5E44" strokeWidth="2" className="w-5 h-5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <p className="text-sm font-semibold text-[#5C3D00]">
              {fr ? "Glisser-déposer ou cliquer pour choisir" : "Drag & drop or click to choose"}
            </p>
            <p className="text-xs text-[#9B8A6B]">{hint}</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </div>
  );
}

function StepAbout({ data, onChange, onCertFilesChange, onNext, onBack }: {
  data: FormData;
  onChange: (k: keyof FormData, v: string) => void;
  onCertFilesChange: (files: CertFile[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const isValid = data.bio.length >= 100 && data.cvUrl.trim().length > 0 && data.motivationLetterUrl.trim().length > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">
        {fr ? "Parlez-nous de vous" : "About You"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-5">
        {fr
          ? "Cette biographie sera lue par notre équipe RH, puis publiée sur votre profil public. Soyez vous-même — pas un CV."
          : "This bio will be reviewed by our HR team, then published on your public profile. Be yourself — not a résumé."}
      </p>

      {/* Bio writing tips */}
      <div className="bg-[#FFF8E1] border border-[#F5C400]/40 rounded-xl p-4 mb-4 space-y-1.5">
        <p className="text-xs font-bold text-[#5C3D00] uppercase tracking-wide mb-2">
          {fr ? "✦ Comment écrire une bio qui attire des étudiants" : "✦ How to write a bio that attracts students"}
        </p>
        {(fr ? [
          "Parlez de votre passion pour la langue, pas de vos diplômes.",
          "Décrivez votre style : êtes-vous structuré, ludique, orienté conversation ?",
          "Citez un ou deux résultats concrets que vous avez aidé à atteindre.",
          "Soyez chaleureux — l'étudiant doit avoir envie de vous rencontrer.",
          "Évitez le jargon académique. Écrivez comme si vous parliez à un ami.",
        ] : [
          "Talk about your passion for the language, not your degrees.",
          "Describe your style: are you structured, playful, conversation-focused?",
          "Mention one or two concrete outcomes you've helped students achieve.",
          "Be warm — the student should want to meet you after reading this.",
          "Avoid academic jargon. Write like you're talking to a friend.",
        ]).map((tip, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-[#6B5E44]">
            <span className="text-[#F5C400] font-bold mt-0.5 flex-shrink-0">→</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>

      {/* Bio */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
          {fr ? "Biographie" : "Bio"}{" "}
          <span className="font-normal text-[#6B5E44]">({fr ? "min. 100 caractères" : "min. 100 chars"})</span>
          <span className="text-red-400"> *</span>
        </label>
        <textarea
          value={data.bio}
          onChange={e => onChange("bio", e.target.value)}
          rows={6}
          placeholder={fr
            ? "Bonjour ! Je m'appelle [Prénom] et j'adore faire tomber les barrières linguistiques.\n\nMa méthode ? On parle. Beaucoup. Et on s'amuse aussi ! Je m'adapte à votre rythme et à vos objectifs — que vous vouliez briller en réunion professionnelle, réussir le TCF, ou simplement commander un café à Paris sans rougir.\n\nAvec moi, vous progresserez vite parce qu'on vise directement ce dont vous avez besoin."
            : "Hi! I'm [Name] and I love breaking down language barriers.\n\nMy approach? We talk. A lot. And we have fun doing it! I adapt to your pace and your goals — whether you want to shine in business meetings, pass the IELTS, or simply feel confident ordering a coffee in London.\n\nWith me, you'll progress fast because we go straight to what you actually need."}
          className={inputCls + " resize-none"}
        />
        <p className={`text-xs mt-1 ${data.bio.length < 100 ? "text-[#9B8A6B]" : "text-green-600"}`}>
          {data.bio.length} / 100 {fr ? "caractères minimum" : "characters minimum"}
        </p>
      </div>

      {/* CV Upload */}
      <div className="mb-5">
        <FileUploadZone
          label={fr ? "CV / Curriculum Vitae" : "CV / Resume"}
          required
          hint={fr ? "PDF ou Word · max 10 Mo" : "PDF or Word · max 10 MB"}
          accept=".pdf,.doc,.docx"
          value={data.cvUrl}
          savedFileName={data.cvFileName}
          onChange={(name, dataUrl) => { onChange("cvUrl", dataUrl); onChange("cvFileName", name); }}
          fr={fr}
        />
      </div>

      {/* Lettre de motivation Upload */}
      <div className="mb-5">
        <FileUploadZone
          label={fr ? "Lettre de motivation" : "Cover letter"}
          required
          hint={fr ? "PDF ou Word · max 10 Mo" : "PDF or Word · max 10 MB"}
          accept=".pdf,.doc,.docx"
          value={data.motivationLetterUrl}
          savedFileName={data.motivationLetterFileName}
          onChange={(name, dataUrl) => { onChange("motivationLetterUrl", dataUrl); onChange("motivationLetterFileName", name); }}
          fr={fr}
        />
      </div>

      {/* Documents justificatifs — multiple PDFs */}
      <div className="mb-6">
        <CertificateUploadList
          files={data.certificateFiles}
          onChange={onCertFilesChange}
          fr={fr}
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>
          {fr ? "Retour" : "Back"}
        </button>
        <button onClick={onNext} disabled={!isValid} className={`flex-1 py-2.5 ${btnPrimary}`}>
          {fr ? "Continuer" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── Multi-document upload ────────────────────────────────────────────────────

interface CertFile { type: string; name: string; dataUrl: string; }

function CertificateUploadList({ files, onChange, fr }: {
  files: CertFile[];
  onChange: (files: CertFile[]) => void;
  fr: boolean;
}) {
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const DOC_TYPES = fr
    ? ["Diplôme", "Attestation de travail", "Certification", "Relevé de notes", "Attestation", "Autre"]
    : ["Diploma", "Work attestation", "Certification", "Transcript", "Attestation", "Other"];

  function addEntry() {
    onChange([...files, { type: DOC_TYPES[0], name: "", dataUrl: "" }]);
  }

  function removeEntry(i: number) {
    onChange(files.filter((_, idx) => idx !== i));
    setErrors(prev => { const e = { ...prev }; delete e[i]; return e; });
  }

  function setType(i: number, type: string) {
    const updated = [...files];
    updated[i] = { ...updated[i], type };
    onChange(updated);
  }

  function handleFile(i: number, file: File) {
    if (!file.name.match(/\.pdf$/i)) {
      setErrors(prev => ({ ...prev, [i]: fr ? "PDF uniquement." : "PDF only." }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [i]: fr ? "Fichier trop lourd (max 10 Mo)." : "File too large (max 10 MB)." }));
      return;
    }
    setErrors(prev => { const e = { ...prev }; delete e[i]; return e; });
    const reader = new FileReader();
    reader.onload = () => {
      const updated = [...files];
      updated[i] = { ...updated[i], name: file.name, dataUrl: reader.result as string };
      onChange(updated);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-[#5C3D00]">
          {fr ? "Documents justificatifs" : "Supporting documents"}
          <span className="ml-1.5 text-xs text-[#9B8A6B] font-normal">
            ({fr ? "PDF uniquement · optionnel" : "PDF only · optional"})
          </span>
        </label>
        {files.length < 8 && (
          <button
            type="button"
            onClick={addEntry}
            className="flex items-center gap-1.5 text-xs font-bold text-[#5C3D00] bg-[#FFF3B0] border border-[#F5C400]/50 px-3 py-1.5 rounded-full hover:bg-[#FFDE59]/40 transition"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            {fr ? "Ajouter un document" : "Add document"}
          </button>
        )}
      </div>

      {files.length === 0 && (
        <button
          type="button"
          onClick={addEntry}
          className="w-full border-2 border-dashed border-[#6B5E44]/20 rounded-2xl py-6 flex flex-col items-center gap-2 hover:border-[#F5C400]/60 hover:bg-[#FFFBEA] transition cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F2EFE9] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#6B5E44" strokeWidth="2" className="w-5 h-5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#5C3D00]">
            {fr ? "Ajouter un diplôme ou une certification" : "Add a diploma or certification"}
          </p>
          <p className="text-xs text-[#9B8A6B]">
            {fr ? "Vous pouvez en ajouter plusieurs (PDF uniquement)" : "You can add multiple (PDF only)"}
          </p>
        </button>
      )}

      <div className="space-y-3">
        {files.map((f, i) => (
          <div key={i} className={`rounded-2xl border-2 p-4 transition ${f.dataUrl ? "border-green-400 bg-green-50" : "border-[#E8DFC8] bg-white"}`}>
            <div className="flex items-center gap-2 mb-3">
              {/* Type selector */}
              <select
                value={f.type}
                onChange={e => setType(i, e.target.value)}
                className="flex-1 border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] transition font-semibold"
              >
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {/* Remove */}
              <button
                type="button"
                onClick={() => removeEntry(i)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#9B8A6B] hover:bg-red-50 hover:text-red-500 transition flex-shrink-0"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>

            {/* Upload zone */}
            <div
              onClick={() => fileRefs.current[i]?.click()}
              className={`border-2 border-dashed rounded-xl px-4 py-4 text-center cursor-pointer transition ${
                f.dataUrl
                  ? "border-green-400 bg-green-50/50"
                  : "border-[#6B5E44]/20 hover:border-[#F5C400]/60 hover:bg-[#FFFBEA]"
              }`}
            >
              {f.dataUrl ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-red-600">PDF</span>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-bold text-green-700 truncate">{f.name}</p>
                    <p className="text-xs text-green-600">{fr ? "✓ Chargé — cliquez pour changer" : "✓ Loaded — click to change"}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#6B5E44" strokeWidth="2" className="w-5 h-5 flex-shrink-0">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="text-sm text-[#6B5E44]">
                    {fr ? "Cliquer pour choisir un PDF" : "Click to choose a PDF"}
                  </p>
                </div>
              )}
            </div>

            {errors[i] && <p className="text-xs text-red-500 mt-1">{errors[i]}</p>}

            <input
              ref={el => { fileRefs.current[i] = el; }}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => { const file = e.target.files?.[0]; if (file) handleFile(i, file); e.target.value = ""; }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Availability ─────────────────────────────────────────────────────

// Convert a Tunisia time hour (UTC+1) to the user's local timezone hour
function tunisToLocal(tunisHour: number): number {
  const userOffsetHours = -new Date().getTimezoneOffset() / 60; // e.g. -5 for EST
  const tunisOffset = 1; // Africa/Tunis = UTC+1 year-round
  return ((tunisHour + userOffsetHours - tunisOffset) % 24 + 24) % 24;
}

function fmtH(h: number): string {
  return `${String(h).padStart(2, "0")}h`;
}

function StepAvailability({ data, onChange, onNext, onBack }: {
  data: FormData;
  onChange: (k: keyof FormData, v: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const [detectedTz, setDetectedTz] = useState("");

  // Auto-detect timezone on mount
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setDetectedTz(tz);
  }, []);

  const userOffsetHours = -new Date().getTimezoneOffset() / 60;
  const isTunisTz = Math.abs(userOffsetHours - 1) < 0.1;

  const dayLabels: Record<string, string> = fr
    ? { MON: "Lun", TUE: "Mar", WED: "Mer", THU: "Jeu", FRI: "Ven", SAT: "Sam", SUN: "Dim" }
    : { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };

  // Tunisia reference times; converted to local for display
  const TUNIS_WINDOWS = [
    { val: "MORNING",   labelFr: "Matin",       labelEn: "Morning",   startT: 6,  endT: 12 },
    { val: "AFTERNOON", labelFr: "Après-midi",  labelEn: "Afternoon", startT: 12, endT: 18 },
    { val: "EVENING",   labelFr: "Soir",        labelEn: "Evening",   startT: 18, endT: 23 },
  ];

  const windows = TUNIS_WINDOWS.map(w => ({
    val: w.val,
    label: fr ? w.labelFr : w.labelEn,
    localTime: `${fmtH(tunisToLocal(w.startT))}–${fmtH(tunisToLocal(w.endT))}`,
    tunisTime: `${fmtH(w.startT)}–${fmtH(w.endT)}`,
  }));

  function toggleDay(d: string) {
    const cur = data.availabilityDays;
    onChange("availabilityDays", cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]);
  }

  function toggleWindow(w: string) {
    const cur = data.timeWindowPreference;
    onChange("timeWindowPreference", cur.includes(w) ? cur.filter(x => x !== w) : [...cur, w]);
  }

  const isValid = data.availabilityDays.length > 0 && data.timeWindowPreference.length > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">
        {fr ? "Vos disponibilités" : "Your Availability"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-4">
        {fr
          ? "Indiquez quand vous êtes disponible pour donner des cours."
          : "Let us know when you're available to teach."}
      </p>

      {/* Timezone banner */}
      {detectedTz && (
        <div className="flex items-center gap-2 bg-[#F0F7FF] border border-blue-200 rounded-xl px-4 py-2.5 mb-5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
          </svg>
          <p className="text-xs text-blue-700 font-semibold">
            {fr ? "Fuseau détecté :" : "Detected timezone:"}{" "}
            <span className="font-bold">{detectedTz}</span>
            {" · "}
            {fr ? "Les horaires sont affichés dans votre heure locale." : "Times shown in your local time."}
          </p>
        </div>
      )}

      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Jours disponibles" : "Available days"}
        </label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map(d => (
            <button key={d} type="button" onClick={() => toggleDay(d)}
              className={`px-3 py-1.5 rounded-full border-2 text-sm font-bold transition ${
                data.availabilityDays.includes(d) ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}>
              {dayLabels[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
          {fr ? "Créneaux horaires" : "Time windows"}
        </label>
        {!isTunisTz && (
          <p className="text-[11px] text-[#9B8A6B] mb-2">
            {fr
              ? `Heure locale · Entre parenthèses : heure de Tunis (UTC+1)`
              : `Local time · In parentheses: Tunisia time (UTC+1)`}
          </p>
        )}
        <div className="flex gap-3">
          {windows.map(w => (
            <button key={w.val} type="button" onClick={() => toggleWindow(w.val)}
              className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 text-sm transition ${
                data.timeWindowPreference.includes(w.val) ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}>
              <span className="font-bold">{w.label}</span>
              <span className="text-xs mt-0.5 text-[#6B5E44] font-semibold">{w.localTime}</span>
              {!isTunisTz && (
                <span className="text-[10px] mt-0.5 text-[#9B8A6B]">({w.tunisTime} Tunis)</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>
          {fr ? "Retour" : "Back"}
        </button>
        <button onClick={onNext} disabled={!isValid} className={`flex-1 py-2.5 ${btnPrimary}`}>
          {fr ? "Continuer" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Review & Submit ───────────────────────────────────────────────────

function StepReview({ data, onSubmit, onBack, submitting, error }: {
  data: FormData;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string;
}) {
  const { lang } = useLanguage();
  const fr = lang === "fr";

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-2 border-b border-[#6B5E44]/10 text-sm">
      <span className="text-[#6B5E44]">{label}</span>
      <span className="text-[#5C3D00] font-semibold text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">
        {fr ? "Vérifiez votre candidature" : "Review your application"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {fr ? "Tout est correct ? Soumettez votre dossier." : "Everything looks good? Submit your application."}
      </p>

      <div className="bg-[#FFFDF4] border border-[#F5C400]/30 rounded-xl p-4 mb-5">
        <Row label={fr ? "Prénom" : "First name"} value={data.firstName} />
        <Row label={fr ? "Nom de famille" : "Last name"} value={data.lastName} />
        <Row label="E-mail" value={data.email} />
        <Row label={fr ? "Date de naissance" : "Date of birth"} value={data.birthday} />
        <Row label={fr ? "Sexe" : "Gender"} value={
          data.gender === "M" ? (fr ? "Homme" : "Male") :
          data.gender === "F" ? (fr ? "Femme" : "Female") :
          data.gender === "PREFER_NOT_TO_SAY" ? (fr ? "Préfère ne pas dire" : "Prefer not to say") : "—"
        } />
        <Row label={fr ? "Pays" : "Country"} value={data.country} />
        <Row label={fr ? "Ville" : "City"} value={data.city} />
        <Row label={fr ? "Téléphone" : "Phone"} value={data.phone} />
        <Row label={fr ? "Langues enseignées" : "Languages"} value={data.languagesTaught.join(", ")} />
        <Row label={fr ? "Spécialisations" : "Specializations"} value={data.specializations.join(", ")} />
        <Row label={fr ? "Expérience" : "Experience"} value={`${data.yearsExperience} ${fr ? "ans" : "yrs"}`} />
        <Row label={fr ? "Certifications" : "Certifications"} value={data.certifications.join(", ")} />
        <Row label="CV" value={data.cvFileName ? `📎 ${data.cvFileName}` : (data.cvUrl ? (fr ? "✓ Fichier chargé" : "✓ File loaded") : "—")} />
        <Row label={fr ? "Lettre de motivation" : "Cover letter"} value={data.motivationLetterFileName ? `📎 ${data.motivationLetterFileName}` : (data.motivationLetterUrl ? (fr ? "✓ Fichier chargé" : "✓ File loaded") : "—")} />
        {data.certificateFiles.filter(f => f.dataUrl).length > 0 && (
          <Row
            label={fr ? "Documents" : "Documents"}
            value={data.certificateFiles.filter(f => f.dataUrl).map(f => `📎 ${f.type} — ${f.name}`).join(" · ")}
          />
        )}
        <Row label={fr ? "Jours dispo." : "Avail. days"} value={data.availabilityDays.join(", ")} />
        <Row label={fr ? "Créneaux" : "Windows"} value={data.timeWindowPreference.join(", ")} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} disabled={submitting} className={`flex-1 py-2.5 ${btnSecondary}`}>
          {fr ? "Retour" : "Back"}
        </button>
        <button onClick={onSubmit} disabled={submitting} className={`flex-1 py-2.5 ${btnPrimary}`}>
          {submitting
            ? (fr ? "Envoi en cours…" : "Submitting…")
            : (fr ? "Soumettre ma candidature" : "Submit application")}
        </button>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen() {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const router = useRouter();

  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 text-green-600">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">
        {fr ? "Candidature envoyée !" : "Application submitted!"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-2 leading-relaxed">
        {fr
          ? "Notre équipe RH examinera votre dossier et vous contactera dans 3 à 5 jours ouvrables."
          : "Our HR team will review your application and contact you within 3–5 business days."}
      </p>
      <p className="text-xs text-[#9B8A6B] mb-6">
        {fr ? "Vous pouvez suivre l'avancement de votre candidature depuis votre espace tuteur." : "You can track your application status from your tutor dashboard."}
      </p>
      <button onClick={() => router.push("/dashboard/tutor")} className={`px-8 py-2.5 ${btnPrimary}`}>
        {fr ? "Voir mon espace tuteur →" : "Go to my dashboard →"}
      </button>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function TutorApplyWizard() {
  const { lang, setLang } = useLanguage();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user?.email;
  const loggedInEmail = session?.user?.email ?? "";

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const [data, setData] = useState<FormData>({
    firstName: "", lastName: "", fullName: "", email: "", password: "", confirmPassword: "", phone: "", birthday: "", gender: "", country: "", city: "",
    languagesTaught: ["Arabic"], specializations: [], yearsExperience: 0, certifications: [], englishLevel: "",
    bio: "", cvUrl: "", cvFileName: "", motivationLetterUrl: "", motivationLetterFileName: "", certificateFiles: [],
    availabilityDays: [], timeWindowPreference: [],
  });

  // When logged in (e.g. after Google OAuth), pre-fill name + email from DB
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch("/api/auth/me")
      .then(r => r.json())
      .then((profile: { firstName?: string; lastName?: string; email?: string }) => {
        setData(prev => ({
          ...prev,
          email:    prev.email    || profile.email    || loggedInEmail,
          firstName: prev.firstName || profile.firstName || "",
          lastName:  prev.lastName  || profile.lastName  || "",
          fullName: prev.fullName  ||
            [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "",
        }));
        // Email is from authenticated session → mark as verified
        setEmailVerified(true);
      })
      .catch(() => {});
  }, [isLoggedIn, loggedInEmail]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function update(key: keyof FormData, value: any) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep(s => Math.max(s - 1, 1));

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tutors/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          fullName: data.fullName || `${data.firstName} ${data.lastName}`.trim(),
          useExistingAccount: isLoggedIn,
          certificateUrls: data.certificateFiles.map(f => f.dataUrl).filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "reapply_blocked") {
          const date = new Date(json.reapplyAfter).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" });
          setError(lang === "fr" ? `Votre candidature a été rejetée. Vous pourrez postuler à nouveau le ${date}.` : `Your application was rejected. You may reapply on ${date}.`);
        } else if (json.error === "email_taken") {
          setError(lang === "fr" ? "Cette adresse e-mail est déjà utilisée." : "This email is already in use.");
        } else if (json.error === "already_applied") {
          setError(lang === "fr" ? "Une candidature existe déjà pour ce compte." : "An application already exists for this account.");
        } else if (json.error === "validation" && json.issues) {
          const first = json.issues[0];
          setError(`Erreur de validation : ${first?.path?.join(".") ?? ""} — ${first?.message ?? "données invalides"}`);
        } else {
          setError(`[${json.error ?? res.status}] ${json.detail ?? (lang === "fr" ? "Erreur inattendue." : "Unexpected error.")}`);
        }
      } else {
        setSubmitted(true);
      }
    } catch {
      setError(lang === "fr" ? "Erreur réseau. Veuillez réessayer." : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const fr = lang === "fr";

  const PERKS = fr
    ? [
        { icon: "💰", title: "Revenus flexibles", desc: "Fixez vos propres horaires et enseignez à votre rythme." },
        { icon: "🌍", title: "Apprenants motivés", desc: "Des étudiants sérieux qui veulent vraiment progresser." },
        { icon: "📅", title: "100% à distance", desc: "Enseignez depuis n'importe où dans le monde, sans contraintes." },
        { icon: "🎓", title: "Accompagnement RH", desc: "Une équipe dédiée vous accompagne à chaque étape." },
      ]
    : [
        { icon: "💰", title: "Flexible income", desc: "Set your own hours and teach at your own pace." },
        { icon: "🌍", title: "Motivated learners", desc: "Serious students who genuinely want to improve." },
        { icon: "📅", title: "100% remote", desc: "Teach from anywhere in the world, no constraints." },
        { icon: "🎓", title: "HR support", desc: "A dedicated team guides you through every step." },
      ];

  return (
    <div className="min-h-screen flex">

      {/* Left panel — brand / value prop */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #2D1A00 0%, #1A0E00 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #F5C400, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #F5C400, transparent)", transform: "translate(-30%, 30%)" }} />

        {/* Logo */}
        <div>
          <Link href="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 bg-[#F5C400] rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M5 6l4.5 8 2.5-4.5L14.5 14 19 6" stroke="#5C3D00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-white text-base tracking-tight">WithYou</span>
          </Link>

          <div className="mb-10">
            <span className="inline-block text-xs font-bold text-[#F5C400] bg-[#F5C400]/10 border border-[#F5C400]/20 px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
              {fr ? "Devenez tuteur" : "Become a tutor"}
            </span>
            <h1 className="text-3xl font-bold text-white leading-tight mb-3">
              {fr ? (
                <>Enseignez.<br /><span className="text-[#F5C400]">Impactez.</span><br />Gagnez.</>
              ) : (
                <>Teach.<br /><span className="text-[#F5C400]">Impact.</span><br />Earn.</>
              )}
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              {fr
                ? "Rejoignez WithYou et aidez les apprenants à atteindre leurs objectifs d'apprentissage."
                : "Join WithYou and help learners achieve their language goals."}
            </p>
          </div>

          <div className="space-y-4">
            {PERKS.map(p => (
              <div key={p.icon} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#F5C400]/10 border border-[#F5C400]/20 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                  {p.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">{p.title}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-8">
          <p className="text-xs text-white/50 leading-relaxed">
            {fr
              ? "WithYou accueille des tuteurs du monde entier. Peu importe votre pays, si vous maîtrisez l'enseignement d'une langue, nous voulons vous rencontrer."
              : "WithYou welcomes tutors from around the world. Wherever you are, if you're fluent in French or English, we want to meet you."}
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-6">
          <p className="text-xs font-bold text-[#F5C400]/70 uppercase tracking-widest mb-3">
            {fr ? "Questions fréquentes" : "FAQ"}
          </p>
          <div className="space-y-2">
            {(fr ? [
              { q: "Comment suis-je payé ?", a: "Par virement bancaire (RIB) ou D17 en dinars tunisiens, mensuellement." },
              { q: "Quels horaires ?", a: "Vous choisissez vos disponibilités. Les créneaux les plus demandés sont les soirs et week-ends." },
              { q: "Faut-il un diplôme ?", a: "Une certification linguistique (DELF, IELTS, CELTA…) ou un niveau très avancé est requis." },
              { q: "Combien de temps dure le recrutement ?", a: "En moyenne 2 à 3 semaines selon vos disponibilités." },
              { q: "Une question ?", a: "Ecrivez-nous : recrutement@withyou.com" },
            ] : [
              { q: "How am I paid?", a: "By bank transfer or D17 in Tunisian dinars, monthly." },
              { q: "What hours do I work?", a: "You choose your availability. Evenings and weekends are the most in demand." },
              { q: "Is a degree required?", a: "A language certification (DELF, IELTS, CELTA…) or near-native level is required." },
              { q: "How long does recruitment take?", a: "Around 2–3 weeks depending on your availability." },
              { q: "Questions?", a: "Email us: recrutement@withyou.com" },
            ]).map((item, i) => (
              <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
                <details className="group">
                  <summary className="px-3 py-2.5 text-xs font-semibold text-white/80 cursor-pointer list-none flex items-center justify-between hover:bg-white/5 transition">
                    {item.q}
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white/40 flex-shrink-0 group-open:rotate-180 transition-transform">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </summary>
                  <p className="px-3 pb-3 text-xs text-white/50 leading-relaxed">{item.a}</p>
                </details>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — wizard */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#FAF8F0]">
        {/* Top bar */}
        <div className="h-16 px-8 flex items-center justify-between border-b border-[#E8E0D4] bg-white">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 bg-[#F5C400] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M5 6l4.5 8 2.5-4.5L14.5 14 19 6" stroke="#5C3D00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-[#2D1A00] text-sm">WithYou</span>
          </Link>
          <p className="hidden lg:block text-sm font-semibold text-[#6B5E44]">
            {fr ? "Candidature tuteur" : "Tutor application"}
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="text-xs font-bold text-[#6B5E44] border border-[#6B5E44]/20 px-2.5 py-1 rounded-full hover:bg-[#FFF3B0] hover:border-[#F5C400] transition">
              {lang === "fr" ? "EN" : "FR"}
            </button>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-start justify-center px-6 py-10 overflow-auto">
          <div className="w-full max-w-lg">
            {submitted ? (
              <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D4] p-8">
                <SuccessScreen />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D4] p-8">
                <ProgressBar step={step} />
                {step === 1 && <StepPersonal data={data} onChange={(k, v) => update(k, v as string)} onNext={next} phoneVerified={phoneVerified} onPhoneVerified={() => setPhoneVerified(true)} emailVerified={emailVerified} onEmailVerified={() => setEmailVerified(true)} isLoggedIn={isLoggedIn} loggedInEmail={loggedInEmail} />}
                {step === 2 && <StepTeaching data={data} onChange={(k, v) => update(k, v as string[] | number)} onNext={next} onBack={back} />}
                {step === 3 && <StepAbout data={data} onChange={(k, v) => update(k, v)} onCertFilesChange={(files) => update("certificateFiles", files)} onNext={next} onBack={back} />}
                {step === 4 && <StepAvailability data={data} onChange={(k, v) => update(k, v as string[])} onNext={next} onBack={back} />}
                {step === 5 && <StepReview data={data} onSubmit={handleSubmit} onBack={back} submitting={submitting} error={error} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
