"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
  useParticipants,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
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

// ─── Post-session screen ──────────────────────────────────────────────────────

function LeftScreen({ role, bookingId }: { role: string; bookingId: string }) {
  return (
    <div className="h-screen bg-[#0F0A04] flex items-center justify-center px-6">
      <div className="bg-[#1A1209] rounded-2xl border border-[#3A2A0E] p-10 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-[#F5C400]/10 rounded-full flex items-center justify-center mx-auto mb-4">
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
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main classroom view (inside LiveKitRoom context) ─────────────────────────

function ClassroomView({
  role, tutorName, studentName, durationMins, scheduledAt, onLeave, bookingId,
}: {
  role: "student" | "tutor";
  tutorName: string;
  studentName: string;
  durationMins: number;
  scheduledAt: string;
  onLeave: () => void;
  bookingId: string;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const [elapsed, setElapsed] = useState(0);
  const sessionStart = new Date(scheduledAt).getTime();

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - sessionStart) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const remoteCameraTrack = tracks.find(t => !t.participant.isLocal && t.source === Track.Source.Camera);
  const localCameraTrack  = tracks.find(t =>  t.participant.isLocal && t.source === Track.Source.Camera);
  const remoteParticipant = participants.find(p => !p.isLocal);

  const hasRemoteVideo = !!(remoteCameraTrack?.publication && !remoteCameraTrack.publication.isMuted);

  const otherName  = role === "student" ? tutorName   : studentName;
  const myName     = role === "student" ? studentName : tutorName;
  const otherInit  = otherName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const myInit     = myName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="h-screen flex flex-col bg-[#0F0A04] overflow-hidden select-none">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#0A0703] border-b border-white/5 flex-shrink-0 z-10">

        {/* Left */}
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="WithYou" className="h-6 w-auto opacity-70" />
          <div className="w-px h-5 bg-white/10" />
          <div>
            <p className="text-white/70 text-xs font-semibold leading-tight">
              Séance avec <span className="text-[#F5C400]">{otherName}</span>
            </p>
            <p className="text-white/25 text-[10px] leading-tight capitalize">
              {role === "student" ? "Étudiant" : "Tuteur"} · {durationMins} min · Découverte
            </p>
          </div>
        </div>

        {/* Center: timer */}
        <div className="flex items-center gap-2 bg-[#1A1209] border border-[#F5C400]/20 px-4 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F5C400] animate-pulse" />
          <span className="text-[#F5C400] font-mono text-sm font-bold tracking-widest">
            {formatTimer(elapsed)}
          </span>
        </div>

        {/* Right: leave */}
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Quitter
        </button>
      </div>

      {/* ── Main video area ───────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Remote video or waiting */}
        {hasRemoteVideo && remoteCameraTrack ? (
          <VideoTrack
            trackRef={remoteCameraTrack}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1C1308] to-[#0A0703]">
            {remoteParticipant ? (
              /* Camera off */
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#F5C400] to-[#C49200] flex items-center justify-center text-[#5C3D00] font-bold text-5xl mx-auto mb-5 shadow-[0_0_60px_rgba(245,196,0,0.15)]">
                  {otherInit}
                </div>
                <p className="text-white/70 text-sm font-semibold">{otherName}</p>
                <p className="text-white/30 text-xs mt-1">Caméra désactivée</p>
              </div>
            ) : (
              /* Waiting */
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-[#F5C400]/10 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-[#F5C400]/20 animate-ping [animation-delay:0.3s]" />
                  <div className="absolute inset-4 rounded-full border-2 border-[#F5C400]/30 animate-ping [animation-delay:0.6s]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-[#F5C400]/20 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-[#F5C400]/60" />
                    </div>
                  </div>
                </div>
                <p className="text-white/60 text-sm font-semibold">En attente de {otherName}…</p>
                <p className="text-white/20 text-xs mt-1.5">Le lien de la salle a été partagé</p>
                <div className="mt-4 bg-[#1A1209] border border-[#3A2A0E] rounded-xl px-4 py-2 inline-block">
                  <p className="text-[#9B8A6B] text-xs font-mono">/classroom/{bookingId.slice(0, 8)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Remote name tag */}
        {remoteParticipant && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <p className="text-white/90 text-xs font-semibold">{otherName}</p>
          </div>
        )}

        {/* ── Self-view PiP ── */}
        <div className="absolute bottom-4 right-4 w-48 h-32 rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)] border-2 border-[#F5C400]/30 bg-[#1A1209]">
          {localCameraTrack && isCameraEnabled ? (
            <VideoTrack
              trackRef={localCameraTrack}
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#2A1F0E]">
              <div className="w-12 h-12 rounded-full bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold">
                {myInit}
              </div>
            </div>
          )}
          <div className="absolute bottom-1.5 left-2.5">
            <span className="text-white/60 text-[10px] font-semibold bg-black/40 px-1.5 py-0.5 rounded-md">Vous</span>
          </div>
          {!isMicrophoneEnabled && (
            <div className="absolute top-1.5 right-1.5 bg-red-600 rounded-full p-1">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* ── Control bar ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-[#0A0703] border-t border-white/5 px-8 py-4">
        <div className="flex items-center justify-center gap-3">

          {/* Mic */}
          <ControlButton
            active={isMicrophoneEnabled}
            onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
            label={isMicrophoneEnabled ? "Micro" : "Muet"}
            activeIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            }
            inactiveIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM3 3l18 18" />
              </svg>
            }
          />

          {/* Camera */}
          <ControlButton
            active={isCameraEnabled}
            onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
            label={isCameraEnabled ? "Caméra" : "Arrêtée"}
            activeIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }
            inactiveIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
              </svg>
            }
          />

          {/* Divider */}
          <div className="w-px h-10 bg-white/10 mx-1" />

          {/* End call */}
          <button onClick={onLeave} className="flex flex-col items-center gap-1 group">
            <div className="w-14 h-12 rounded-2xl bg-red-600 hover:bg-red-500 flex items-center justify-center transition shadow-[0_4px_20px_rgba(239,68,68,0.35)] group-hover:shadow-[0_4px_24px_rgba(239,68,68,0.5)]">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </div>
            <span className="text-[10px] text-red-400/60">Terminer</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable control button ──────────────────────────────────────────────────

function ControlButton({ active, onClick, label, activeIcon, inactiveIcon }: {
  active: boolean;
  onClick: () => void;
  label: string;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
        active
          ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border border-[#3A2A0E] text-white"
          : "bg-red-600/90 hover:bg-red-600 text-white"
      }`}>
        {active ? activeIcon : inactiveIcon}
      </div>
      <span className="text-[10px] text-white/30 group-hover:text-white/50 transition">{label}</span>
    </button>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function ClassroomClient({
  bookingId, role, tutorName, studentName, scheduledAt, durationMins, status,
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

  useEffect(() => { fetchToken(); }, [fetchToken]);

  if (left) return <LeftScreen role={role} bookingId={bookingId} />;

  if (loading) {
    return (
      <div className="h-screen bg-[#0F0A04] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#C4BAA8] text-sm">Connexion à la salle…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token!}
      serverUrl={serverUrl}
      onDisconnected={() => setLeft(true)}
      style={{ height: "100vh" }}
    >
      <ClassroomView
        role={role}
        tutorName={tutorName}
        studentName={studentName}
        durationMins={durationMins}
        scheduledAt={scheduledAt}
        onLeave={() => setLeft(true)}
        bookingId={bookingId}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
