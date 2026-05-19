"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function TotpPage() {
  const { update } = useSession();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/totp/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Invalid code. Please try again.");
      setCode("");
      return;
    }

    await update();
    window.location.href = "/console/hr";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the 6-digit code from your authenticator app.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
              {error}
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
            autoFocus
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-center text-3xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="000000"
          />
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-yellow-400 text-yellow-900 font-bold py-2.5 rounded-full hover:bg-yellow-300 disabled:opacity-50 transition"
          >
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}
