"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

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
interface ImageObj {
  kind: "image"; dataUrl: string; x: number; y: number; w: number; h: number;
}
type CanvasObj = StrokeObj | ShapeObj | TextObj | ImageObj;

// ─── Image cache ─────────────────────────────────────────────────────────────

const imgCache = new Map<string, HTMLImageElement>();
function loadImg(dataUrl: string): Promise<HTMLImageElement> {
  if (imgCache.has(dataUrl)) return Promise.resolve(imgCache.get(dataUrl)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { imgCache.set(dataUrl, img); resolve(img); };
    img.src = dataUrl;
  });
}

// ─── Draw ─────────────────────────────────────────────────────────────────────

function drawObj(ctx: CanvasRenderingContext2D, obj: CanvasObj) {
  ctx.save();
  if (obj.kind === "image") {
    const img = imgCache.get(obj.dataUrl);
    if (img) ctx.drawImage(img, obj.x, obj.y, obj.w, obj.h);
    ctx.restore(); return;
  }
  if (obj.kind === "stroke") {
    if (obj.points.length < 2) { ctx.restore(); return; }
    ctx.globalAlpha = obj.opacity;
    ctx.strokeStyle = obj.color;
    ctx.lineWidth   = obj.width;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
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

// ─── Canvas Viewer ────────────────────────────────────────────────────────────

export default function CanvasViewerPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [objects, setObjects]   = useState<CanvasObj[] | null>(null);
  const [pageHtml, setPageHtml] = useState<string>("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/lessons/${bookingId}/canvas`)
      .then(r => {
        if (r.status === 401) { router.push("/auth/login"); return null; }
        if (r.status === 403) { setError("Accès refusé."); return null; }
        if (!r.ok) { setError("Toile introuvable."); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        const wd = data.whiteboardData;
        if (!wd) { setError("Aucune toile enregistrée pour cette séance."); return; }
        setObjects(wd.objects ?? []);
        setPageHtml(wd.pageHtml ?? "");
      })
      .catch(() => setError("Erreur de chargement."))
      .finally(() => setLoading(false));
  }, [bookingId, router]);

  // Render canvas objects once loaded
  useEffect(() => {
    if (!objects) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Preload all images, then draw
    const imageObjs = objects.filter((o): o is ImageObj => o.kind === "image");
    Promise.all(imageObjs.map(o => loadImg(o.dataUrl))).then(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const obj of objects) drawObj(ctx, obj);
    });
  }, [objects]);

  const hasContent = objects && (objects.length > 0 || pageHtml.trim());

  return (
    <div className="min-h-screen bg-[#FAF8F0] flex flex-col">
      {/* Header */}
      <div className="h-14 bg-white border-b border-black/5 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9B8A6B] hover:bg-[#F2EFE9] transition"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="w-px h-5 bg-black/10" />
          <p className="text-sm font-bold text-[#2D1A00]">Toile de la séance</p>
        </div>
        <button
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const a = document.createElement("a");
            a.href = canvas.toDataURL("image/png");
            a.download = `toile-${bookingId}.png`;
            a.click();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#F5C400] text-[#5C3D00] font-bold text-sm rounded-xl hover:bg-[#FFDE59] transition"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Exporter PNG
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="max-w-lg mx-auto mt-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F5C400]/10 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-[#9B8A6B]">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path strokeLinecap="round" d="M8 13l2.5-3.5 2 2.5 2-3L18 13" />
              </svg>
            </div>
            <p className="text-[#5C3D00] font-bold mb-1">{error}</p>
            <p className="text-sm text-[#9B8A6B]">La toile sera disponible après la première séance.</p>
          </div>
        )}

        {!loading && !error && hasContent && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Canvas drawings */}
            {objects && objects.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-black/5">
                  <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest">Dessin</p>
                </div>
                <div className="p-4 overflow-auto">
                  <canvas
                    ref={canvasRef}
                    width={900}
                    height={600}
                    className="rounded-xl border border-black/5 max-w-full"
                    style={{ background: "#fff" }}
                  />
                </div>
              </div>
            )}

            {/* Text/HTML content */}
            {pageHtml.trim() && (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-black/5">
                  <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest">Texte</p>
                </div>
                <div
                  className="p-6 prose prose-sm max-w-none text-[#2D1A00]"
                  style={{ fontFamily: "Georgia, serif", lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: pageHtml }}
                />
              </div>
            )}
          </div>
        )}

        {!loading && !error && !hasContent && (
          <div className="max-w-lg mx-auto mt-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F5C400]/10 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-[#9B8A6B]">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path strokeLinecap="round" d="M8 13l2.5-3.5 2 2.5 2-3L18 13" />
              </svg>
            </div>
            <p className="text-[#5C3D00] font-bold mb-1">Toile vide</p>
            <p className="text-sm text-[#9B8A6B]">Aucun contenu n&apos;a été ajouté à la toile lors de cette séance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
