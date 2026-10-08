"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ClassroomView } from "../ClassroomCore";
import { useCall } from "@/context/CallContext";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  bookingId: string;
  role: "student" | "tutor";
  tutorName: string;
  studentName: string;
  scheduledAt: string;
  durationMins: number;
}

// ─── Post-session screen ──────────────────────────────────────────────────────

function LeftScreen({ role, bookingId }: { role: string; bookingId: string }) {
  return (
    <div className="h-screen bg-[#0F0A04] flex items-center justify-center px-6">
      <div className="bg-[#1A1209] rounded-2xl border border-[#3A2A0E] p-10 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-[#F5C400]/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-[#F5C400]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Séance terminée</h2>
        <p className="text-sm text-[#9B8A6B] mb-6">Vous avez quitté la salle de classe.</p>
        <div className="flex flex-col gap-3">
          {role === "student" && (
            <Link href={`/review/${bookingId}`}
              className="block w-full bg-[#F5C400] text-[#5C3D00] py-3 rounded-xl font-bold text-sm hover:bg-[#FFDE59] transition">
              Laisser un avis →
            </Link>
          )}
          <Link href={role === "student" ? "/dashboard/student" : "/dashboard/tutor"}
            className="block w-full bg-[#2A1F0E] text-[#C4BAA8] py-3 rounded-xl font-semibold text-sm hover:bg-[#3A2A0E] transition border border-[#3A2A0E]">
            Tableau de bord
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link href={role === "student" ? "/dashboard/student/settings" : "/dashboard/tutor/settings"}
              className="block bg-[#1A1209] text-white/50 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#2A1F0E] hover:text-white/70 transition border border-[#3A2A0E] text-center">
              Paramètres
            </Link>
            <Link href="/help"
              className="block bg-[#1A1209] text-white/50 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#2A1F0E] hover:text-white/70 transition border border-[#3A2A0E] text-center">
              Assistance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function ClassroomClient({
  bookingId, role, tutorName, studentName, scheduledAt, durationMins,
}: Props) {
  const [myName,  setMyName]  = useState(role === "student" ? studentName : tutorName);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [left,    setLeft]    = useState(false);
  const joinedRef             = useRef(false);

  const { joinCall, leaveCall, isInCall, elapsed, setOverlayOpen } = useCall();
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

  // When the call ends (for any reason) while we're mounted, show LeftScreen
  useEffect(() => {
    if (joinedRef.current && !isInCall) setLeft(true);
  }, [isInCall]);

  const handleLeave = useCallback(async () => {
    // leaveCall() calls /api/bookings/${bookingId}/complete + room.disconnect()
    await leaveCall();
    setLeft(true);
  }, [leaveCall]);

  const fetchToken = useCallback(async () => {
    try {
      const res  = await fetch(`/api/livekit/token?bookingId=${bookingId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Impossible de rejoindre la salle."); return; }

      const name = data.displayName || myName;
      if (data.displayName) setMyName(data.displayName);

      await joinCall({
        serverUrl,
        token:       data.token,
        roomId:      bookingId,
        myName:      name,
        otherName:   role === "student" ? tutorName : studentName,
        role,
        scheduledAt,
        durationMins,
        bookingId,
      });
      joinedRef.current = true;
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, joinCall, serverUrl, role, tutorName, studentName, scheduledAt, durationMins]);

  useEffect(() => { fetchToken(); }, [fetchToken]);

  if (left) return <LeftScreen role={role} bookingId={bookingId} />;

  if (loading) return (
    <div className="h-screen bg-[#0F0A04] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#C4BAA8] text-sm">Connexion à la salle…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="h-screen bg-[#0F0A04] flex items-center justify-center px-6">
      <div className="bg-[#1A1209] rounded-2xl border border-[#3A2A0E] p-8 max-w-sm w-full text-center">
        <p className="text-red-400 font-semibold mb-2">Erreur de connexion</p>
        <p className="text-sm text-[#9B8A6B] mb-6">{error}</p>
        <Link href={role === "student" ? "/dashboard/student" : "/dashboard/tutor"}
          className="block w-full bg-[#F5C400] text-[#5C3D00] py-3 rounded-xl font-bold text-sm hover:bg-[#FFDE59] transition">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );

  return (
    <ClassroomView
      role={role}
      myName={myName}
      otherName={role === "student" ? tutorName : studentName}
      durationMins={durationMins}
      scheduledAt={scheduledAt}
      bookingId={bookingId}
      elapsed={elapsed}
      onOverlayChange={setOverlayOpen}
      onLeave={handleLeave}
    />
  );
}
