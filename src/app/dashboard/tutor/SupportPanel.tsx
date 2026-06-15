"use client";

import { useState, useEffect, useRef } from "react";

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "Comment puis-je suivre l'avancement de ma candidature ?",
    a: "Votre tableau de bord affiche en temps réel le statut de votre candidature et les étapes restantes. Vous recevrez également un email à chaque changement de statut.",
  },
  {
    q: "Comment suis-je payé en Tunisie ?",
    a: "Les tuteurs tunisiens sont payés par virement bancaire (RIB) ou via D17. Le taux est fixé en dinars tunisiens (TND) et les virements sont effectués mensuellement.",
  },
  {
    q: "Quels sont les horaires de travail ?",
    a: "Vous choisissez entièrement vos disponibilités. Les créneaux les plus demandés sont les soirs et week-ends (heure de Paris / Montréal). Vous pouvez enseigner de chez vous, sans contrainte géographique.",
  },
  {
    q: "Combien de temps dure le processus de recrutement ?",
    a: "En moyenne 2 à 3 semaines : examen du dossier (3–5 jours), vidéo (3–5 jours), entretien (1 semaine). Tout dépend de la rapidité de vos retours.",
  },
  {
    q: "Que se passe-t-il si ma candidature est mise en réserve ?",
    a: "Cela signifie que votre profil est retenu mais qu'il n'y a pas de besoin immédiat. Vous serez contacté en priorité dès qu'un poste se libère, sans avoir à recommencer le processus.",
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  content: string;
  isFromCandidate: boolean;
  createdAt: string;
  author: { email: string } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SupportPanel() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tab, setTab] = useState<"faq" | "messages">("faq");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === "messages") loadMessages();
  }, [tab]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    setLoadingMsgs(true);
    const res = await fetch("/api/tutors/support-message").catch(() => null);
    if (res?.ok) {
      const data = await res.json().catch(() => []);
      setMessages(Array.isArray(data) ? data : []);
    }
    setLoadingMsgs(false);
  }

  async function send() {
    if (!text.trim()) return;
    setError("");
    setSending(true);
    const res = await fetch("/api/tutors/support-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages(prev => [...prev, msg]);
      setText("");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur lors de l'envoi.");
    }
    setSending(false);
  }

  return (
    <div className="bg-white border border-[#C4BAA8] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E8E0D4] flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-[#5C3D00]">Centre d&apos;aide</p>
          <p className="text-xs text-[#9B8A6B] mt-0.5">FAQ & contact équipe RH</p>
        </div>
        <a
          href="mailto:recrutement@withyou.com"
          className="text-xs font-semibold text-[#5C3D00] bg-[#FFF3B0] border border-[#F5C400]/50 px-3 py-1.5 rounded-full hover:bg-[#FFDE59] transition"
        >
          recrutement@withyou.com
        </a>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E8E0D4]">
        <button
          onClick={() => setTab("faq")}
          className={`flex-1 py-2.5 text-sm font-semibold transition ${tab === "faq" ? "text-[#5C3D00] border-b-2 border-[#F5C400]" : "text-[#9B8A6B] hover:text-[#5C3D00]"}`}
        >
          Questions frequentes
        </button>
        <button
          onClick={() => setTab("messages")}
          className={`flex-1 py-2.5 text-sm font-semibold transition ${tab === "messages" ? "text-[#5C3D00] border-b-2 border-[#F5C400]" : "text-[#9B8A6B] hover:text-[#5C3D00]"}`}
        >
          Poser une question
        </button>
      </div>

      {/* FAQ Tab */}
      {tab === "faq" && (
        <div className="divide-y divide-[#E8E0D4]">
          {FAQ.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-[#FAF8F0] transition"
              >
                <span className="text-sm font-semibold text-[#5C3D00] leading-snug">{item.q}</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-4 h-4 text-[#9B8A6B] flex-shrink-0 mt-0.5 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-[#6B5E44] leading-relaxed bg-[#FAF8F0]">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages Tab */}
      {tab === "messages" && (
        <div className="flex flex-col">
          {/* Thread */}
          <div className="px-5 py-4 space-y-3 min-h-[160px] max-h-72 overflow-y-auto">
            {loadingMsgs && (
              <p className="text-xs text-[#9B8A6B] text-center py-4">Chargement…</p>
            )}
            {!loadingMsgs && messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm font-semibold text-[#5C3D00]">Posez votre premiere question</p>
                <p className="text-xs text-[#9B8A6B] mt-1">L'equipe RH vous repondra directement ici.</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isFromCandidate ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.isFromCandidate
                    ? "bg-[#5C3D00] text-white rounded-br-sm"
                    : "bg-[#FFF3B0] text-[#5C3D00] border border-[#F5C400]/30 rounded-bl-sm"
                }`}>
                  {!msg.isFromCandidate && (
                    <p className="text-[10px] font-bold text-[#9B7A00] mb-1">Equipe RH</p>
                  )}
                  <p className="leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.isFromCandidate ? "text-white/50" : "text-[#9B8A6B]"}`}>
                    {new Date(msg.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Compose */}
          <div className="border-t border-[#E8E0D4] px-5 py-4 space-y-2">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}}
              rows={3}
              placeholder="Ecrivez votre question a l'equipe RH… (Entree pour envoyer)"
              className="w-full border border-[#C4BAA8] rounded-xl px-3 py-2.5 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 resize-none"
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="w-full bg-[#F5C400] text-[#5C3D00] font-bold py-2.5 rounded-xl hover:bg-[#FFDE59] disabled:opacity-40 transition text-sm"
            >
              {sending ? "Envoi…" : "Envoyer ma question →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
