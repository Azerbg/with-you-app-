"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

export default function Setup2FAPage() {
  const { update } = useSession();
  const router = useRouter();

  const [qrUrl, setQrUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"loading" | "scan" | "done">("loading");

  useEffect(() => {
    async function initSetup() {
      const res = await fetch("/api/auth/totp/setup", { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setSecret(data.secret);
      const dataUrl = await QRCode.toDataURL(data.otpauth, { width: 200, margin: 2 });
      setQrUrl(dataUrl);
      setStep("scan");
    }
    initSetup();
  }, []);

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/totp/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Invalid code, try again.");
      return;
    }

    setStep("done");
    await update({ totpVerified: true });
    setTimeout(() => { window.location.href = "/console/hr"; }, 1500);
  }

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Generating QR code…</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-md p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-gray-800">2FA Activated!</h2>
          <p className="text-gray-500 text-sm mt-2">Redirecting to HR Console…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Set up 2FA</h1>
        <p className="text-sm text-gray-500 mb-6">
          Scan the QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>,
          then enter the 6-digit code to activate.
        </p>

        <div className="flex justify-center mb-4">
          {qrUrl && <img src={qrUrl} alt="TOTP QR code" width={200} height={200} className="rounded-lg border" />}
        </div>

        <details className="mb-4 text-xs text-gray-400 cursor-pointer">
          <summary>Can&apos;t scan? Enter key manually</summary>
          <p className="mt-1 font-mono break-all select-all bg-gray-50 rounded p-2">{secret}</p>
        </details>

        <form onSubmit={handleEnable} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">6-digit code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-yellow-400 text-yellow-900 font-bold py-2.5 rounded-full hover:bg-yellow-300 disabled:opacity-50 transition"
          >
            {loading ? "Verifying…" : "Activate 2FA"}
          </button>
        </form>
      </div>
    </div>
  );
}
