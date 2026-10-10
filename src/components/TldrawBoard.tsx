"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Tldraw, Editor, TLRecord, getSnapshot, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";

export interface TldrawDiff {
  added: Record<string, TLRecord>;
  updated: Record<string, [TLRecord, TLRecord]>;
  removed: Record<string, TLRecord>;
}

interface Props {
  bookingId: string | undefined;
  lang: string;
  isOpen: boolean;
  isFull: boolean;
  onClose: () => void;
  onToggleFull: () => void;
  sendData: (payload: object) => void;
  incomingDiff: TldrawDiff | null;
}

export default function TldrawBoard({
  bookingId,
  lang,
  isOpen,
  isFull,
  onClose,
  onToggleFull,
  sendData,
  incomingDiff,
}: Props) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRemote = useRef(false);

  const handleMount = useCallback(
    (e: Editor) => {
      e.user.updateUserPreferences({ locale: lang === "fr" ? "fr" : "en" });
      setEditor(e);

      if (bookingId) {
        fetch(`/api/lessons/${bookingId}/canvas`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.snapshot) {
              try {
                loadSnapshot(e.store, data.snapshot);
              } catch {
                /* schema mismatch — start fresh */
              }
            }
          })
          .catch(() => {});
      }
    },
    [bookingId, lang],
  );

  // Update locale on lang change
  useEffect(() => {
    if (!editor) return;
    editor.user.updateUserPreferences({ locale: lang === "fr" ? "fr" : "en" });
  }, [editor, lang]);

  // Broadcast local changes + debounced save
  useEffect(() => {
    if (!editor) return;
    const unsub = editor.store.listen(
      ({ changes }) => {
        if (applyingRemote.current) return;
        const { added, updated, removed } = changes;
        if (
          !Object.keys(added).length &&
          !Object.keys(updated).length &&
          !Object.keys(removed).length
        )
          return;

        sendData({ type: "tldraw-diff", added, updated, removed });

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          if (!bookingId) return;
          const snap = getSnapshot(editor.store);
          fetch(`/api/lessons/${bookingId}/canvas`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snapshot: snap }),
          }).catch(() => {});
        }, 3000);
      },
      { source: "user" },
    );

    return () => {
      unsub();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editor, sendData, bookingId]);

  // Apply incoming peer diffs
  useEffect(() => {
    if (!incomingDiff || !editor) return;
    const { added, updated, removed } = incomingDiff;
    applyingRemote.current = true;
    try {
      editor.store.mergeRemoteChanges(() => {
        if (Object.keys(added).length)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          editor.store.put(Object.values(added) as any);
        if (Object.keys(updated).length)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          editor.store.put(Object.values(updated).map(([, to]) => to) as any);
        if (Object.keys(removed).length)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          editor.store.remove(Object.keys(removed) as any);
      });
    } finally {
      applyingRemote.current = false;
    }
  }, [incomingDiff, editor]);

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

        <button
          onClick={onToggleFull}
          title={
            isFull
              ? lang === "fr"
                ? "Réduire"
                : "Minimize"
              : lang === "fr"
                ? "Agrandir"
                : "Expand"
          }
          className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition"
        >
          {isFull ? (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
          )}
        </button>

        <button
          onClick={onClose}
          title={lang === "fr" ? "Fermer" : "Close"}
          className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 relative min-h-0 bg-white">
        <Tldraw
          onMount={handleMount}
          licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
        />
      </div>
    </div>
  );
}
