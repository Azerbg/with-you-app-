"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Overview",  href: "/dashboard/admin",           icon: "📊" },
  { label: "Users",     href: "/dashboard/admin/users",     icon: "👥" },
  { label: "Messages",  href: "/dashboard/admin/messages",  icon: "💬" },
  { label: "Bookings",  href: "/dashboard/admin/bookings",  icon: "📅" },
  { label: "Disputes",  href: "/dashboard/admin/disputes",  icon: "⚠️" },
  { label: "HR Console",href: "/console/hr",                icon: "🗂️" },
];

interface Props { email: string; }

export default function AdminSidebar({ email }: Props) {
  const pathname = usePathname();
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="w-56 flex-shrink-0 bg-[#1A0F00] flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <p className="text-[#F5C400] font-black text-lg tracking-tight">WithYou</p>
        <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mt-0.5">Admin Panel</p>
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
              {item.label}
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
            <p className="text-[10px] text-white/30">Administrateur</p>
          </div>
        </div>
        <Link href="/api/auth/signout"
          className="block text-center text-xs text-white/30 hover:text-white/60 transition py-1">
          Se déconnecter
        </Link>
      </div>
    </div>
  );
}
