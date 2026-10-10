"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type {
  ExcalidrawImperativeAPI,
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";

// Set asset path before module loads
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";
}

const Excalidraw = dynamic(
  () =>
    import("@excalidraw/excalidraw").then((m) => {
      // CSS must be imported inside the dynamic callback so Next.js bundles it
      require("@excalidraw/excalidraw/index.css");
      return m.Excalidraw;
    }),
  { ssr: false },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExcalidrawSceneElements = readonly any[];

export interface ExcalidrawSync {
  elements: ExcalidrawSceneElements;
  files?: BinaryFiles;
  version: number;
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

// Build grouped table elements
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTableElements(rows: number, cols: number, x: number, y: number): any[] {
  const cellW = 120;
  const cellH = 40;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: any[] = [];
  const groupId = `table-${Date.now()}`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `cell-${Date.now()}-${r}-${c}`;
      elements.push({
        id,
        type: "rectangle",
        x: x + c * cellW,
        y: y + r * cellH,
        width: cellW,
        height: cellH,
        angle: 0,
        strokeColor: "#1e1e1e",
        backgroundColor: r === 0 ? "#e9ecef" : "transparent",
        fillStyle: r === 0 ? "solid" : "hachure",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
      });

      // Text label
      elements.push({
        id: `text-${id}`,
        type: "text",
        x: x + c * cellW + 6,
        y: y + r * cellH + 10,
        width: cellW - 12,
        height: 20,
        angle: 0,
        strokeColor: "#1e1e1e",
        backgroundColor: "transparent",
        fillStyle: "hachure",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: "",
        fontSize: 14,
        fontFamily: 1,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: null,
        originalText: "",
        autoResize: true,
        lineHeight: 1.25,
      });
    }
  }
  return elements;
}

export default function ExcalidrawBoard({
  bookingId,
  lang,
  isOpen,
  isFull,
  onClose,
  onToggleFull,
  sendData,
  incomingSync,
}: Props) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRemote = useRef(false);
  const lastVersion = useRef(-1);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Table picker state
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(4);

  // Load snapshot on mount
  const handleMount = useCallback(
    (excalidrawApi: ExcalidrawImperativeAPI) => {
      setApi(excalidrawApi);
      if (!bookingId) return;
      fetch(`/api/lessons/${bookingId}/canvas`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data?.snapshot) return;
          const snap = data.snapshot;
          try {
            excalidrawApi.updateScene({
              elements: snap.elements ?? [],
              appState: { ...(snap.appState ?? {}), collaborators: new Map() },
            });
            if (snap.files && Object.keys(snap.files).length) {
              excalidrawApi.addFiles(Object.values(snap.files));
            }
          } catch {
            /* schema mismatch — start fresh */
          }
        })
        .catch(() => {});
    },
    [bookingId],
  );

  // Broadcast + debounced save on change
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    (_elements: readonly any[], _state: AppState, files: BinaryFiles) => {
      if (applyingRemote.current) return;

      // Throttle broadcast to ~50ms
      if (throttleTimer.current) return;
      throttleTimer.current = setTimeout(() => {
        throttleTimer.current = null;
        if (!api) return;
        const els = api.getSceneElements();
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getSceneVersion } = require("@excalidraw/excalidraw");
        const v = getSceneVersion(els);
        if (v === lastVersion.current) return;
        lastVersion.current = v;
        sendData({ type: "excalidraw-sync", elements: els, files, version: v });
      }, 50);

      // Debounced save to DB
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (!bookingId || !api) return;
        const els = api.getSceneElements();
        const appState = api.getAppState();
        const dbFiles = api.getFiles();
        fetch(`/api/lessons/${bookingId}/canvas`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            snapshot: { elements: els, appState, files: dbFiles },
          }),
        }).catch(() => {});
      }, 3000);
    },
    [api, bookingId, sendData],
  );

  // Apply incoming peer sync
  useEffect(() => {
    if (!incomingSync || !api) return;
    applyingRemote.current = true;
    try {
      api.updateScene({
        elements: incomingSync.elements,
        appState: { collaborators: new Map() },
      });
      if (incomingSync.files && Object.keys(incomingSync.files).length) {
        api.addFiles(Object.values(incomingSync.files));
      }
    } finally {
      applyingRemote.current = false;
    }
  }, [incomingSync, api]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (throttleTimer.current) clearTimeout(throttleTimer.current);
    };
  }, []);

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

  async function handleExportPng() {
    if (!api) return;
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const blob = await exportToBlob({
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles(),
      mimeType: "image/png",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whiteboard-${bookingId ?? "export"}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 flex flex-col overflow-hidden ${
        isFull
          ? "inset-0"
          : "top-16 left-8 right-8 bottom-8 rounded-2xl shadow-2xl border border-black/10"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1209] flex-shrink-0">
        <svg
          className="w-4 h-4 text-[#F5C400] flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
        <span className="text-white/80 text-sm font-bold flex-1">
          {lang === "fr" ? "Tableau blanc" : "Whiteboard"}
        </span>

        {/* Table button */}
        <div className="relative">
          <button
            onClick={() => setShowTablePicker((v) => !v)}
            title={lang === "fr" ? "Insérer un tableau" : "Insert table"}
            className="flex items-center gap-1.5 px-2.5 h-7 text-white/60 hover:text-white/90 hover:bg-white/10 rounded-lg transition text-xs font-semibold"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
            {lang === "fr" ? "Tableau" : "Table"}
          </button>

          {showTablePicker && (
            <div className="absolute top-9 left-0 z-10 bg-[#0D0904] border border-white/10 rounded-xl shadow-2xl p-4 w-56">
              <p className="text-white/60 text-xs font-bold mb-3">{lang === "fr" ? "Taille du tableau" : "Table size"}</p>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-white/40 text-xs w-16">{lang === "fr" ? "Lignes" : "Rows"}</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="w-16 bg-[#1A1209] border border-white/10 rounded-lg px-2 py-1 text-sm text-white/80 focus:outline-none focus:border-[#F5C400]/40"
                />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <label className="text-white/40 text-xs w-16">{lang === "fr" ? "Colonnes" : "Cols"}</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="w-16 bg-[#1A1209] border border-white/10 rounded-lg px-2 py-1 text-sm text-white/80 focus:outline-none focus:border-[#F5C400]/40"
                />
              </div>
              <button
                onClick={insertTable}
                className="w-full bg-[#F5C400] text-[#5C3D00] font-bold text-sm py-2 rounded-xl hover:bg-[#FFDE59] transition"
              >
                {lang === "fr" ? "Insérer" : "Insert"}
              </button>
            </div>
          )}
        </div>

        {/* Export PNG */}
        <button
          onClick={handleExportPng}
          title={lang === "fr" ? "Exporter en PNG" : "Export PNG"}
          className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        {/* Minimize / Expand */}
        <button
          onClick={onToggleFull}
          title={
            isFull
              ? lang === "fr" ? "Réduire" : "Minimize"
              : lang === "fr" ? "Agrandir" : "Expand"
          }
          className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition"
        >
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

        {/* Close */}
        <button
          onClick={onClose}
          title={lang === "fr" ? "Fermer" : "Close"}
          className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 relative min-h-0 bg-white" style={{ height: "100%", width: "100%" }}>
        <Excalidraw
          excalidrawAPI={(excalidrawApi) => handleMount(excalidrawApi)}
          onChange={handleChange}
          langCode={lang === "fr" ? "fr-FR" : "en"}
          theme="light"
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveToActiveFile: false,
            },
          }}
        />
      </div>
    </div>
  );
}
