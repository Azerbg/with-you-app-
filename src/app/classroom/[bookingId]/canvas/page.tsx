"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tldraw, Editor, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";

export default function CanvasViewerPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorRef, setEditorRef] = useState<Editor | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [snapshot, setSnapshot] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/lessons/${bookingId}/canvas`)
      .then((r) => {
        if (r.status === 401) { router.push("/auth/login"); return null; }
        if (r.status === 403) { setError("Accès refusé."); return null; }
        if (!r.ok)            { setError("Toile introuvable."); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.snapshot) {
          setSnapshot(data.snapshot);
        } else {
          setError("Aucune toile enregistrée pour cette séance.");
        }
      })
      .catch(() => setError("Erreur de chargement."))
      .finally(() => setLoading(false));
  }, [bookingId, router]);

  const handleMount = useCallback(
    (editor: Editor) => {
      editor.updateInstanceState({ isReadonly: true });
      setEditorRef(editor);
      if (snapshot) {
        try { loadSnapshot(editor.store, snapshot); } catch { /* schema mismatch */ }
      }
    },
    [snapshot],
  );

  // Apply snapshot after both editor and snapshot are ready
  useEffect(() => {
    if (!editorRef || !snapshot) return;
    try { loadSnapshot(editorRef.store, snapshot); } catch { /* ignore */ }
  }, [editorRef, snapshot]);

  function handleExport() {
    if (!editorRef) return;
    // Use tldraw's built-in export action
    editorRef.selectAll();
    // Fallback: open browser print dialog which can save to PDF
    window.print();
    editorRef.selectNone();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F0]" style={{ fontFamily: "sans-serif" }}>
      {/* Header */}
      <div className="h-14 bg-white border-b border-black/5 flex items-center justify-between px-6 flex-shrink-0 no-print">
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
          <p className="text-sm font-bold text-[#2D1A00]">Tableau blanc de la séance</p>
        </div>
        {!loading && !error && snapshot && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[#F5C400] text-[#5C3D00] font-bold text-sm rounded-xl hover:bg-[#FFDE59] transition"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Exporter / Imprimer
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F5C400]/10 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-[#9B8A6B]">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path strokeLinecap="round" d="M8 13l2.5-3.5 2 2.5 2-3L18 13" />
              </svg>
            </div>
            <p className="text-[#5C3D00] font-bold mb-1">{error}</p>
            <p className="text-sm text-[#9B8A6B]">Le tableau sera disponible après la première séance.</p>
          </div>
        )}

        {!loading && !error && snapshot && (
          <Tldraw
            onMount={handleMount}
            licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
          />
        )}
      </div>
    </div>
  );
}
