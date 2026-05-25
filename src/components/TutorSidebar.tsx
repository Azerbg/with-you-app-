"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  fullName: string;
  initials: string;
  photo: string | null;
  profileComplete: boolean;
}

const NAV = [
  {
    href: "/dashboard/tutor",
    label: "Tableau de bord",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
    exact: true,
  },
  {
    href: "/dashboard/tutor/sessions",
    label: "Mes séances",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/dashboard/tutor/availability",
    label: "Disponibilités",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/dashboard/tutor/earnings",
    label: "Revenus",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/dashboard/tutor/complete-profile",
    label: "Mon profil",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export default function TutorSidebar({ fullName, initials, photo, profileComplete }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const firstName = fullName.split(" ")[0];

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#F0EAD8]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#F5C400] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M5 6l4.5 8 2.5-4.5L14.5 14 19 6" stroke="#5C3D00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-[#2D1A00] text-[15px] tracking-tight">WithYou</span>
        </Link>
      </div>

      {/* Avatar */}
      <div className="px-5 py-5 border-b border-[#F0EAD8]">
        <div className="flex items-center gap-3">
          {photo ? (
            <img src={photo} alt={fullName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-sm flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#2D1A00] truncate">{firstName}</p>
            <p className="text-xs text-[#9B8A6B]">Tuteur</p>
          </div>
        </div>

        {!profileComplete && (
          <Link href="/dashboard/tutor/complete-profile" className="mt-3 flex items-center gap-2 bg-[#FFF3B0] border border-[#F5C400] rounded-xl px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F5C400] flex-shrink-0 animate-pulse" />
            <p className="text-xs text-[#5C3D00] font-semibold">Compléter le profil</p>
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                active
                  ? "bg-[#F5C400] text-[#5C3D00]"
                  : "text-[#6B5E44] hover:bg-[#F5F0E8] hover:text-[#5C3D00]"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#F0EAD8]">
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#9B8A6B] hover:bg-[#F5F0E8] hover:text-[#5C3D00] transition font-semibold"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
          Déconnexion
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#F0EAD8] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#F5C400] rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
              <path d="M5 6l4.5 8 2.5-4.5L14.5 14 19 6" stroke="#5C3D00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-[#2D1A00] text-sm">WithYou</span>
        </Link>
        <button onClick={() => setOpen(true)} className="p-2 rounded-xl hover:bg-[#F5F0E8] transition">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#5C3D00]">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-72 bg-white h-full shadow-2xl overflow-hidden">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-[#F0EAD8] h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
