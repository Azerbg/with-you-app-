"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  useTracks,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  VideoTrack,
  isTrackReference,
} from "@livekit/components-react";
import { Track, RoomEvent, ConnectionQuality, ParticipantEvent } from "livekit-client";

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

interface WbStroke {
  color: string;
  width: number;
  points: [number, number][];
}

type ActivePanel = "chat" | "canvas" | "whiteboard" | "info" | null;
type Dropdown = "micro" | "camera" | "outils" | "plus" | null;

const REACTIONS = ["👍", "❤️", "😂", "🎉", "🤔", "👏"];

// ─── Utility ──────────────────────────────────────────────────────────────────

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

// ─── Connection Quality ───────────────────────────────────────────────────────

function QualityBars({ quality }: { quality: ConnectionQuality }) {
  const isExcellent = quality === ConnectionQuality.Excellent;
  const isGoodOrMore = isExcellent || quality === ConnectionQuality.Good;
  const isAnySignal  = isGoodOrMore || quality === ConnectionQuality.Poor;
  const isLost       = quality === ConnectionQuality.Lost;

  const c1 = isLost ? "bg-red-400" : isAnySignal ? (quality === ConnectionQuality.Poor ? "bg-yellow-400" : "bg-emerald-400") : "bg-white/20";
  const c2 = isGoodOrMore ? "bg-emerald-400" : "bg-white/20";
  const c3 = isExcellent  ? "bg-emerald-400" : "bg-white/20";

  return (
    <div className="flex items-end gap-0.5 h-3.5">
      <div className={`w-1 h-1.5 rounded-sm ${c1}`} />
      <div className={`w-1 h-2.5 rounded-sm ${c2}`} />
      <div className={`w-1 h-3.5 rounded-sm ${c3}`} />
    </div>
  );
}

// ─── Bar Button ───────────────────────────────────────────────────────────────

function BarBtn({
  active, label, onClick, icon, yellowActive = true,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  yellowActive?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition border ${
        active && yellowActive
          ? "bg-[#F5C400]/20 border-[#F5C400]/40 text-[#F5C400]"
          : active && !yellowActive
          ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
          : "bg-[#2A1F0E] border-[#3A2A0E] text-white/70 hover:text-white hover:bg-[#3A2A0E]"
      }`}>
        {icon}
      </div>
      <span className={`text-[10px] transition ${
        active && yellowActive ? "text-[#F5C400]/80"
        : active ? "text-blue-400/80"
        : "text-white/30 group-hover:text-white/50"
      }`}>{label}</span>
    </button>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({
  messages, input, setInput, sendMessage, inputRef, messagesEndRef,
}: {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
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
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Écrire un message…"
            className="flex-1 bg-[#1A1209] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/85 placeholder-white/20 focus:outline-none focus:border-[#F5C400]/40"
          />
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

// ─── Canvas / Toile Panel ─────────────────────────────────────────────────────

function CanvasPanel({
  onSendData,
  incomingHtml,
}: {
  onSendData: (data: object) => void;
  incomingHtml: string | null;
}) {
  const editorRef    = useRef<HTMLDivElement>(null);
  const isFocused    = useRef(false);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!incomingHtml || !editorRef.current || isFocused.current) return;
    editorRef.current.innerHTML = incomingHtml;
  }, [incomingHtml]);

  function execCmd(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    broadcast();
  }

  function broadcast() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSendData({ type: "canvas", html: editorRef.current?.innerHTML ?? "" });
    }, 500);
  }

  const COLORS = ["#1a1a1a", "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#64748b", "#F5C400"];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — onMouseDown:preventDefault keeps selection in editor when clicking buttons */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-white/5 flex-shrink-0 flex-wrap bg-[#0D0904]"
        onMouseDown={e => e.preventDefault()}>
        <button onClick={() => execCmd("bold")} title="Gras"
          className="w-7 h-7 rounded text-white/70 hover:bg-white/10 hover:text-white font-bold text-sm transition flex items-center justify-center">B</button>
        <button onClick={() => execCmd("italic")} title="Italique"
          className="w-7 h-7 rounded text-white/70 hover:bg-white/10 hover:text-white italic text-sm transition flex items-center justify-center">I</button>
        <button onClick={() => execCmd("underline")} title="Souligné"
          className="w-7 h-7 rounded text-white/70 hover:bg-white/10 hover:text-white underline text-sm transition flex items-center justify-center">U</button>
        <button onClick={() => execCmd("strikeThrough")} title="Barré"
          className="w-7 h-7 rounded text-white/70 hover:bg-white/10 hover:text-white line-through text-sm transition flex items-center justify-center">S</button>
        <div className="w-px h-5 bg-white/10 mx-0.5" />
        <button onClick={() => execCmd("insertUnorderedList")} title="Liste à puces"
          className="w-7 h-7 rounded text-white/70 hover:bg-white/10 hover:text-white text-sm transition flex items-center justify-center">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button onClick={() => execCmd("insertOrderedList")} title="Liste numérotée"
          className="w-7 h-7 rounded text-white/70 hover:bg-white/10 hover:text-white text-sm transition flex items-center justify-center">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>
        <div className="w-px h-5 bg-white/10 mx-0.5" />
        {COLORS.map(c => (
          <button key={c} onClick={() => execCmd("foreColor", c)} title={`Couleur ${c}`}
            className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform flex-shrink-0"
            style={{ backgroundColor: c }} />
        ))}
        <div className="w-px h-5 bg-white/10 mx-0.5" />
        <button onClick={() => execCmd("removeFormat")} title="Effacer formatage"
          className="w-7 h-7 rounded text-white/50 hover:bg-white/10 hover:text-white transition flex items-center justify-center">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L17.94 6M3 3l18 18" />
          </svg>
        </button>
      </div>
      {/* Editor area — white background like a real document */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => { isFocused.current = true; }}
          onBlur={() => { isFocused.current = false; broadcast(); }}
          onInput={broadcast}
          data-placeholder="Commencez à écrire…"
          className="min-h-full p-4 text-gray-900 text-sm leading-relaxed focus:outline-none"
        />
      </div>
    </div>
  );
}

// ─── Whiteboard Panel ─────────────────────────────────────────────────────────

function WhiteboardPanel({
  onSendData,
  incomingStroke,
  incomingClear,
}: {
  onSendData: (data: object) => void;
  incomingStroke: WbStroke | null;
  incomingClear: number;
}) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const strokesRef     = useRef<WbStroke[]>([]);
  const currentPoints  = useRef<[number, number][]>([]);
  const isDrawing      = useRef(false);
  const [penColor, setPenColor] = useState("#1a1a1a");
  const [tool, setTool]         = useState<"pen" | "eraser">("pen");

  const WB_COLORS = ["#1a1a1a", "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#F5C400"];

  function getCtx() { return canvasRef.current?.getContext("2d") ?? null; }

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: WbStroke) {
    if (stroke.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth   = stroke.width;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
    }
    ctx.stroke();
  }

  function redraw() {
    const canvas = canvasRef.current;
    const ctx    = getCtx();
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokesRef.current.forEach(s => drawStroke(ctx, s));
  }

  // Resize observer to match canvas bitmap size to container
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      const container = containerRef.current;
      const canvas    = canvasRef.current;
      if (!container || !canvas) return;
      const { width, height } = container.getBoundingClientRect();
      canvas.width  = width;
      canvas.height = height;
      redraw();
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Incoming remote stroke
  useEffect(() => {
    if (!incomingStroke) return;
    strokesRef.current.push(incomingStroke);
    const ctx = getCtx();
    if (ctx) drawStroke(ctx, incomingStroke);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingStroke]);

  // Incoming clear
  useEffect(() => {
    if (incomingClear === 0) return;
    strokesRef.current = [];
    redraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingClear]);

  function getPos(e: React.MouseEvent<HTMLCanvasElement>): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    isDrawing.current     = true;
    currentPoints.current = [getPos(e)];
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const pos = getPos(e);
    currentPoints.current.push(pos);
    const ctx = getCtx();
    const pts = currentPoints.current;
    if (!ctx || pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : penColor;
    ctx.lineWidth   = tool === "eraser" ? 24 : 3;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1]);
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.stroke();
  }

  function onMouseUp() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (currentPoints.current.length > 1) {
      const stroke: WbStroke = {
        color:  tool === "eraser" ? "#ffffff" : penColor,
        width:  tool === "eraser" ? 24 : 3,
        points: [...currentPoints.current],
      };
      strokesRef.current.push(stroke);
      onSendData({ type: "wb-stroke", ...stroke });
    }
    currentPoints.current = [];
  }

  function clearBoard() {
    strokesRef.current = [];
    redraw();
    onSendData({ type: "wb-clear" });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 flex-shrink-0 bg-[#0D0904]">
        <button onClick={() => setTool("pen")}
          className={`w-7 h-7 rounded flex items-center justify-center transition ${tool === "pen" ? "bg-[#F5C400]/20 text-[#F5C400]" : "text-white/50 hover:bg-white/10 hover:text-white"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button onClick={() => setTool("eraser")}
          className={`w-7 h-7 rounded flex items-center justify-center transition ${tool === "eraser" ? "bg-[#F5C400]/20 text-[#F5C400]" : "text-white/50 hover:bg-white/10 hover:text-white"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L17.94 6M3 3l18 18" />
          </svg>
        </button>
        <div className="w-px h-5 bg-white/10" />
        {WB_COLORS.map(c => (
          <button key={c} onClick={() => { setPenColor(c); setTool("pen"); }}
            className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-125 flex-shrink-0 ${
              penColor === c && tool === "pen" ? "border-[#F5C400]" : "border-transparent"
            }`}
            style={{ backgroundColor: c }} />
        ))}
        <button onClick={clearBoard}
          className="ml-auto text-white/40 hover:text-red-400 transition text-xs px-2 py-1 rounded hover:bg-red-400/10">
          Effacer
        </button>
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </div>
    </div>
  );
}

// ─── Info Panel ───────────────────────────────────────────────────────────────

function InfoPanel({
  myName, otherName, elapsed, msgCount, quality, remoteQuality, isSandbox,
}: {
  myName: string;
  otherName: string;
  elapsed: number;
  msgCount: number;
  quality: ConnectionQuality;
  remoteQuality: ConnectionQuality;
  isSandbox?: boolean;
}) {
  const [tab, setTab]   = useState<"info" | "reseau" | "cles">("info");
  const [copied, setCopied] = useState(false);
  const roomLink = typeof window !== "undefined" ? window.location.href : "";

  function copyLink() {
    navigator.clipboard.writeText(roomLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const qualityLabel: Record<string, string> = {
    [ConnectionQuality.Excellent]: "Excellente",
    [ConnectionQuality.Good]:      "Bonne",
    [ConnectionQuality.Poor]:      "Faible",
    [ConnectionQuality.Lost]:      "Perdue",
    [ConnectionQuality.Unknown]:   "Inconnue",
  };

  function QualityRow({ q, label }: { q: ConnectionQuality; label: string }) {
    const color =
      q === ConnectionQuality.Excellent || q === ConnectionQuality.Good ? "text-emerald-400" :
      q === ConnectionQuality.Poor      ? "text-yellow-400" :
      q === ConnectionQuality.Lost      ? "text-red-400" : "text-white/40";
    return (
      <div className="bg-[#1A1209] rounded-xl p-4 border border-white/5">
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-wide mb-3">{label}</p>
        <div className="flex items-center gap-3">
          <QualityBars quality={q} />
          <span className={`text-sm font-semibold ${color}`}>{qualityLabel[q] ?? "Inconnue"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-white/5 flex-shrink-0">
        {(["info", "reseau", "cles"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-[11px] font-semibold transition border-b-2 ${
              tab === t ? "text-[#F5C400] border-[#F5C400]" : "text-white/40 border-transparent hover:text-white/60"
            }`}>
            {t === "info" ? "Informations" : t === "reseau" ? "Réseau" : "Infos clés"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "info" && (
          <>
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wide mb-2">Participants</p>
              {[myName + " (vous)", otherName].map((n, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-[#F5C400]/20 flex items-center justify-center text-[#F5C400] text-xs font-bold flex-shrink-0">
                    {n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
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
              <button onClick={copyLink}
                className="w-full flex items-center justify-center gap-2 bg-[#2A1F0E] border border-[#3A2A0E] rounded-xl py-2.5 text-xs text-white/60 hover:text-white hover:bg-[#3A2A0E] transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copied ? "Lien copié !" : "Copier le lien"}
              </button>
            </div>
            {isSandbox && (
              <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
                <p className="text-amber-400 text-xs font-bold mb-1">Salle de test permanente</p>
                <p className="text-white/40 text-xs">Cette salle reste toujours ouverte. Partagez le lien ci-dessus pour inviter un participant.</p>
              </div>
            )}
          </>
        )}

        {tab === "reseau" && (
          <>
            <QualityRow q={quality}       label="Votre connexion" />
            <QualityRow q={remoteQuality} label={`Connexion de ${otherName.split(" ")[0]}`} />
          </>
        )}

        {tab === "cles" && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

// ─── ClassroomView (main shared component) ────────────────────────────────────

export function ClassroomView({
  role, myName, otherName, durationMins, scheduledAt, bookingId, isSandbox, onLeave,
}: {
  role: "student" | "tutor";
  myName: string;
  otherName: string;
  durationMins?: number;
  scheduledAt?: string;
  bookingId?: string;
  isSandbox?: boolean;
  onLeave: () => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const room         = useRoomContext();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera,      withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // ── Timer ──
  const startRef = useRef(scheduledAt ? new Date(scheduledAt).getTime() : Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - startRef.current) / 1000))), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Tracks ──
  const remoteCameraTrack = tracks.find(t => !t.participant.isLocal && t.source === Track.Source.Camera);
  const localCameraTrack  = tracks.find(t =>  t.participant.isLocal && t.source === Track.Source.Camera);
  const remoteScreenTrack = tracks.find(t => !t.participant.isLocal && t.source === Track.Source.ScreenShare);
  const localScreenTrack  = tracks.find(t =>  t.participant.isLocal && t.source === Track.Source.ScreenShare);

  const remoteParticipant = participants.find(p => !p.isLocal);
  const hasRemoteVideo    = !!(remoteCameraTrack?.publication && !remoteCameraTrack.publication.isMuted);
  const hasRemoteScreen   = !!(remoteScreenTrack && isTrackReference(remoteScreenTrack) && remoteScreenTrack.publication && !remoteScreenTrack.publication.isMuted);
  const isScreenSharing   = !!(localScreenTrack?.publication && !localScreenTrack.publication.isMuted);

  const displayOtherName = remoteParticipant?.name ?? otherName;
  const myInit    = myName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const otherInit = displayOtherName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  // ── Connection quality ──
  const [quality, setQuality]           = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  const [remoteQuality, setRemoteQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);

  useEffect(() => {
    const update = (q: ConnectionQuality) => setQuality(q);
    localParticipant.on(ParticipantEvent.ConnectionQualityChanged, update);
    setQuality(localParticipant.connectionQuality);
    return () => { localParticipant.off(ParticipantEvent.ConnectionQualityChanged, update); };
  }, [localParticipant]);

  useEffect(() => {
    if (!remoteParticipant) return;
    const update = (q: ConnectionQuality) => setRemoteQuality(q);
    remoteParticipant.on(ParticipantEvent.ConnectionQualityChanged, update);
    setRemoteQuality(remoteParticipant.connectionQuality);
    return () => { remoteParticipant.off(ParticipantEvent.ConnectionQualityChanged, update); };
  }, [remoteParticipant]);

  // ── Panels & Dropdowns ──
  const [activePanel,   setActivePanel]   = useState<ActivePanel>(null);
  const [openDropdown,  setOpenDropdown]  = useState<Dropdown>(null);
  const [showPicker,    setShowPicker]    = useState(false);

  function togglePanel(panel: Exclude<ActivePanel, null>) {
    setActivePanel(prev => prev === panel ? null : panel);
    setOpenDropdown(null);
  }

  function toggleDropdown(dd: Exclude<Dropdown, null>) {
    setOpenDropdown(prev => prev === dd ? null : dd);
  }

  useEffect(() => {
    if (!openDropdown) return;
    const close = () => setOpenDropdown(null);
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, [openDropdown]);

  // ── Devices ──
  const [audioInputs,  setAudioInputs]  = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs,  setVideoInputs]  = useState<MediaDeviceInfo[]>([]);

  const loadDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    setAudioInputs(devices.filter(d => d.kind === "audioinput"));
    setAudioOutputs(devices.filter(d => d.kind === "audiooutput"));
    setVideoInputs(devices.filter(d => d.kind === "videoinput"));
  }, []);

  // ── Data channel ──
  const encoder = useRef(new TextEncoder());
  const decoder = useRef(new TextDecoder());

  const sendData = useCallback((payload: object) => {
    localParticipant.publishData(encoder.current.encode(JSON.stringify(payload)), { reliable: true });
  }, [localParticipant]);

  // ── Chat ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState("");
  const [unread,   setUnread]   = useState(0);
  const messagesEndRef          = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // ── Reactions ──
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // ── Canvas (Toile) ──
  const [incomingCanvasHtml, setIncomingCanvasHtml] = useState<string | null>(null);

  // ── Whiteboard ──
  const [incomingWbStroke, setIncomingWbStroke] = useState<WbStroke | null>(null);
  const [wbClearCount,     setWbClearCount]     = useState(0);

  // ── Data receiver ──
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleData = (payload: Uint8Array, _p: any) => {
      try {
        const msg = JSON.parse(decoder.current.decode(payload));
        switch (msg.type) {
          case "chat":
            setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: msg.sender, text: msg.text, time: msg.time, isLocal: false }]);
            setActivePanel(prev => { if (prev !== "chat") setUnread(n => n + 1); return prev; });
            break;
          case "reaction":
            addFloating(msg.emoji, msg.sender);
            break;
          case "canvas":
            setIncomingCanvasHtml(msg.html);
            break;
          case "wb-stroke":
            setIncomingWbStroke({ color: msg.color, width: msg.width, points: msg.points });
            break;
          case "wb-clear":
            setWbClearCount(n => n + 1);
            break;
        }
      } catch { /* ignore */ }
    };
    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room]);

  // When a participant connects, re-broadcast current canvas so they sync
  useEffect(() => {
    const onConnect = () => {
      // re-send canvas html if we have content
      // (whiteboard strokes are not re-synced for simplicity)
    };
    room.on(RoomEvent.ParticipantConnected, onConnect);
    return () => { room.off(RoomEvent.ParticipantConnected, onConnect); };
  }, [room]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (activePanel === "chat") {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activePanel]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    sendData({ type: "chat", sender: myName, text, time: Date.now() });
    setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: myName, text, time: Date.now(), isLocal: true }]);
    setInput("");
  }

  function addFloating(emoji: string, sender: string) {
    const id = crypto.randomUUID();
    setFloatingReactions(prev => [...prev, { id, emoji, sender, x: 30 + Math.random() * 40 }]);
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2500);
  }

  function sendReaction(emoji: string) {
    sendData({ type: "reaction", sender: myName, emoji });
    addFloating(emoji, myName);
    setShowPicker(false);
  }

  async function toggleScreenShare() {
    try { await localParticipant.setScreenShareEnabled(!isScreenSharing); } catch { /* user cancelled */ }
  }

  const panelTitles: Record<string, string> = {
    chat: "Chat", canvas: "Toile collaborative", whiteboard: "Tableau blanc", info: "Informations",
  };

  return (
    <div className="h-screen flex flex-col bg-[#0F0A04] overflow-hidden select-none">

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#0A0703] border-b border-white/5 flex-shrink-0 z-10">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WithYou" className="h-6 w-auto opacity-70 flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          {isSandbox ? (
            <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-700/40 px-3 py-1 rounded-full flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 text-[11px] font-bold">SALLE DE TEST</span>
            </div>
          ) : (
            <>
              <div className="w-px h-5 bg-white/10 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white/70 text-xs font-semibold leading-tight truncate">
                  Séance avec <span className="text-[#F5C400]">{displayOtherName}</span>
                </p>
                <p className="text-white/25 text-[10px] leading-tight capitalize">
                  {role === "student" ? "Étudiant" : "Tuteur"}{durationMins ? ` · ${durationMins} min` : ""}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Center: timer + quality */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-[#1A1209] border border-[#F5C400]/20 px-4 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F5C400] animate-pulse" />
            <span className="text-[#F5C400] font-mono text-sm font-bold tracking-widest">{fmt(elapsed)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#1A1209] border border-white/5 px-3 py-1.5 rounded-full cursor-default" title="Qualité de connexion">
            <QualityBars quality={quality} />
          </div>
        </div>

        {/* Right: Quitter */}
        <button onClick={onLeave}
          className="flex items-center gap-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Quitter
        </button>
      </div>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Video area */}
        <div className="flex-1 relative overflow-hidden">

          {/* Main display: remote screen > remote camera */}
          {hasRemoteScreen && remoteScreenTrack && isTrackReference(remoteScreenTrack) ? (
            <VideoTrack trackRef={remoteScreenTrack} className="absolute inset-0 w-full h-full object-contain bg-black" />
          ) : hasRemoteVideo && remoteCameraTrack && isTrackReference(remoteCameraTrack) ? (
            <VideoTrack trackRef={remoteCameraTrack} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1C1308] to-[#0A0703]">
              {remoteParticipant ? (
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#F5C400] to-[#C49200] flex items-center justify-center text-[#5C3D00] font-bold text-5xl mx-auto mb-5 shadow-[0_0_60px_rgba(245,196,0,0.15)]">
                    {otherInit}
                  </div>
                  <p className="text-white/70 text-sm font-semibold">{displayOtherName}</p>
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
                  <p className="text-white/60 text-sm font-semibold">En attente de {displayOtherName}…</p>
                  <p className="text-white/20 text-xs mt-2">Partage ce lien pour inviter</p>
                  <div className="mt-3 bg-[#1A1209] border border-[#3A2A0E] rounded-xl px-4 py-2 inline-block">
                    <p className="text-[#9B8A6B] text-xs font-mono">
                      {isSandbox ? "/classroom/sandbox" : `/classroom/${(bookingId ?? "").slice(0, 8)}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Screen share banners */}
          {isScreenSharing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F5C400] animate-pulse" />
              <span className="text-white/70 text-xs font-semibold">Vous partagez votre écran</span>
            </div>
          )}
          {hasRemoteScreen && !isScreenSharing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-white/70 text-xs font-semibold">{displayOtherName} partage son écran</span>
            </div>
          )}

          {/* Remote name tag */}
          {remoteParticipant && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-white/90 text-xs font-semibold">{displayOtherName}</p>
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

        {/* ── Side panel ────────────────────────────────────────── */}
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
              {activePanel === "chat" && (
                <ChatPanel
                  messages={messages} input={input} setInput={setInput}
                  sendMessage={sendMessage} inputRef={inputRef} messagesEndRef={messagesEndRef}
                />
              )}
              {activePanel === "canvas" && (
                <CanvasPanel onSendData={sendData} incomingHtml={incomingCanvasHtml} />
              )}
              {activePanel === "whiteboard" && (
                <WhiteboardPanel
                  onSendData={sendData}
                  incomingStroke={incomingWbStroke}
                  incomingClear={wbClearCount}
                />
              )}
              {activePanel === "info" && (
                <InfoPanel
                  myName={myName}
                  otherName={displayOtherName}
                  elapsed={elapsed}
                  msgCount={messages.length}
                  quality={quality}
                  remoteQuality={remoteQuality}
                  isSandbox={isSandbox}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Control bar ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-[#0A0703] border-t border-white/5 px-4 py-3 z-10">
        <div className="flex items-center justify-center gap-2 flex-wrap">

          {/* ── Micro + chevron ── */}
          <div className="relative flex items-end gap-px">
            <button
              onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`w-12 h-12 rounded-l-2xl flex items-center justify-center transition border-y border-l ${
                isMicrophoneEnabled
                  ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white"
                  : "bg-red-600/90 hover:bg-red-600 border-transparent text-white"
              }`}>
                {isMicrophoneEnabled ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM3 3l18 18" />
                  </svg>
                )}
              </div>
              <span className="text-[10px] text-white/30 group-hover:text-white/50 transition">{isMicrophoneEnabled ? "Micro" : "Muet"}</span>
            </button>
            <button
              onClick={e => { e.stopPropagation(); loadDevices(); toggleDropdown("micro"); }}
              className={`h-12 w-5 rounded-r-xl flex items-center justify-center transition border-y border-r mb-[18px] ${
                isMicrophoneEnabled
                  ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white/40 hover:text-white"
                  : "bg-red-700 hover:bg-red-600 border-transparent text-white/60"
              }`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === "micro" && (
              <div className="absolute bottom-full mb-2 left-0 bg-[#1A1209] border border-[#3A2A0E] rounded-2xl shadow-2xl py-2 min-w-[220px] z-50"
                onClick={e => e.stopPropagation()}>
                {audioInputs.length > 0 && (
                  <>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider px-4 pt-1 pb-2">Microphone</p>
                    {audioInputs.map(d => (
                      <button key={d.deviceId}
                        onClick={() => { room.switchActiveDevice("audioinput", d.deviceId); setOpenDropdown(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition truncate">
                        {d.label || `Micro ${d.deviceId.slice(0, 6)}`}
                      </button>
                    ))}
                  </>
                )}
                {audioOutputs.length > 0 && (
                  <>
                    <div className="border-t border-white/5 my-1.5" />
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider px-4 pb-2">Haut-parleur</p>
                    {audioOutputs.map(d => (
                      <button key={d.deviceId}
                        onClick={() => { room.switchActiveDevice("audiooutput", d.deviceId); setOpenDropdown(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition truncate">
                        {d.label || `Haut-parleur ${d.deviceId.slice(0, 6)}`}
                      </button>
                    ))}
                  </>
                )}
                {audioInputs.length === 0 && audioOutputs.length === 0 && (
                  <p className="text-white/30 text-sm px-4 py-3">Aucun périphérique trouvé</p>
                )}
              </div>
            )}
          </div>

          {/* ── Caméra + chevron ── */}
          <div className="relative flex items-end gap-px">
            <button
              onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`w-12 h-12 rounded-l-2xl flex items-center justify-center transition border-y border-l ${
                isCameraEnabled
                  ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white"
                  : "bg-red-600/90 hover:bg-red-600 border-transparent text-white"
              }`}>
                {isCameraEnabled ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
                  </svg>
                )}
              </div>
              <span className="text-[10px] text-white/30 group-hover:text-white/50 transition">{isCameraEnabled ? "Caméra" : "Arrêtée"}</span>
            </button>
            <button
              onClick={e => { e.stopPropagation(); loadDevices(); toggleDropdown("camera"); }}
              className={`h-12 w-5 rounded-r-xl flex items-center justify-center transition border-y border-r mb-[18px] ${
                isCameraEnabled
                  ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white/40 hover:text-white"
                  : "bg-red-700 hover:bg-red-600 border-transparent text-white/60"
              }`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === "camera" && (
              <div className="absolute bottom-full mb-2 left-0 bg-[#1A1209] border border-[#3A2A0E] rounded-2xl shadow-2xl py-2 min-w-[200px] z-50"
                onClick={e => e.stopPropagation()}>
                {videoInputs.length > 0 ? (
                  <>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider px-4 pt-1 pb-2">Caméra</p>
                    {videoInputs.map(d => (
                      <button key={d.deviceId}
                        onClick={() => { room.switchActiveDevice("videoinput", d.deviceId); setOpenDropdown(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition truncate">
                        {d.label || `Caméra ${d.deviceId.slice(0, 6)}`}
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="text-white/30 text-sm px-4 py-3">Aucune caméra trouvée</p>
                )}
              </div>
            )}
          </div>

          <div className="w-px h-10 bg-white/10 mx-1" />

          {/* ── Toile ── */}
          <BarBtn
            active={activePanel === "canvas"}
            label="Toile"
            onClick={() => togglePanel("canvas")}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />

          {/* ── Outils ── */}
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); toggleDropdown("outils"); }}
              className="flex flex-col items-center gap-1 group">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition border ${
                activePanel === "whiteboard" || openDropdown === "outils"
                  ? "bg-[#F5C400]/20 border-[#F5C400]/40 text-[#F5C400]"
                  : "bg-[#2A1F0E] border-[#3A2A0E] text-white/70 hover:text-white hover:bg-[#3A2A0E]"
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <span className={`text-[10px] transition ${activePanel === "whiteboard" || openDropdown === "outils" ? "text-[#F5C400]/80" : "text-white/30 group-hover:text-white/50"}`}>Outils</span>
            </button>
            {openDropdown === "outils" && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1A1209] border border-[#3A2A0E] rounded-2xl shadow-2xl py-2 min-w-[200px] z-50"
                onClick={e => e.stopPropagation()}>
                <button onClick={() => { togglePanel("whiteboard"); setOpenDropdown(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                  <svg className="w-4 h-4 text-[#F5C400]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Tableau blanc
                </button>
                <div className="border-t border-white/5 mx-3 my-1" />
                {[
                  { icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", label: "Assistant IA" },
                  { icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", label: "Vocabulaire" },
                  { icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", label: "Notes" },
                ].map(item => (
                  <button key={item.label} disabled className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/30 cursor-not-allowed">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    {item.label}
                    <span className="ml-auto text-[10px] text-white/20 bg-white/5 rounded px-1.5 py-0.5">bientôt</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Partager (screen share) ── */}
          <BarBtn
            active={isScreenSharing}
            label="Partager"
            onClick={toggleScreenShare}
            yellowActive={false}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />

          {/* ── Chat ── */}
          <div className="relative">
            <BarBtn
              active={activePanel === "chat"}
              label="Chat"
              onClick={() => togglePanel("chat")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />
            {unread > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-[#F5C400] text-[#5C3D00] text-[9px] font-black rounded-full flex items-center justify-center pointer-events-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>

          {/* ── Réagir ── */}
          <button onClick={() => { setShowPicker(v => !v); setOpenDropdown(null); }}
            className="flex flex-col items-center gap-1 group">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition border ${
              showPicker ? "bg-[#F5C400]/20 border-[#F5C400]/40" : "bg-[#2A1F0E] border-[#3A2A0E] text-white/70 hover:text-white hover:bg-[#3A2A0E]"
            }`}>😊</div>
            <span className={`text-[10px] transition ${showPicker ? "text-[#F5C400]/80" : "text-white/30 group-hover:text-white/50"}`}>Réagir</span>
          </button>

          <div className="w-px h-10 bg-white/10 mx-1" />

          {/* ── Plus ··· ── */}
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); toggleDropdown("plus"); }}
              className="flex flex-col items-center gap-1 group">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition border ${
                openDropdown === "plus"
                  ? "bg-[#F5C400]/20 border-[#F5C400]/40 text-[#F5C400]"
                  : "bg-[#2A1F0E] border-[#3A2A0E] text-white/70 hover:text-white hover:bg-[#3A2A0E]"
              }`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5"  cy="12" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                </svg>
              </div>
              <span className={`text-[10px] transition ${openDropdown === "plus" ? "text-[#F5C400]/80" : "text-white/30 group-hover:text-white/50"}`}>Plus</span>
            </button>
            {openDropdown === "plus" && (
              <div className="absolute bottom-full mb-2 right-0 bg-[#1A1209] border border-[#3A2A0E] rounded-2xl shadow-2xl py-2 min-w-[210px] z-50"
                onClick={e => e.stopPropagation()}>
                <button onClick={() => { togglePanel("info"); setOpenDropdown(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                  <svg className="w-4 h-4 text-[#F5C400]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Informations
                </button>
                <button
                  onClick={() => { window.open("mailto:support@withyou.app?subject=Problème en classe", "_blank"); setOpenDropdown(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Signaler un problème
                </button>
                <button
                  onClick={() => { window.open("/help", "_blank"); setOpenDropdown(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Assistance
                </button>
                <div className="border-t border-white/5 mx-3 my-1" />
                <button
                  onClick={() => {
                    window.open(role === "student" ? "/dashboard/student/settings" : "/dashboard/tutor/settings", "_blank");
                    setOpenDropdown(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Paramètres
                </button>
              </div>
            )}
          </div>

          {/* ── Quitter ── */}
          <button onClick={onLeave} className="flex flex-col items-center gap-1 group">
            <div className="w-14 h-12 rounded-2xl bg-red-600 hover:bg-red-500 flex items-center justify-center transition shadow-[0_4px_20px_rgba(239,68,68,0.35)]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: rgba(0,0,0,0.25);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
