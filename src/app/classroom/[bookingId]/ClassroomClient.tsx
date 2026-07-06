"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import Link from "next/link";

interface Props {
  bookingId: string;
  role: "student" | "tutor";
  tutorName: string;
  studentName: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
}

export default function ClassroomClient({
  bookingId,
  role,
  tutorName,
  studentName,
  scheduledAt,
  durationMins,
  status,
}: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [left, setLeft] = useState(false);

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/livekit/token?bookingId=${bookingId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Impossible de rejoindre la salle.");
        return;
      }
      const data = await res.json();
      setToken(data.token);
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const otherName = role === "student" ? tutorName : studentName;
  const scheduledDate = new Date(scheduledAt);
  const timeStr = scheduledDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  });
  const dateStr = scheduledDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Tunis",
  });

  if (left) {
    return (
      <div className="min-h-screen bg-[#FAF8F0] flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-[#C4BAA8] shadow-sm p-10 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-[#F5C400]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#5C3D00]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#2D1A00] mb-2">Séance terminée</h2>
          <p className="text-sm text-[#6B5E44] mb-6">Vous avez quitté la salle de classe.</p>
          <div className="flex flex-col gap-3">
            {role === "student" && (
              <Link
                href={`/review/${bookingId}`}
                className="block w-full bg-[#F5C400] text-[#5C3D00] py-3 rounded-xl font-bold text-sm hover:bg-[#FFDE59] transition"
              >
                Laisser un avis →
              </Link>
            )}
            <Link
              href={role === "student" ? "/dashboard/student" : "/dashboard/tutor"}
              className="block w-full bg-white border border-[#D9D0C3] text-[#5C3D00] py-3 rounded-xl font-semibold text-sm hover:bg-[#FAF8F0] transition"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1209] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#C4BAA8] text-sm">Connexion à la salle...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF8F0] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-[#C4BAA8] shadow-sm p-8 max-w-sm w-full text-center">
          <p className="text-red-600 font-semibold mb-2">Erreur</p>
          <p className="text-sm text-[#6B5E44] mb-6">{error}</p>
          <Link
            href={role === "student" ? "/dashboard/student" : "/dashboard/tutor"}
            className="block w-full bg-[#F5C400] text-[#5C3D00] py-3 rounded-xl font-bold text-sm hover:bg-[#FFDE59] transition"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#1A1209]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#110D06] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="WithYou" className="h-6 w-auto opacity-80" />
          <span className="text-white/40 text-xs">|</span>
          <span className="text-white/70 text-sm font-medium">
            Séance avec <span className="text-[#F5C400]">{otherName}</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-xs capitalize">
            {dateStr} · {timeStr} · {durationMins} min
          </span>
          <button
            onClick={() => setLeft(true)}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
          >
            Quitter
          </button>
        </div>
      </div>

      {/* LiveKit room */}
      <div className="flex-1 overflow-hidden">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token!}
          serverUrl={serverUrl}
          data-lk-theme="default"
          style={{ height: "100%" }}
          onDisconnected={() => setLeft(true)}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}
