"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";

interface Props {
  email: string;
  cefrLevel: string | null;
  tier: string;
  initials: string;
  activePage?: "overview" | "sessions" | "tutors" | "flashcards" | "messages" | "billing";
}

export default function StudentSidebar({ email, cefrLevel, tier, initials, activePage = "overview" }: Props) {
  const { lang } = useLanguage();
  const s = T[lang].sidebar;

  const NAV = [
    {
      items: [
        {
          label: s.overview,
          href: "/dashboard/student",
          page: "overview" as const,
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
        },
        {
          label: s.sessions,
          href: "/dashboard/student/sessions",
          page: "sessions" as const,
          badge: "0",
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
        },
        {
          label: s.myTutors,
          href: "/dashboard/student/tutors",
          page: "tutors" as const,
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /><path d="M19 8v6M16 11h6" /></svg>,
        },
        {
          label: s.flashcards,
          href: "/dashboard/student/flashcards",
          page: "flashcards" as const,
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>,
        },
      ],
    },
    {
      label: s.communicate,
      items: [
        {
          label: s.messages,
          href: "/dashboard/student/messages",
          page: "messages" as const,
          badge: "0",
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
        },
      ],
    },
    {
      label: s.account,
      items: [
        {
          label: s.billing,
          href: "/dashboard/student/billing",
          page: "billing" as const,
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /></svg>,
        },
      ],
    },
  ];

  return (
    <aside
      className="hidden md:flex flex-col w-56 flex-shrink-0 h-screen sticky top-0 overflow-y-auto"
      style={{ background: "linear-gradient(160deg, #2D1F0E 0%, #1A1208 100%)" }}
    >
      {/* Logo */}
      <div className="h-14 px-5 flex items-center flex-shrink-0">
        <Link href="/" className="font-bold text-[#F5C400] text-base tracking-tight">WithYou</Link>
      </div>

      {/* User */}
      <div className="px-3 pb-4 mb-2">
        <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-white/5 transition cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-xs flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/80 truncate leading-tight">{email}</p>
            <p className="text-[11px] leading-tight mt-0.5" style={{ color: "#F5C400" }}>
              {cefrLevel} · {tier}
            </p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-white/20 flex-shrink-0">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      <div className="mx-4 h-px bg-white/6 mb-3" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto pb-3">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-[10px] font-semibold uppercase tracking-widest px-2.5 mb-1.5" style={{ color: "rgba(245,196,0,0.3)" }}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = activePage === item.page;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative ${
                      active ? "text-[#5C3D00]" : "text-white/35 hover:text-white/70 hover:bg-white/5"
                    }`}
                    style={active ? { background: "#F5C400" } : {}}
                  >
                    <span className={active ? "text-[#5C3D00]" : "text-white/25"}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {"badge" in item && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                        active ? "bg-[#5C3D00]/15 text-[#5C3D00]" : "bg-white/8 text-white/25"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 pt-3 space-y-0.5">
        <div className="mx-1 h-px bg-white/6 mb-3" />
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/30 hover:bg-white/5 hover:text-white/60 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
          </svg>
          {s.help}
        </button>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/30 hover:bg-red-500/10 hover:text-red-400 transition"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          {s.logout}
        </button>
      </div>
    </aside>
  );
}
