"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  VideoTrack,
  isTrackReference,
} from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: number;
  isLocal: boolean;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  sender: string;
  x: number;
}

const REACTIONS = ["👍", "❤️", "😂", "🎉", "🤔", "👏"];

function renderWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="text-[#F5C400] underline underline-offset-2 break-all hover:text-[#FFDE59]">
        {part}
      </a>
    ) : <span key={i}>{part}</span>
  );
}

// ─── Classroom view ───────────────────────────────────────────────────────────

function SandboxView({ myName, onLeave }: { myName: string; onLeave: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const room = useRoomContext();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera,      withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Tracks
  const remoteCameraTrack = tracks.find(t => !t.participant.isLocal && t.source === Track.Source.Camera);
  const localCameraTrack  = tracks.find(t =>  t.participant.isLocal && t.source === Track.Source.Camera);
  const remoteParticipant = participants.find(p => !p.isLocal);
  const hasRemoteVideo    = !!(remoteCameraTrack?.publication && !remoteCameraTrack.publication.isMuted);

  const otherName = remoteParticipant?.name ?? "En attente…";
  const otherInit = otherName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const myInit    = myName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  // Data channel
  const encoder = useRef(new TextEncoder());
  const decoder = useRef(new TextDecoder());

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [unread, setUnread]     = useState(0);
  const messagesEndRef          = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Reactions
  const [showPicker, setShowPicker]             = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleData = (payload: Uint8Array, _p: any) => {
      try {
        const msg = JSON.parse(decoder.current.decode(payload));
        if (msg.type === "chat") {
          setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: msg.sender, text: msg.text, time: msg.time, isLocal: false }]);
          setChatOpen(prev => { if (!prev) setUnread(n => n + 1); return prev; });
        } else if (msg.type === "reaction") {
          addFloating(msg.emoji, msg.sender);
        }
      } catch { /* ignore */ }
    };
    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (chatOpen) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 50); } }, [chatOpen]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const payload = { type: "chat", sender: myName, text, time: Date.now() };
    localParticipant.publishData(encoder.current.encode(JSON.stringify(payload)), { reliable: true });
    setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: myName, text, time: Date.now(), isLocal: true }]);
    setInput("");
  }

  function addFloating(emoji: string, sender: string) {
    const id = crypto.randomUUID();
    setFloatingReactions(prev => [...prev, { id, emoji, sender, x: 30 + Math.random() * 40 }]);
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2500);
  }

  function sendReaction(emoji: string) {
    const payload = { type: "reaction", sender: myName, emoji };
    localParticipant.publishData(encoder.current.encode(JSON.stringify(payload)), { reliable: true });
    addFloating(emoji, myName);
    setShowPicker(false);
  }

  return (
    <div className="h-screen flex flex-col bg-[#0F0A04] overflow-hidden select-none">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#0A0703] border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#F5C400] font-bold text-sm">WithYou</span>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-700/40 px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-[11px] font-bold">SALLE DE TEST</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#1A1209] border border-[#F5C400]/20 px-4 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F5C400] animate-pulse" />
          <span className="text-[#F5C400] font-mono text-sm font-bold tracking-widest">{fmt(elapsed)}</span>
        </div>
        <button onClick={onLeave}
          className="flex items-center gap-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition">
          Quitter
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video */}
        <div className="flex-1 relative overflow-hidden">
          {hasRemoteVideo && remoteCameraTrack && isTrackReference(remoteCameraTrack) ? (
            <VideoTrack trackRef={remoteCameraTrack} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1C1308] to-[#0A0703]">
              {remoteParticipant ? (
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#F5C400] to-[#C49200] flex items-center justify-center text-[#5C3D00] font-bold text-5xl mx-auto mb-5">
                    {otherInit}
                  </div>
                  <p className="text-white/70 text-sm font-semibold">{otherName}</p>
                  <p className="text-white/30 text-xs mt-1">Caméra désactivée</p>
                </div>
              ) : (
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
                  <p className="text-white/60 text-sm font-semibold">En attente de l&apos;autre participant…</p>
                  <p className="text-white/20 text-xs mt-2">Partage ce lien :</p>
                  <div className="mt-2 bg-[#1A1209] border border-[#3A2A0E] rounded-xl px-4 py-2 inline-block">
                    <p className="text-[#9B8A6B] text-xs font-mono">/classroom/sandbox</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {remoteParticipant && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-white/90 text-xs font-semibold">{otherName}</p>
            </div>
          )}

          {/* Self PiP */}
          <div className="absolute bottom-4 right-4 w-44 h-28 rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)] border-2 border-[#F5C400]/30 bg-[#1A1209]">
            {localCameraTrack && isCameraEnabled && isTrackReference(localCameraTrack) ? (
              <VideoTrack trackRef={localCameraTrack} className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#2A1F0E]">
                <div className="w-12 h-12 rounded-full bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold">{myInit}</div>
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

          {/* Reaction picker */}
          {showPicker && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
              <div className="bg-[#1A1209] border border-[#3A2A0E] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => sendReaction(emoji)}
                    className="text-2xl hover:scale-125 transition-transform">{emoji}</button>
                ))}
              </div>
              <div className="w-3 h-3 bg-[#1A1209] border-r border-b border-[#3A2A0E] rotate-45 mx-auto -mt-1.5" />
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <div className="w-72 flex flex-col bg-[#0D0904] border-l border-white/5 flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
              <p className="text-white/80 text-sm font-bold">Chat</p>
              <button onClick={() => setChatOpen(false)} className="text-white/30 hover:text-white/70 transition p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-3xl mb-2">💬</p>
                  <p className="text-white/30 text-xs">Commencez la conversation…</p>
                </div>
              ) : messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.isLocal ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] font-semibold mb-1" style={{ color: msg.isLocal ? "#F5C400" : "#9B8A6B" }}>
                    {msg.sender.split(" ")[0]}
                  </span>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.isLocal ? "bg-[#F5C400] text-[#2D1A00] rounded-tr-sm" : "bg-[#2A1F0E] text-white/85 rounded-tl-sm"
                  }`}>
                    {renderWithLinks(msg.text)}
                  </div>
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
                  placeholder="Écrire un message…"
                  className="flex-1 bg-[#1A1209] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/85 placeholder-white/20 focus:outline-none focus:border-[#F5C400]/40" />
                <button onClick={sendMessage} disabled={!input.trim()}
                  className="w-9 h-9 flex-shrink-0 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] hover:bg-[#FFDE59] transition disabled:opacity-30">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex-shrink-0 bg-[#0A0703] border-t border-white/5 px-8 py-4">
        <div className="flex items-center justify-center gap-3">
          {/* Mic */}
          <CtrlBtn active={isMicrophoneEnabled} label={isMicrophoneEnabled ? "Micro" : "Muet"}
            onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
            activeIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
            inactiveIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM3 3l18 18" /></svg>}
          />
          {/* Camera */}
          <CtrlBtn active={isCameraEnabled} label={isCameraEnabled ? "Caméra" : "Arrêtée"}
            onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
            activeIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
            inactiveIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" /></svg>}
          />
          <div className="w-px h-10 bg-white/10 mx-1" />
          {/* Reactions */}
          <button onClick={() => setShowPicker(v => !v)} className="flex flex-col items-center gap-1 group">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition border ${showPicker ? "bg-[#F5C400]/20 border-[#F5C400]/40 text-[#F5C400]" : "bg-[#2A1F0E] border-[#3A2A0E] text-white/70 hover:text-white hover:bg-[#3A2A0E]"}`}>😊</div>
            <span className="text-[10px] text-white/30 group-hover:text-white/50 transition">Réagir</span>
          </button>
          {/* Chat */}
          <button onClick={() => setChatOpen(v => !v)} className="flex flex-col items-center gap-1 group relative">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition border ${chatOpen ? "bg-[#F5C400]/20 border-[#F5C400]/40 text-[#F5C400]" : "bg-[#2A1F0E] border-[#3A2A0E] text-white/70 hover:text-white hover:bg-[#3A2A0E]"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#F5C400] text-[#5C3D00] text-[9px] font-black rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </div>
            <span className="text-[10px] text-white/30 group-hover:text-white/50 transition">Chat</span>
          </button>
          <div className="w-px h-10 bg-white/10 mx-1" />
          {/* End */}
          <button onClick={onLeave} className="flex flex-col items-center gap-1 group">
            <div className="w-14 h-12 rounded-2xl bg-red-600 hover:bg-red-500 flex items-center justify-center transition shadow-[0_4px_20px_rgba(239,68,68,0.35)]">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </div>
            <span className="text-[10px] text-red-400/60">Quitter</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          20%  { opacity: 1; transform: translateY(-20px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-120px) scale(0.8); }
        }
      `}</style>
    </div>
  );
}

function CtrlBtn({ active, onClick, label, activeIcon, inactiveIcon }: {
  active: boolean; onClick: () => void; label: string;
  activeIcon: React.ReactNode; inactiveIcon: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition border ${
        active ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white" : "bg-red-600/90 hover:bg-red-600 border-transparent text-white"
      }`}>{active ? activeIcon : inactiveIcon}</div>
      <span className="text-[10px] text-white/30 group-hover:text-white/50 transition">{label}</span>
    </button>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SandboxClient() {
  const [token, setToken]       = useState<string | null>(null);
  const [myName, setMyName]     = useState("Participant");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [left, setLeft]         = useState(false);
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

  useEffect(() => {
    fetch("/api/livekit/sandbox-token")
      .then(r => r.json())
      .then(d => { setToken(d.token); setMyName(d.displayName); })
      .catch(() => setError("Erreur réseau."))
      .finally(() => setLoading(false));
  }, []);

  if (left) return (
    <div className="h-screen bg-[#0F0A04] flex items-center justify-center px-6">
      <div className="bg-[#1A1209] rounded-2xl border border-[#3A2A0E] p-10 max-w-sm w-full text-center">
        <p className="text-xl font-bold text-white mb-2">Séance terminée</p>
        <p className="text-sm text-[#9B8A6B] mb-6">Vous avez quitté la salle sandbox.</p>
        <a href="/classroom/sandbox" className="block w-full bg-[#F5C400] text-[#5C3D00] py-3 rounded-xl font-bold text-sm hover:bg-[#FFDE59] transition text-center">
          Rejoindre à nouveau →
        </a>
      </div>
    </div>
  );

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
        <a href="/dashboard" className="block w-full bg-[#F5C400] text-[#5C3D00] py-3 rounded-xl font-bold text-sm">Retour</a>
      </div>
    </div>
  );

  return (
    <LiveKitRoom video={true} audio={true} token={token!} serverUrl={serverUrl}
      onDisconnected={() => setLeft(true)} style={{ height: "100vh" }}>
      <SandboxView myName={myName} onLeave={() => setLeft(true)} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
