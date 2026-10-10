"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { ExcalidrawSync } from "@/components/ExcalidrawBoard";
import type ExcalidrawBoardType from "@/components/ExcalidrawBoard";
import type { ComponentProps } from "react";

const ExcalidrawBoard = dynamic<ComponentProps<typeof ExcalidrawBoardType>>(
  () => import("@/components/ExcalidrawBoard"),
  { ssr: false },
);
import { useLanguage } from "@/context/LanguageContext";
import { useCall } from "@/context/CallContext";
import {
  useTracks,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  VideoTrack,
  isTrackReference,
} from "@livekit/components-react";
import { Track, RoomEvent, ConnectionQuality, ParticipantEvent, LocalVideoTrack } from "livekit-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string; sender: string; text: string; time: number; isLocal: boolean;
}
interface FloatingReaction {
  id: string; emoji: string; sender: string; x: number;
}
type ActivePanel = "chat" | "info" | null;
type Dropdown    = "micro" | "camera" | "outils" | "plus" | null;

const REACTIONS = ["👍", "❤️", "😂", "🎉", "👏"];

// ─── Utility ──────────────────────────────────────────────────────────────────

function renderWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#F5C400] underline underline-offset-2 break-all hover:text-[#FFDE59]">{part}</a>
      : <span key={i}>{part}</span>
  );
}

// ─── Connection Quality ───────────────────────────────────────────────────────

function QualityBars({ quality }: { quality: ConnectionQuality }) {
  const isExcellent = quality === ConnectionQuality.Excellent;
  const isGoodPlus  = isExcellent || quality === ConnectionQuality.Good;
  const hasSignal   = isGoodPlus   || quality === ConnectionQuality.Poor;
  const isLost      = quality === ConnectionQuality.Lost;
  const c1 = isLost ? "bg-red-400" : hasSignal ? (quality === ConnectionQuality.Poor ? "bg-yellow-400" : "bg-emerald-400") : "bg-white/20";
  const c2 = isGoodPlus  ? "bg-emerald-400" : "bg-white/20";
  const c3 = isExcellent ? "bg-emerald-400" : "bg-white/20";
  return (
    <div className="flex items-end gap-0.5 h-3.5">
      <div className={`w-1 h-1.5 rounded-sm ${c1}`} />
      <div className={`w-1 h-2.5 rounded-sm ${c2}`} />
      <div className={`w-1 h-3.5 rounded-sm ${c3}`} />
    </div>
  );
}

// ─── Bar Button ───────────────────────────────────────────────────────────────

function BarBtn({ active, label, onClick, icon, blue = false }: {
  active: boolean; label: string; onClick: () => void; icon: React.ReactNode; blue?: boolean;
}) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="flex flex-col items-center gap-1 group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition border ${
        active && !blue ? "bg-[#F5C400]/20 border-[#F5C400]/40 text-[#F5C400]"
        : active && blue ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
        : "bg-[#2A1F0E] border-[#3A2A0E] text-white/70 hover:text-white hover:bg-[#3A2A0E]"
      }`}>{icon}</div>
      <span className={`text-[10px] transition ${
        active && !blue ? "text-[#F5C400]/80" : active ? "text-blue-400/80" : "text-white/30 group-hover:text-white/50"
      }`}>{label}</span>
    </button>
  );
}

// ─── Virtual Background Panel ────────────────────────────────────────────────

type BgChoice = "none" | "blur-soft" | "blur-strong" | string; // string = image data URL or color

const SOLID_COLORS = [
  { label: "Noir",        hex: "#0a0a0a" },
  { label: "Nuit",        hex: "#0f172a" },
  { label: "Forêt",       hex: "#0f2718" },
  { label: "Marron",      hex: "#2d1a00" },
  { label: "Ardoise",     hex: "#1e293b" },
  { label: "Violet",      hex: "#1e1b4b" },
  { label: "Gris foncé",  hex: "#1f2937" },
  { label: "Bordeaux",    hex: "#4c0519" },
];

function solidDataUrl(hex: string): string {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 4;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = hex; ctx.fillRect(0, 0, 4, 4);
  return c.toDataURL();
}

function VirtualBgPanel({ onClose, onApply, current, applying }: {
  onClose: () => void;
  onApply: (choice: BgChoice) => void;
  current: BgChoice;
  applying: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { lang } = useLanguage();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) onApply(ev.target.result as string); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="bg-[#0D0904] border border-white/10 rounded-2xl shadow-2xl p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/80 text-sm font-bold">{lang === "fr" ? "Arrière-plan" : "Background"}</p>
        <button onClick={onClose} aria-label={lang === "fr" ? "Fermer" : "Close"} className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {applying && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[#F5C400]/10 rounded-xl">
          <div className="w-3.5 h-3.5 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-[#F5C400] text-xs">{lang === "fr" ? "Application en cours…" : "Applying…"}</span>
        </div>
      )}

      {/* None + Blur */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {/* None */}
        <button onClick={() => onApply("none")} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition ${current === "none" ? "border-[#F5C400] bg-[#F5C400]/10" : "border-white/10 hover:border-white/25 hover:bg-white/5"}`}>
          <div className="w-full rounded-lg bg-[#1A1209] flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
            <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          </div>
          <span className={`text-[10px] font-semibold ${current === "none" ? "text-[#F5C400]" : "text-white/40"}`}>{lang === "fr" ? "Aucun" : "None"}</span>
        </button>

        {/* Blur soft */}
        <button onClick={() => onApply("blur-soft")} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition ${current === "blur-soft" ? "border-[#F5C400] bg-[#F5C400]/10" : "border-white/10 hover:border-white/25 hover:bg-white/5"}`}>
          <div className="w-full rounded-lg bg-[#1A1209] flex items-center justify-center overflow-hidden" style={{ aspectRatio: "16/9" }}>
            <div className="w-full h-full bg-gradient-to-br from-[#2a1f0e] to-[#0a0703]" style={{ filter: "blur(3px)" }} />
          </div>
          <span className={`text-[10px] font-semibold ${current === "blur-soft" ? "text-[#F5C400]" : "text-white/40"}`}>{lang === "fr" ? "Flou léger" : "Light blur"}</span>
        </button>

        {/* Blur strong */}
        <button onClick={() => onApply("blur-strong")} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition ${current === "blur-strong" ? "border-[#F5C400] bg-[#F5C400]/10" : "border-white/10 hover:border-white/25 hover:bg-white/5"}`}>
          <div className="w-full rounded-lg bg-[#1A1209] flex items-center justify-center overflow-hidden" style={{ aspectRatio: "16/9" }}>
            <div className="w-full h-full bg-gradient-to-br from-[#2a1f0e] to-[#0a0703]" style={{ filter: "blur(8px)" }} />
          </div>
          <span className={`text-[10px] font-semibold ${current === "blur-strong" ? "text-[#F5C400]" : "text-white/40"}`}>{lang === "fr" ? "Flou fort" : "Strong blur"}</span>
        </button>
      </div>

      {/* Solid colors */}
      <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-2">{lang === "fr" ? "Couleur unie" : "Solid color"}</p>
      <div className="grid grid-cols-8 gap-1.5 mb-4">
        {SOLID_COLORS.map(c => (
          <button
            key={c.hex}
            onClick={() => onApply(c.hex)}
            title={c.label}
            className={`w-full rounded-lg border-2 transition ${current === c.hex ? "border-[#F5C400] scale-110" : "border-transparent hover:border-white/30"}`}
            style={{ aspectRatio: "1", backgroundColor: c.hex }}
          />
        ))}
      </div>

      {/* Custom image */}
      <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-2">{lang === "fr" ? "Image personnalisée" : "Custom image"}</p>
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-dashed border-white/20 text-white/40 hover:text-white/70 hover:border-white/40 transition text-xs font-semibold"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        {lang === "fr" ? "Choisir une image" : "Choose an image"}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({ messages, input, setInput, sendMessage, inputRef, messagesEndRef, lang }: {
  messages: ChatMessage[]; input: string; setInput: (v: string) => void;
  sendMessage: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  lang: string;
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-white/30 text-xs">{lang === "fr" ? "Commencez la conversation…" : "Start the conversation…"}</p>
          </div>
        ) : messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.isLocal ? "items-end" : "items-start"}`}>
            <span className="text-[10px] font-semibold mb-1" style={{ color: msg.isLocal ? "#F5C400" : "#9B8A6B" }}>
              {msg.sender.split(" ")[0]}
            </span>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              msg.isLocal ? "bg-[#F5C400] text-[#2D1A00] rounded-tr-sm" : "bg-[#2A1F0E] text-white/85 rounded-tl-sm"
            }`}>{renderWithLinks(msg.text)}</div>
            <span className="text-[9px] text-white/20 mt-1">
              {new Date(msg.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="px-3 py-3 border-t border-white/5 flex-shrink-0">
        <div className="flex items-end gap-2">
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={lang === "fr" ? "Écrire un message…" : "Write a message…"}
            className="flex-1 bg-[#1A1209] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/85 placeholder-white/20 focus:outline-none focus:border-[#F5C400]/40" />
          <button onClick={sendMessage} disabled={!input.trim()}
            className="w-9 h-9 flex-shrink-0 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] hover:bg-[#FFDE59] transition disabled:opacity-30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Info Panel ───────────────────────────────────────────────────────────────

function InfoPanel({ myName, otherName, elapsed, msgCount, quality, remoteQuality, isSandbox }: {
  myName: string; otherName: string; elapsed: number; msgCount: number;
  quality: ConnectionQuality; remoteQuality: ConnectionQuality; isSandbox?: boolean;
}) {
  const [tab, setTab]       = useState<"info" | "reseau" | "cles">("info");
  const [copied, setCopied] = useState(false);
  const roomLink = typeof window !== "undefined" ? window.location.href : "";
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
  const ql: Record<string, string> = {
    [ConnectionQuality.Excellent]: "Excellente", [ConnectionQuality.Good]: "Bonne",
    [ConnectionQuality.Poor]: "Faible", [ConnectionQuality.Lost]: "Perdue", [ConnectionQuality.Unknown]: "Inconnue",
  };
  function QRow({ q, lbl }: { q: ConnectionQuality; lbl: string }) {
    const col = q === ConnectionQuality.Excellent || q === ConnectionQuality.Good ? "text-emerald-400"
      : q === ConnectionQuality.Poor ? "text-yellow-400" : q === ConnectionQuality.Lost ? "text-red-400" : "text-white/40";
    return (
      <div className="bg-[#1A1209] rounded-xl p-4 border border-white/5">
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-wide mb-3">{lbl}</p>
        <div className="flex items-center gap-3"><QualityBars quality={q} /><span className={`text-sm font-semibold ${col}`}>{ql[q] ?? "Inconnue"}</span></div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-white/5 flex-shrink-0">
        {(["info","reseau","cles"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-[11px] font-semibold transition border-b-2 ${tab === t ? "text-[#F5C400] border-[#F5C400]" : "text-white/40 border-transparent hover:text-white/60"}`}>
            {t === "info" ? "Informations" : t === "reseau" ? "Réseau" : "Infos clés"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "info" && <>
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wide mb-2">Participants</p>
            {[myName + " (vous)", otherName].map((n, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#F5C400]/20 flex items-center justify-center text-[#F5C400] text-xs font-bold flex-shrink-0">
                  {n.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase()}
                </div>
                <span className="text-white/70 text-sm truncate">{n}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wide mb-2">Lien de la salle</p>
            <div className="bg-[#1A1209] rounded-xl px-3 py-2 border border-white/5 mb-2">
              <p className="text-[#9B8A6B] text-[11px] font-mono break-all leading-relaxed">{roomLink}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(roomLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
              className="w-full flex items-center justify-center gap-2 bg-[#2A1F0E] border border-[#3A2A0E] rounded-xl py-2.5 text-xs text-white/60 hover:text-white hover:bg-[#3A2A0E] transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              {copied ? "Lien copié !" : "Copier le lien"}
            </button>
          </div>
          {isSandbox && (
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
              <p className="text-amber-400 text-xs font-bold mb-1">Salle de test permanente</p>
              <p className="text-white/40 text-xs">Cette salle reste toujours ouverte. Partagez le lien ci-dessus pour inviter un participant.</p>
            </div>
          )}
        </>}
        {tab === "reseau" && <>
          <QRow q={quality}       lbl="Votre connexion" />
          <QRow q={remoteQuality} lbl={`Connexion de ${otherName.split(" ")[0]}`} />
        </>}
        {tab === "cles" && <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1A1209] rounded-xl p-3 border border-white/5 text-center">
              <p className="text-[#F5C400] text-2xl font-bold font-mono">{fmt(elapsed)}</p>
              <p className="text-white/40 text-xs mt-1">Durée</p>
            </div>
            <div className="bg-[#1A1209] rounded-xl p-3 border border-white/5 text-center">
              <p className="text-[#F5C400] text-2xl font-bold">{msgCount}</p>
              <p className="text-white/40 text-xs mt-1">Messages</p>
            </div>
          </div>
          <div className="bg-[#2A1F0E] border border-[#3A2A0E] rounded-xl p-4 text-center">
            <p className="text-4xl mb-3">🤖</p>
            <p className="text-white/60 text-sm font-semibold mb-1">Résumé IA</p>
            <p className="text-white/30 text-xs">Bientôt disponible — un résumé de la séance sera généré automatiquement.</p>
          </div>
        </>}
      </div>
    </div>
  );
}

// ─── ClassroomView ────────────────────────────────────────────────────────────

export function ClassroomView({ role, myName, otherName, durationMins, scheduledAt, bookingId, isSandbox, onLeave, elapsed: elapsedProp, onOverlayChange }: {
  role: "student" | "tutor"; myName: string; otherName: string;
  durationMins?: number; scheduledAt?: string; bookingId?: string;
  isSandbox?: boolean; onLeave: () => void;
  /** Timer injected from CallProvider so it survives navigation. Falls back to local timer. */
  elapsed?: number;
  /** Called whenever the whiteboard/canvas overlay opens or closes. */
  onOverlayChange?: (open: boolean) => void;
}) {
  const { lang } = useLanguage();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const room         = useRoomContext();

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  // Timer — uses injected elapsed from CallProvider when available; local fallback otherwise
  const startRef = useRef(scheduledAt ? new Date(scheduledAt).getTime() : Date.now());
  const [elapsedLocal, setElapsedLocal] = useState(0);
  useEffect(() => {
    if (elapsedProp !== undefined) return; // provider owns the timer
    const id = setInterval(() => setElapsedLocal(Math.max(0, Math.floor((Date.now() - startRef.current) / 1000))), 1000);
    return () => clearInterval(id);
  }, [elapsedProp]);
  const elapsed = elapsedProp ?? elapsedLocal;
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  // Tracks
  const remoteCamTrack  = tracks.find(t => !t.participant.isLocal && t.source === Track.Source.Camera);
  const localCamTrack   = tracks.find(t =>  t.participant.isLocal && t.source === Track.Source.Camera);
  const remoteScrnTrack = tracks.find(t => !t.participant.isLocal && t.source === Track.Source.ScreenShare);
  const localScrnTrack  = tracks.find(t =>  t.participant.isLocal && t.source === Track.Source.ScreenShare);
  const remotePart      = participants.find(p => !p.isLocal);
  const hasRemoteVideo  = !!(remoteCamTrack?.publication && !remoteCamTrack.publication.isMuted);
  const hasRemoteScreen = !!(remoteScrnTrack && isTrackReference(remoteScrnTrack) && remoteScrnTrack.publication && !remoteScrnTrack.publication.isMuted);
  const isSharing       = !!(localScrnTrack?.publication && !localScrnTrack.publication.isMuted);
  const displayOther    = remotePart?.name ?? otherName;
  const myInit          = myName.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
  const otherInit       = displayOther.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();

  // Connection quality
  const [quality,       setQuality]       = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  const [remoteQuality, setRemoteQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  useEffect(() => {
    const u = (q: ConnectionQuality) => setQuality(q);
    localParticipant.on(ParticipantEvent.ConnectionQualityChanged, u);
    setQuality(localParticipant.connectionQuality);
    return () => { localParticipant.off(ParticipantEvent.ConnectionQualityChanged, u); };
  }, [localParticipant]);
  useEffect(() => {
    if (!remotePart) return;
    const u = (q: ConnectionQuality) => setRemoteQuality(q);
    remotePart.on(ParticipantEvent.ConnectionQualityChanged, u);
    setRemoteQuality(remotePart.connectionQuality);
    return () => { remotePart.off(ParticipantEvent.ConnectionQualityChanged, u); };
  }, [remotePart]);

  // Leave / disconnect
  const userInitiatedLeaveRef = useRef(false);
  const [disconnected, setDisconnected] = useState(false);
  const { intentionalLeaveRef } = useCall();

  async function handleLeave() {
    userInitiatedLeaveRef.current = true;
    // Dispose background processor before leaving
    const pub = localParticipant.getTrackPublication(Track.Source.Camera);
    const vt  = pub?.videoTrack as LocalVideoTrack | undefined;
    if (vt) { try { await vt.stopProcessor(); } catch { /* ignore */ } }
    onLeave();
  }

  // Disconnect overlay — suppressed when leave was user-initiated (from here or from MiniCall)
  useEffect(() => {
    const onDisconnect = () => {
      if (!userInitiatedLeaveRef.current && !intentionalLeaveRef.current) setDisconnected(true);
    };
    room.on(RoomEvent.Disconnected, onDisconnect);
    return () => { room.off(RoomEvent.Disconnected, onDisconnect); };
  }, [room, intentionalLeaveRef]);

  // Mic toast
  const [micToast, setMicToast] = useState<string | null>(null);
  function showMicToast(msg: string) {
    setMicToast(msg);
    setTimeout(() => setMicToast(null), 3500);
  }

  // Link copied toast
  const [linkCopied, setLinkCopied] = useState(false);

  // Panel / dropdown / canvas state
  const [activePanel,  setActivePanel]  = useState<ActivePanel>(null);
  const [openDropdown, setOpenDropdown] = useState<Dropdown>(null);
  const [showPicker,   setShowPicker]   = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [boardFull, setBoardFull] = useState(true);

  function togglePanel(p: Exclude<ActivePanel, null>) { setActivePanel(prev => prev === p ? null : p); setOpenDropdown(null); setShowPicker(false); setBgPanelOpen(false); }
  function toggleDd(dd: Exclude<Dropdown, null>) { setOpenDropdown(prev => prev === dd ? null : dd); }

  useEffect(() => {
    if (!openDropdown) return;
    const close = () => setOpenDropdown(null);
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, [openDropdown]);

  // Close all popovers on Escape; opening one closes others
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenDropdown(null);
        setShowPicker(false);
        setBgPanelOpen(false);
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  // Opening bgPanel or picker closes the other
  function openBgPanel() { setBgPanelOpen(v => !v); setShowPicker(false); setOpenDropdown(null); }
  function openPicker()  { setShowPicker(v => !v);  setBgPanelOpen(false); setOpenDropdown(null); }

  // Notify global CallProvider when overlay opens/closes (so MiniCall becomes visible)
  useEffect(() => {
    onOverlayChange?.(boardOpen);
  }, [boardOpen, onOverlayChange]);

  // Devices
  const [audioIn,  setAudioIn]  = useState<MediaDeviceInfo[]>([]);
  const [audioOut, setAudioOut] = useState<MediaDeviceInfo[]>([]);
  const [videoIn,  setVideoIn]  = useState<MediaDeviceInfo[]>([]);
  const loadDevices = useCallback(async () => {
    const d = await navigator.mediaDevices.enumerateDevices();
    setAudioIn(d.filter(x => x.kind === "audioinput"));
    setAudioOut(d.filter(x => x.kind === "audiooutput"));
    setVideoIn(d.filter(x => x.kind === "videoinput"));
  }, []);

  // Data channel
  const enc = useRef(new TextEncoder());
  const dec = useRef(new TextDecoder());
  const sendData = useCallback((payload: object) => {
    localParticipant.publishData(enc.current.encode(JSON.stringify(payload)), { reliable: true });
  }, [localParticipant]);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [unread, setUnread]     = useState(0);
  const messagesEndRef          = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Reactions
  const [floatingReactions, setFloatReactions] = useState<FloatingReaction[]>([]);

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunks  = useRef<Blob[]>([]);
  const recTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording,   setRecording]   = useState(false);
  const [recSeconds,  setRecSeconds]  = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function startRecording() {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      let finalStream = screen;
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const actx = new AudioContext();
        const dest = actx.createMediaStreamDestination();
        if (screen.getAudioTracks().length) actx.createMediaStreamSource(screen).connect(dest);
        actx.createMediaStreamSource(mic).connect(dest);
        finalStream = new MediaStream([...screen.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      } catch { /* mic unavailable, screen audio only */ }
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9"
                 : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "";
      const mr = new MediaRecorder(finalStream, mime ? { mimeType: mime } : {});
      recordingChunks.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) recordingChunks.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(recordingChunks.current, { type: "video/webm" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = `seance-${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.webm`; a.click();
        URL.revokeObjectURL(url);
        finalStream.getTracks().forEach(t => t.stop());
        setRecording(false); setRecSeconds(0);
        if (recTimerRef.current) clearInterval(recTimerRef.current);
      };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setRecording(true); setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch { /* user cancelled */ }
  }
  function stopRecording() { mediaRecorderRef.current?.stop(); }

  // Virtual background
  const [bgPanelOpen,  setBgPanelOpen]  = useState(false);
  const [currentBg,    setCurrentBg]    = useState<BgChoice>("none");
  const [bgApplying,   setBgApplying]   = useState(false);

  async function applyBackground(choice: BgChoice) {
    const pub = localParticipant.getTrackPublication(Track.Source.Camera);
    const videoTrack = pub?.videoTrack as LocalVideoTrack | undefined;
    if (!videoTrack) return;
    setBgApplying(true);
    try {
      // Always stop any existing processor first to avoid WebGL context accumulation
      try { await videoTrack.stopProcessor(); } catch { /* ignore if none */ }
      if (choice === "none") {
        // already stopped above
      } else if (choice === "blur-soft" || choice === "blur-strong") {
        const { BackgroundBlur } = await import("@livekit/track-processors");
        await videoTrack.setProcessor(BackgroundBlur(choice === "blur-soft" ? 10 : 25));
      } else {
        // Solid color hex or custom image data URL
        const { VirtualBackground } = await import("@livekit/track-processors");
        const url = choice.startsWith("#") ? solidDataUrl(choice) : choice;
        await videoTrack.setProcessor(VirtualBackground(url));
      }
      setCurrentBg(choice);
    } catch (err) {
      console.error("Background error:", err);
    } finally {
      setBgApplying(false);
    }
  }

  // Whiteboard (excalidraw)
  const [incomingSync, setIncomingSync] = useState<ExcalidrawSync | null>(null);

  // Data receiver
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const handle = (payload: Uint8Array, _p: any) => {
      try {
        const msg = JSON.parse(dec.current.decode(payload));
        switch (msg.type) {
          case "chat":
            setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: msg.sender, text: msg.text, time: msg.time, isLocal: false }]);
            setActivePanel(prev => { if (prev !== "chat") setUnread(n => n + 1); return prev; });
            break;
          case "reaction":     addFloat(msg.emoji, msg.sender); break;
          case "excalidraw-sync": setIncomingSync({ elements: msg.elements ?? [], files: msg.files, version: msg.version ?? 0 }); break;
        }
      } catch { /* ignore */ }
    };
    room.on(RoomEvent.DataReceived, handle);
    return () => { room.off(RoomEvent.DataReceived, handle); };
  }, [room]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (activePanel === "chat") { setUnread(0); setTimeout(() => inputRef.current?.focus(), 50); } }, [activePanel]);

  function sendMessage() {
    const text = input.trim(); if (!text) return;
    sendData({ type: "chat", sender: myName, text, time: Date.now() });
    setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: myName, text, time: Date.now(), isLocal: true }]);
    setInput("");
  }
  function addFloat(emoji: string, sender: string) {
    const id = crypto.randomUUID();
    setFloatReactions(prev => [...prev, { id, emoji, sender, x: 30 + Math.random() * 40 }]);
    setTimeout(() => setFloatReactions(prev => prev.filter(r => r.id !== id)), 2500);
  }
  function sendReaction(emoji: string) { sendData({ type: "reaction", sender: myName, emoji }); addFloat(emoji, myName); setShowPicker(false); }
  async function toggleScreen() { try { await localParticipant.setScreenShareEnabled(!isSharing); } catch { /* cancelled */ } }

  const panelTitles: Record<string, string> = { chat: "Chat", info: lang === "fr" ? "Informations" : "Info" };

  return (
    <div className="h-screen flex flex-col bg-[#0F0A04] overflow-hidden select-none">

      {/* Disconnect overlay (Fix 10) */}
      {disconnected && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1209] border border-[#3A2A0E] rounded-2xl px-8 py-8 text-center max-w-sm w-full mx-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 17.657a9 9 0 010-12.728M9.172 15.536a5 5 0 010-7.072" /></svg>
            </div>
            <p className="text-white font-bold text-base mb-1">{lang === "fr" ? "Connexion perdue" : "Connection lost"}</p>
            <p className="text-white/40 text-sm mb-6">{lang === "fr" ? "Reconnexion en cours…" : "Reconnecting…"}</p>
            <div className="flex gap-3">
              <button onClick={() => window.location.reload()}
                className="flex-1 bg-[#F5C400] text-[#5C3D00] font-bold text-sm py-2.5 rounded-xl hover:bg-[#FFDE59] transition">
                {lang === "fr" ? "Reconnecter" : "Reconnect"}
              </button>
              <button onClick={() => { userInitiatedLeaveRef.current = true; onLeave(); }}
                className="flex-1 bg-white/5 text-white/60 font-semibold text-sm py-2.5 rounded-xl hover:bg-white/10 transition">
                {lang === "fr" ? "Quitter" : "Leave"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mic error toast (Fix 4) — placed at top to avoid overlapping dropdown */}
      {micToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-red-900/90 border border-red-700/50 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xl pointer-events-none">
          {micToast}
        </div>
      )}

      {/* MiniCall overlay is handled globally by CallProvider/MiniCall */}

      {/* Whiteboard (excalidraw) */}
      <ExcalidrawBoard
        bookingId={bookingId}
        lang={lang}
        isOpen={boardOpen}
        isFull={boardFull}
        onClose={() => setBoardOpen(false)}
        onToggleFull={() => setBoardFull(v => !v)}
        sendData={sendData}
        incomingSync={incomingSync}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#0A0703] border-b border-white/5 flex-shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WithYou" className="h-6 w-auto opacity-70 flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          {isSandbox ? (
            <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-700/40 px-3 py-1 rounded-full flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 text-[11px] font-bold">{lang === "fr" ? "SALLE DE TEST" : "SANDBOX"}</span>
            </div>
          ) : (
            <>
              <div className="w-px h-5 bg-white/10 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white/70 text-xs font-semibold leading-tight truncate">
                  {lang === "fr" ? "Séance avec" : "Session with"} <span className="text-[#F5C400]">{displayOther}</span>
                </p>
                <p className="text-white/25 text-[10px] leading-tight capitalize">
                  {role === "student" ? (lang === "fr" ? "Étudiant" : "Student") : (lang === "fr" ? "Tuteur" : "Tutor")}{durationMins ? ` · ${durationMins} min` : ""}
                </p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {recording && (
            <div className="flex items-center gap-2 bg-red-950/60 border border-red-700/50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-[11px] font-bold font-mono">{fmt(recSeconds)}</span>
              <button onClick={stopRecording} className="text-red-400/70 hover:text-red-300 text-[10px] ml-1 underline">Arrêter</button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-[#1A1209] border border-[#F5C400]/20 px-4 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F5C400] animate-pulse" />
            <span className="text-[#F5C400] font-mono text-sm font-bold tracking-widest">{fmt(elapsed)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#1A1209] border border-white/5 px-3 py-1.5 rounded-full" title="Qualité de connexion">
            <QualityBars quality={quality} />
          </div>
        </div>
        <button onClick={handleLeave} aria-label={lang === "fr" ? "Quitter la séance" : "Leave session"}
          className="flex items-center gap-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {lang === "fr" ? "Quitter" : "Leave"}
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative overflow-hidden">

          {/* Main display */}
          {hasRemoteScreen && remoteScrnTrack && isTrackReference(remoteScrnTrack) ? (
            // Screen share → plein écran
            <div className="absolute inset-0 bg-black flex flex-col">
              <VideoTrack trackRef={remoteScrnTrack} className="flex-1 w-full object-contain" />
              {/* Self PiP over screen share */}
              <div className="absolute bottom-4 right-4 w-36 rounded-xl overflow-hidden shadow-xl border border-white/20 bg-[#1A1209]" style={{ aspectRatio: "16/9" }}>
                {localCamTrack && isCameraEnabled && isTrackReference(localCamTrack) ? (
                  <VideoTrack trackRef={localCamTrack} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#2A1F0E]">
                    <div className="w-8 h-8 rounded-full bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-sm">{myInit}</div>
                  </div>
                )}
                <span className="absolute bottom-1 left-1.5 text-white/60 text-[9px] font-semibold bg-black/50 px-1 py-0.5 rounded">Vous</span>
              </div>
              {/* Banner */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-white/70 text-xs font-semibold">{displayOther} partage son écran</span>
              </div>
            </div>
          ) : remotePart ? (
            // En appel → participant distant plein écran + PiP local
            <div className="absolute inset-0 bg-[#080503]">

              {/* Participant distant — plein écran */}
              <div className="absolute inset-0 overflow-hidden">
                {hasRemoteVideo && remoteCamTrack && isTrackReference(remoteCamTrack) ? (
                  <VideoTrack trackRef={remoteCamTrack} className="w-full h-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#F5C400] to-[#C49200] flex items-center justify-center text-[#5C3D00] font-bold text-4xl shadow-lg">{otherInit}</div>
                    <p className="text-white/60 text-sm font-semibold">{displayOther}</p>
                    <p className="text-white/30 text-xs">Caméra désactivée</p>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-white/80 text-[11px] font-semibold bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md">{displayOther}</span>
                </div>
              </div>

              {/* PiP local — coin bas droite */}
              <div className="absolute bottom-4 right-4 w-44 rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-[#1A1209]" style={{ aspectRatio: "16/9" }}>
                {localCamTrack && isCameraEnabled && isTrackReference(localCamTrack) ? (
                  <VideoTrack trackRef={localCamTrack} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#2A1F0E]">
                    <div className="w-10 h-10 rounded-full bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold">{myInit}</div>
                  </div>
                )}
                <div className="absolute bottom-1 left-1.5 flex items-center gap-1">
                  {!isMicrophoneEnabled && (
                    <div className="w-3.5 h-3.5 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /></svg>
                    </div>
                  )}
                  <span className="text-white/60 text-[9px] font-semibold bg-black/50 px-1 py-0.5 rounded">Vous</span>
                </div>
              </div>

              {/* Bannière partage écran local */}
              {isSharing && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#F5C400] animate-pulse" />
                  <span className="text-white/70 text-xs font-semibold">Vous partagez votre écran</span>
                </div>
              )}
            </div>
          ) : (
            // En attente de l'autre participant
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-[#1C1308] to-[#0A0703]">
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
                <p className="text-white/60 text-sm font-semibold">{lang === "fr" ? "En attente d'un participant…" : "Waiting for a participant…"}</p>
                <p className="text-white/20 text-xs mt-2">{lang === "fr" ? "Partage ce lien pour inviter" : "Share this link to invite"}</p>
                <div className="mt-3 bg-[#1A1209] border border-[#3A2A0E] rounded-xl px-3 py-2 inline-flex items-center gap-2 max-w-xs">
                  <p className="text-[#9B8A6B] text-xs font-mono truncate flex-1">
                    {typeof window !== "undefined" ? window.location.href : (isSandbox ? "/classroom/sandbox" : `/classroom/${(bookingId ?? "").slice(0,8)}`)}
                  </p>
                  <button
                    onClick={() => {
                      const url = typeof window !== "undefined" ? window.location.href : "";
                      navigator.clipboard.writeText(url).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); });
                    }}
                    className="flex-shrink-0 text-[10px] font-bold text-[#F5C400] bg-[#F5C400]/10 hover:bg-[#F5C400]/20 px-2 py-1 rounded-lg transition">
                    {linkCopied ? (lang === "fr" ? "Lien copié" : "Copied!") : (lang === "fr" ? "Copier" : "Copy")}
                  </button>
                </div>
              </div>
              {/* Aperçu caméra locale */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#1A1209]"
                style={{ width: 280, aspectRatio: "16/9" }}>
                {localCamTrack && isCameraEnabled && isTrackReference(localCamTrack) ? (
                  <VideoTrack trackRef={localCamTrack} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#2A1F0E]">
                    <div className="w-12 h-12 rounded-full bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold">{myInit}</div>
                  </div>
                )}
                <span className="absolute bottom-2 left-2.5 text-white/60 text-[10px] font-semibold bg-black/40 px-1.5 py-0.5 rounded-md">{lang === "fr" ? "Vous" : "You"}</span>
              </div>
            </div>
          )}

          {/* Floating reactions */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {floatingReactions.map(r => (
              <div key={r.id} className="absolute bottom-24 flex flex-col items-center"
                style={{ left: `${r.x}%`, animation: "floatUp 2.5s ease-out forwards" }}>
                <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
                <span className="text-white/50 text-[10px] mt-1 font-medium">{r.sender.split(" ")[0]}</span>
              </div>
            ))}
          </div>

          {/* Reaction picker moved to above Réagir button in control bar */}
        </div>

        {/* Side panel */}
        {activePanel && (
          <div className="w-80 flex flex-col bg-[#0D0904] border-l border-white/5 flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
              <p className="text-white/80 text-sm font-bold">{panelTitles[activePanel]}</p>
              <button onClick={() => setActivePanel(null)} className="text-white/30 hover:text-white/70 transition p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              {activePanel === "chat" && <ChatPanel messages={messages} input={input} setInput={setInput} sendMessage={sendMessage} inputRef={inputRef} messagesEndRef={messagesEndRef} lang={lang} />}
              {activePanel === "info" && <InfoPanel myName={myName} otherName={displayOther} elapsed={elapsed} msgCount={messages.length} quality={quality} remoteQuality={remoteQuality} isSandbox={isSandbox} />}
            </div>
          </div>
        )}
      </div>

      {/* Virtual background panel — slides up above control bar */}
      {bgPanelOpen && (
        <div className="flex-shrink-0 bg-transparent px-4 pt-2 pb-0 z-20 flex justify-center">
          <VirtualBgPanel
            onClose={() => setBgPanelOpen(false)}
            onApply={async (c) => { await applyBackground(c); }}
            current={currentBg}
            applying={bgApplying}
          />
        </div>
      )}

      {/* Control bar */}
      <div className="flex-shrink-0 bg-[#0A0703] border-t border-white/5 px-4 py-3 z-10">
        <div className="flex items-center justify-center gap-2 flex-wrap">

          {/* Micro + chevron */}
          <div className="relative flex items-end gap-px">
            <button
              aria-label={isMicrophoneEnabled ? (lang === "fr" ? "Couper le micro" : "Mute microphone") : (lang === "fr" ? "Activer le micro" : "Unmute microphone")}
              title={isMicrophoneEnabled ? (lang === "fr" ? "Couper le micro" : "Mute microphone") : (lang === "fr" ? "Activer le micro" : "Unmute microphone")}
              onClick={async () => {
                try {
                  await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
                } catch (err: unknown) {
                  const name = (err as { name?: string })?.name;
                  if (name === "NotFoundError") showMicToast(lang === "fr" ? "Aucun microphone détecté" : "No microphone found");
                  else if (name === "NotAllowedError") showMicToast(lang === "fr" ? "Accès au micro refusé" : "Microphone access denied");
                  else showMicToast(lang === "fr" ? "Impossible d'activer le micro" : "Could not enable microphone");
                }
              }}
              className="flex flex-col items-center gap-1 group">
              <div className={`w-12 h-12 rounded-l-2xl flex items-center justify-center transition border-y border-l ${isMicrophoneEnabled ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white" : "bg-red-600/90 hover:bg-red-600 border-transparent text-white"}`}>
                {isMicrophoneEnabled
                  ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM3 3l18 18" /></svg>
                }
              </div>
              <span className="text-[10px] text-white/30 group-hover:text-white/50 transition">{isMicrophoneEnabled ? (lang === "fr" ? "Micro" : "Mic") : (lang === "fr" ? "Muet" : "Muted")}</span>
            </button>
            <button
              aria-label={lang === "fr" ? "Choisir le microphone" : "Choose microphone"}
              title={lang === "fr" ? "Choisir le microphone" : "Choose microphone"}
              onClick={e => { e.stopPropagation(); loadDevices(); toggleDd("micro"); }}
              className={`h-12 w-5 rounded-r-xl flex items-center justify-center transition border-y border-r mb-[18px] ${isMicrophoneEnabled ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white/40 hover:text-white" : "bg-red-700 hover:bg-red-600 border-transparent text-white/60"}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {openDropdown === "micro" && (
              <div className="absolute bottom-full mb-2 left-0 bg-[#1A1209] border border-[#3A2A0E] rounded-2xl shadow-2xl py-2 min-w-[220px] z-50" onClick={e => e.stopPropagation()}>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider px-4 pt-1 pb-2">{lang === "fr" ? "Microphone" : "Microphone"}</p>
                {audioIn.length > 0
                  ? audioIn.map(d => <button key={d.deviceId} onClick={() => { room.switchActiveDevice("audioinput", d.deviceId); setOpenDropdown(null); }} className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition truncate">{d.label || `Micro ${d.deviceId.slice(0,6)}`}</button>)
                  : <p className="text-white/30 text-xs px-4 pb-2">{lang === "fr" ? "Aucun microphone trouvé" : "No microphone found"}</p>
                }
                {audioOut.length > 0 && <><div className="border-t border-white/5 my-1.5" /><p className="text-white/30 text-[10px] font-bold uppercase tracking-wider px-4 pb-2">{lang === "fr" ? "Haut-parleur" : "Speaker"}</p>
                  {audioOut.map(d => <button key={d.deviceId} onClick={() => { room.switchActiveDevice("audiooutput", d.deviceId); setOpenDropdown(null); }} className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition truncate">{d.label || (lang === "fr" ? `Haut-parleur ${d.deviceId.slice(0,6)}` : `Speaker ${d.deviceId.slice(0,6)}`)}</button>)}</>}
              </div>
            )}
          </div>

          {/* Camera + chevron */}
          <div className="relative flex items-end gap-px">
            <button
              aria-label={isCameraEnabled ? (lang === "fr" ? "Couper la caméra" : "Turn off camera") : (lang === "fr" ? "Activer la caméra" : "Turn on camera")}
              title={isCameraEnabled ? (lang === "fr" ? "Couper la caméra" : "Turn off camera") : (lang === "fr" ? "Activer la caméra" : "Turn on camera")}
              onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
              className="flex flex-col items-center gap-1 group">
              <div className={`w-12 h-12 rounded-l-2xl flex items-center justify-center transition border-y border-l ${isCameraEnabled ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white" : "bg-red-600/90 hover:bg-red-600 border-transparent text-white"}`}>
                {isCameraEnabled
                  ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" /></svg>
                }
              </div>
              <span className="text-[10px] text-white/30 group-hover:text-white/50 transition">{isCameraEnabled ? (lang === "fr" ? "Caméra" : "Camera") : (lang === "fr" ? "Arrêtée" : "Off")}</span>
            </button>
            <button
              aria-label={lang === "fr" ? "Choisir la caméra" : "Choose camera"}
              title={lang === "fr" ? "Choisir la caméra" : "Choose camera"}
              onClick={e => { e.stopPropagation(); loadDevices(); toggleDd("camera"); }}
              className={`h-12 w-5 rounded-r-xl flex items-center justify-center transition border-y border-r mb-[18px] ${isCameraEnabled ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white/40 hover:text-white" : "bg-red-700 hover:bg-red-600 border-transparent text-white/60"}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {openDropdown === "camera" && (
              <div className="absolute bottom-full mb-2 left-0 bg-[#1A1209] border border-[#3A2A0E] rounded-2xl shadow-2xl py-2 min-w-[200px] z-50" onClick={e => e.stopPropagation()}>
                {videoIn.length > 0 ? <><p className="text-white/30 text-[10px] font-bold uppercase tracking-wider px-4 pt-1 pb-2">Caméra</p>{videoIn.map(d => <button key={d.deviceId} onClick={() => { room.switchActiveDevice("videoinput", d.deviceId); setOpenDropdown(null); }} className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition truncate">{d.label || `Caméra ${d.deviceId.slice(0,6)}`}</button>)}</> : <p className="text-white/30 text-sm px-4 py-3">Aucune caméra trouvée</p>}
              </div>
            )}
          </div>

          <div className="w-px h-10 bg-white/10 mx-1" />

          {/* Tableau blanc */}
          <BarBtn active={boardOpen} label={lang === "fr" ? "Tableau" : "Board"} onClick={() => setBoardOpen(v => !v)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
          />

          {/* Arrière-plan */}
          <div className="relative">
            <BarBtn active={bgPanelOpen || currentBg !== "none"} label={lang === "fr" ? "Fond" : "Background"} onClick={openBgPanel}
              icon={
                <div className="relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {currentBg !== "none" && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#F5C400] border border-[#0A0703]" />
                  )}
                </div>
              }
            />
          </div>

          {/* Partager */}
          <BarBtn active={isSharing} label={lang === "fr" ? "Partager" : "Share"} onClick={toggleScreen} blue={true}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
          />

          {/* Chat */}
          <div className="relative">
            <BarBtn active={activePanel === "chat"} label="Chat" onClick={() => togglePanel("chat")}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
            />
            {unread > 0 && <span className="absolute top-0 right-0 w-5 h-5 bg-[#F5C400] text-[#5C3D00] text-[9px] font-black rounded-full flex items-center justify-center pointer-events-none">{unread > 9 ? "9+" : unread}</span>}
          </div>

          {/* Réagir — picker anchored above this button */}
          <div className="relative flex flex-col items-center">
            {showPicker && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-[#1A1209] border border-[#3A2A0E] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
                  {REACTIONS.map(e => <button key={e} onClick={() => sendReaction(e)} aria-label={e} className="text-2xl hover:scale-125 transition-transform">{e}</button>)}
                </div>
                <div className="w-3 h-3 bg-[#1A1209] border-r border-b border-[#3A2A0E] rotate-45 mx-auto -mt-1.5" />
              </div>
            )}
            <button
              aria-label={lang === "fr" ? "Réagir" : "React"}
              title={lang === "fr" ? "Envoyer une réaction" : "Send a reaction"}
              onClick={openPicker}
              className="flex flex-col items-center gap-1 group">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition border ${showPicker ? "bg-[#F5C400]/20 border-[#F5C400]/40" : "bg-[#2A1F0E] border-[#3A2A0E] text-white/70 hover:text-white hover:bg-[#3A2A0E]"}`}>😊</div>
              <span className={`text-[10px] transition ${showPicker ? "text-[#F5C400]/80" : "text-white/30 group-hover:text-white/50"}`}>{lang === "fr" ? "Réagir" : "React"}</span>
            </button>
          </div>

          <div className="w-px h-10 bg-white/10 mx-1" />

          {/* Quitter */}
          <button onClick={handleLeave} aria-label={lang === "fr" ? "Quitter la séance" : "Leave session"} title={lang === "fr" ? "Quitter la séance" : "Leave session"} className="flex flex-col items-center gap-1 group">
            <div className="w-14 h-12 rounded-2xl bg-red-600 hover:bg-red-500 flex items-center justify-center transition shadow-[0_4px_20px_rgba(239,68,68,0.35)]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </div>
            <span className="text-[10px] text-red-400/60">{lang === "fr" ? "Quitter" : "Leave"}</span>
          </button>

        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0%   { opacity:1; transform:translateY(0) scale(1); }
          20%  { opacity:1; transform:translateY(-20px) scale(1.2); }
          100% { opacity:0; transform:translateY(-120px) scale(0.8); }
        }
      `}</style>
    </div>
  );
}
