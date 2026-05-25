"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface AppData {
  id: string;
  fullName: string;
  interviewSlots: string[];
  interviewSelectedAt: string | null;
  interviewMeetingUrl: string | null;
}

function formatInTz(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Tunis",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export default function InterviewSelectionPage() {
  const { token } = useParams<{ token: string }>();
  const [app, setApp] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/interview/${token}`)
      .then(async r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return; }
        const data = await r.json();
        setApp(data);
        if (data.interviewSelectedAt) {
          setConfirmed(true);
          setConfirmedSlot(data.interviewSelectedAt);
        }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  async function selectSlot(index: number) {
    setSelecting(index);
    const res = await fetch(`/api/interview/${token}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotIndex: index }),
    });
    if (res.ok) {
      const data = await res.json();
      setConfirmed(true);
      setConfirmedSlot(app!.interviewSlots[index]);
      setApp(prev => prev ? { ...prev, interviewSelectedAt: data.scheduledAt } : prev);
    } else {
      const err = await res.json();
      if (err.error === "already_selected") {
        setConfirmed(true);
        setConfirmedSlot(app?.interviewSelectedAt ?? null);
      }
    }
    setSelecting(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F0] flex items-center justify-center">
        <div className="text-[#6B5E44] text-sm">Chargement…</div>
      </div>
    );
  }

  if (notFound || !app) {
    return (
      <div className="min-h-screen bg-[#FAF8F0] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-[#5C3D00] mb-2">Lien invalide</h1>
          <p className="text-sm text-[#6B5E44]">Ce lien d'entretien est invalide ou a expiré.</p>
        </div>
      </div>
    );
  }

  if (confirmed && confirmedSlot) {
    return (
      <div className="min-h-screen bg-[#FAF8F0] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-[#5C3D00] mb-3">Entretien confirmé !</h1>
          <p className="text-sm text-[#6B5E44] mb-6">
            Bonjour {app.fullName}, votre entretien est planifié pour :
          </p>
          <div className="bg-[#FFF3B0] rounded-2xl p-5 mb-6">
            <p className="text-lg font-bold text-[#5C3D00]">
              {formatInTz(confirmedSlot)}
            </p>
          </div>
          {app.interviewMeetingUrl ? (
            <div>
              <p className="text-sm text-[#6B5E44] mb-3">Lien de l'entretien :</p>
              <a
                href={app.interviewMeetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-[#5C3D00] text-[#F5C400] font-bold px-6 py-3 rounded-full text-sm hover:bg-[#7A5000] transition"
              >
                Rejoindre l'entretien →
              </a>
            </div>
          ) : (
            <p className="text-sm text-[#6B5E44]">
              Le lien de l'entretien vous sera envoyé prochainement par e-mail.
            </p>
          )}
          <p className="text-xs text-[#6B5E44]/60 mt-8">WithYou · Plateforme d'apprentissage des langues</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F0] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-block bg-[#5C3D00] text-[#F5C400] font-bold text-lg px-4 py-1 rounded-lg mb-4">
            WithYou
          </span>
          <h1 className="text-2xl font-bold text-[#5C3D00] mb-2">
            Choisissez votre créneau
          </h1>
          <p className="text-sm text-[#6B5E44]">
            Bonjour <strong>{app.fullName}</strong>, veuillez sélectionner l'un des créneaux
            ci-dessous pour votre entretien. Les horaires sont affichés en heure de Tunis.
          </p>
        </div>

        {/* Slots */}
        <div className="space-y-3 mb-8">
          {app.interviewSlots.map((slot, i) => (
            <button
              key={i}
              onClick={() => selectSlot(i)}
              disabled={selecting !== null}
              className="w-full text-left border-2 border-[#6B5E44]/20 rounded-2xl px-5 py-4 hover:border-[#F5C400] hover:bg-[#FFF3B0]/40 transition group disabled:opacity-60 disabled:cursor-wait"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#6B5E44] uppercase tracking-widest mb-1">
                    Créneau {i + 1}
                  </p>
                  <p className="text-base font-bold text-[#5C3D00]">
                    {formatInTz(slot)}
                  </p>
                </div>
                <span className="text-[#F5C400] text-xl opacity-0 group-hover:opacity-100 transition ml-3">
                  {selecting === i ? "⏳" : "→"}
                </span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-[#6B5E44]/60">
          Ce lien ne peut être utilisé qu'une seule fois.<br />
          WithYou · Plateforme d'apprentissage des langues
        </p>
      </div>
    </div>
  );
}
