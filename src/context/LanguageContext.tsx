"use client";

import { createContext, useContext, useState, useEffect } from "react";

export type Lang = "fr" | "en";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("wy_lang") as Lang;
    const resolved: Lang = (saved === "en" || saved === "fr")
      ? saved
      : (navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en");
    setLangState(resolved);
    // Sync to cookie every load so server components (generateMetadata) can read it
    document.cookie = `wy_lang=${resolved};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("wy_lang", l);
    // Also set a cookie so server components (e.g. generateMetadata) can read it
    document.cookie = `wy_lang=${l};path=/;max-age=31536000;SameSite=Lax`;
  }

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  return useContext(Ctx);
}
