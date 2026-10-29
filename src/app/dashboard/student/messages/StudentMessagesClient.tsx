"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/context/LanguageContext";

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
  isLocked: boolean;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: string;
  fileUrl?: string | null;
  reactions?: Record<string, string[]> | null;
  isRead: boolean;
  createdAt: string;
}

const MSG_EMOJIS = ["👍", "❤️", "😂", "🎉", "👏"];

function displayName(u: ThreadUser): string {
  if (u.hrApplication?.fullName) return u.hrApplication.fullName;
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return name || u.email;
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function timeLabel(iso: string, lang: string): string {
  const d = new Date(iso);
  const now = new Date();
  const locale = lang === "en" ? "en-US" : "fr-FR";
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return lang === "en" ? "Yesterday" : "Hier";
  if (diffDays < 7) return d.toLocaleDateString(locale, { weekday: "short" });
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function ThreadItem({ thread, currentUserId, active, lang, onClick }: {
  thread: Thread; currentUserId: string; active: boolean; lang: string; onClick: () => void;
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
          {last && <span className="text-[10px] text-[#9B8A6B] shrink-0">{timeLabel(last.createdAt, lang)}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-[#9B8A6B] truncate">
            {last
              ? (last.senderId === currentUserId ? (lang === "en" ? "You: " : "Vous : ") : "") + last.content
              : (lang === "en" ? "No messages" : "Aucun message")}
          </p>
          {thread.isLocked ? (
            <span className="text-[10px] text-[#9B8A6B] shrink-0">🔒</span>
          ) : thread.unreadCount > 0 ? (
            <span className="text-[10px] font-bold bg-[#F5C400] text-[#5C3D00] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
              {thread.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ChatPanel({ thread, currentUserId, lang, onMessageSent }: {
  thread: Thread; currentUserId: string; lang: string; onMessageSent: () => void;
}) {
  const [messages, setMessages]             = useState<Message[]>([]);
  const [isLocked, setIsLocked]             = useState(thread.isLocked);
  const [text, setText]                     = useState("");
  const [sending, setSending]               = useState(false);
  const [sendError, setSendError]           = useState<string | null>(null);
  const [recording, setRecording]           = useState(false);
  const [recSeconds, setRecSeconds]         = useState(0);
  const [uploading, setUploading]           = useState<"file" | "audio" | null>(null);
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);
  const bottomRef        = useRef<HTMLDivElement>(null);
  const pollRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const attachRef        = useRef<HTMLInputElement>(null);
  const mediaRecRef      = useRef<MediaRecorder | null>(null);
  const recChunksRef     = useRef<Blob[]>([]);
  const recTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const recSecondsRef    = useRef(0);

  const other = thread.studentId === currentUserId ? thread.tutor : thread.student;
  const name  = displayName(other);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/messages/${thread.id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
      if (typeof data.isLocked === "boolean") setIsLocked(data.isLocked);
    }
  }, [thread.id]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendText() {
    if (!text.trim() || sending) return;
    setSending(true); setSendError(null);
    const res = await fetch(`/api/messages/${thread.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    if (res.ok) { const msg = await res.json(); setMessages(prev => [...prev, msg]); setText(""); onMessageSent(); }
    else {
      const d = await res.json().catch(() => ({}));
      if (d.error === "CONTACT_INFO_BLOCKED") setSendError(lang === "en" ? "⚠️ Personal contact details are not allowed." : "⚠️ Les coordonnées personnelles ne sont pas autorisées.");
      else if (d.error === "MESSAGE_LIMIT_REACHED") setSendError(lang === "en" ? "Wait for the tutor's reply or book a session." : "Attendez la réponse du tuteur ou réservez une séance.");
      else setSendError(lang === "en" ? "Failed to send. Please retry." : "Échec de l'envoi. Réessayez.");
    }
    setSending(false);
  }

  async function sendMedia(type: string, fileUrl: string, content: string) {
    const res = await fetch(`/api/messages/${thread.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, fileUrl, content }),
    });
    if (res.ok) { const msg = await res.json(); setMessages(prev => [...prev, msg]); onMessageSent(); }
    else setSendError(lang === "en" ? "Failed to send file." : "Échec de l'envoi du fichier.");
  }

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setUploading("file");
    try {
      const form = new FormData(); form.append("file", file);
      const res = await fetch("/api/messages/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      const { url, type } = await res.json();
      await sendMedia(type === "image" ? "IMAGE" : "FILE", url, file.name);
    } catch { setSendError(lang === "en" ? "Failed to send file." : "Échec de l'envoi du fichier."); }
    setUploading(null);
  }

  async function startRecord() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recTimerRef.current) clearInterval(recTimerRef.current);
        const dur = recSecondsRef.current;
        setRecording(false); setRecSeconds(0); recSecondsRef.current = 0;
        const blob = new Blob(recChunksRef.current, { type: "audio/webm" });
        setUploading("audio");
        try {
          const form = new FormData(); form.append("file", blob, `voice-${Date.now()}.webm`);
          const res = await fetch("/api/messages/upload", { method: "POST", body: form });
          if (!res.ok) throw new Error();
          const { url } = await res.json();
          const label = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, "0")}`;
          await sendMedia("AUDIO", url, label);
        } catch { setSendError(lang === "en" ? "Failed to send voice message." : "Échec de l'envoi du message vocal."); }
        setUploading(null);
      };
      mr.start(100); mediaRecRef.current = mr;
      setRecording(true); setRecSeconds(0); recSecondsRef.current = 0;
      recTimerRef.current = setInterval(() => {
        recSecondsRef.current += 1;
        setRecSeconds(recSecondsRef.current);
      }, 1000);
    } catch { setSendError(lang === "en" ? "Microphone access denied." : "Accès au microphone refusé."); }
  }

  function stopRecord() { mediaRecRef.current?.stop(); }

  async function reactToMessage(messageId: string, emoji: string) {
    setReactionPickerId(null);
    const res = await fetch(`/api/messages/${thread.id}/react`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji }),
    });
    if (res.ok) {
      const { id, reactions } = await res.json();
      setMessages(prev => prev.map(m => m.id === id ? { ...m, reactions } : m));
    }
  }

  function renderContent(m: Message, isMe: boolean) {
    if (m.type === "IMAGE" && m.fileUrl) return (
      <a href={m.fileUrl} target="_blank" rel="noopener noreferrer">
        <img src={m.fileUrl} alt="Image" className="max-w-[220px] max-h-[200px] rounded-xl object-cover hover:opacity-90 transition" />
      </a>
    );
    if (m.type === "AUDIO" && m.fileUrl) return (
      <div className="flex flex-col gap-1 min-w-[180px]">
        <audio controls src={m.fileUrl} className="h-8 w-full max-w-[220px]" />
        <span className={`text-[10px] ${isMe ? "text-white/50" : "text-[#9B8A6B]"}`}>🎤 {m.content}</span>
      </div>
    );
    if (m.type === "FILE" && m.fileUrl) return (
      <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
        className={`flex items-center gap-2 hover:opacity-80 transition max-w-[220px]`}>
        <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
        <span className="truncate text-sm">{m.content}</span>
      </a>
    );
    return <p className="whitespace-pre-wrap break-words">{m.content}</p>;
  }

  const locale = lang === "en" ? "en-US" : "fr-FR";
  const groups: { date: string; msgs: Message[] }[] = [];
  for (const m of messages) {
    const date = new Date(m.createdAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
    const last = groups[groups.length - 1];
    if (last?.date === date) last.msgs.push(m); else groups.push({ date, msgs: [m] });
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden" onClick={() => setReactionPickerId(null)}>
      <div className="h-14 border-b border-black/5 bg-white flex items-center gap-3 px-6 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-sm flex-shrink-0">{initials(name)}</div>
        <div>
          <p className="text-sm font-bold text-[#2D1A00]">{name}</p>
          <p className="text-[10px] text-[#9B8A6B]">{lang === "en" ? "Tutor" : "Tuteur"}</p>
        </div>
        <div className="ml-auto"><LanguageSwitcher /></div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[#FAF8F0]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm font-semibold text-[#5C3D00]">{lang === "en" ? "Start the conversation" : "Démarrez la conversation"}</p>
            <p className="text-xs text-[#9B8A6B] mt-1">{lang === "en" ? "Send a first message to your tutor." : "Envoyez un premier message à votre tuteur."}</p>
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
                  <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`relative group/msg flex ${isMe ? "justify-end" : "justify-start"} w-full`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe ? "bg-[#5C3D00] text-white rounded-br-sm" : "bg-white border border-black/8 text-[#2D1A00] rounded-bl-sm shadow-sm"
                      }`}>
                        {renderContent(m, isMe)}
                        <p className={`text-[10px] mt-1 ${isMe ? "text-white/50 text-right" : "text-[#9B8A6B]"}`}>
                          {new Date(m.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                          {isMe && (m.isRead ? (lang === "en" ? " · Read" : " · Lu") : (lang === "en" ? " · Sent" : " · Envoyé"))}
                        </p>
                      </div>
                      {/* Hover reaction trigger */}
                      <button
                        onClick={e => { e.stopPropagation(); setReactionPickerId(prev => prev === m.id ? null : m.id); }}
                        className={`self-center ${isMe ? "mr-2 order-first" : "ml-2"} opacity-0 group-hover/msg:opacity-100 transition text-base text-[#9B8A6B] hover:text-[#5C3D00]`}>
                        😊
                      </button>
                      {/* Mini reaction picker */}
                      {reactionPickerId === m.id && (
                        <div className={`absolute z-50 bottom-full mb-1 ${isMe ? "right-8" : "left-8"} bg-white border border-black/10 rounded-2xl px-3 py-2 flex gap-2 shadow-xl`}
                          onClick={e => e.stopPropagation()}>
                          {MSG_EMOJIS.map(e => (
                            <button key={e} onClick={() => reactToMessage(m.id, e)} className="text-xl hover:scale-125 transition-transform">{e}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Reaction chips */}
                    {m.reactions && Object.keys(m.reactions).length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                        {Object.entries(m.reactions).map(([emoji, users]) => {
                          const isMine = (users as string[]).includes(currentUserId);
                          return (
                            <button key={emoji} onClick={() => reactToMessage(m.id, emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition ${
                                isMine ? "bg-[#FFF3B0] border-[#F5C400] text-[#5C3D00]" : "bg-white border-black/10 text-[#9B8A6B] hover:bg-[#FAF8F0]"
                              }`}>
                              <span>{emoji}</span><span>{(users as string[]).length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600 flex items-center justify-between">
          <span>{sendError}</span>
          <button onClick={() => setSendError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {isLocked ? (
        <div className="border-t border-black/5 bg-[#FAF8F0] px-4 py-3 flex items-center gap-3">
          <span className="text-lg">🔒</span>
          <p className="text-xs text-[#9B8A6B] leading-relaxed">
            {lang === "en"
              ? "Waiting for the tutor's reply. Full chat unlocks once they respond or after a booking."
              : "En attente de la réponse du tuteur. Le chat complet s'active dès qu'il répond ou après une réservation."}
          </p>
        </div>
      ) : (
        <div className="border-t border-black/5 bg-white px-4 py-3 flex items-end gap-2">
          {/* Attachment */}
          <button onClick={() => attachRef.current?.click()} disabled={!!uploading || recording}
            title="Pièce jointe"
            className="w-9 h-9 rounded-xl border border-[#6B5E44]/30 flex items-center justify-center text-[#9B8A6B] hover:text-[#5C3D00] hover:bg-[#FAF8F0] transition flex-shrink-0 disabled:opacity-40">
            {uploading === "file"
              ? <div className="w-4 h-4 border-2 border-[#9B8A6B] border-t-[#5C3D00] rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
            }
          </button>
          <input ref={attachRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleAttach} />

          <textarea value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            rows={1} placeholder={lang === "en" ? "Write a message… (Enter to send)" : "Écrire un message… (Entrée pour envoyer)"}
            className="flex-1 border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#2D1A00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 resize-none transition"
            style={{ maxHeight: 120 }} />

          {/* Voice / Send */}
          {text.trim() ? (
            <button onClick={sendText} disabled={sending}
              className="w-9 h-9 bg-[#F5C400] rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-[#FFDE59] disabled:opacity-40 transition">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#5C3D00]">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
              </svg>
            </button>
          ) : recording ? (
            <button onClick={stopRecord}
              className="h-9 px-3 bg-red-500 rounded-xl flex items-center gap-1.5 text-white flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[11px] font-mono font-bold">{Math.floor(recSeconds/60)}:{String(recSeconds%60).padStart(2,"0")}</span>
            </button>
          ) : (
            <button onClick={startRecord} disabled={!!uploading} title="Message vocal"
              className="w-9 h-9 rounded-xl border border-[#6B5E44]/30 flex items-center justify-center text-[#9B8A6B] hover:text-[#5C3D00] hover:bg-[#FAF8F0] transition flex-shrink-0 disabled:opacity-40">
              {uploading === "audio"
                ? <div className="w-4 h-4 border-2 border-[#9B8A6B] border-t-[#5C3D00] rounded-full animate-spin" />
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentMessagesClient({ currentUserId }: { currentUserId: string }) {
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(searchParams.get("thread"));
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

  function openThread(threadId: string) {
    setThreads(prev => prev.map(t =>
      t.id === threadId ? { ...t, unreadCount: 0 } : t
    ));
    setActiveId(threadId);
    const thread = threads.find(t => t.id === threadId);
    if (thread && thread.unreadCount > 0) router.refresh();
  }

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
            <div className="flex items-center justify-center h-32 text-[#9B8A6B] text-sm">{lang === "en" ? "Loading…" : "Chargement…"}</div>
          )}
          {!loading && threads.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-sm font-semibold text-[#5C3D00]">{lang === "en" ? "No conversations" : "Aucune conversation"}</p>
              <p className="text-xs text-[#9B8A6B] mt-1">{lang === "en" ? "Contact your tutor from the My Tutors page." : "Contactez votre tuteur depuis la page Mes Tuteurs."}</p>
            </div>
          )}
          {threads.map(t => (
            <ThreadItem key={t.id} thread={t} currentUserId={currentUserId}
              active={t.id === activeId} lang={lang} onClick={() => openThread(t.id)} />
          ))}
        </div>
      </div>

      {active ? (
        <ChatPanel key={active.id} thread={active} currentUserId={currentUserId} lang={lang} onMessageSent={loadThreads} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-[#FAF8F0]">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-base font-bold text-[#5C3D00]">{lang === "en" ? "Select a conversation" : "Sélectionnez une conversation"}</p>
          <p className="text-sm text-[#9B8A6B] mt-1">{lang === "en" ? "Or contact your tutor from the My Tutors page." : "Ou contactez votre tuteur depuis la page Mes Tuteurs."}</p>
        </div>
      )}
    </div>
  );
}
