"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  accountStatus: string;
  statusReason: string | null;
  createdAt: string;
  hrApplication: { fullName: string | null; status: string } | null;
  _count: { bookingsAsStudent: number; bookingsAsTutor: number };
}

const ROLE_BADGE: Record<string, string> = {
  STUDENT: "bg-blue-50 text-blue-700",
  TUTOR:   "bg-[#FFF3B0] text-[#C49200]",
  HR:      "bg-purple-50 text-purple-700",
  ADMIN:   "bg-[#1A0F00] text-[#F5C400]",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:  "bg-green-50 text-green-700",
  FROZEN:  "bg-orange-50 text-orange-700",
  BLOCKED: "bg-red-50 text-red-600",
};

function displayName(u: User) {
  if (u.hrApplication?.fullName) return u.hrApplication.fullName;
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return n || u.email;
}

interface ActionModalProps {
  user: User;
  onClose: () => void;
  onDone: () => void;
}

function ActionModal({ user, onClose, onDone }: ActionModalProps) {
  const [tab, setTab] = useState<"status" | "delete">("status");
  const [status, setStatus] = useState(user.accountStatus);
  const [reason, setReason] = useState(user.statusReason ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveStatus() {
    if (loading) return;
    setLoading(true); setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountStatus: status, statusReason: reason }),
    });
    if (res.ok) { onDone(); onClose(); }
    else { setError("Échec de la mise à jour."); setLoading(false); }
  }

  async function deleteUser() {
    if (loading) return;
    setLoading(true); setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (res.ok) { onDone(); onClose(); }
    else { setError("Impossible de supprimer."); setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-[#2D1A00]">{displayName(user)}</h2>
            <p className="text-xs text-[#9B8A6B]">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-[#9B8A6B] hover:text-[#5C3D00] transition">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab("status")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${tab === "status" ? "bg-[#F5C400] text-[#5C3D00]" : "bg-black/5 text-[#9B8A6B]"}`}>
            Statut du compte
          </button>
          <button onClick={() => setTab("delete")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${tab === "delete" ? "bg-red-500 text-white" : "bg-black/5 text-[#9B8A6B]"}`}>
            Supprimer
          </button>
        </div>

        {tab === "status" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#5C3D00] mb-2">Statut</p>
              <div className="grid grid-cols-3 gap-2">
                {["ACTIVE", "FROZEN", "BLOCKED"].map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`py-2 rounded-xl text-xs font-bold transition border-2 ${
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
              <p>La suppression efface définitivement le compte, l&apos;historique et toutes les données associées.</p>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-black/10 rounded-xl text-sm font-semibold text-[#9B8A6B] hover:bg-black/5 transition">
                Annuler
              </button>
              <button onClick={deleteUser} disabled={loading}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-50 transition">
                {loading ? "Suppression…" : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UsersClient() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, role, status, page: String(page) });
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [search, role, status, page]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, role, status]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-black/5 px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-xl text-[#1A0F00]">Utilisateurs</h1>
            <p className="text-xs text-[#9B8A6B] mt-0.5">{total.toLocaleString()} comptes au total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="flex-1 border border-[#6B5E44]/30 rounded-xl px-4 py-2 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20 transition"
          />
          <select value={role} onChange={e => setRole(e.target.value)}
            className="border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] transition bg-white">
            <option value="ALL">Tous les rôles</option>
            <option value="STUDENT">Étudiant</option>
            <option value="TUTOR">Tuteur</option>
            <option value="HR">RH</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] transition bg-white">
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="FROZEN">Gelé</option>
            <option value="BLOCKED">Bloqué</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-[#9B8A6B]">Chargement…</div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-[#9B8A6B]">Aucun utilisateur trouvé</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-8 py-3">Utilisateur</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Rôle</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Statut</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Activité</th>
                <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Inscrit le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-[#FAF8F0] transition group">
                  <td className="px-8 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F5C400]/20 flex items-center justify-center text-[#5C3D00] font-bold text-xs flex-shrink-0">
                        {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#2D1A00]">{displayName(u)}</p>
                        <p className="text-xs text-[#9B8A6B]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role] ?? ""}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[u.accountStatus] ?? ""}`}>
                      {u.accountStatus === "ACTIVE" ? "Actif" : u.accountStatus === "FROZEN" ? "Gelé" : "Bloqué"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9B8A6B]">
                    {u.role === "STUDENT"
                      ? `${u._count.bookingsAsStudent} rés.`
                      : u.role === "TUTOR"
                      ? `${u._count.bookingsAsTutor} séances`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9B8A6B]">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => router.push(`/dashboard/admin/users/${u.id}`)}
                        className="text-xs font-semibold text-[#9B8A6B] hover:text-[#5C3D00] transition px-2 py-1 rounded-lg hover:bg-black/5">
                        Voir
                      </button>
                      <button onClick={() => setSelected(u)}
                        className="text-xs font-semibold text-[#5C3D00] hover:text-[#1A0F00] transition px-2 py-1 rounded-lg hover:bg-[#F5C400]/20">
                        Gérer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="bg-white border-t border-black/5 px-8 py-3 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-[#9B8A6B]">Page {page} sur {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-semibold text-[#9B8A6B] disabled:opacity-40 hover:bg-black/5 transition">
              ← Précédent
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-semibold text-[#9B8A6B] disabled:opacity-40 hover:bg-black/5 transition">
              Suivant →
            </button>
          </div>
        </div>
      )}

      {selected && (
        <ActionModal user={selected} onClose={() => setSelected(null)} onDone={load} />
      )}
    </div>
  );
}
