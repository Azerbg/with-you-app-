"use client";

import { useState, useEffect, useRef, useCallback, Component } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import type {
  ExcalidrawImperativeAPI,
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";
}

function BoardSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false, loading: () => <BoardSkeleton /> },
);

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface EBProps { lang: string; onClose: () => void; children: ReactNode; }
interface EBState { crashed: boolean; }

class BoardErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white gap-4">
        <p className="text-[#5C3D00] font-bold text-sm">
          {this.props.lang === "fr" ? "Le tableau a planté." : "Board failed to load."}
        </p>
        <div className="flex gap-3">
          <button onClick={() => this.setState({ crashed: false })}
            className="px-4 py-2 bg-[#F5C400] text-[#5C3D00] font-bold text-sm rounded-xl hover:bg-[#FFDE59] transition">
            {this.props.lang === "fr" ? "Réessayer" : "Retry"}
          </button>
          <button onClick={this.props.onClose}
            className="px-4 py-2 bg-white border border-black/10 text-[#5C3D00] font-bold text-sm rounded-xl hover:bg-gray-50 transition">
            {this.props.lang === "fr" ? "Fermer" : "Close"}
          </button>
        </div>
      </div>
    );
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExcalidrawSceneElements = readonly any[];

export interface ExcalidrawSync {
  elements: ExcalidrawSceneElements;
  files?: BinaryFiles;
  version: number;
  pageId?: string;
}

interface PageData {
  id: string;
  label: string;
  elements: ExcalidrawSceneElements;
  files: BinaryFiles;
}

interface Props {
  bookingId: string | undefined;
  lang: string;
  isOpen: boolean;
  isFull: boolean;
  onClose: () => void;
  onToggleFull: () => void;
  sendData: (payload: object) => void;
  incomingSync: ExcalidrawSync | null;
}

// ─── Table builder ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTableElements(rows: number, cols: number, x: number, y: number): any[] {
  const cellW = 120, cellH = 40;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: any[] = [];
  const groupId = `table-${Date.now()}`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rectId = `cell-${Date.now()}-${r}-${c}`;
      const textId = `text-${rectId}`;
      elements.push({
        id: rectId, type: "rectangle",
        x: x + c * cellW, y: y + r * cellH, width: cellW, height: cellH,
        angle: 0, strokeColor: "#1e1e1e",
        backgroundColor: r === 0 ? "#e9ecef" : "transparent",
        fillStyle: r === 0 ? "solid" : "hachure",
        strokeWidth: 1, strokeStyle: "solid", roughness: 0, opacity: 100,
        groupIds: [groupId], frameId: null, roundness: null,
        seed: Math.floor(Math.random() * 100000), version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false, boundElements: [{ type: "text", id: textId }],
        updated: Date.now(), link: null, locked: false,
      });
      elements.push({
        id: textId, type: "text",
        x: x + c * cellW + cellW / 2, y: y + r * cellH + cellH / 2,
        width: cellW - 12, height: 20, angle: 0, strokeColor: "#1e1e1e",
        backgroundColor: "transparent", fillStyle: "hachure",
        strokeWidth: 1, strokeStyle: "solid", roughness: 0, opacity: 100,
        groupIds: [groupId], frameId: null, roundness: null,
        seed: Math.floor(Math.random() * 100000), version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false, boundElements: null, updated: Date.now(),
        link: null, locked: false, text: "", fontSize: 14, fontFamily: 1,
        textAlign: "center", verticalAlign: "middle", containerId: rectId,
        originalText: "", autoResize: true, lineHeight: 1.25,
      });
    }
  }
  return elements;
}

// ─── Component ────────────────────────────────────────────────────────────────

const INITIAL_PAGES: PageData[] = [{ id: "p1", label: "Page 1", elements: [], files: {} }];

export default function ExcalidrawBoard({
  bookingId, lang, isOpen, isFull, onClose, onToggleFull, sendData, incomingSync,
}: Props) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const saveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRemote = useRef(false);
  const lastVersion    = useRef(-1);
  const throttleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(4);
  const seenElementIds = useRef<Set<string>>(new Set());

  // ─── Pages ────────────────────────────────────────────────────────────────
  const [pages, setPages]               = useState<PageData[]>(INITIAL_PAGES);
  const [currentPageId, setCurrentPageId] = useState("p1");
  const pagesRef         = useRef<PageData[]>(INITIAL_PAGES);
  const currentPageIdRef = useRef("p1");
  useEffect(() => { currentPageIdRef.current = currentPageId; }, [currentPageId]);

  // ─── Browser back button closes board ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ boardOpen: true }, "");
    const handlePop = () => onClose();
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isOpen, onClose]);

  // ─── Escape key closes board ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // ─── Page helpers ─────────────────────────────────────────────────────────
  function saveCurrentPageToRef(currentApi: ExcalidrawImperativeAPI) {
    const els = currentApi.getSceneElements();
    const files = currentApi.getFiles();
    const updated = pagesRef.current.map(p =>
      p.id === currentPageIdRef.current ? { ...p, elements: els, files } : p
    );
    pagesRef.current = updated;
    return updated;
  }

  function switchPage(newPageId: string) {
    if (!api || newPageId === currentPageIdRef.current) return;
    const updatedPages = saveCurrentPageToRef(api);
    setPages(updatedPages);
    setCurrentPageId(newPageId);
    currentPageIdRef.current = newPageId;
    const page = updatedPages.find(p => p.id === newPageId);
    if (page) {
      applyingRemote.current = true;
      try {
        api.updateScene({ elements: page.elements ?? [], appState: { collaborators: new Map() } });
        if (page.files && Object.keys(page.files).length) api.addFiles(Object.values(page.files));
      } finally { applyingRemote.current = false; }
    }
  }

  function addPage() {
    const newId = `p${Date.now()}`;
    const newLabel = `Page ${pagesRef.current.length + 1}`;
    const updatedPages = api ? saveCurrentPageToRef(api) : pagesRef.current;
    const allPages = [...updatedPages, { id: newId, label: newLabel, elements: [], files: {} }];
    pagesRef.current = allPages;
    setPages(allPages);
    setCurrentPageId(newId);
    currentPageIdRef.current = newId;
    if (api) {
      applyingRemote.current = true;
      try { api.updateScene({ elements: [], appState: { collaborators: new Map() } }); }
      finally { applyingRemote.current = false; }
    }
    sendData({ type: "excalidraw-page-add", page: { id: newId, label: newLabel } });
  }

  // ─── Load snapshot on mount ───────────────────────────────────────────────
  const handleMount = useCallback((excalidrawApi: ExcalidrawImperativeAPI) => {
    setApi(excalidrawApi);
    if (!bookingId) return;
    fetch(`/api/lessons/${bookingId}/canvas`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.snapshot) return;
        const snap = data.snapshot;
        try {
          if (snap.pages && Array.isArray(snap.pages)) {
            const loadedPages: PageData[] = snap.pages;
            const firstId = snap.currentPageId ?? loadedPages[0]?.id ?? "p1";
            pagesRef.current = loadedPages;
            setPages(loadedPages);
            setCurrentPageId(firstId);
            currentPageIdRef.current = firstId;
            const page = loadedPages.find(p => p.id === firstId) ?? loadedPages[0];
            if (page) {
              excalidrawApi.updateScene({ elements: page.elements ?? [], appState: { collaborators: new Map() } });
              if (page.files && Object.keys(page.files).length) excalidrawApi.addFiles(Object.values(page.files));
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (page.elements as any[]).forEach(el => seenElementIds.current.add(el.id));
            }
          } else {
            // Legacy single-page
            excalidrawApi.updateScene({ elements: snap.elements ?? [], appState: { ...(snap.appState ?? {}), collaborators: new Map() } });
            if (snap.files && Object.keys(snap.files).length) excalidrawApi.addFiles(Object.values(snap.files));
            const page1: PageData = { id: "p1", label: "Page 1", elements: snap.elements ?? [], files: snap.files ?? {} };
            pagesRef.current = [page1];
            setPages([page1]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (snap.elements ?? []).forEach((el: any) => seenElementIds.current.add(el.id));
          }
        } catch { /* schema mismatch — start fresh */ }
      })
      .catch(() => {});
  }, [bookingId]);

  // ─── Broadcast + debounced save on change ────────────────────────────────
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_elements: readonly any[], _state: AppState, files: BinaryFiles) => {
      if (applyingRemote.current) return;

      // Silently fix standalone text elements created by click so they wrap at page width
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newTextEls = (_elements as any[]).filter(el =>
        el.type === "text" && !el.containerId && el.autoResize === true && !seenElementIds.current.has(el.id)
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_elements as any[]).forEach(el => seenElementIds.current.add(el.id));
      if (newTextEls.length > 0 && api) {
        setTimeout(() => {
          if (!api) return;
          const currentAppState = api.getAppState();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const patched = (api.getSceneElements() as any[]).map(el =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            newTextEls.find((n: any) => n.id === el.id)
              ? { ...el, autoResize: false, width: 800 }
              : el
          );
          applyingRemote.current = true;
          try {
            api.updateScene({
              elements: patched,
              // Preserve active editing so typing continues after wrap
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              appState: { editingElement: (currentAppState as any).editingElement, collaborators: new Map() },
            });
          }
          finally { applyingRemote.current = false; }
        }, 0);
      }

      if (!throttleTimer.current) {
        throttleTimer.current = setTimeout(async () => {
          throttleTimer.current = null;
          if (!api) return;
          const els = api.getSceneElements();
          const { getSceneVersion } = await import("@excalidraw/excalidraw");
          const v = getSceneVersion(els);
          if (v === lastVersion.current) return;
          lastVersion.current = v;
          sendData({ type: "excalidraw-sync", elements: els, files, version: v, pageId: currentPageIdRef.current });
        }, 50);
      }

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (!bookingId || !api) return;
        const els = api.getSceneElements();
        const appState = api.getAppState();
        const dbFiles = api.getFiles();
        const updated = pagesRef.current.map(p =>
          p.id === currentPageIdRef.current ? { ...p, elements: els, files: dbFiles } : p
        );
        pagesRef.current = updated;
        fetch(`/api/lessons/${bookingId}/canvas`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot: { version: 2, pages: updated, currentPageId: currentPageIdRef.current, appState } }),
        }).catch(() => {});
      }, 3000);
    },
    [api, bookingId, sendData],
  );

  // ─── Apply incoming peer sync ─────────────────────────────────────────────
  useEffect(() => {
    if (!incomingSync) return;
    const pageId = incomingSync.pageId ?? "p1";

    // Auto-create missing page from remote
    if (pageId && !pagesRef.current.find(p => p.id === pageId)) {
      const newPage: PageData = { id: pageId, label: `Page ${pagesRef.current.length + 1}`, elements: [], files: {} };
      const updated = [...pagesRef.current, newPage];
      pagesRef.current = updated;
      setPages(updated);
    }

    if (pageId !== currentPageIdRef.current) {
      // Store for that page, don't disturb current view
      const updated = pagesRef.current.map(p =>
        p.id === pageId ? { ...p, elements: incomingSync.elements, files: { ...(incomingSync.files ?? {}) } as BinaryFiles } : p
      );
      pagesRef.current = updated;
      setPages(updated);
      return;
    }

    if (!api) return;
    applyingRemote.current = true;
    try {
      api.updateScene({ elements: incomingSync.elements, appState: { collaborators: new Map() } });
      if (incomingSync.files && Object.keys(incomingSync.files).length) api.addFiles(Object.values(incomingSync.files));
    } finally { applyingRemote.current = false; }
  }, [incomingSync, api]);

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (throttleTimer.current) clearTimeout(throttleTimer.current);
  }, []);

  // ─── Table insert ─────────────────────────────────────────────────────────
  function insertTable() {
    if (!api) return;
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const cx = appState.scrollX !== undefined ? -appState.scrollX + appState.width / 2 : 100;
    const cy = appState.scrollY !== undefined ? -appState.scrollY + appState.height / 2 : 100;
    const tableEls = buildTableElements(tableRows, tableCols, cx - (tableCols * 120) / 2, cy - (tableRows * 40) / 2);
    api.updateScene({ elements: [...elements, ...tableEls] });
    setShowTablePicker(false);
  }

  // ─── Export PNG ───────────────────────────────────────────────────────────
  async function handleExportPng() {
    if (!api) return;
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const blob = await exportToBlob({ elements: api.getSceneElements(), appState: api.getAppState(), files: api.getFiles(), mimeType: "image/png" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `whiteboard-${bookingId ?? "export"}.png`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!isOpen) return null;

  const fr = lang === "fr";

  return (
    <div className={`fixed z-50 flex flex-col overflow-hidden ${
      isFull ? "inset-0" : "top-16 left-4 right-4 bottom-24 rounded-2xl shadow-2xl border border-black/10"
    }`}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#1A1209] flex-shrink-0">
        {/* Title */}
        <svg className="w-4 h-4 text-[#F5C400] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span className="text-white/80 text-sm font-bold flex-1">{fr ? "Tableau blanc" : "Whiteboard"}</span>

        {/* Insert table */}
        <div className="relative">
          <button onClick={() => setShowTablePicker(v => !v)}
            title={fr ? "Insérer un tableau" : "Insert table"}
            className={`flex items-center gap-1.5 px-2.5 h-7 rounded-lg transition text-xs font-semibold ${showTablePicker ? "bg-[#F5C400]/20 text-[#F5C400]" : "text-white/50 hover:text-white hover:bg-white/10"}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
            {fr ? "Insérer tableau" : "Insert table"}
          </button>
          {showTablePicker && (
            <div className="absolute top-9 left-0 z-[400] bg-[#0D0904] border border-white/10 rounded-xl shadow-2xl p-4 w-52">
              <p className="text-white/60 text-xs font-bold mb-3">{fr ? "Taille" : "Size"}</p>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-white/40 text-xs w-16">{fr ? "Lignes" : "Rows"}</label>
                <input type="number" min={1} max={20} value={tableRows}
                  onChange={e => setTableRows(Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="w-14 bg-[#1A1209] border border-white/10 rounded-lg px-2 py-1 text-sm text-white/80 focus:outline-none" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <label className="text-white/40 text-xs w-16">{fr ? "Colonnes" : "Cols"}</label>
                <input type="number" min={1} max={20} value={tableCols}
                  onChange={e => setTableCols(Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="w-14 bg-[#1A1209] border border-white/10 rounded-lg px-2 py-1 text-sm text-white/80 focus:outline-none" />
              </div>
              <button onClick={insertTable} className="w-full bg-[#F5C400] text-[#5C3D00] font-bold text-sm py-2 rounded-xl hover:bg-[#FFDE59] transition">
                {fr ? "Insérer" : "Insert"}
              </button>
            </div>
          )}
        </div>

        {/* Export PNG */}
        <button onClick={handleExportPng} title={fr ? "Enregistrer en image PNG" : "Save as PNG"}
          className="flex items-center gap-1.5 px-2.5 h-7 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition text-xs font-semibold">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          PNG
        </button>

        {/* Minimize / Full screen */}
        <button onClick={onToggleFull}
          title={isFull ? (fr ? "Réduire" : "Minimize") : (fr ? "Plein écran" : "Full screen")}
          className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition">
          {isFull ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          )}
        </button>

        {/* Close — big red, always visible */}
        <button onClick={onClose}
          title={fr ? "Fermer le tableau" : "Close board"}
          className="flex items-center gap-1.5 h-7 px-3 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold rounded-lg transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {fr ? "Fermer" : "Close"}
        </button>
      </div>

      {/* ── Editor ── */}
      <BoardErrorBoundary lang={lang} onClose={onClose}>
        {/* Outer: light gray background so users see the page boundary */}
        <div className="flex-1 relative min-h-0 bg-[#e8e8e8] flex justify-center overflow-hidden">
          {/* Inner "page": white, max-width 900px, fills full height */}
          <div className="relative h-full shadow-[0_2px_16px_rgba(0,0,0,0.18)]" style={{ width: "100%", maxWidth: 900 }}>
            <Excalidraw
              excalidrawAPI={handleMount}
              onChange={handleChange}
              langCode={lang === "fr" ? "fr-FR" : "en"}
              theme="light"
              UIOptions={{ canvasActions: { loadScene: false, export: false, saveToActiveFile: false } }}
            />
          </div>
        </div>
      </BoardErrorBoundary>

      {/* ── Page navigation — bottom bar (like Google Slides) ── */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#1A1209] border-t border-white/5 flex-shrink-0 overflow-x-auto">
        <span className="text-white/30 text-[10px] font-semibold mr-1 flex-shrink-0">{fr ? "Pages :" : "Pages:"}</span>
        {pages.map(page => (
          <button key={page.id} onClick={() => switchPage(page.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0 transition ${
              page.id === currentPageId
                ? "bg-[#F5C400] text-[#5C3D00]"
                : "bg-[#2A1F0E] text-white/50 hover:text-white border border-white/10"
            }`}>
            {page.label}
          </button>
        ))}
        <button onClick={addPage}
          title={fr ? "Nouvelle page" : "New page"}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2A1F0E] border border-white/10 text-white/50 hover:text-white hover:bg-[#3A2A0E] transition text-xs font-bold flex-shrink-0 ml-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {fr ? "Nouvelle page" : "New page"}
        </button>
      </div>
    </div>
  );
}
