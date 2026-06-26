"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  currentStatus: string;
  currentReason: string;
}

export default function UserDetailClient({ userId, currentStatus, currentReason }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"status" | "delete">("status");
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState(currentReason);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveStatus() {
    if (loading) return;
    setLoading(true); setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountStatus: status, statusReason: reason }),
    });
    if (res.ok) { router.refresh(); setOpen(false); }
    else { setError("Échec de la mise à jour."); }
    setLoading(false);
  }

  async function deleteUser() {
    if (loading) return;
    setLoading(true); setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) { router.push("/dashboard/admin/users"); }
    else { setError("Impossible de supprimer."); setLoading(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex-shrink-0 px-4 py-2 bg-[#F5C400] text-[#5C3D00] font-bold text-sm rounded-xl hover:bg-[#FFDE59] transition">
        Gérer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#2D1A00]">Gérer le compte</h2>
              <button onClick={() => setOpen(false)} className="text-[#9B8A6B] hover:text-[#5C3D00] transition">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="flex gap-2 mb-5">
              <button onClick={() => setTab("status")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${tab === "status" ? "bg-[#F5C400] text-[#5C3D00]" : "bg-black/5 text-[#9B8A6B]"}`}>
                Statut
              </button>
              <button onClick={() => setTab("delete")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${tab === "delete" ? "bg-red-500 text-white" : "bg-black/5 text-[#9B8A6B]"}`}>
                Supprimer
              </button>
            </div>

            {tab === "status" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[#5C3D00] mb-2">Statut du compte</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["ACTIVE", "FROZEN", "BLOCKED"] as const).map(s => (
                      <button key={s} onClick={() => setStatus(s)}
                        className={`py-2 rounded-xl text-xs font-bold border-2 transition ${
                          status === s ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]" : "border-transparent bg-black/5 text-[#9B8A6B]"
                        }`}>
                        {s === "ACTIVE" ? "Actif" : s === "FROZEN" ? "Gelé" : "Bloqué"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#5C3D00] mb-2">Raison (optionnel)</p>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                    placeholder="Motif du gel ou du blocage…"
                    className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] resize-none transition" />
                </div>
                {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <button onClick={saveStatus} disabled={loading}
                  className="w-full py-2.5 bg-[#F5C400] text-[#5C3D00] rounded-xl font-bold text-sm hover:bg-[#FFDE59] disabled:opacity-50 transition">
                  {loading ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            )}

            {tab === "delete" && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  <p className="font-bold mb-1">Action irréversible</p>
                  <p>La suppression efface définitivement toutes les données de cet utilisateur.</p>
                </div>
                {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 border border-black/10 rounded-xl text-sm font-semibold text-[#9B8A6B] hover:bg-black/5 transition">
                    Annuler
                  </button>
                  <button onClick={deleteUser} disabled={loading}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-50 transition">
                    {loading ? "Suppression…" : "Supprimer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
