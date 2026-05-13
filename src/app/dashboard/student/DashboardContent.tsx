"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";
import StudentSidebar from "@/components/StudentSidebar";

interface Props {
  email: string;
  firstName: string | null;
  nickname: string | null;
  image: string | null;
  cefrLevel: string | null;
  tierKey: string;
  tierCls: string;
  initials: string;
  nativeLanguage: string | null;
  targetLanguage: string | null;
  learningObjective: string | null;
  sessionFrequency: string | null;
  programDuration: string | null;
  timezone: string;
  timeWindowPreference: string[];
  availabilityDays: string[];
  country: string | null;
}

const DAYS_ORDER = ["MON","TUE","WED","THU","FRI","SAT","SUN"];

export default function DashboardContent(p: Props) {
  const { lang } = useLanguage();
  const t = T[lang].dashboard;

  // Resolve tier info from translations (bilingual)
  const tiers = (t as unknown as { tiers: Record<string, { label: string; sessions: string; desc: string }> }).tiers;
  const tierInfo   = tiers[p.tierKey] ?? { label: p.tierKey, sessions: "", desc: "" };
  const tierLabel   = tierInfo.label;
  const tierSessions = tierInfo.sessions;
  const tierDesc    = tierInfo.desc;

  // Resolve language names from translations
  const langNames = (t as unknown as { languageNames: Record<string, string> }).languageNames;
  const nativeLangLabel  = p.nativeLanguage  ? (langNames[p.nativeLanguage]  ?? p.nativeLanguage)  : "—";
  const targetLangLabel  = p.targetLanguage  ? (langNames[p.targetLanguage]  ?? p.targetLanguage)  : "—";

  // Resolve time window labels from translations
  const twLabels = (t as unknown as { timeWindowLabels: Record<string, string> }).timeWindowLabels;

  const objLabel  = p.learningObjective ? (t.objectives  as Record<string,string>)[p.learningObjective] ?? p.learningObjective : "—";
  const freqLabel = p.sessionFrequency  ? (t.frequencies as Record<string,string>)[p.sessionFrequency]  ?? p.sessionFrequency  : "—";
  const durLabel  = p.programDuration   ? (t.durations   as Record<string,string>)[p.programDuration]   ?? p.programDuration   : "";
  const cefrDesc  = p.cefrLevel         ? (t.cefr        as Record<string,string>)[p.cefrLevel]         ?? "" : "";

  const greetingName = p.firstName ? `, ${p.firstName}` : "";
  const greeting = lang === "fr" ? `Bonjour${greetingName} 👋` : `Hello${greetingName} 👋`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F2EFE9" }}>
      <StudentSidebar
        email={p.email}
        firstName={p.firstName}
        nickname={p.nickname}
        image={p.image}
        cefrLevel={p.cefrLevel}
        tier={tierLabel}
        initials={p.initials}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Top bar */}
        <div className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-8 flex-shrink-0">
          <h1 className="text-base font-bold text-[#5C3D00]">{t.overview}</h1>
          <div className="flex items-center gap-2">
            {/* 5.9 — Messages icon */}
            <button title={t.messages} className="w-8 h-8 rounded-lg hover:bg-[#5C3D00]/5 flex items-center justify-center text-[#6B5E44] transition">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </button>
            {/* Bell icon */}
            <button className="w-8 h-8 rounded-lg hover:bg-[#5C3D00]/5 flex items-center justify-center text-[#6B5E44] transition">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>
            {/* 5.10 — Settings icon */}
            <Link href="/settings/payment" title={t.settings} className="w-8 h-8 rounded-lg hover:bg-[#5C3D00]/5 flex items-center justify-center text-[#6B5E44] transition">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </Link>
            {/* 5.2 — Avatar: Google photo or initials */}
            {p.image ? (
              <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-xs">
                {p.initials}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">

          {/* 5.1 — Personalised welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#5C3D00]">{greeting}</h2>
            <p className="text-sm text-[#6B5E44] mt-1">{t.greetingSub}</p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: t.cefrLevel, value: p.cefrLevel ?? "—", sub: cefrDesc,
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" /></svg>,
                color: "text-[#C49200]", bg: "bg-[#FFF3B0]",
              },
              {
                label: t.program, value: tierLabel, sub: tierSessions,
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg>,
                color: "text-[#5C3D00]", bg: "bg-[#F5C400]/20",
              },
              {
                label: t.language, value: targetLangLabel, sub: `${t.from} ${nativeLangLabel}`,
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-3.754 1 1 0 111.93-.525c.11.41.237.805.38 1.187A17.165 17.165 0 006.5 7.81V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.992a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.992A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" clipRule="evenodd" /></svg>,
                color: "text-emerald-700", bg: "bg-emerald-50",
              },
              {
                label: t.frequency, value: freqLabel, sub: durLabel,
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>,
                color: "text-blue-700", bg: "bg-blue-50",
              },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-black/5 rounded-2xl p-5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-xs font-semibold text-[#6B5E44]/70 uppercase tracking-wide">{s.label}</p>
                  <div className={`w-8 h-8 ${s.bg} ${s.color} rounded-lg flex items-center justify-center`}>{s.icon}</div>
                </div>
                <p className="text-2xl font-bold text-[#5C3D00]">{s.value}</p>
                <p className="text-xs text-[#6B5E44] mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Two-col */}
          <div className="grid xl:grid-cols-3 gap-6">

            {/* Left 2/3 */}
            <div className="xl:col-span-2 space-y-6">

              {/* 5.6 — My Learning Profile */}
              <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
                  <p className="font-bold text-[#5C3D00]">{t.profile}</p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.tierCls}`}>{tierLabel}</span>
                </div>
                <div className="p-6 grid grid-cols-2 gap-6">
                  {[
                    { label: t.nativeLang, value: nativeLangLabel },
                    { label: t.learning,   value: targetLangLabel },
                  ].map((r) => (
                    <div key={r.label} className="space-y-1">
                      <p className="text-xs text-[#6B5E44]/60 uppercase tracking-wide font-medium">{r.label}</p>
                      <p className="font-bold text-[#5C3D00]">{r.value}</p>
                    </div>
                  ))}

                  {/* 5.4 — "Niveau actuel" / "Current Level" */}
                  <div className="space-y-1">
                    <p className="text-xs text-[#6B5E44]/60 uppercase tracking-wide font-medium">{t.cefrLevelShort}</p>
                    {p.cefrLevel ? (
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold text-[#5C3D00]">{p.cefrLevel}</p>
                        <p className="text-sm text-[#6B5E44]">{cefrDesc}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl font-bold text-[#5C3D00] mb-1">—</p>
                        <Link href="/placement-test" className="inline-block text-xs font-semibold text-[#C49200] hover:text-[#5C3D00] underline underline-offset-2 transition">
                          {lang === "fr" ? "Passer le test →" : "Take the test →"}
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-[#6B5E44]/60 uppercase tracking-wide font-medium">{t.goal}</p>
                    <p className="font-bold text-[#5C3D00]">{objLabel}</p>
                  </div>

                  {/* 5.8 — Country */}
                  {p.country && (
                    <div className="space-y-1">
                      <p className="text-xs text-[#6B5E44]/60 uppercase tracking-wide font-medium">{t.country}</p>
                      <p className="font-bold text-[#5C3D00]">{p.country}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-black/5">
                  <p className="font-bold text-[#5C3D00]">{t.schedule}</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: t.freqLabel,  val: freqLabel },
                      { label: t.commitment, val: durLabel || "—" },
                      { label: t.timezone,   val: p.timezone },
                    ].map((r) => (
                      <div key={r.label} className="space-y-1">
                        <p className="text-xs text-[#6B5E44]/60 uppercase tracking-wide font-medium">{r.label}</p>
                        <p className="font-bold text-[#5C3D00] text-sm truncate">{r.val}</p>
                      </div>
                    ))}
                  </div>

                  {p.timeWindowPreference.length > 0 && (
                    <div>
                      <p className="text-xs text-[#6B5E44]/60 uppercase tracking-wide font-medium mb-2">{t.timeWindows}</p>
                      <div className="flex gap-2">
                        {p.timeWindowPreference.map((w) => (
                          <span key={w} className="px-3 py-1.5 bg-[#FFF3B0] text-[#C49200] text-xs font-bold rounded-lg border border-[#F5C400]/30">
                            {twLabels[w] ?? (w.charAt(0) + w.slice(1).toLowerCase())}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.availabilityDays.length > 0 && (
                    <div>
                      <p className="text-xs text-[#6B5E44]/60 uppercase tracking-wide font-medium mb-3">{t.availDays}</p>
                      <div className="flex gap-2">
                        {DAYS_ORDER.map((code) => {
                          const on = p.availabilityDays.includes(code);
                          const label = (t.dayLabels as Record<string,string>)[code] ?? code.slice(0,2);
                          return (
                            <div key={code} className="flex flex-col items-center gap-1.5">
                              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                                on ? "bg-[#F5C400] text-[#5C3D00] shadow-[0_2px_8px_rgba(245,196,0,0.4)]" : "bg-[#F7F5F0] text-[#6B5E44]/30"
                              }`}>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 5.7 — "Find a tutor" block removed */}
            </div>

            {/* Right 1/3 */}
            <div className="space-y-5">
              {/* Program card */}
              <div className="bg-[#5C3D00] rounded-2xl p-5 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[#F5C400]/10 -translate-y-8 translate-x-8" />
                <p className="text-[10px] font-bold text-[#F5C400]/50 uppercase tracking-widest mb-1">{t.yourProgram}</p>
                <p className="text-2xl font-bold text-white">{tierLabel}</p>
                <p className="text-sm text-white/50 mt-1 mb-4">{tierSessions}</p>
                <div className="bg-white/8 rounded-xl p-3 text-xs text-white/60 leading-relaxed">{tierDesc}</div>
              </div>

              {/* Activity */}
              <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-black/5">
                  <p className="font-bold text-[#5C3D00] text-sm">{t.activity}</p>
                </div>
                <div className="divide-y divide-black/4">
                  {[
                    { label: t.sessionsCompleted, value: "0", icon: "📅" },
                    { label: t.flashcardsCreated, value: "0", icon: "🗂️" },
                    { label: t.streak,            value: `0 ${t.days}`, icon: "🔥" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{s.icon}</span>
                        <p className="text-xs text-[#6B5E44]">{s.label}</p>
                      </div>
                      <p className="text-sm font-bold text-[#5C3D00]">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discovery session */}
              <div className="bg-[#FFF3B0] border border-[#F5C400]/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#F5C400] animate-pulse" />
                  <p className="text-xs font-bold text-[#5C3D00] uppercase tracking-wide">{t.discovery}</p>
                </div>
                <p className="text-sm text-[#6B5E44] mb-4 leading-relaxed">{t.discoverySub}</p>
                <Link href="/settings/payment" className="block w-full bg-[#5C3D00] text-[#F5C400] py-2.5 rounded-xl font-bold text-sm hover:bg-[#3d2900] transition text-center">
                  {t.bookNow}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
