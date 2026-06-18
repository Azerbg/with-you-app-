"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Booking {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorPhoto: string | null;
  scheduledAt: string;
  status: string;
  durationMins: number;
  sessionType: string;
  studentPriceUsd: number | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  CONFIRMED:  { label: "Confirmée",  cls: "bg-green-100 text-green-700" },
  PENDING:    { label: "En attente", cls: "bg-yellow-100 text-yellow-700" },
  COMPLETED:  { label: "Terminée",   cls: "bg-blue-100 text-blue-700" },
  CANCELLED:  { label: "Annulée",    cls: "bg-red-100 text-red-600" },
  NO_SHOW:    { label: "Absent",     cls: "bg-gray-100 text-gray-500" },
};

export default function SessionsClient({
  bookings,
  currentUserId,
}: {
  bookings: Booking[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ type: "FULL" | "CREDIT" | "NONE"; amount: number } | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  const now = new Date();

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Annulé par l'étudiant" }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocalStatuses((prev) => ({ ...prev, [cancelTarget.id]: "CANCELLED" }));
        setCancelResult({
          type: data.refundType,
          amount: cancelTarget.studentPriceUsd ?? 15,
        });
      }
    } finally {
      setCancelling(false);
    }
  }

  function hoursUntil(iso: string) {
    return (new Date(iso).getTime() - now.getTime()) / 3_600_000;
  }

  const upcoming = bookings.filter(
    (b) => (localStatuses[b.id] ?? b.status) === "CONFIRMED" && new Date(b.scheduledAt) > now
  );
  const past = bookings.filter(
    (b) =>
      (localStatuses[b.id] ?? b.status) !== "CONFIRMED" ||
      new Date(b.scheduledAt) <= now
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      {/* Top bar */}
      <div className="h-14 border-b border-black/5 bg-white flex items-center px-8 flex-shrink-0">
        <h1 className="text-base font-bold text-[#5C3D00]">Mes séances</h1>
      </div>

      <div className="flex-1 overflow-auto p-8 space-y-8">

        {/* Policy info */}
        <div className="bg-[#FFF3B0] border border-[#F5C400]/40 rounded-2xl px-5 py-4 flex gap-3 items-start">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#C49200] mt-0.5 flex-shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-bold text-[#5C3D00] mb-1">Politique d&apos;annulation</p>
            <p className="text-xs text-[#6B5E44] leading-relaxed">
              <strong>Plus de 24h avant la séance</strong> : remboursement intégral sur votre carte.<br />
              <strong>Moins de 24h avant la séance</strong> : le montant est converti en crédit WithYou utilisable pour votre prochaine réservation.
            </p>
          </div>
        </div>

        {/* Upcoming */}
        <div>
          <h2 className="text-sm font-bold text-[#5C3D00] uppercase tracking-widest mb-4">
            Séances à venir ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <div className="bg-white border border-black/5 rounded-2xl p-10 text-center">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-semibold text-[#5C3D00]">Aucune séance planifiée</p>
              <p className="text-sm text-[#9B8A6B] mt-1 mb-5">Réservez une séance de découverte avec un tuteur.</p>
              <Link href="/find-tutors" className="inline-block bg-[#F5C400] text-[#5C3D00] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#FFDE59] transition">
                Trouver un tuteur
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => {
                const hrs = hoursUntil(b.scheduledAt);
                const canCancel = (localStatuses[b.id] ?? b.status) === "CONFIRMED";
                const policyLabel =
                  hrs >= 24
                    ? "Remboursement complet si annulé maintenant"
                    : "Crédit uniquement si annulé maintenant";
                const policyColor = hrs >= 24 ? "text-green-600" : "text-orange-500";

                return (
                  <div key={b.id} className="bg-white border border-black/5 rounded-2xl p-5 flex items-center gap-4">
                    {b.tutorPhoto ? (
                      <img src={b.tutorPhoto} alt={b.tutorName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-sm flex-shrink-0">
                        {initials(b.tutorName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#2D1A00]">{b.tutorName}</p>
                      <p className="text-sm text-[#6B5E44]">
                        {new Date(b.scheduledAt).toLocaleString("fr-FR", {
                          weekday: "long", day: "numeric", month: "long",
                          hour: "2-digit", minute: "2-digit",
                          timeZone: "Africa/Tunis",
                        })}
                        {" · "}{b.durationMins} min
                      </p>
                      <p className={`text-xs mt-0.5 ${policyColor}`}>{policyLabel}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <a
                        href={`/api/bookings/${b.id}/ical`}
                        download
                        title="Ajouter au calendrier"
                        className="w-9 h-9 rounded-xl border border-[#D9D0C3] flex items-center justify-center text-[#6B5E44] hover:bg-[#FAF8F0] transition"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                        </svg>
                      </a>
                      {canCancel && (
                        <button
                          onClick={() => setCancelTarget(b)}
                          className="px-4 py-2 text-xs font-bold border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past */}
        {past.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-[#5C3D00] uppercase tracking-widest mb-4">
              Historique ({past.length})
            </h2>
            <div className="space-y-3">
              {past.map((b) => {
                const status = localStatuses[b.id] ?? b.status;
                const s = STATUS_LABEL[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
                return (
                  <div key={b.id} className="bg-white border border-black/5 rounded-2xl p-5 flex items-center gap-4 opacity-80">
                    {b.tutorPhoto ? (
                      <img src={b.tutorPhoto} alt={b.tutorName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#F5C400]/40 flex items-center justify-center text-[#5C3D00]/60 font-bold text-sm flex-shrink-0">
                        {initials(b.tutorName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#2D1A00]">{b.tutorName}</p>
                      <p className="text-sm text-[#6B5E44]">
                        {new Date(b.scheduledAt).toLocaleString("fr-FR", {
                          weekday: "long", day: "numeric", month: "long",
                          hour: "2-digit", minute: "2-digit",
                          timeZone: "Africa/Tunis",
                        })}
                        {" · "}{b.durationMins} min
                      </p>
                      {status === "CANCELLED" && b.cancelledBy && (
                        <p className="text-xs text-[#9B8A6B] mt-0.5">
                          Annulée par {b.cancelledBy === "STUDENT" ? "vous" : "le tuteur"}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {cancelTarget && !cancelResult && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-[#2D1A00] mb-2">Annuler la séance ?</h3>
            <p className="text-sm text-[#6B5E44] mb-4">
              Séance avec <strong>{cancelTarget.tutorName}</strong> le{" "}
              {new Date(cancelTarget.scheduledAt).toLocaleString("fr-FR", {
                day: "numeric", month: "long",
                hour: "2-digit", minute: "2-digit",
                timeZone: "Africa/Tunis",
              })}
            </p>

            {/* Refund info */}
            {hoursUntil(cancelTarget.scheduledAt) >= 24 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-5 text-sm text-green-700">
                <strong>Remboursement complet</strong> — La séance est dans plus de 24h, vous serez remboursé intégralement.
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-5 text-sm text-orange-700">
                <strong>Crédit uniquement</strong> — La séance est dans moins de 24h. Le montant sera converti en crédit WithYou.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#D9D0C3] text-sm font-semibold text-[#6B5E44] hover:bg-[#FAF8F0] transition"
              >
                Garder la séance
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition disabled:opacity-50"
              >
                {cancelling ? "Annulation…" : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result modal */}
      {cancelResult && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-7 h-7 text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#2D1A00] mb-2">Séance annulée</h3>
            {cancelResult.type === "FULL" && (
              <p className="text-sm text-[#6B5E44]">
                Un remboursement de <strong>{cancelResult.amount} USD</strong> a été initié sur votre carte. Il apparaîtra dans 5 à 10 jours ouvrables.
              </p>
            )}
            {cancelResult.type === "CREDIT" && (
              <p className="text-sm text-[#6B5E44]">
                <strong>{cancelResult.amount} USD</strong> ont été ajoutés à votre crédit WithYou. Utilisez-le lors de votre prochaine réservation.
              </p>
            )}
            {cancelResult.type === "NONE" && (
              <p className="text-sm text-[#6B5E44]">Votre séance a été annulée.</p>
            )}
            <button
              onClick={() => { setCancelTarget(null); setCancelResult(null); router.refresh(); }}
              className="mt-5 w-full bg-[#F5C400] text-[#5C3D00] py-2.5 rounded-xl font-bold text-sm hover:bg-[#FFDE59] transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
