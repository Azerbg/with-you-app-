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
    if (saved === "en" || saved === "fr") {
      setLangState(saved);
    } else {
      // First visit: detect browser language
      const browserLang = navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
      setLangState(browserLang);
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("wy_lang", l);
  }

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  return useContext(Ctx);
}
