"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 bg-black/5 rounded-lg p-0.5">
      <button
        onClick={() => setLang("fr")}
        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
          lang === "fr"
            ? "bg-white text-[#5C3D00] shadow-sm"
            : "text-black/40 hover:text-black/70"
        }`}
      >
        FR
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
          lang === "en"
            ? "bg-white text-[#5C3D00] shadow-sm"
            : "text-black/40 hover:text-black/70"
        }`}
      >
        EN
      </button>
    </div>
  );
}
