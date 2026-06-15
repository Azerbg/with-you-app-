"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ThreadUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  hrApplication?: { fullName: string | null } | null;
}

interface Thread {
  id: string;
  studentId: string;
  tutorId: string;
  lastMessageAt: string | null;
  student: ThreadUser;
  tutor: ThreadUser;
  messages: { content: string; createdAt: string; senderId: string; isRead: boolean }[];
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

function displayName(u: ThreadUser): string {
  if (u.hrApplication?.fullName) return u.hrApplication.fullName;
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return name || u.email;
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function ThreadItem({ thread, currentUserId, active, onClick }: {
  thread: Thread; currentUserId: string; active: boolean; onClick: () => void;
}) {
  const other = thread.studentId === currentUserId ? thread.tutor : thread.student;
  const name = displayName(other);
  const last = thread.messages[0];

  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition border-b border-black/5 ${
        active ? "bg-[#FFF3B0]" : "hover:bg-[#FAF8F0]"
      }`}>
      <div className="w-10 h-10 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-sm flex-shrink-0">
        {initials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-[#2D1A00] truncate">{name}</p>
          {last && <span className="text-[10px] text-[#9B8A6B] shrink-0">{timeLabel(last.createdAt)}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-[#9B8A6B] truncate">
            {last ? (last.senderId === currentUserId ? "Vous : " : "") + last.content : "Aucun message"}
          </p>
          {thread.unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-[#F5C400] text-[#5C3D00] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
              {thread.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ChatPanel({ thread, currentUserId, onMessageSent }: {
  thread: Thread; currentUserId: string; onMessageSent: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const other = thread.studentId === currentUserId ? thread.tutor : thread.student;
  const name = displayName(other);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/messages/${thread.id}`);
    if (res.ok) setMessages(await res.json());
  }, [thread.id]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/messages/${thread.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages(prev => [...prev, msg]);
      setText("");
      onMessageSent();
    }
    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const groups: { date: string; msgs: Message[] }[] = [];
  for (const m of messages) {
    const date = new Date(m.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const last = groups[groups.length - 1];
    if (last?.date === date) last.msgs.push(m);
    else groups.push({ date, msgs: [m] });
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="h-14 border-b border-black/5 bg-white flex items-center gap-3 px-6 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-sm flex-shrink-0">
          {initials(name)}
        </div>
        <div>
          <p className="text-sm font-bold text-[#2D1A00]">{name}</p>
          <p className="text-[10px] text-[#9B8A6B]">Tuteur</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[#FAF8F0]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm font-semibold text-[#5C3D00]">Démarrez la conversation</p>
            <p className="text-xs text-[#9B8A6B] mt-1">Envoyez un premier message à votre tuteur.</p>
          </div>
        )}
        {groups.map(g => (
          <div key={g.date}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-black/8" />
              <span className="text-[10px] text-[#9B8A6B] font-semibold">{g.date}</span>
              <div className="flex-1 h-px bg-black/8" />
            </div>
            <div className="space-y-2">
              {g.msgs.map(m => {
                const isMe = m.senderId === currentUserId;
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? "bg-[#5C3D00] text-white rounded-br-sm"
                        : "bg-white border border-black/8 text-[#2D1A00] rounded-bl-sm shadow-sm"
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? "text-white/50 text-right" : "text-[#9B8A6B]"}`}>
                        {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {isMe && (m.isRead ? " · Lu" : " · Envoyé")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-black/5 bg-white px-4 py-3 flex items-end gap-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder="Écrire un message… (Entrée pour envoyer)"
          className="flex-1 border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#2D1A00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 resize-none transition"
          style={{ maxHeight: 120 }}
        />
        <button onClick={send} disabled={!text.trim() || sending}
          className="w-9 h-9 bg-[#F5C400] rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-[#FFDE59] disabled:opacity-40 transition">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#5C3D00]">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function StudentMessagesClient({ currentUserId }: { currentUserId: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/messages/threads");
    if (res.ok) setThreads(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadThreads();
    const iv = setInterval(loadThreads, 10000);
    return () => clearInterval(iv);
  }, [loadThreads]);

  const active = threads.find(t => t.id === activeId) ?? null;

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      <div className="w-72 flex-shrink-0 border-r border-black/5 bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-black/5">
          <h1 className="font-bold text-[#2D1A00]">Messages</h1>
          <p className="text-xs text-[#9B8A6B] mt-0.5">{threads.length} conversation{threads.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-32 text-[#9B8A6B] text-sm">Chargement…</div>
          )}
          {!loading && threads.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-sm font-semibold text-[#5C3D00]">Aucune conversation</p>
              <p className="text-xs text-[#9B8A6B] mt-1">Contactez votre tuteur depuis la page Mes Tuteurs.</p>
            </div>
          )}
          {threads.map(t => (
            <ThreadItem key={t.id} thread={t} currentUserId={currentUserId}
              active={t.id === activeId} onClick={() => setActiveId(t.id)} />
          ))}
        </div>
      </div>

      {active ? (
        <ChatPanel key={active.id} thread={active} currentUserId={currentUserId} onMessageSent={loadThreads} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-[#FAF8F0]">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-base font-bold text-[#5C3D00]">Sélectionnez une conversation</p>
          <p className="text-sm text-[#9B8A6B] mt-1">Ou contactez votre tuteur depuis la page Mes Tuteurs.</p>
        </div>
      )}
    </div>
  );
}
