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
  id: string; sender: string; text: string; time: number; isLocal: boolean;
}
interface FloatingReaction {
  id: string; emoji: string; sender: string; x: number;
}
type DrawTool = "pen" | "highlight" | "eraser" | "text" | "line" | "arrow" | "rect" | "circle" | "triangle" | "hand";

interface StrokeObj {
  kind: "stroke"; tool: "pen" | "highlight";
  color: string; width: number; opacity: number;
  points: [number, number][];
}
interface ShapeObj {
  kind: "shape"; shape: "line" | "arrow" | "rect" | "circle" | "triangle";
  color: string; width: number; filled: boolean;
  x1: number; y1: number; x2: number; y2: number;
}
interface TextObj {
  kind: "text"; content: string; x: number; y: number; color: string; size: number;
}
type CanvasObj = StrokeObj | ShapeObj | TextObj;

type ActivePanel = "chat" | "whiteboard" | "info" | null;
type Dropdown    = "micro" | "camera" | "outils" | "plus" | null;

const REACTIONS      = ["👍", "❤️", "😂", "🎉", "🤔", "👏"];
const CANVAS_COLORS  = ["#1a1a1a","#dc2626","#ea580c","#f59e0b","#facc15","#16a34a","#0891b2","#2563eb","#9333ea","#db2777","#6b7280","#92400e"];
const STROKE_WIDTHS  = [2, 4, 8, 16];
const WORD_TOOL_IDS: DrawTool[] = ["pen", "text", "eraser", "hand"];

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
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
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

// ─── Canvas draw helper (top-level, stable) ───────────────────────────────────

function drawObj(ctx: CanvasRenderingContext2D, obj: CanvasObj) {
  ctx.save();
  if (obj.kind === "stroke") {
    if (obj.points.length < 2) { ctx.restore(); return; }
    ctx.globalAlpha  = obj.opacity;
    ctx.strokeStyle  = obj.color;
    ctx.lineWidth    = obj.width;
    ctx.lineCap      = "round";
    ctx.lineJoin     = "round";
    ctx.beginPath();
    ctx.moveTo(obj.points[0][0], obj.points[0][1]);
    for (let i = 1; i < obj.points.length; i++) ctx.lineTo(obj.points[i][0], obj.points[i][1]);
    ctx.stroke();
  } else if (obj.kind === "shape") {
    ctx.strokeStyle = obj.color;
    ctx.lineWidth   = obj.width;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    if (obj.filled) ctx.fillStyle = obj.color + "33";
    const dx = obj.x2 - obj.x1, dy = obj.y2 - obj.y1;
    if (obj.shape === "line") {
      ctx.beginPath(); ctx.moveTo(obj.x1, obj.y1); ctx.lineTo(obj.x2, obj.y2); ctx.stroke();
    } else if (obj.shape === "arrow") {
      const angle   = Math.atan2(dy, dx);
      const len     = Math.sqrt(dx * dx + dy * dy);
      const headLen = Math.min(20, len * 0.35);
      ctx.beginPath(); ctx.moveTo(obj.x1, obj.y1); ctx.lineTo(obj.x2, obj.y2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(obj.x2, obj.y2);
      ctx.lineTo(obj.x2 - headLen * Math.cos(angle - Math.PI / 6), obj.y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(obj.x2, obj.y2);
      ctx.lineTo(obj.x2 - headLen * Math.cos(angle + Math.PI / 6), obj.y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (obj.shape === "rect") {
      const x = Math.min(obj.x1, obj.x2), y = Math.min(obj.y1, obj.y2);
      const w = Math.abs(dx), h = Math.abs(dy);
      if (obj.filled) ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    } else if (obj.shape === "circle") {
      const cx = (obj.x1 + obj.x2) / 2, cy = (obj.y1 + obj.y2) / 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(dx) / 2, Math.abs(dy) / 2, 0, 0, Math.PI * 2);
      if (obj.filled) ctx.fill(); ctx.stroke();
    } else if (obj.shape === "triangle") {
      const mx = (obj.x1 + obj.x2) / 2;
      ctx.beginPath(); ctx.moveTo(mx, obj.y1); ctx.lineTo(obj.x2, obj.y2); ctx.lineTo(obj.x1, obj.y2); ctx.closePath();
      if (obj.filled) ctx.fill(); ctx.stroke();
    }
  } else if (obj.kind === "text") {
    ctx.fillStyle = obj.color;
    ctx.font      = `${obj.size}px sans-serif`;
    obj.content.split("\n").forEach((line, i) => ctx.fillText(line, obj.x, obj.y + i * obj.size * 1.35));
  }
  ctx.restore();
}

// ─── Canvas Modal (Toile) ─────────────────────────────────────────────────────

const TOOL_DEFS: { id: DrawTool; label: string; hint: string; d: string }[] = [
  { id: "pen",      label: "Stylo",      hint: "Dessinez librement. Supporte le tactile.",          d: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" },
  { id: "highlight",label: "Surligneur", hint: "Surlignez des zones (transparence 40%).",           d: "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" },
  { id: "eraser",   label: "Gomme",      hint: "Effacez en peignant par-dessus.",                   d: "M20 20H7L3 16l13-13 7 7-3 10zm-7 0l-4-4" },
  { id: "text",     label: "Texte",      hint: "Cliquez pour placer du texte. Entrée pour valider.",d: "M9 12h6M12 9v6M4 7V4h16v3M9 20h6M12 4v16" },
  { id: "line",     label: "Ligne",      hint: "Tracez une ligne droite.",                          d: "M5 19L19 5" },
  { id: "arrow",    label: "Flèche",     hint: "Tracez une flèche avec pointe.",                    d: "M5 19L19 5m0 0H9m10 0v10" },
  { id: "rect",     label: "Rectangle",  hint: "Dessinez un rectangle.",                            d: "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" },
  { id: "circle",   label: "Cercle",     hint: "Dessinez une ellipse.",                             d: "M12 22a10 10 0 110-20 10 10 0 010 20z" },
  { id: "triangle", label: "Triangle",   hint: "Dessinez un triangle isocèle.",                     d: "M3 21l9-16 9 16H3z" },
  { id: "hand",     label: "Main",       hint: "Glissez pour déplacer la vue. Molette pour zoomer.", d: "M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" },
];

function CanvasModal({ isOpen, isFull, onClose, onToggleFull, onSendData, incomingObj, clearCount, undoCount }: {
  isOpen: boolean; isFull: boolean;
  onClose: () => void; onToggleFull: () => void;
  onSendData: (d: object) => void;
  incomingObj: CanvasObj | null; clearCount: number; undoCount: number;
}) {
  const mainRef      = useRef<HTMLCanvasElement>(null);
  const previewRef   = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const objectsRef   = useRef<CanvasObj[]>([]);
  const redoRef      = useRef<CanvasObj[]>([]);
  const drawingRef   = useRef(false);
  const startPos     = useRef<[number,number]>([0,0]);
  const curPts       = useRef<[number,number][]>([]);

  const [tool,   setTool]   = useState<DrawTool>("pen");
  const [color,  setColor]  = useState("#1a1a1a");
  const [width,  setWidth]  = useState(4);
  const [filled, setFilled] = useState(false);
  const [isPanning,  setIsPanning]  = useState(false);
  const pageTextRef   = useRef("");          // texte complet de la page
  const pageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus quand on entre en mode texte
  useEffect(() => {
    if (tool === "text" && isOpen) {
      setTimeout(() => pageTextareaRef.current?.focus(), 30);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, isOpen]);

  // Zoom & pan
  const zoomRef          = useRef(1);
  const panRef           = useRef({ x: 48, y: 48 }); // marge initiale comme Word
  const [zoomPct, setZoomPct] = useState(100);
  const activePtrsRef    = useRef(new Map<number, { x: number; y: number }>());
  const lastPinchDistRef = useRef<number | null>(null);
  const isPanningRef     = useRef(false);
  const panStartRef      = useRef({ sx: 0, sy: 0, px: 0, py: 0 });

  const isShape      = ["line","arrow","rect","circle","triangle"].includes(tool);
  const isFillable   = ["rect","circle","triangle"].includes(tool);

  const getMain    = () => mainRef.current?.getContext("2d") ?? null;
  const getPreview = () => previewRef.current?.getContext("2d") ?? null;

  function applyZoom(factor: number, cx: number, cy: number) {
    const z = Math.max(0.15, Math.min(8, zoomRef.current * factor));
    panRef.current.x = cx - (cx - panRef.current.x) * (z / zoomRef.current);
    panRef.current.y = cy - (cy - panRef.current.y) * (z / zoomRef.current);
    zoomRef.current  = z;
    setZoomPct(Math.round(z * 100));
    redraw();
  }
  function resetZoom() {
    zoomRef.current = 1; panRef.current = { x: 48, y: 48 };
    setZoomPct(100); redraw();
  }

  function redraw() {
    const c = mainRef.current; const ctx = getMain();
    if (!c || !ctx) return;
    const z = zoomRef.current; const px = panRef.current.x; const py = panRef.current.y;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Fond gris document (comme Word)
    ctx.fillStyle = "#d0d0d0"; ctx.fillRect(0, 0, c.width, c.height);
    // Feuille blanche A4 avec ombre (page logique : 0,0 → 794,1123)
    ctx.shadowColor = "rgba(0,0,0,0.22)"; ctx.shadowBlur = 14; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(px, py, 794 * z, 1123 * z);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    // Dessiner les objets
    ctx.setTransform(z, 0, 0, z, px, py);
    objectsRef.current.forEach(o => drawObj(ctx, o));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function clearPreview() {
    const c = previewRef.current; const ctx = getPreview();
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
  }
  function drawObjOnMain(obj: CanvasObj) {
    const ctx = getMain(); if (!ctx) return;
    ctx.save();
    ctx.setTransform(zoomRef.current, 0, 0, zoomRef.current, panRef.current.x, panRef.current.y);
    drawObj(ctx, obj);
    ctx.restore();
  }

  // Resize observer
  useEffect(() => {
    if (!isOpen) return;
    const obs = new ResizeObserver(() => {
      const el = containerRef.current;
      const m  = mainRef.current;
      const p  = previewRef.current;
      if (!el || !m || !p) return;
      const { width: w, height: h } = el.getBoundingClientRect();
      m.width = w; m.height = h; p.width = w; p.height = h;
      redraw();
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Incoming remote object
  useEffect(() => {
    if (!incomingObj) return;
    objectsRef.current.push(incomingObj);
    drawObjOnMain(incomingObj);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingObj]);

  // Remote clear
  useEffect(() => {
    if (!clearCount) return;
    objectsRef.current = []; redoRef.current = []; redraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearCount]);

  // Remote undo
  useEffect(() => {
    if (!undoCount) return;
    if (objectsRef.current.length) objectsRef.current.pop();
    redraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoCount]);

  // Escape key + Ctrl+Z
  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (isFull) onToggleFull(); else onClose(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isFull]);

  // Wheel zoom (must be non-passive to preventDefault)
  useEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current;
    if (!el) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      if (e.ctrlKey || e.metaKey) {
        // trackpad pinch sends ctrl+wheel
        applyZoom(e.deltaY < 0 ? 1.1 : 0.9, cx, cy);
      } else {
        // regular scroll = zoom
        applyZoom(e.deltaY < 0 ? 1.12 : 0.88, cx, cy);
      }
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const r = mainRef.current!.getBoundingClientRect();
    return [
      (e.clientX - r.left - panRef.current.x) / zoomRef.current,
      (e.clientY - r.top  - panRef.current.y) / zoomRef.current,
    ];
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    activePtrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = getPos(e);

    // Text tool: full-page textarea — no canvas interaction
    if (tool === "text") return;

    // Pinch: 2+ fingers → zoom instead of draw
    if (activePtrsRef.current.size >= 2) {
      drawingRef.current = false;
      const pts = [...activePtrsRef.current.values()];
      lastPinchDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);

    // Hand tool: pan
    if (tool === "hand") {
      isPanningRef.current = true;
      setIsPanning(true);
      panStartRef.current  = { sx: e.clientX, sy: e.clientY, px: panRef.current.x, py: panRef.current.y };
      return;
    }

    drawingRef.current = true;
    startPos.current   = p;
    curPts.current     = [p];
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    activePtrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pinch zoom
    if (activePtrsRef.current.size >= 2 && lastPinchDistRef.current !== null) {
      const pts = [...activePtrsRef.current.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const r = containerRef.current!.getBoundingClientRect();
      const cx = (pts[0].x + pts[1].x) / 2 - r.left;
      const cy = (pts[0].y + pts[1].y) / 2 - r.top;
      applyZoom(dist / lastPinchDistRef.current, cx, cy);
      lastPinchDistRef.current = dist;
      return;
    }

    // Hand tool pan
    if (isPanningRef.current) {
      panRef.current.x = panStartRef.current.px + (e.clientX - panStartRef.current.sx);
      panRef.current.y = panStartRef.current.py + (e.clientY - panStartRef.current.sy);
      redraw(); return;
    }

    if (!drawingRef.current) return;
    const p = getPos(e);
    curPts.current.push(p);

    if (tool === "pen" || tool === "highlight" || tool === "eraser") {
      const ctx = getMain(); const pts = curPts.current;
      if (!ctx || pts.length < 2) return;
      ctx.save();
      ctx.setTransform(zoomRef.current, 0, 0, zoomRef.current, panRef.current.x, panRef.current.y);
      ctx.globalAlpha = (tool === "highlight") ? 0.4 : 1;
      ctx.strokeStyle = (tool === "eraser") ? "#ffffff" : color;
      ctx.lineWidth   = (tool === "highlight") ? width * 3 : (tool === "eraser") ? width * 4 : width;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1]);
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      ctx.stroke(); ctx.restore();
    } else {
      clearPreview();
      const ctx = getPreview(); if (!ctx) return;
      ctx.save();
      ctx.setTransform(zoomRef.current, 0, 0, zoomRef.current, panRef.current.x, panRef.current.y);
      drawObj(ctx, { kind:"shape", shape:tool as ShapeObj["shape"], color, width, filled, x1:startPos.current[0], y1:startPos.current[1], x2:p[0], y2:p[1] });
      ctx.restore();
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    activePtrsRef.current.delete(e.pointerId);
    if (activePtrsRef.current.size < 2) lastPinchDistRef.current = null;
    if (tool === "hand") { isPanningRef.current = false; setIsPanning(false); return; }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    clearPreview();
    const p = getPos(e);

    if (tool === "pen" || tool === "highlight" || tool === "eraser") {
      if (curPts.current.length < 2) { curPts.current = []; return; }
      const obj: StrokeObj = {
        kind:    "stroke",
        tool:    tool === "eraser" ? "pen" : tool,
        color:   tool === "eraser" ? "#ffffff" : color,
        width:   tool === "highlight" ? width * 3 : tool === "eraser" ? width * 4 : width,
        opacity: tool === "highlight" ? 0.4 : 1,
        points:  [...curPts.current],
      };
      objectsRef.current.push(obj);
      redoRef.current = [];
      if (tool === "eraser") redraw(); // re-render cleanly after erasing
      onSendData({ type: "canvas-obj", obj });
    } else {
      const obj: ShapeObj = {
        kind: "shape", shape: tool as ShapeObj["shape"],
        color, width, filled,
        x1: startPos.current[0], y1: startPos.current[1], x2: p[0], y2: p[1],
      };
      objectsRef.current.push(obj);
      redoRef.current = [];
      drawObjOnMain(obj);
      onSendData({ type: "canvas-obj", obj });
    }
    curPts.current = [];
  }

  function handleUndo() {
    if (!objectsRef.current.length) return;
    redoRef.current.push(objectsRef.current.pop()!);
    redraw();
    onSendData({ type: "canvas-undo" });
  }
  function handleRedo() {
    if (!redoRef.current.length) return;
    const obj = redoRef.current.pop()!;
    objectsRef.current.push(obj);
    drawObjOnMain(obj);
  }
  function handleClear() {
    objectsRef.current = []; redoRef.current = []; redraw();
    onSendData({ type: "canvas-clear" });
  }
  function handleExport() {
    const c = mainRef.current; if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png"); a.download = "toile.png"; a.click();
  }
  function commitPageText() {
    const text = pageTextRef.current.trim();
    if (!text) return;
    const sz = 16;
    const margin = 60;
    const obj: TextObj = { kind:"text", content:text, x:margin, y:margin + sz, color, size:sz };
    objectsRef.current.push(obj); redoRef.current = [];
    drawObjOnMain(obj);
    onSendData({ type: "canvas-obj", obj });
    pageTextRef.current = "";
    if (pageTextareaRef.current) pageTextareaRef.current.value = "";
  }

  const cursors: Record<DrawTool, string> = {
    pen:"crosshair", highlight:"crosshair", eraser:"cell", text:"text",
    line:"crosshair", arrow:"crosshair", rect:"crosshair", circle:"crosshair", triangle:"crosshair",
    hand: isPanning ? "grabbing" : "grab",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`flex flex-col bg-[#0D0904] shadow-2xl overflow-hidden transition-all duration-200 border border-[#3A2A0E] ${
        isFull ? "w-full h-full rounded-none" : "w-[92vw] h-[90vh] rounded-2xl"
      }`}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#0A0703] border-b border-white/5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-[#F5C400] animate-pulse" />
          <span className="text-white/85 text-sm font-bold">Toile collaborative</span>
          <span className="text-white/25 text-xs hidden sm:block">Modifications visibles en temps réel</span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={handleExport} title="Exporter PNG"
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:block">Exporter</span>
            </button>
            <button onClick={onToggleFull} title={isFull ? "Réduire" : "Plein écran"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition">
              {isFull
                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M15 9h4.5M15 9V4.5M9 15v4.5M9 15H4.5M15 15h4.5M15 15v4.5" /></svg>
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
              }
            </button>
            <button onClick={onClose} title="Fermer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Options toolbar */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F0B05] border-b border-white/5 flex-shrink-0 flex-wrap">

          {/* Tools (Word mode: stylo, texte, gomme, main) */}
          <div className="flex items-center gap-0.5">
            {TOOL_DEFS.filter(t => WORD_TOOL_IDS.includes(t.id)).map(t => (
              <button key={t.id} onClick={() => { if (tool === "text" && t.id !== "text") commitPageText(); setTool(t.id); }} title={t.label}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                  tool === t.id ? "bg-[#F5C400]/20 text-[#F5C400] border border-[#F5C400]/40" : "text-white/50 hover:bg-white/10 hover:text-white"
                }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={t.d} />
                </svg>
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          {/* Colors */}
          <div className="flex items-center gap-1 flex-wrap">
            {CANVAS_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} title={c}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${
                  color === c ? "border-[#F5C400] scale-110" : "border-white/20"
                }`}
                style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={color} onChange={e => setColor(e.target.value)} title="Couleur personnalisée"
              className="w-5 h-5 rounded-full cursor-pointer border-2 border-white/20 bg-transparent p-0 flex-shrink-0" />
          </div>

          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          {/* Stroke widths */}
          <div className="flex items-center gap-1">
            {STROKE_WIDTHS.map(w => (
              <button key={w} onClick={() => setWidth(w)} title={`${w}px`}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                  width === w ? "bg-[#F5C400]/20 border border-[#F5C400]/40" : "hover:bg-white/10"
                }`}>
                <div className="rounded-full" style={{ width: ({ 2: 4, 4: 8, 8: 14, 16: 22 } as Record<number,number>)[w], height: ({ 2: 4, 4: 8, 8: 14, 16: 22 } as Record<number,number>)[w], backgroundColor: color }} />
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          {/* Fill toggle (fillable shapes only) */}
          {isFillable && (
            <button onClick={() => setFilled(v => !v)} title={filled ? "Mode contour" : "Mode rempli"}
              className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition border ${
                filled ? "bg-[#F5C400]/20 border-[#F5C400]/40 text-[#F5C400]" : "border-white/10 text-white/50 hover:border-white/20 hover:text-white"
              }`}>
              <svg className="w-3.5 h-3.5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
              </svg>
              {filled ? "Rempli" : "Contour"}
            </button>
          )}

          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          {/* Undo / Redo / Clear */}
          <div className="flex items-center gap-0.5">
            <button onClick={handleUndo} title="Annuler (Ctrl+Z)"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11" />
              </svg>
            </button>
            <button onClick={handleRedo} title="Rétablir"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 14l5-5-5-5M19 9H8.5a5.5 5.5 0 100 11H13" />
              </svg>
            </button>
            <button onClick={handleClear} title="Tout effacer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:bg-red-500/20 hover:text-red-400 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => { const r = containerRef.current?.getBoundingClientRect(); if (r) applyZoom(1.25, r.width/2, r.height/2); }}
              title="Zoom +" className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition font-bold text-base">+</button>
            <button onClick={resetZoom} title="Réinitialiser"
              className="h-8 px-2 rounded-lg text-[11px] font-mono text-white/50 hover:bg-white/10 hover:text-white transition min-w-[3.2rem] text-center">{zoomPct}%</button>
            <button onClick={() => { const r = containerRef.current?.getBoundingClientRect(); if (r) applyZoom(0.8, r.width/2, r.height/2); }}
              title="Zoom -" className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition font-bold text-base">−</button>
          </div>

          {/* Tool hint */}
          <span className="ml-2 text-white/25 text-[10px] hidden md:block truncate">
            {TOOL_DEFS.find(t => t.id === tool)?.hint}
          </span>
        </div>

        {/* Canvas area — fond gris document comme Word */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#e8e8e8]">
          <canvas ref={mainRef}
            className="absolute inset-0"
            style={{ cursor: cursors[tool], touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={e => {
              activePtrsRef.current.delete(e.pointerId);
              lastPinchDistRef.current = null;
              isPanningRef.current = false;
              setIsPanning(false);
              drawingRef.current = false;
              clearPreview();
            }}
          />
          <canvas ref={previewRef}
            className="absolute inset-0 pointer-events-none"
          />
          {/* Page texte complète — visible quand outil "texte" actif */}
          {tool === "text" && (() => {
            const z  = zoomRef.current;
            const px = panRef.current.x;
            const py = panRef.current.y;
            const margin = 60 * z;
            return (
              <textarea
                ref={pageTextareaRef}
                className="absolute bg-transparent resize-none focus:outline-none"
                style={{
                  left:       px + margin,
                  top:        py + margin,
                  width:      794 * z - margin * 2,
                  height:     1123 * z - margin * 2,
                  fontSize:   16 * z,
                  lineHeight: 1.65,
                  fontFamily: "Georgia, serif",
                  color,
                  caretColor: color,
                  overflow:   "auto",
                  cursor:     "text",
                  whiteSpace: "pre-wrap",
                  wordBreak:  "break-word",
                }}
                defaultValue={pageTextRef.current}
                onChange={e => { pageTextRef.current = e.target.value; }}
                onKeyDown={e => {
                  if (e.key === "Escape") { commitPageText(); setTool("pen"); }
                }}
              />
            );
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-1 bg-[#0A0703] border-t border-white/5 flex-shrink-0">
          <span className="text-[10px] text-white/25">Toile partagée · Tactile · Molette = zoom · Outil Main = naviguer</span>
          <span className="text-[10px] text-white/25">Ctrl+Z annuler · Échap fermer · {zoomPct}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({ messages, input, setInput, sendMessage, inputRef, messagesEndRef }: {
  messages: ChatMessage[]; input: string; setInput: (v: string) => void;
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
    </>
  );
}

// ─── Whiteboard Panel (Paint) ─────────────────────────────────────────────────

function WhiteboardPanel({ onSendData, incomingObj, clearCount, undoCount }: {
  onSendData: (d: object) => void;
  incomingObj: CanvasObj | null; clearCount: number; undoCount: number;
}) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mainRef       = useRef<HTMLCanvasElement>(null);
  const previewRef    = useRef<HTMLCanvasElement>(null);
  const objectsRef    = useRef<CanvasObj[]>([]);
  const redoRef       = useRef<CanvasObj[]>([]);
  const drawingRef    = useRef(false);
  const startPos      = useRef<[number,number]>([0,0]);
  const curPts        = useRef<[number,number][]>([]);
  const textVal       = useRef("");
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const committingRef = useRef(false);

  const [tool,    setTool]    = useState<DrawTool>("pen");
  const [color,   setColor]   = useState("#1a1a1a");
  const [width,   setWidth]   = useState(4);
  const [filled,  setFilled]  = useState(false);
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  const isFillable = ["rect","circle","triangle"].includes(tool);
  const getMain    = () => mainRef.current?.getContext("2d") ?? null;
  const getPreview = () => previewRef.current?.getContext("2d") ?? null;

  function wbRedraw() {
    const c = mainRef.current; const ctx = getMain();
    if (!c || !ctx) return;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,c.width,c.height);
    objectsRef.current.forEach(o => drawObj(ctx, o));
  }
  function wbClearPreview() {
    const c = previewRef.current; const ctx = getPreview();
    if (!c || !ctx) return; ctx.clearRect(0,0,c.width,c.height);
  }
  function wbDrawOnMain(obj: CanvasObj) {
    const ctx = getMain(); if (!ctx) return;
    ctx.save(); drawObj(ctx, obj); ctx.restore();
  }

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      const el = containerRef.current; const m = mainRef.current; const p = previewRef.current;
      if (!el || !m || !p) return;
      const { width: w, height: h } = el.getBoundingClientRect();
      m.width = w; m.height = h; p.width = w; p.height = h;
      wbRedraw();
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!incomingObj) return;
    objectsRef.current.push(incomingObj);
    wbDrawOnMain(incomingObj);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingObj]);

  useEffect(() => {
    if (!clearCount) return;
    objectsRef.current = []; redoRef.current = []; wbRedraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearCount]);

  useEffect(() => {
    if (!undoCount) return;
    if (objectsRef.current.length) objectsRef.current.pop();
    wbRedraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoCount]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const r = mainRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = getPos(e);
    if (tool === "text") {
      committingRef.current = false; textVal.current = "";
      setTextPos({ x: p[0], y: p[1] });
      setTimeout(() => textareaRef.current?.focus(), 30);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true; startPos.current = p; curPts.current = [p];
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const p = getPos(e);
    curPts.current.push(p);
    if (tool === "pen" || tool === "highlight" || tool === "eraser") {
      const ctx = getMain(); const pts = curPts.current;
      if (!ctx || pts.length < 2) return;
      ctx.save();
      ctx.globalAlpha  = tool === "highlight" ? 0.4 : 1;
      ctx.strokeStyle  = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth    = tool === "highlight" ? width * 3 : tool === "eraser" ? width * 4 : width;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[pts.length-2][0], pts[pts.length-2][1]);
      ctx.lineTo(pts[pts.length-1][0], pts[pts.length-1][1]);
      ctx.stroke(); ctx.restore();
    } else {
      wbClearPreview();
      const ctx = getPreview(); if (!ctx) return;
      ctx.save();
      drawObj(ctx, { kind:"shape", shape:tool as ShapeObj["shape"], color, width, filled, x1:startPos.current[0], y1:startPos.current[1], x2:p[0], y2:p[1] });
      ctx.restore();
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false; wbClearPreview();
    const p = getPos(e);
    if (tool === "pen" || tool === "highlight" || tool === "eraser") {
      if (curPts.current.length < 2) { curPts.current = []; return; }
      const obj: StrokeObj = {
        kind: "stroke", tool: tool === "eraser" ? "pen" : tool,
        color: tool === "eraser" ? "#ffffff" : color,
        width: tool === "highlight" ? width * 3 : tool === "eraser" ? width * 4 : width,
        opacity: tool === "highlight" ? 0.4 : 1,
        points: [...curPts.current],
      };
      objectsRef.current.push(obj); redoRef.current = [];
      if (tool === "eraser") wbRedraw();
      onSendData({ type: "wb-obj", obj });
    } else {
      const obj: ShapeObj = {
        kind:"shape", shape:tool as ShapeObj["shape"],
        color, width, filled,
        x1:startPos.current[0], y1:startPos.current[1], x2:p[0], y2:p[1],
      };
      objectsRef.current.push(obj); redoRef.current = [];
      wbDrawOnMain(obj);
      onSendData({ type: "wb-obj", obj });
    }
    curPts.current = [];
  }

  function wbUndo() {
    if (!objectsRef.current.length) return;
    redoRef.current.push(objectsRef.current.pop()!);
    wbRedraw(); onSendData({ type: "wb-undo" });
  }
  function wbRedo() {
    if (!redoRef.current.length) return;
    const obj = redoRef.current.pop()!;
    objectsRef.current.push(obj); wbDrawOnMain(obj);
  }
  function wbClear() {
    objectsRef.current = []; redoRef.current = []; wbRedraw();
    onSendData({ type: "wb-clear" });
  }
  function wbExport() {
    const c = mainRef.current; if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png"); a.download = "tableau.png"; a.click();
  }
  function commitText() {
    if (committingRef.current) return;
    committingRef.current = true;
    const text = textVal.current.trim(); textVal.current = ""; setTextPos(null);
    if (!text || !textPos) return;
    const sz = Math.max(14, width * 5);
    const obj: TextObj = { kind:"text", content:text, x:textPos.x, y:textPos.y, color, size:sz };
    objectsRef.current.push(obj); redoRef.current = [];
    const ctx = getMain(); if (ctx) drawObj(ctx, obj);
    onSendData({ type: "wb-obj", obj });
  }

  const WB_TOOLS = TOOL_DEFS.filter(t => t.id !== "hand");
  const wbCursors: Partial<Record<DrawTool,string>> = {
    pen:"crosshair", highlight:"crosshair", eraser:"cell", text:"text",
    line:"crosshair", arrow:"crosshair", rect:"crosshair", circle:"crosshair", triangle:"crosshair",
  };
  const DOT_SIZE: Record<number,number> = { 2:4, 4:8, 8:14, 16:22 };

  return (
    <div className="flex flex-col h-full">

      {/* Toolbar */}
      <div className="flex flex-col gap-1.5 px-2 py-2 bg-[#0D0904] border-b border-white/5 flex-shrink-0">

        {/* Tools + actions row */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {WB_TOOLS.map(t => (
            <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                tool === t.id ? "bg-[#F5C400]/20 text-[#F5C400] border border-[#F5C400]/40" : "text-white/50 hover:bg-white/10 hover:text-white"
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={t.d} />
              </svg>
            </button>
          ))}
          <div className="w-px h-5 bg-white/10 mx-0.5 flex-shrink-0" />
          <button onClick={wbUndo} title="Annuler"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11" /></svg>
          </button>
          <button onClick={wbRedo} title="Rétablir"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 14l5-5-5-5M19 9H8.5a5.5 5.5 0 100 11H13" /></svg>
          </button>
          <button onClick={wbExport} title="Exporter PNG"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          <button onClick={wbClear} title="Tout effacer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:bg-red-500/20 hover:text-red-400 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>

        {/* Colors + widths + fill row */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {CANVAS_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${color === c ? "border-[#F5C400] scale-110" : "border-white/20"}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-4 h-4 rounded-full cursor-pointer border-2 border-white/20 bg-transparent p-0 flex-shrink-0" />
          <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />
          {STROKE_WIDTHS.map(w => (
            <button key={w} onClick={() => setWidth(w)} title={`${w}px`}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${width === w ? "bg-[#F5C400]/20 border border-[#F5C400]/40" : "hover:bg-white/10"}`}>
              <div className="rounded-full" style={{ width: DOT_SIZE[w], height: DOT_SIZE[w], backgroundColor: color }} />
            </button>
          ))}
          {isFillable && (
            <>
              <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />
              <button onClick={() => setFilled(v => !v)}
                className={`h-7 px-2 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition border ${
                  filled ? "bg-[#F5C400]/20 border-[#F5C400]/40 text-[#F5C400]" : "border-white/10 text-white/50 hover:border-white/20 hover:text-white"
                }`}>
                <svg className="w-3 h-3" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                </svg>
                {filled ? "Plein" : "Vide"}
              </button>
            </>
          )}
        </div>

        <p className="text-[9px] text-white/25 truncate">{TOOL_DEFS.find(t => t.id === tool)?.hint}</p>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white">
        <canvas ref={mainRef} className="absolute inset-0"
          style={{ cursor: wbCursors[tool] ?? "crosshair", touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { drawingRef.current = false; wbClearPreview(); }}
        />
        <canvas ref={previewRef} className="absolute inset-0 pointer-events-none" />
        {textPos && (
          <textarea ref={textareaRef}
            className="absolute bg-white/90 border-2 border-dashed border-blue-500 rounded px-1 resize-none focus:outline-none shadow"
            style={{ left: textPos.x, top: textPos.y, fontSize: Math.max(12, width * 5), color, fontFamily: "sans-serif", minWidth: 120, minHeight: 36, lineHeight: 1.4 }}
            onChange={e => { textVal.current = e.target.value; }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); }
              if (e.key === "Escape") { committingRef.current = true; textVal.current = ""; setTextPos(null); }
            }}
            onBlur={commitText}
          />
        )}
      </div>
    </div>
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

export function ClassroomView({ role, myName, otherName, durationMins, scheduledAt, bookingId, isSandbox, onLeave }: {
  role: "student" | "tutor"; myName: string; otherName: string;
  durationMins?: number; scheduledAt?: string; bookingId?: string;
  isSandbox?: boolean; onLeave: () => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const room         = useRoomContext();

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  // Timer
  const startRef = useRef(scheduledAt ? new Date(scheduledAt).getTime() : Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - startRef.current) / 1000))), 1000);
    return () => clearInterval(id);
  }, []);
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

  // Panel / dropdown / canvas state
  const [activePanel,  setActivePanel]  = useState<ActivePanel>(null);
  const [openDropdown, setOpenDropdown] = useState<Dropdown>(null);
  const [showPicker,   setShowPicker]   = useState(false);
  const [canvasOpen,   setCanvasOpen]   = useState(false);
  const [canvasFull,   setCanvasFull]   = useState(true);

  function togglePanel(p: Exclude<ActivePanel, null>) { setActivePanel(prev => prev === p ? null : p); setOpenDropdown(null); }
  function toggleDd(dd: Exclude<Dropdown, null>) { setOpenDropdown(prev => prev === dd ? null : dd); }

  useEffect(() => {
    if (!openDropdown) return;
    const close = () => setOpenDropdown(null);
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, [openDropdown]);

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

  // Canvas
  const [incomingCanvasObj, setIncomingCanvasObj] = useState<CanvasObj | null>(null);
  const [canvasClearCount,  setCanvasClearCount]  = useState(0);
  const [canvasUndoCount,   setCanvasUndoCount]   = useState(0);

  // Whiteboard (Paint)
  const [incomingWbObj, setIncomingWbObj] = useState<CanvasObj | null>(null);
  const [wbClearCount,  setWbClearCount]  = useState(0);
  const [wbUndoCount,   setWbUndoCount]   = useState(0);

  // Data receiver
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = (payload: Uint8Array, _p: any) => {
      try {
        const msg = JSON.parse(dec.current.decode(payload));
        switch (msg.type) {
          case "chat":
            setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: msg.sender, text: msg.text, time: msg.time, isLocal: false }]);
            setActivePanel(prev => { if (prev !== "chat") setUnread(n => n + 1); return prev; });
            break;
          case "reaction":    addFloat(msg.emoji, msg.sender); break;
          case "canvas-obj":  setIncomingCanvasObj(msg.obj); break;
          case "canvas-clear":setCanvasClearCount(n => n + 1); break;
          case "canvas-undo": setCanvasUndoCount(n => n + 1); break;
          case "wb-obj":   setIncomingWbObj(msg.obj); break;
          case "wb-clear": setWbClearCount(n => n + 1); break;
          case "wb-undo":  setWbUndoCount(n => n + 1); break;
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

  const panelTitles: Record<string, string> = { chat: "Chat", whiteboard: "Tableau blanc", info: "Informations" };

  return (
    <div className="h-screen flex flex-col bg-[#0F0A04] overflow-hidden select-none">

      {/* Canvas Modal */}
      <CanvasModal
        isOpen={canvasOpen} isFull={canvasFull}
        onClose={() => setCanvasOpen(false)}
        onToggleFull={() => setCanvasFull(v => !v)}
        onSendData={sendData}
        incomingObj={incomingCanvasObj}
        clearCount={canvasClearCount}
        undoCount={canvasUndoCount}
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
              <span className="text-amber-400 text-[11px] font-bold">SALLE DE TEST</span>
            </div>
          ) : (
            <>
              <div className="w-px h-5 bg-white/10 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white/70 text-xs font-semibold leading-tight truncate">
                  Séance avec <span className="text-[#F5C400]">{displayOther}</span>
                </p>
                <p className="text-white/25 text-[10px] leading-tight capitalize">
                  {role === "student" ? "Étudiant" : "Tuteur"}{durationMins ? ` · ${durationMins} min` : ""}
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
        <button onClick={onLeave}
          className="flex items-center gap-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Quitter
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative overflow-hidden">

          {/* Main display */}
          {hasRemoteScreen && remoteScrnTrack && isTrackReference(remoteScrnTrack) ? (
            <VideoTrack trackRef={remoteScrnTrack} className="absolute inset-0 w-full h-full object-contain bg-black" />
          ) : hasRemoteVideo && remoteCamTrack && isTrackReference(remoteCamTrack) ? (
            <VideoTrack trackRef={remoteCamTrack} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1C1308] to-[#0A0703]">
              {remotePart ? (
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#F5C400] to-[#C49200] flex items-center justify-center text-[#5C3D00] font-bold text-5xl mx-auto mb-5 shadow-[0_0_60px_rgba(245,196,0,0.15)]">{otherInit}</div>
                  <p className="text-white/70 text-sm font-semibold">{displayOther}</p>
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
                  <p className="text-white/60 text-sm font-semibold">En attente de {displayOther}…</p>
                  <p className="text-white/20 text-xs mt-2">Partage ce lien pour inviter</p>
                  <div className="mt-3 bg-[#1A1209] border border-[#3A2A0E] rounded-xl px-4 py-2 inline-block">
                    <p className="text-[#9B8A6B] text-xs font-mono">{isSandbox ? "/classroom/sandbox" : `/classroom/${(bookingId ?? "").slice(0,8)}`}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isSharing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F5C400] animate-pulse" />
              <span className="text-white/70 text-xs font-semibold">Vous partagez votre écran</span>
            </div>
          )}
          {hasRemoteScreen && !isSharing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-white/70 text-xs font-semibold">{displayOther} partage son écran</span>
            </div>
          )}
          {remotePart && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-white/90 text-xs font-semibold">{displayOther}</p>
            </div>
          )}

          {/* Self PiP */}
          <div className="absolute bottom-4 right-4 w-44 h-28 rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)] border-2 border-[#F5C400]/30 bg-[#1A1209]">
            {localCamTrack && isCameraEnabled && isTrackReference(localCamTrack) ? (
              <VideoTrack trackRef={localCamTrack} className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
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

          {showPicker && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
              <div className="bg-[#1A1209] border border-[#3A2A0E] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
                {REACTIONS.map(e => <button key={e} onClick={() => sendReaction(e)} className="text-2xl hover:scale-125 transition-transform">{e}</button>)}
              </div>
              <div className="w-3 h-3 bg-[#1A1209] border-r border-b border-[#3A2A0E] rotate-45 mx-auto -mt-1.5" />
            </div>
          )}
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
              {activePanel === "chat"       && <ChatPanel messages={messages} input={input} setInput={setInput} sendMessage={sendMessage} inputRef={inputRef} messagesEndRef={messagesEndRef} />}
              {activePanel === "whiteboard" && <WhiteboardPanel onSendData={sendData} incomingObj={incomingWbObj} clearCount={wbClearCount} undoCount={wbUndoCount} />}
              {activePanel === "info"       && <InfoPanel myName={myName} otherName={displayOther} elapsed={elapsed} msgCount={messages.length} quality={quality} remoteQuality={remoteQuality} isSandbox={isSandbox} />}
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex-shrink-0 bg-[#0A0703] border-t border-white/5 px-4 py-3 z-10">
        <div className="flex items-center justify-center gap-2 flex-wrap">

          {/* Micro + chevron */}
          <div className="relative flex items-end gap-px">
            <button onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)} className="flex flex-col items-center gap-1 group">
              <div className={`w-12 h-12 rounded-l-2xl flex items-center justify-center transition border-y border-l ${isMicrophoneEnabled ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white" : "bg-red-600/90 hover:bg-red-600 border-transparent text-white"}`}>
                {isMicrophoneEnabled
                  ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM3 3l18 18" /></svg>
                }
              </div>
              <span className="text-[10px] text-white/30 group-hover:text-white/50 transition">{isMicrophoneEnabled ? "Micro" : "Muet"}</span>
            </button>
            <button onClick={e => { e.stopPropagation(); loadDevices(); toggleDd("micro"); }}
              className={`h-12 w-5 rounded-r-xl flex items-center justify-center transition border-y border-r mb-[18px] ${isMicrophoneEnabled ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white/40 hover:text-white" : "bg-red-700 hover:bg-red-600 border-transparent text-white/60"}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {openDropdown === "micro" && (
              <div className="absolute bottom-full mb-2 left-0 bg-[#1A1209] border border-[#3A2A0E] rounded-2xl shadow-2xl py-2 min-w-[220px] z-50" onClick={e => e.stopPropagation()}>
                {audioIn.length > 0 && <><p className="text-white/30 text-[10px] font-bold uppercase tracking-wider px-4 pt-1 pb-2">Microphone</p>
                  {audioIn.map(d => <button key={d.deviceId} onClick={() => { room.switchActiveDevice("audioinput", d.deviceId); setOpenDropdown(null); }} className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition truncate">{d.label || `Micro ${d.deviceId.slice(0,6)}`}</button>)}</>}
                {audioOut.length > 0 && <><div className="border-t border-white/5 my-1.5" /><p className="text-white/30 text-[10px] font-bold uppercase tracking-wider px-4 pb-2">Haut-parleur</p>
                  {audioOut.map(d => <button key={d.deviceId} onClick={() => { room.switchActiveDevice("audiooutput", d.deviceId); setOpenDropdown(null); }} className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition truncate">{d.label || `Haut-parleur ${d.deviceId.slice(0,6)}`}</button>)}</>}
                {audioIn.length === 0 && audioOut.length === 0 && <p className="text-white/30 text-sm px-4 py-3">Aucun périphérique trouvé</p>}
              </div>
            )}
          </div>

          {/* Camera + chevron */}
          <div className="relative flex items-end gap-px">
            <button onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)} className="flex flex-col items-center gap-1 group">
              <div className={`w-12 h-12 rounded-l-2xl flex items-center justify-center transition border-y border-l ${isCameraEnabled ? "bg-[#2A1F0E] hover:bg-[#3A2A0E] border-[#3A2A0E] text-white" : "bg-red-600/90 hover:bg-red-600 border-transparent text-white"}`}>
                {isCameraEnabled
                  ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" /></svg>
                }
              </div>
              <span className="text-[10px] text-white/30 group-hover:text-white/50 transition">{isCameraEnabled ? "Caméra" : "Arrêtée"}</span>
            </button>
            <button onClick={e => { e.stopPropagation(); loadDevices(); toggleDd("camera"); }}
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

          {/* Toile */}
          <BarBtn active={canvasOpen} label="Toile" onClick={() => setCanvasOpen(v => !v)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
          />

          {/* Outils */}
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); toggleDd("outils"); }} className="flex flex-col items-center gap-1 group">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition border ${activePanel === "whiteboard" || openDropdown === "outils" ? "bg-[#F5C400]/20 border-[#F5C400]/40 text-[#F5C400]" : "bg-[#2A1F0E] border-[#3A2A0E] text-white/70 hover:text-white hover:bg-[#3A2A0E]"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <span className={`text-[10px] transition ${activePanel === "whiteboard" || openDropdown === "outils" ? "text-[#F5C400]/80" : "text-white/30 group-hover:text-white/50"}`}>Outils</span>
            </button>
            {openDropdown === "outils" && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1A1209] border border-[#3A2A0E] rounded-2xl shadow-2xl py-2 min-w-[200px] z-50" onClick={e => e.stopPropagation()}>
                <button onClick={() => { togglePanel("whiteboard"); setOpenDropdown(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                  <svg className="w-4 h-4 text-[#F5C400]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Tableau blanc
                </button>
                <div className="border-t border-white/5 mx-3 my-1" />
                {[{d:"M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",l:"Assistant IA"},
                  {d:"M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",l:"Vocabulaire"},
                  {d:"M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",l:"Notes"},
                ].map(x => (
                  <button key={x.l} disabled className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/30 cursor-not-allowed">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={x.d} /></svg>
                    {x.l}<span className="ml-auto text-[10px] text-white/20 bg-white/5 rounded px-1.5 py-0.5">bientôt</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Partager */}
          <BarBtn active={isSharing} label="Partager" onClick={toggleScreen} blue={true}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
          />

          {/* Chat */}
          <div className="relative">
            <BarBtn active={activePanel === "chat"} label="Chat" onClick={() => togglePanel("chat")}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
            />
            {unread > 0 && <span className="absolute top-0 right-0 w-5 h-5 bg-[#F5C400] text-[#5C3D00] text-[9px] font-black rounded-full flex items-center justify-center pointer-events-none">{unread > 9 ? "9+" : unread}</span>}
          </div>

          {/* Réagir */}
          <button onClick={() => { setShowPicker(v => !v); setOpenDropdown(null); }} className="flex flex-col items-center gap-1 group">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition border ${showPicker ? "bg-[#F5C400]/20 border-[#F5C400]/40" : "bg-[#2A1F0E] border-[#3A2A0E] text-white/70 hover:text-white hover:bg-[#3A2A0E]"}`}>😊</div>
            <span className={`text-[10px] transition ${showPicker ? "text-[#F5C400]/80" : "text-white/30 group-hover:text-white/50"}`}>Réagir</span>
          </button>

          <div className="w-px h-10 bg-white/10 mx-1" />

          {/* Plus */}
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); toggleDd("plus"); }} className="flex flex-col items-center gap-1 group">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition border ${openDropdown === "plus" ? "bg-[#F5C400]/20 border-[#F5C400]/40 text-[#F5C400]" : "bg-[#2A1F0E] border-[#3A2A0E] text-white/70 hover:text-white hover:bg-[#3A2A0E]"}`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
              </div>
              <span className={`text-[10px] transition ${openDropdown === "plus" ? "text-[#F5C400]/80" : "text-white/30 group-hover:text-white/50"}`}>Plus</span>
            </button>
            {openDropdown === "plus" && (
              <div className="absolute bottom-full mb-2 right-0 bg-[#1A1209] border border-[#3A2A0E] rounded-2xl shadow-2xl py-2 min-w-[210px] z-50" onClick={e => e.stopPropagation()}>
                <button onClick={() => { togglePanel("info"); setOpenDropdown(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                  <svg className="w-4 h-4 text-[#F5C400]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Informations
                </button>
                <button onClick={() => { recording ? stopRecording() : startRecording(); setOpenDropdown(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition ${recording ? "text-red-400" : "text-white/70 hover:text-white"}`}>
                  <svg className="w-4 h-4" fill={recording ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    {recording
                      ? <><circle cx="12" cy="12" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 110 20A10 10 0 0112 2z" /></>
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    }
                  </svg>
                  {recording ? "Arrêter l'enregistrement" : "Enregistrer la séance"}
                </button>
                <button onClick={() => { window.open("mailto:support@withyou.app?subject=Problème en classe","_blank"); setOpenDropdown(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Signaler un problème
                </button>
                <button onClick={() => { window.open("/help","_blank"); setOpenDropdown(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Assistance
                </button>
                <div className="border-t border-white/5 mx-3 my-1" />
                <button onClick={() => { window.open(role === "student" ? "/dashboard/student/settings" : "/dashboard/tutor/settings","_blank"); setOpenDropdown(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Paramètres
                </button>
              </div>
            )}
          </div>

          {/* Quitter */}
          <button onClick={onLeave} className="flex flex-col items-center gap-1 group">
            <div className="w-14 h-12 rounded-2xl bg-red-600 hover:bg-red-500 flex items-center justify-center transition shadow-[0_4px_20px_rgba(239,68,68,0.35)]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </div>
            <span className="text-[10px] text-red-400/60">Quitter</span>
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
