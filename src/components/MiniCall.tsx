"use client";

import {
  useRef, useState, useEffect, useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  useTracks, useLocalParticipant, useParticipants,
  VideoTrack, isTrackReference, RoomContext,
} from "@livekit/components-react";
import { Track, ParticipantEvent, LocalVideoTrack } from "livekit-client";
import { useCall } from "@/context/CallContext";
import { useLanguage } from "@/context/LanguageContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 240;
const H_VIDEO = 135;
const H_CTRL  = 40;
const H_HDR   = 36;
const H_FULL  = H_HDR + H_VIDEO + H_CTRL;
const PILL_W  = 200;
const PILL_H  = 48;
const MARGIN  = 16;
const LS_KEY  = "miniCallCorner";

type Corner = "tl" | "tr" | "bl" | "br";

function cornerPos(corner: Corner, w = W, h = H_FULL): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isRight  = corner.endsWith("r");
  const isBottom = corner.startsWith("b");
  return {
    x: isRight  ? vw - w - MARGIN : MARGIN,
    y: isBottom ? vh - h - MARGIN : MARGIN + 64, // 64 = room for top nav
  };
}

function snapCorner(x: number, y: number, w = W, h = H_FULL): Corner {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r  = cx > vw / 2 ? "r" : "l";
  const b  = cy > vh / 2 ? "b" : "t";
  return (b + r) as Corner;
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ─── PiP Content (rendered in Document PiP window) ───────────────────────────

function PiPContent({
  remoteCamTrack, localCamTrack,
  hasRemoteVideo, isCameraEnabled,
  remoteInit, remoteColor,
  isMicOn, elapsed,
  onMute, onCam, onLeave,
}: {
  remoteCamTrack: ReturnType<typeof useTracks>[number] | undefined;
  localCamTrack:  ReturnType<typeof useTracks>[number] | undefined;
  hasRemoteVideo: boolean; isCameraEnabled: boolean;
  remoteInit: string; remoteColor: string;
  isMicOn: boolean; elapsed: number;
  onMute: () => void; onCam: () => void; onLeave: () => void;
}) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#0A0703", display: "flex", flexDirection: "column", fontFamily: "sans-serif", overflow: "hidden", position: "relative" }}>
      {/* Video */}
      <div style={{ flex: 1, position: "relative", background: "#1A0F00" }}>
        {hasRemoteVideo && remoteCamTrack && isTrackReference(remoteCamTrack) ? (
          <VideoTrack trackRef={remoteCamTrack} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: remoteColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#5C3D00", fontWeight: "bold", fontSize: 18 }}>{remoteInit}</div>
          </div>
        )}
        {/* Self-view */}
        {localCamTrack && isCameraEnabled && isTrackReference(localCamTrack) && (
          <div style={{ position: "absolute", bottom: 6, right: 6, width: 60, borderRadius: 6, overflow: "hidden", aspectRatio: "16/9" }}>
            <VideoTrack trackRef={localCamTrack} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
          </div>
        )}
      </div>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#0A0703" }}>
        <span style={{ color: "#F5C400", fontFamily: "monospace", fontSize: 12, flex: 1 }}>{fmt(elapsed)}</span>
        <button onClick={onMute}  style={{ background: isMicOn ? "#2A1F0E" : "#dc2626", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: "white", fontSize: 11 }}>{isMicOn ? "🎤" : "🔇"}</button>
        <button onClick={onCam}   style={{ background: "#2A1F0E", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: "white", fontSize: 11 }}>{isCameraEnabled ? "📷" : "🚫"}</button>
        <button onClick={onLeave} style={{ background: "#dc2626", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: "white", fontSize: 11 }}>✕</button>
      </div>
    </div>
  );
}

// ─── Main MiniCall component ──────────────────────────────────────────────────

export default function MiniCall() {
  const router  = useRouter();
  const { lang } = useLanguage();
  const {
    isInCall, roomId, otherName, elapsed,
    isSandbox, leaveCall, room,
  } = useCall();

  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const remotePart      = participants.find(p => !p.isLocal);
  const remoteCamTrack  = tracks.find(t => !t.participant.isLocal && t.source === Track.Source.Camera);
  const localCamTrack   = tracks.find(t =>  t.participant.isLocal && t.source === Track.Source.Camera);
  const hasRemoteVideo  = !!(remoteCamTrack?.publication && !remoteCamTrack.publication.isMuted);
  const otherInit       = (remotePart?.name ?? otherName).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  // Speaking indicator (manual subscription — no conditional hook)
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (!remotePart) { setSpeaking(false); return; }
    setSpeaking(remotePart.isSpeaking);
    const fn = (s: boolean) => setSpeaking(s);
    remotePart.on(ParticipantEvent.IsSpeakingChanged, fn);
    return () => { remotePart.off(ParticipantEvent.IsSpeakingChanged, fn); };
  }, [remotePart]);

  // ── Collapse ────────────────────────────────────────────────────────────────

  const [collapsed, setCollapsed] = useState(false);

  // ── Drag & corner snap ──────────────────────────────────────────────────────

  const pipRef    = useRef<HTMLDivElement>(null);
  const dragState = useRef({ active: false, ox: 0, oy: 0 });
  const [corner, setCorner] = useState<Corner>(() => {
    try { return (localStorage.getItem(LS_KEY) as Corner) || "br"; } catch { return "br"; }
  });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // Set initial position from corner on mount / window resize
  useEffect(() => {
    const h = collapsed ? PILL_H : H_FULL;
    const w = collapsed ? PILL_W : W;
    setPos(cornerPos(corner, w, h));
    const onResize = () => setPos(cornerPos(corner, w, h));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [corner, collapsed]);

  function onPointerDown(e: React.PointerEvent) {
    const r = pipRef.current?.getBoundingClientRect();
    if (!r) return;
    dragState.current = { active: true, ox: e.clientX - r.left, oy: e.clientY - r.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current.active) return;
    setPos({ x: e.clientX - dragState.current.ox, y: e.clientY - dragState.current.oy });
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    const x = e.clientX - dragState.current.ox;
    const y = e.clientY - dragState.current.oy;
    const h = collapsed ? PILL_H : H_FULL;
    const w = collapsed ? PILL_W : W;
    const c = snapCorner(x, y, w, h);
    const snapped = cornerPos(c, w, h);
    setCorner(c);
    setPos(snapped);
    try { localStorage.setItem(LS_KEY, c); } catch { /* ignore */ }
  }

  // ── Controls ─────────────────────────────────────────────────────────────────

  async function toggleMic() {
    try { await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled); } catch { /* denied */ }
  }
  async function toggleCam() {
    try { await localParticipant.setCameraEnabled(!isCameraEnabled); } catch { /* denied */ }
  }
  function backToCall() {
    router.push(isSandbox ? "/classroom/sandbox" : `/classroom/${roomId}`);
  }
  async function handleLeave() {
    // Dispose background processor before leaving
    const pub = localParticipant.getTrackPublication(Track.Source.Camera);
    const vt  = pub?.videoTrack as LocalVideoTrack | undefined;
    if (vt) { try { await vt.stopProcessor(); } catch { /* ignore */ } }
    await leaveCall();
  }

  // ── Document PiP ─────────────────────────────────────────────────────────────

  const [pipWin, setPipWin] = useState<Window | null>(null);
  const pipSupported = typeof window !== "undefined" && "documentPictureInPicture" in window;

  async function openDocPiP() {
    if (!pipSupported) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pip = await (window as any).documentPictureInPicture.requestWindow({ width: 280, height: 200 });
      // Copy stylesheets for Tailwind / fonts
      document.head.querySelectorAll('link[rel="stylesheet"], style').forEach(el => {
        pip.document.head.appendChild(el.cloneNode(true));
      });
      pip.document.documentElement.style.cssText = "height:100%;margin:0;padding:0;overflow:hidden;";
      pip.document.body.style.cssText    = "height:100%;margin:0;padding:0;overflow:hidden;background:#0A0703;";
      setPipWin(pip);
      pip.addEventListener("pagehide", () => setPipWin(null));
    } catch { /* user cancelled or not supported */ }
  }

  // ── Guard ─────────────────────────────────────────────────────────────────────

  if (!isInCall || !pos) return null;

  // ── i18n ──────────────────────────────────────────────────────────────────────

  const L = {
    backToCall:    lang === "fr" ? "Retour à l'appel"        : "Back to call",
    mute:          lang === "fr" ? "Couper le micro"          : "Mute",
    unmute:        lang === "fr" ? "Activer le micro"         : "Unmute",
    camOff:        lang === "fr" ? "Désactiver la caméra"     : "Turn camera off",
    camOn:         lang === "fr" ? "Activer la caméra"        : "Turn camera on",
    leave:         lang === "fr" ? "Quitter"                  : "Leave",
    collapse:      lang === "fr" ? "Réduire"                  : "Collapse",
    expand:        lang === "fr" ? "Agrandir"                 : "Expand",
    popOut:        lang === "fr" ? "Fenêtre flottante"        : "Pop out",
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const displayName = remotePart
    ? (remotePart.name || otherName)
    : (lang === "fr" ? "En attente du participant…" : "Waiting for participant…");

  // Collapsed pill
  if (collapsed) {
    return (
      <div
        ref={pipRef}
        style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 300, width: PILL_W, height: PILL_H, touchAction: "none" }}
        className="rounded-full bg-[#0A0703] border border-[#F5C400]/30 shadow-2xl flex items-center gap-2 px-3 select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${speaking ? "bg-green-400 animate-pulse" : "bg-[#F5C400] animate-pulse"}`} />
        <div className="w-7 h-7 rounded-full bg-[#F5C400]/20 flex items-center justify-center text-[#F5C400] font-bold text-[10px] flex-shrink-0">
          {otherInit}
        </div>
        <span className="text-white/60 text-[11px] font-semibold truncate flex-1">{displayName}</span>
        <span className="text-[#F5C400] font-mono text-[10px] flex-shrink-0">{fmt(elapsed)}</span>
        {!isMicrophoneEnabled && (
          <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0" aria-label={L.mute}>
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setCollapsed(false)}
          aria-label={L.expand}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition flex-shrink-0"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        </button>
      </div>
    );
  }

  // Full card
  return (
    <>
      <div
        ref={pipRef}
        style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 300, width: W, touchAction: "none" }}
        className={`rounded-2xl overflow-hidden shadow-2xl border transition-shadow select-none
          ${speaking ? "border-green-400/60 shadow-green-400/20" : "border-white/10"}`}
        aria-label={lang === "fr" ? "Appel en cours" : "Active call"}
      >
        {/* ── Header / drag handle ───────────────────────────────────── */}
        <div
          className="flex items-center gap-2 px-3 py-2 bg-[#0A0703] cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${speaking ? "bg-green-400 animate-pulse" : "bg-[#F5C400] animate-pulse"}`} />
          <span className="text-white/70 text-[11px] font-semibold truncate flex-1 min-w-0">{displayName}</span>
          <span className="text-[#F5C400] font-mono text-[10px] flex-shrink-0">{fmt(elapsed)}</span>
          {/* Pop out (Document PiP) */}
          {pipSupported && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={openDocPiP}
              aria-label={L.popOut}
              title={L.popOut}
              className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white/70 transition flex-shrink-0"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          )}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setCollapsed(true)}
            aria-label={L.collapse}
            title={L.collapse}
            className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white/70 transition flex-shrink-0"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
        </div>

        {/* ── Video area ────────────────────────────────────────────────── */}
        <div className="relative bg-[#1A0F00]" style={{ width: W, height: H_VIDEO }}>
          {/* Remote participant */}
          {hasRemoteVideo && remoteCamTrack && isTrackReference(remoteCamTrack) ? (
            <VideoTrack trackRef={remoteCamTrack} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1A0F00]">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F5C400] to-[#C49200] flex items-center justify-center text-[#5C3D00] font-bold text-base">
                {otherInit}
              </div>
            </div>
          )}

          {/* Self-view PiP */}
          {localCamTrack && isCameraEnabled && isTrackReference(localCamTrack) ? (
            <div className="absolute bottom-1.5 right-1.5 rounded-md overflow-hidden border border-white/20 bg-[#0A0703]"
              style={{ width: 60, aspectRatio: "16/9" }}>
              <VideoTrack trackRef={localCamTrack} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
            </div>
          ) : null}

          {/* Muted mic badge */}
          {!isMicrophoneEnabled && (
            <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shadow">
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* ── Controls bar ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 px-3 bg-[#0A0703] border-t border-white/5" style={{ height: H_CTRL }}>
          {/* Mute */}
          <button
            onClick={toggleMic}
            aria-label={isMicrophoneEnabled ? L.mute : L.unmute}
            title={isMicrophoneEnabled ? L.mute : L.unmute}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition flex-shrink-0
              ${isMicrophoneEnabled
                ? "bg-[#2A1F0E] text-white/60 hover:text-white hover:bg-[#3A2A0E]"
                : "bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30"}`}
          >
            {isMicrophoneEnabled ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Camera */}
          <button
            onClick={toggleCam}
            aria-label={isCameraEnabled ? L.camOff : L.camOn}
            title={isCameraEnabled ? L.camOff : L.camOn}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition flex-shrink-0
              ${isCameraEnabled
                ? "bg-[#2A1F0E] text-white/60 hover:text-white hover:bg-[#3A2A0E]"
                : "bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30"}`}
          >
            {isCameraEnabled ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14m-5 0H5a2 2 0 01-2-2v-4M3 3l18 18" />
              </svg>
            )}
          </button>

          {/* Back to call */}
          <button
            onClick={backToCall}
            aria-label={L.backToCall}
            title={L.backToCall}
            className="flex-1 h-7 rounded-lg flex items-center justify-center gap-1 bg-[#F5C400]/20 text-[#F5C400] hover:bg-[#F5C400]/30 transition text-[10px] font-bold truncate px-2"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l-4 4m0 0l-4-4m4 4V3" />
            </svg>
            <span className="truncate">{lang === "fr" ? "Retour" : "Back"}</span>
          </button>

          {/* Leave */}
          <button
            onClick={handleLeave}
            aria-label={L.leave}
            title={L.leave}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Document PiP portal */}
      {pipWin && createPortal(
        <RoomContext.Provider value={room}>
          <PiPContent
            remoteCamTrack={remoteCamTrack}
            localCamTrack={localCamTrack}
            hasRemoteVideo={hasRemoteVideo}
            isCameraEnabled={isCameraEnabled}
            remoteInit={otherInit}
            remoteColor="linear-gradient(135deg,#F5C400,#C49200)"
            isMicOn={isMicrophoneEnabled}
            elapsed={elapsed}
            onMute={toggleMic}
            onCam={toggleCam}
            onLeave={handleLeave}
          />
        </RoomContext.Provider>,
        pipWin.document.body,
      )}
    </>
  );
}
