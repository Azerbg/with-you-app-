"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tutorId: string;
  tutorName: string;
  loginUrl: string;
  isStudent: boolean;
}

export default function ContactTutorButton({ tutorId, tutorName, loginUrl, isStudent }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isStudent) {
    return (
      <a
        href={loginUrl}
        className="block w-full text-center border-2 border-[#F5C400] text-[#F5C400] py-2.5 rounded-xl font-bold text-sm hover:bg-[#F5C400]/10 transition"
      >
        Contacter le tuteur
      </a>
    );
  }

  async function handleSend() {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);

    try {
      // Create or retrieve thread
      const threadRes = await fetch("/api/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId }),
      });
      if (!threadRes.ok) { setError("Erreur réseau. Réessayez."); setSending(false); return; }
      const { id: threadId } = await threadRes.json();

      // Send the intro message
      const msgRes = await fetch(`/api/messages/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message.trim() }),
      });

      if (msgRes.ok || msgRes.status === 403) {
        // 403 = already sent a message → still redirect, thread exists
        router.push(`/dashboard/student/messages?thread=${threadId}`);
        return;
      }

      setError("Impossible d'envoyer le message. Réessayez.");
    } catch {
      setError("Erreur réseau. Réessayez.");
    }
    setSending(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block w-full text-center border-2 border-[#F5C400] text-[#F5C400] py-2.5 rounded-xl font-bold text-sm hover:bg-[#F5C400]/10 transition"
      >
        Contacter le tuteur
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-[#2D1A00] text-lg">Contacter {tutorName.split(" ")[0]}</h2>
                <p className="text-xs text-[#9B8A6B] mt-1 leading-relaxed">
                  Envoyez un message d&apos;introduction. Le chat complet s&apos;ouvrira dès que le tuteur vous répond ou après votre première réservation.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-[#9B8A6B] hover:text-[#5C3D00] transition ml-4 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <textarea
              autoFocus
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder={`Bonjour ${tutorName.split(" ")[0]}, je suis intéressé(e) par vos cours…`}
              className="w-full border border-[#6B5E44]/30 rounded-xl px-4 py-3 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 resize-none transition"
            />
            <div className="flex justify-between items-center mt-1 mb-4">
              <span className="text-[11px] text-[#9B8A6B]">{message.length}/500</span>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-semibold text-[#9B8A6B] hover:bg-black/5 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className="flex-1 py-2.5 rounded-xl bg-[#F5C400] text-[#5C3D00] font-bold text-sm hover:bg-[#FFDE59] disabled:opacity-50 transition"
              >
                {sending ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
