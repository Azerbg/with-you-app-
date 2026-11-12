"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useRef, useState, useCallback } from "react";

const NAV = [
  { labelFr: "Vue d'ensemble", labelEn: "Overview",   href: "/dashboard/admin",           icon: "📊" },
  { labelFr: "Utilisateurs",   labelEn: "Users",      href: "/dashboard/admin/users",     icon: "👥" },
  { labelFr: "Messages",       labelEn: "Messages",   href: "/dashboard/admin/messages",  icon: "💬" },
  { labelFr: "Réservations",   labelEn: "Bookings",   href: "/dashboard/admin/bookings",  icon: "📅" },
  { labelFr: "Finance",        labelEn: "Finance",    href: "/dashboard/admin/finance",   icon: "📈" },
  { labelFr: "Virements",      labelEn: "Payouts",    href: "/dashboard/admin/payouts",   icon: "💸" },
  { labelFr: "Litiges",        labelEn: "Disputes",   href: "/dashboard/admin/disputes",  icon: "⚠️" },
  { labelFr: "Console RH",     labelEn: "HR Console", href: "/console/hr",                icon: "🗂️" },
];

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

function NotificationBell() {
  const [unread, setUnread]   = useState(0);
  const [items, setItems]     = useState<NotifItem[]>([]);
  const [open, setOpen]       = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications");
      if (!r.ok) return;
      const d = await r.json() as { unread: number; items: NotifItem[] };
      setUnread(d.unread);
      setItems(d.items.slice(0, 15));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    setUnread(0);
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
  }

  async function markRead(id: string, link: string | null) {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) });
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
    if (link) window.location.href = link;
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs(); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 w-80 bg-[#1E1208] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-[#F5C400] hover:text-white transition font-semibold">
                Tout lire
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-8">Aucune notification</p>
            ) : (
              items.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id, n.link)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition flex gap-3 items-start ${!n.isRead ? "bg-white/5" : ""}`}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {n.type === "PAYMENT_RECEIVED" ? "💳" :
                     n.type === "PAYOUT_PROCESSED" ? "💸" :
                     n.type === "DISPUTE_OPENED"   ? "⚠️" : "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${n.isRead ? "text-white/50" : "text-white"}`}>{n.title}</p>
                    {n.body && <p className="text-[11px] text-white/40 truncate mt-0.5">{n.body}</p>}
                  </div>
                  <span className="text-[10px] text-white/30 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                  {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#F5C400] flex-shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props { email: string; }

export default function AdminSidebar({ email }: Props) {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="w-56 flex-shrink-0 bg-[#1A0F00] flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
        <div>
          <img src="/logo.svg" alt="WithYou" className="h-12 w-auto brightness-0 invert" />
          <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mt-0.5">Admin Panel</p>
        </div>
        <NotificationBell />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-3">
        {NAV.map(item => {
          const active = item.href === "/dashboard/admin"
            ? pathname === "/dashboard/admin"
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active
                  ? "bg-[#F5C400] text-[#1A0F00]"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}>
              <span className="text-base">{item.icon}</span>
              {lang === "fr" ? item.labelFr : item.labelEn}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#F5C400] flex items-center justify-center text-[#1A0F00] font-bold text-xs flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{email}</p>
            <p className="text-[10px] text-white/30">{lang === "fr" ? "Administrateur" : "Administrator"}</p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="block text-center text-xs text-white/30 hover:text-white/60 transition py-1 w-full">
          {lang === "fr" ? "Se déconnecter" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
