"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function PaymentReturnInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const piId   = searchParams.get("payment_intent");
    const status = searchParams.get("redirect_status");

    if (!piId || status !== "succeeded") {
      router.replace("/dashboard/student");
      return;
    }

    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: piId }),
    })
      .then((r) => r.json())
      .then((booking) => {
        if (booking?.id) {
          router.replace(`/booking/confirmation/${booking.id}`);
        } else {
          setError(booking?.error ?? "Une erreur est survenue lors de la confirmation.");
        }
      })
      .catch(() => setError("Erreur réseau. Votre paiement a été reçu — vérifiez votre tableau de bord."));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return (
    <div className="min-h-screen bg-[#FAF8F0] flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-[#C4BAA8] p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[#2D1A00] mb-1">Erreur de confirmation</p>
        <p className="text-xs text-[#6B5E44] mb-6">{error}</p>
        <Link
          href="/dashboard/student"
          className="block w-full bg-[#F5C400] text-[#5C3D00] py-3 rounded-xl font-bold text-sm hover:bg-[#FFDE59] transition text-center"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF8F0] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#6B5E44] text-sm font-medium">Finalisation de votre réservation…</p>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF8F0] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentReturnInner />
    </Suspense>
  );
}
