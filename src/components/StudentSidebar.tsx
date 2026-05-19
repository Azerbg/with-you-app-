"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";
import ProfileEditPanel from "@/components/ProfileEditPanel";

interface Props {
  email: string;
  firstName: string | null;
  nickname: string | null;
  image: string | null;
  cefrLevel: string | null;
  tier: string;
  initials: string;
}

export default function StudentSidebar({ email, firstName, nickname, image, cefrLevel, tier, initials }: Props) {
  const { lang } = useLanguage();
  const s = T[lang].sidebar;

  // Local state so display updates instantly after save (no full reload)
  const [displayName, setDisplayName] = useState(nickname || firstName || email.split("@")[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(image);
  const [panelOpen, setPanelOpen] = useState(false);

  const NAV = [
    {
      items: [
        { label: s.overview, active: true, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg> },
        { label: s.sessions, active: false, badge: "0", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg> },
        { label: s.myTutors, active: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /><path d="M19 8v6M16 11h6" /></svg> },
        { label: s.flashcards, active: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg> },
      ],
    },
    {
      label: s.communicate,
      items: [
        { label: s.messages, active: false, badge: "0", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg> },
      ],
    },
    {
      label: s.account,
      items: [
        { label: s.billing, active: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /></svg> },
      ],
    },
  ];

  return (
    <>
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 h-screen sticky top-0 overflow-y-auto bg-[#F5F1EA] border-r border-[#E0D8CC]">
        {/* Logo */}
        <div className="h-16 px-5 flex items-center flex-shrink-0 border-b border-[#E0D8CC]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-[#F5C400] rounded-xl flex items-center justify-center shadow-sm group-hover:bg-[#FFDE59] transition">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M5 6l4.5 8 2.5-4.5L14.5 14 19 6" stroke="#5C3D00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-[#2D1A00] text-[15px] tracking-tight">WithYou</span>
          </Link>
        </div>

        {/* User profile block */}
        <div className="px-4 py-4 border-b border-[#E0D8CC]">
          <button
            onClick={() => setPanelOpen(true)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#EDE7DC] transition group text-left"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0 ring-2 ring-[#EDE8DF] group-hover:ring-[#F5C400] transition" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-sm flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#2D1A00] truncate leading-tight">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {cefrLevel && (
                  <span className="text-[10px] font-bold bg-[#FFF3B0] text-[#5C3D00] px-1.5 py-0.5 rounded-full leading-none">{cefrLevel}</span>
                )}
                <span className="text-[11px] text-[#9B8A6B] truncate">{tier}</span>
              </div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-[#C4BAA8] group-hover:text-[#F5C400] transition flex-shrink-0">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#B0A490] px-2.5 mb-2">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left ${
                      item.active
                        ? "bg-[#F5C400] text-[#5C3D00]"
                        : "text-[#6B5E44] hover:bg-[#EDE7DC] hover:text-[#2D1A00]"
                    }`}
                  >
                    <span className={item.active ? "text-[#5C3D00]" : "text-[#9B8A6B]"}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {"badge" in item && Number(item.badge) > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                        item.active ? "bg-[#5C3D00]/15 text-[#5C3D00]" : "bg-[#F5C400]/30 text-[#5C3D00]"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-5 pt-2 border-t border-[#E0D8CC] space-y-0.5">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#9B8A6B] hover:bg-[#EDE7DC] hover:text-[#2D1A00] transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
            </svg>
            {s.help}
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#9B8A6B] hover:bg-red-50 hover:text-red-500 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {s.logout}
          </button>
        </div>
      </aside>

      {/* Profile edit panel */}
      {panelOpen && (
        <ProfileEditPanel
          email={email}
          displayName={displayName}
          image={avatarUrl}
          initials={initials}
          onClose={() => setPanelOpen(false)}
          onSaved={(newName, newImage) => {
            setDisplayName(newName);
            setAvatarUrl(newImage);
          }}
        />
      )}
    </>
  );
}
