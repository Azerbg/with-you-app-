"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ClassroomView } from "../ClassroomCore";
import { useCall } from "@/context/CallContext";

// ─── Post-session screen ──────────────────────────────────────────────────────

function SandboxLeftScreen() {
  return (
    <div className="h-screen bg-[#0F0A04] flex items-center justify-center px-6">
      <div className="bg-[#1A1209] rounded-2xl border border-[#3A2A0E] p-10 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Séance terminée</h2>
        <p className="text-sm text-[#9B8A6B] mb-6">Vous avez quitté la salle bac à sable.</p>
        <div className="flex flex-col gap-3">
          <Link href="/classroom/sandbox"
            className="block w-full bg-[#F5C400] text-[#5C3D00] py-3 rounded-xl font-bold text-sm hover:bg-[#FFDE59] transition text-center">
            Rejoindre à nouveau →
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/dashboard"
              className="block bg-[#2A1F0E] text-white/50 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#3A2A0E] hover:text-white/70 transition border border-[#3A2A0E] text-center">
              Tableau de bord
            </Link>
            <Link href="/help"
              className="block bg-[#2A1F0E] text-white/50 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#3A2A0E] hover:text-white/70 transition border border-[#3A2A0E] text-center">
              Assistance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function SandboxClient() {
  const [myName,  setMyName]  = useState("Participant");
  const [role,    setRole]    = useState<"student" | "tutor">("student");
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [left,    setLeft]    = useState(false);
  const joinedRef             = useRef(false);

  const { joinCall, leaveCall, isInCall, elapsed, setOverlayOpen } = useCall();
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

  // When the call ends while mounted, show LeftScreen
  useEffect(() => {
    if (joinedRef.current && !isInCall) setLeft(true);
  }, [isInCall]);

  useEffect(() => {
    fetch("/api/livekit/sandbox-token")
      .then(r => r.json())
      .then(async d => {
        const name = d.displayName || "Participant";
        const r: "student" | "tutor" = d.role === "tutor" ? "tutor" : "student";
        setMyName(name);
        setRole(r);
        await joinCall({
          serverUrl,
          token:    d.token,
          roomId:   d.roomName ?? "sandbox",
          myName:   name,
          otherName:"Participant",
          role:     r,
          isSandbox: true,
        });
        joinedRef.current = true;
      })
      .catch(() => setError("Erreur réseau."))
      .finally(() => setLoading(false));
  // joinCall is stable (useCallback); runs once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLeave = async () => {
    await leaveCall();
    setLeft(true);
  };

  if (left)    return <SandboxLeftScreen />;

  if (loading) return (
    <div className="h-screen bg-[#0F0A04] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#C4BAA8] text-sm">Connexion à la salle sandbox…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="h-screen bg-[#0F0A04] flex items-center justify-center px-6">
      <div className="bg-[#1A1209] rounded-2xl border border-[#3A2A0E] p-8 max-w-sm w-full text-center">
        <p className="text-red-400 font-semibold mb-4">{error}</p>
        <Link href="/dashboard" className="block w-full bg-[#F5C400] text-[#5C3D00] py-3 rounded-xl font-bold text-sm text-center">Retour</Link>
      </div>
    </div>
  );

  return (
    <ClassroomView
      role={role}
      myName={myName}
      otherName="Participant"
      isSandbox={true}
      elapsed={elapsed}
      onOverlayChange={setOverlayOpen}
      onLeave={handleLeave}
    />
  );
}
