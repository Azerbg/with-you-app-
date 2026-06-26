"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface ThreadUser {
  id: string; email: string; firstName: string | null; lastName: string | null;
  hrApplication?: { fullName: string | null } | null;
}
interface Thread {
  id: string; lastMessageAt: string | null;
  student: ThreadUser; tutor: ThreadUser;
  _count: { messages: number };
  messages: { content: string; createdAt: string; senderId: string }[];
}
interface Message {
  id: string; senderId: string; content: string; type: string; isRead: boolean; createdAt: string;
}
interface ThreadDetail {
  id: string;
  student: ThreadUser; tutor: ThreadUser;
  messages: Message[];
}

function userName(u: ThreadUser) {
  if (u.hrApplication?.fullName) return u.hrApplication.fullName;
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return n || u.email;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Hier";
  if (diff < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function AdminMessagesClient() {
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(searchParams.get("thread"));
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, page: String(page) });
    const res = await fetch(`/api/admin/messages?${params}`);
    if (res.ok) {
      const data = await res.json();
      setThreads(data.threads);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => { setPage(1); }, [search]);

  async function openThread(id: string) {
    setActiveId(id);
    setDetailLoading(true);
    const res = await fetch(`/api/admin/messages/${id}`);
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  }

  useEffect(() => {
    if (activeId) openThread(activeId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages]);

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">

      {/* Thread list */}
      <div className="w-72 flex-shrink-0 border-r border-black/5 bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-black/5">
          <h1 className="font-black text-[#1A0F00]">Messages</h1>
          <p className="text-xs text-[#9B8A6B] mt-0.5">{total} conversation{total !== 1 ? "s" : ""}</p>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="mt-3 w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-xs text-[#2D1A00] focus:outline-none focus:border-[#F5C400] transition"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex items-center justify-center h-24 text-sm text-[#9B8A6B]">Chargement…</div>}
          {!loading && threads.length === 0 && (
            <div className="flex items-center justify-center h-24 text-sm text-[#9B8A6B]">Aucune conversation</div>
          )}
          {threads.map(t => {
            const sName = userName(t.student);
            const tName = userName(t.tutor);
            const last = t.messages[0];
            return (
              <button key={t.id} onClick={() => openThread(t.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-black/5 transition ${
                  activeId === t.id ? "bg-[#FFF3B0]" : "hover:bg-[#FAF8F0]"
                }`}>
                <div className="w-9 h-9 rounded-xl bg-[#1A0F00] flex items-center justify-center text-[#F5C400] font-bold text-xs flex-shrink-0">
                  {initials(sName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#2D1A00] truncate">{sName}</p>
                    {last && <span className="text-[10px] text-[#9B8A6B] shrink-0 ml-1">{timeLabel(last.createdAt)}</span>}
                  </div>
                  <p className="text-[10px] text-[#9B8A6B] truncate">↔ {tName}</p>
                  {last && <p className="text-[10px] text-[#9B8A6B] truncate mt-0.5">{last.content}</p>}
                  <p className="text-[10px] text-[#9B8A6B] mt-0.5">{t._count.messages} msg</p>
                </div>
              </button>
            );
          })}
          {pages > 1 && (
            <div className="px-4 py-3 flex justify-between">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="text-xs text-[#9B8A6B] disabled:opacity-40 hover:text-[#5C3D00] transition">← Préc.</button>
              <span className="text-xs text-[#9B8A6B]">{page}/{pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="text-xs text-[#9B8A6B] disabled:opacity-40 hover:text-[#5C3D00] transition">Suiv. →</button>
            </div>
          )}
        </div>
      </div>

      {/* Message viewer */}
      {detail ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="h-14 border-b border-black/5 bg-white flex items-center gap-4 px-6 flex-shrink-0">
            <div>
              <p className="text-sm font-bold text-[#2D1A00]">{userName(detail.student)} ↔ {userName(detail.tutor)}</p>
              <p className="text-[10px] text-[#9B8A6B]">{detail.messages.length} messages · lecture seule</p>
            </div>
            <div className="ml-auto flex gap-3">
              <a href={`/dashboard/admin/users/${detail.student.id}`}
                className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition">Voir étudiant →</a>
              <a href={`/dashboard/admin/users/${detail.tutor.id}`}
                className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition">Voir tuteur →</a>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-[#FAF8F0]">
            {detailLoading && <div className="flex items-center justify-center h-48 text-sm text-[#9B8A6B]">Chargement…</div>}
            {!detailLoading && detail.messages.map(m => {
              const isStudent = m.senderId === detail.student.id;
              const senderName = isStudent ? userName(detail.student) : userName(detail.tutor);
              return (
                <div key={m.id} className={`flex ${isStudent ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[65%] ${isStudent ? "" : ""}`}>
                    <p className={`text-[10px] font-bold mb-1 ${isStudent ? "text-[#9B8A6B]" : "text-right text-[#9B8A6B]"}`}>
                      {senderName}
                    </p>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isStudent
                        ? "bg-white border border-black/8 text-[#2D1A00] rounded-bl-sm shadow-sm"
                        : "bg-[#5C3D00] text-white rounded-br-sm"
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${isStudent ? "text-[#9B8A6B]" : "text-white/50 text-right"}`}>
                        {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {new Date(m.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Read-only indicator */}
          <div className="border-t border-black/5 bg-white px-6 py-3 flex items-center gap-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#9B8A6B]">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-[#9B8A6B]">Mode lecture seule — les administrateurs ne peuvent pas envoyer de messages</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#FAF8F0]">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-sm font-bold text-[#5C3D00]">Sélectionnez une conversation</p>
          <p className="text-xs text-[#9B8A6B] mt-1">pour lire les échanges entre étudiants et tuteurs</p>
        </div>
      )}
    </div>
  );
}
