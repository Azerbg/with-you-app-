"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface MobileMenuCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const Ctx = createContext<MobileMenuCtx>({ open: false, setOpen: () => {} });

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

export function useMobileMenu() { return useContext(Ctx); }

/** Hamburger button — place in the top bar. Renders nothing on md+. */
export function MobileMenuTrigger() {
  const { setOpen } = useMobileMenu();
  return (
    <button
      onClick={() => setOpen(true)}
      aria-label="Open menu"
      className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-[#6B5E44] hover:bg-[#5C3D00]/5 transition flex-shrink-0"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    </button>
  );
}
