"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Card {
  id: string;
  front: string;
  back: string;
  status: "new" | "learning" | "known";
  reviewCount: number;
}

interface Deck {
  id: string;
  name: string;
  language: string;
  cardCount: number;
  knownCount: number;
  newCount: number;
  createdAt: string;
}

interface Props {
  email: string;
  name: string | null;
  cefrLevel: string | null;
  tier: string;
  initials: string;
  image: string | null;
}

type View = "decks" | "manage" | "study";

const LANGS = ["Anglais", "Français", "Arabe", "Espagnol", "Allemand", "Italien", "Portugais", "Mandarin", "Japonais", "Coréen"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FlashcardsClient(p: Props) {
  // Navigation
  const [view, setView] = useState<View>("decks");
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

  // Decks
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);

  // Create deck modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState("");
  const [creating, setCreating] = useState(false);

  // Cards
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Add card
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [addingCard, setAddingCard] = useState(false);

  // Edit card
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  // Study
  const [studyCards, setStudyCards] = useState<Card[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionKnown, setSessionKnown] = useState<string[]>([]);
  const [studyDone, setStudyDone] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadDecks(); }, []);

  // ── API helpers ──────────────────────────────────────────────────────────────

  async function loadDecks() {
    setLoadingDecks(true);
    try {
      const res = await fetch("/api/student/flashcards");
      const data = await res.json();
      setDecks(data.decks ?? []);
    } finally {
      setLoadingDecks(false);
    }
  }

  async function loadCards(deckId: string) {
    setLoadingCards(true);
    try {
      const res = await fetch(`/api/student/flashcards/${deckId}/cards`);
      const data = await res.json();
      setCards(data.cards ?? []);
    } finally {
      setLoadingCards(false);
    }
  }

  async function createDeck() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/student/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), language: newLang }),
      });
      const data = await res.json();
      if (res.ok) {
        setDecks((prev) => [data.deck, ...prev]);
        setShowCreate(false);
        setNewName("");
        setNewLang("");
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteDeck(deckId: string) {
    if (!confirm("Supprimer ce deck et toutes ses cartes ?")) return;
    await fetch(`/api/student/flashcards?deckId=${deckId}`, { method: "DELETE" });
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
  }

  async function addCard() {
    if (!newFront.trim() || !newBack.trim() || !selectedDeck) return;
    setAddingCard(true);
    try {
      const res = await fetch(`/api/student/flashcards/${selectedDeck.id}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front: newFront.trim(), back: newBack.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCards((prev) => [...prev, data.card]);
        setDecks((prev) =>
          prev.map((d) =>
            d.id === selectedDeck.id ? { ...d, cardCount: d.cardCount + 1, newCount: d.newCount + 1 } : d
          )
        );
        setNewFront("");
        setNewBack("");
        frontInputRef.current?.focus();
      }
    } finally {
      setAddingCard(false);
    }
  }

  async function saveCardEdit(cardId: string) {
    if (!editFront.trim() || !editBack.trim()) return;
    await fetch(`/api/student/flashcards/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front: editFront.trim(), back: editBack.trim() }),
    });
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, front: editFront.trim(), back: editBack.trim() } : c))
    );
    setEditingCard(null);
  }

  async function deleteCard(cardId: string) {
    await fetch(`/api/student/flashcards/cards/${cardId}`, { method: "DELETE" });
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    if (selectedDeck) {
      setDecks((prev) =>
        prev.map((d) =>
          d.id === selectedDeck.id ? { ...d, cardCount: Math.max(0, d.cardCount - 1) } : d
        )
      );
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  function openDeck(deck: Deck) {
    setSelectedDeck(deck);
    loadCards(deck.id);
    setView("manage");
  }

  function startStudy() {
    if (cards.length === 0) return;
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setStudyCards(shuffled);
    setStudyIndex(0);
    setFlipped(false);
    setSessionKnown([]);
    setStudyDone(false);
    setView("study");
  }

  async function handleStudyAnswer(knew: boolean) {
    const card = studyCards[studyIndex];
    const newStatus = knew ? "known" : "learning";

    await fetch(`/api/student/flashcards/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: newStatus } : c)));

    const nextKnown = knew ? [...sessionKnown, card.id] : sessionKnown;
    setSessionKnown(nextKnown);

    if (studyIndex + 1 >= studyCards.length) {
      setStudyDone(true);
      // Refresh deck known counts
      if (selectedDeck) {
        setDecks((prev) =>
          prev.map((d) =>
            d.id === selectedDeck.id
              ? { ...d, knownCount: cards.filter((c) => c.status === "known" || (c.id === card.id && knew)).length }
              : d
          )
        );
      }
    } else {
      setStudyIndex((i) => i + 1);
      setFlipped(false);
    }
  }

  // ── Renders ──────────────────────────────────────────────────────────────────

  // ── VIEW: DECKS ──────────────────────────────────────────────────────────────

  if (view === "decks") {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
          {/* Top bar */}
          <div className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-8 flex-shrink-0">
            <h1 className="text-base font-bold text-[#5C3D00]">Flashcards</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-[#F5C400] text-[#5C3D00] font-bold text-sm px-4 py-2 rounded-xl hover:bg-[#FFDE59] transition"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Nouveau deck
            </button>
          </div>

          <div className="flex-1 p-8">
            {loadingDecks ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : decks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#F5C400]/20 flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C49200" strokeWidth="1.5" className="w-8 h-8">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                  </svg>
                </div>
                <p className="font-bold text-[#5C3D00] mb-1">Aucun deck pour l'instant</p>
                <p className="text-sm text-[#9B8A6B] mb-6">Crée ton premier deck pour commencer à mémoriser du vocabulaire</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-[#F5C400] text-[#5C3D00] font-bold px-6 py-2.5 rounded-xl hover:bg-[#FFDE59] transition"
                >
                  Créer un deck
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {decks.map((deck) => {
                  const pct = deck.cardCount > 0 ? Math.round((deck.knownCount / deck.cardCount) * 100) : 0;
                  return (
                    <div
                      key={deck.id}
                      onClick={() => openDeck(deck)}
                      className="bg-white border border-black/5 rounded-2xl p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[#5C3D00] truncate">{deck.name}</h3>
                          {deck.language && (
                            <span className="inline-block mt-1 text-[11px] font-semibold text-[#C49200] bg-[#FFF3B0] px-2 py-0.5 rounded-full">
                              {deck.language}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteDeck(deck.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-300 hover:text-red-500 transition-all ml-2"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-[#9B8A6B] mb-3">
                        <span><span className="font-bold text-[#5C3D00]">{deck.cardCount}</span> cartes</span>
                        <span>·</span>
                        <span><span className="font-bold text-green-600">{deck.knownCount}</span> maîtrisées</span>
                        <span>·</span>
                        <span><span className="font-bold text-amber-500">{deck.newCount}</span> nouvelles</span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 bg-[#F0EBE3] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[#9B8A6B] mt-1.5">{pct}% maîtrisé</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Create deck modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="font-bold text-[#5C3D00] text-lg mb-5">Nouveau deck</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#7A6B55] uppercase tracking-wide mb-1.5 block">
                    Nom du deck *
                  </label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createDeck()}
                    placeholder="Ex: Vocabulaire Business, Verbes Irréguliers…"
                    className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm text-[#5C3D00] focus:outline-none focus:ring-2 focus:ring-[#F5C400]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#7A6B55] uppercase tracking-wide mb-1.5 block">
                    Langue cible
                  </label>
                  <select
                    value={newLang}
                    onChange={(e) => setNewLang(e.target.value)}
                    className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm text-[#5C3D00] focus:outline-none focus:ring-2 focus:ring-[#F5C400] bg-white"
                  >
                    <option value="">Sélectionner…</option>
                    {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowCreate(false); setNewName(""); setNewLang(""); }}
                  className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-semibold text-[#9B8A6B] hover:bg-black/5 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={createDeck}
                  disabled={!newName.trim() || creating}
                  className="flex-1 py-2.5 rounded-xl bg-[#F5C400] text-[#5C3D00] font-bold text-sm hover:bg-[#FFDE59] disabled:opacity-50 transition"
                >
                  {creating ? "Création…" : "Créer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── VIEW: MANAGE ─────────────────────────────────────────────────────────────

  if (view === "manage" && selectedDeck) {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
          {/* Top bar */}
          <div className="h-14 border-b border-black/5 bg-white flex items-center gap-4 px-8 flex-shrink-0">
            <button
              onClick={() => { setView("decks"); setSelectedDeck(null); }}
              className="text-[#9B8A6B] hover:text-[#5C3D00] transition"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-[#5C3D00] truncate">{selectedDeck.name}</h1>
            </div>
            {selectedDeck.language && (
              <span className="text-xs font-semibold text-[#C49200] bg-[#FFF3B0] px-2.5 py-1 rounded-full flex-shrink-0">
                {selectedDeck.language}
              </span>
            )}
            <button
              onClick={startStudy}
              disabled={cards.length === 0}
              className="flex items-center gap-2 bg-[#F5C400] text-[#5C3D00] font-bold text-sm px-4 py-2 rounded-xl hover:bg-[#FFDE59] disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Étudier ({cards.length})
            </button>
          </div>

          <div className="flex-1 p-8 max-w-3xl w-full mx-auto">
            {/* Add card form */}
            <div className="bg-white border border-black/5 rounded-2xl p-5 mb-6">
              <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-4">Ajouter une carte</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-[#9B8A6B] mb-1 block">Recto (terme)</label>
                  <input
                    ref={frontInputRef}
                    value={newFront}
                    onChange={(e) => setNewFront(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCard()}
                    placeholder="Ex: Bonjour"
                    className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-[#5C3D00] focus:outline-none focus:ring-2 focus:ring-[#F5C400]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9B8A6B] mb-1 block">Verso (réponse)</label>
                  <input
                    value={newBack}
                    onChange={(e) => setNewBack(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCard()}
                    placeholder="Ex: Hello"
                    className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-[#5C3D00] focus:outline-none focus:ring-2 focus:ring-[#F5C400]"
                  />
                </div>
              </div>
              <button
                onClick={addCard}
                disabled={!newFront.trim() || !newBack.trim() || addingCard}
                className="w-full bg-[#F5C400] text-[#5C3D00] font-bold text-sm py-2.5 rounded-xl hover:bg-[#FFDE59] disabled:opacity-40 transition"
              >
                {addingCard ? "Ajout…" : "+ Ajouter"}
              </button>
            </div>

            {/* Cards list */}
            {loadingCards ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-12 text-[#9B8A6B] text-sm">
                Aucune carte pour l'instant. Ajoute ta première carte ci-dessus !
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[#7A6B55]">{cards.length} carte{cards.length > 1 ? "s" : ""}</p>
                  <div className="flex items-center gap-3 text-xs text-[#9B8A6B]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Maîtrisée</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> En cours</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Nouvelle</span>
                  </div>
                </div>
                {cards.map((card) => (
                  <div key={card.id} className="bg-white border border-black/5 rounded-xl overflow-hidden">
                    {editingCard === card.id ? (
                      <div className="p-4 space-y-2">
                        <input
                          autoFocus
                          value={editFront}
                          onChange={(e) => setEditFront(e.target.value)}
                          className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400]"
                        />
                        <input
                          value={editBack}
                          onChange={(e) => setEditBack(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveCardEdit(card.id)}
                          className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400]"
                        />
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => saveCardEdit(card.id)} className="text-xs font-bold text-[#5C3D00] bg-[#F5C400] px-3 py-1.5 rounded-lg hover:bg-[#FFDE59] transition">Enregistrer</button>
                          <button onClick={() => setEditingCard(null)} className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] px-3 py-1.5 transition">Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 px-4 py-3 group">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${card.status === "known" ? "bg-green-400" : card.status === "learning" ? "bg-amber-400" : "bg-gray-300"}`} />
                        <div className="flex-1 grid grid-cols-2 gap-4 min-w-0">
                          <p className="text-sm font-semibold text-[#5C3D00] truncate">{card.front}</p>
                          <p className="text-sm text-[#7A6B55] truncate">{card.back}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => { setEditingCard(card.id); setEditFront(card.front); setEditBack(card.back); }}
                            className="p-1.5 text-[#9B8A6B] hover:text-[#5C3D00] transition"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button onClick={() => deleteCard(card.id)} className="p-1.5 text-red-300 hover:text-red-500 transition">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    );
  }

  // ── VIEW: STUDY ──────────────────────────────────────────────────────────────

  if (view === "study" && selectedDeck) {
    const current = studyCards[studyIndex];
    const progress = Math.round((studyIndex / studyCards.length) * 100);

    // Results screen
    if (studyDone) {
      const knownCount = sessionKnown.length;
      const learningCount = studyCards.length - knownCount;
      const pct = Math.round((knownCount / studyCards.length) * 100);
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="bg-white rounded-3xl shadow-lg p-10 w-full max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" className="w-8 h-8">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">Session terminée !</h2>
              <p className="text-[#9B8A6B] text-sm mb-8">{selectedDeck.name}</p>

              {/* Score ring */}
              <div className="flex items-center justify-center mb-8">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#F0EBE3" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke={pct >= 80 ? "#16a34a" : pct >= 50 ? "#F5C400" : "#f87171"}
                      strokeWidth="10"
                      strokeDasharray={`${pct * 2.51} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-[#5C3D00]">{pct}%</span>
                    <span className="text-[10px] text-[#9B8A6B]">réussi</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mb-8">
                <div className="flex-1 bg-green-50 rounded-xl py-3">
                  <p className="text-2xl font-bold text-green-600">{knownCount}</p>
                  <p className="text-xs text-green-700 font-medium">Maîtrisées</p>
                </div>
                <div className="flex-1 bg-amber-50 rounded-xl py-3">
                  <p className="text-2xl font-bold text-amber-500">{learningCount}</p>
                  <p className="text-xs text-amber-600 font-medium">À revoir</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setView("manage"); }}
                  className="flex-1 py-3 rounded-xl border border-black/10 text-sm font-semibold text-[#7A6B55] hover:bg-black/5 transition"
                >
                  Retour au deck
                </button>
                <button
                  onClick={startStudy}
                  className="flex-1 py-3 rounded-xl bg-[#F5C400] text-[#5C3D00] font-bold text-sm hover:bg-[#FFDE59] transition"
                >
                  Rejouer
                </button>
              </div>
            </div>
          </div>
      );
    }

    // Study card
    return (
      <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="h-14 border-b border-black/5 bg-white flex items-center gap-4 px-8 flex-shrink-0">
            <button
              onClick={() => setView("manage")}
              className="text-[#9B8A6B] hover:text-[#5C3D00] transition"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="flex-1 text-base font-bold text-[#5C3D00] truncate">{selectedDeck.name}</h1>
            <span className="text-sm text-[#9B8A6B] flex-shrink-0">{studyIndex + 1} / {studyCards.length}</span>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-[#E8E1D9]">
            <div className="h-full bg-[#F5C400] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          {/* Card area */}
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            {/* 3D Flip card */}
            <div
              className="w-full max-w-lg cursor-pointer select-none"
              style={{ perspective: "1200px" }}
              onClick={() => setFlipped((f) => !f)}
            >
              <div
                style={{
                  transformStyle: "preserve-3d",
                  transition: "transform 0.45s cubic-bezier(.4,0,.2,1)",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  position: "relative",
                  height: "260px",
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 bg-white rounded-3xl shadow-lg flex flex-col items-center justify-center p-8"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#C49200] mb-4">Terme</p>
                  <p className="text-3xl font-bold text-[#5C3D00] text-center leading-tight">{current?.front}</p>
                  <p className="text-xs text-[#C0B09A] mt-6">Cliquez pour voir la réponse</p>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 bg-[#5C3D00] rounded-3xl shadow-lg flex flex-col items-center justify-center p-8"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5C400]/70 mb-4">Réponse</p>
                  <p className="text-3xl font-bold text-white text-center leading-tight">{current?.back}</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {flipped && (
              <div className="flex gap-4 mt-8 w-full max-w-lg">
                <button
                  onClick={() => handleStudyAnswer(false)}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-red-200 text-red-500 font-bold py-4 rounded-2xl hover:bg-red-50 hover:border-red-300 transition text-sm"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  À revoir
                </button>
                <button
                  onClick={() => handleStudyAnswer(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-4 rounded-2xl hover:bg-green-600 transition text-sm"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Je sais !
                </button>
              </div>
            )}

            {!flipped && (
              <button
                onClick={() => setFlipped(true)}
                className="mt-8 bg-[#F5C400] text-[#5C3D00] font-bold px-8 py-3.5 rounded-2xl hover:bg-[#FFDE59] transition"
              >
                Voir la réponse
              </button>
            )}
          </div>
        </div>
    );
  }

  return null;
}
