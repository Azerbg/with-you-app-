"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";
import ProfileEditPanel from "@/components/ProfileEditPanel";
import PaymentMethodsCard from "./PaymentMethodsCard";

interface UpcomingBooking {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorPhoto: string | null;
  scheduledAt: string;
  status: string;
  durationMins: number;
}

interface Props {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  hasPendingImage?: boolean;
  image?: string | null;
  cefrLevel: string | null;
  tierKey?: string;
  tierLabel?: string;
  tierSessions?: string;
  tierDesc?: string;
  tierCls: string;
  initials: string;
  nativeLanguage: string | null;
  targetLanguage: string | null;
  targetLanguageCode?: string | null;
  learningObjective: string | null;
  sessionFrequency: string | null;
  programDuration: string | null;
  timezone: string;
  timeWindowPreference: string[];
  availabilityDays: string[];
  country?: string | null;
  upcomingBookings?: UpcomingBooking[];
  showReviewedBanner?: boolean;
}

const DAYS_ORDER = ["MON","TUE","WED","THU","FRI","SAT","SUN"];

export default function DashboardContent(p: Props) {
  const { lang } = useLanguage();
  const t = T[lang].dashboard;
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState(p.firstName ?? null);
  const [lastName,  setLastName]  = useState(p.lastName  ?? null);
  const [displayTz, setDisplayTz] = useState(p.timezone);
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setDisplayTz(tz.replace(/_/g, " "));
  }, []);
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : firstName ?? p.email;

  const objLabel = p.learningObjective ? (t.objectives as Record<string,string>)[p.learningObjective] ?? p.learningObjective : "—";
  const freqLabel = p.sessionFrequency ? (t.frequencies as Record<string,string>)[p.sessionFrequency] ?? p.sessionFrequency : "—";
  const durLabel  = p.programDuration  ? (t.durations  as Record<string,string>)[p.programDuration]  ?? p.programDuration  : "";
  const cefrDesc  = p.cefrLevel        ? (t.cefr       as Record<string,string>)[p.cefrLevel]        ?? "" : "";
  const tierInfo  = p.tierKey ? (t.tiers as Record<string, { label: string; sessions: string; desc: string }>)[p.tierKey] : null;
  const tierLabel = tierInfo?.label ?? p.tierLabel ?? "—";
  const tierSessions = tierInfo?.sessions ?? p.tierSessions ?? "";
  const tierDesc  = tierInfo?.desc ?? p.tierDesc ?? "";
  const langNames = t.languageNames as Record<string, string>;
  const targetLangDisplay = p.targetLanguage ? (langNames[p.targetLanguage] ?? p.targetLanguage) : "—";
  const nativeLangDisplay = p.nativeLanguage ? (langNames[p.nativeLanguage] ?? p.nativeLanguage) : "—";

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Top bar */}
        <div className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-8 flex-shrink-0">
          <h1 className="text-base font-bold text-[#5C3D00]">{t.overview}</h1>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-lg hover:bg-[#5C3D00]/05 flex items-center justify-center text-[#6B5E44] transition">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="w-8 h-8 rounded-lg bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-xs hover:bg-[#FFDE59] transition overflow-hidden"
              title="Modifier le profil"
            >
              {p.image ? (
                <img src={p.image} alt="" className="w-full h-full object-cover" />
              ) : (
                p.initials
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">

          {/* Review success banner */}
          {p.showReviewedBanner && (
            <div className="mb-6 flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-green-800">Avis envoyé, merci !</p>
                <p className="text-xs text-green-600 mt-0.5">Votre retour aide la communauté WithYou à grandir.</p>
              </div>
            </div>
          )}

          {/* Placement test banner — shown when cefrLevel is missing */}
          {!p.cefrLevel && (
            <div className="mb-6 flex items-center gap-4 bg-[#FFF3B0] border border-[#F5C400]/60 rounded-2xl px-5 py-4">
              <span className="text-2xl flex-shrink-0">📋</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#5C3D00]">Complétez votre test de niveau</p>
                <p className="text-xs text-[#7A6B55] mt-0.5">
                  Votre niveau de langue n&apos;a pas encore été défini. Passez le test de positionnement pour personnaliser votre programme.
                </p>
              </div>
              <a href="/placement-test"
                className="flex-shrink-0 px-4 py-2 bg-[#F5C400] text-[#5C3D00] font-bold text-xs rounded-xl hover:bg-[#FFDE59] transition whitespace-nowrap">
                Passer le test →
              </a>
            </div>
          )}

          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#5C3D00]">{t.greeting}</h2>
            <p className="text-sm text-[#6B5E44] mt-1">{t.greetingSub}</p>
          </div>

          {/* Bee Progress Bar */}
          <div className="bg-white rounded-2xl border border-black/5 px-6 py-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-[#5C3D00] uppercase tracking-widest">Ma progression</p>
              <span className="text-xs font-bold text-[#C49200]">5%</span>
            </div>
            <div className="relative h-2.5 bg-[#F2EFE9] rounded-full overflow-visible">
              {/* yellow gradient track */}
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ width: "5%", background: "linear-gradient(90deg, #FFE566, #F5C400, #C49200)" }}
              />
              {/* bee at the head with bobbing animation */}
              <div
                className="absolute top-1/2 -translate-x-1/2 select-none"
                style={{
                  left: "5%",
                  animation: "beeBob 1.2s ease-in-out infinite",
                  fontSize: "22px",
                  lineHeight: 1,
                  filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.15))",
                  marginTop: "-14px",
                }}
              >
                🐝
              </div>
            </div>
            <style>{`
              @keyframes beeBob {
                0%, 100% { transform: translateX(-50%) translateY(0px); }
                50%       { transform: translateX(-50%) translateY(-4px); }
              }
            `}</style>
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
                label: t.language, value: targetLangDisplay, sub: `${t.from} ${nativeLangDisplay}`,
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

              {/* Language profile */}
              <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
                  <p className="font-bold text-[#5C3D00]">{t.profile}</p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.tierCls}`}>{tierLabel}</span>
                </div>
                <div className="p-6 grid grid-cols-2 gap-6">
                  {[
                    { label: t.nativeLang,     value: nativeLangDisplay },
                    { label: t.learning,        value: targetLangDisplay },
                  ].map((r) => (
                    <div key={r.label} className="space-y-1">
                      <p className="text-xs text-[#6B5E44]/60 uppercase tracking-wide font-medium">{r.label}</p>
                      <p className="font-bold text-[#5C3D00]">{r.value}</p>
                    </div>
                  ))}
                  <div className="space-y-1">
                    <p className="text-xs text-[#6B5E44]/60 uppercase tracking-wide font-medium">{t.cefrLevelShort}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-bold text-[#5C3D00]">{p.cefrLevel ?? "—"}</p>
                      <p className="text-sm text-[#6B5E44]">{cefrDesc}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#6B5E44]/60 uppercase tracking-wide font-medium">{t.goal}</p>
                    <p className="font-bold text-[#5C3D00]">{objLabel}</p>
                  </div>
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
                      { label: t.timezone,   val: displayTz },
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
                        {p.timeWindowPreference.map((w) => {
                          const TW_FR: Record<string, string> = { MORNING: "Matin", AFTERNOON: "Après-midi", EVENING: "Soirée" };
                          return (
                            <span key={w} className="px-3 py-1.5 bg-[#FFF3B0] text-[#C49200] text-xs font-bold rounded-lg border border-[#F5C400]/30">
                              {TW_FR[w] ?? (w.charAt(0) + w.slice(1).toLowerCase())}
                            </span>
                          );
                        })}
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

              {/* Upcoming sessions */}
              {p.upcomingBookings && p.upcomingBookings.length > 0 && (
                <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-black/5">
                    <p className="font-bold text-[#5C3D00]">Prochaines séances</p>
                  </div>
                  <div className="divide-y divide-black/4">
                    {p.upcomingBookings.map((b) => {
                      const date = new Date(b.scheduledAt);
                      const dateStr = date.toLocaleString("fr-FR", {
                        weekday: "short", day: "numeric", month: "short",
                        hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis",
                      });
                      const initials = b.tutorName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                      const now = Date.now();
                      const sessionMs = date.getTime();
                      const canJoin = sessionMs - now <= 30 * 60 * 1000 && sessionMs - now > -b.durationMins * 60 * 1000;
                      return (
                        <div key={b.id} className="flex items-center gap-4 px-6 py-4">
                          {b.tutorPhoto ? (
                            <img src={b.tutorPhoto} alt={b.tutorName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-xs flex-shrink-0">
                              {initials}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#2D1A00] text-sm truncate">{b.tutorName}</p>
                            <p className="text-xs text-[#6B5E44] capitalize">{dateStr} · {b.durationMins} min</p>
                          </div>
                          {canJoin ? (
                            <a
                              href={`/classroom/${b.id}`}
                              className="flex-shrink-0 bg-[#F5C400] text-[#5C3D00] px-4 py-2 rounded-xl font-bold text-xs hover:bg-[#FFDE59] transition"
                            >
                              Rejoindre →
                            </a>
                          ) : (
                            <a
                              href={`/classroom/${b.id}`}
                              className="flex-shrink-0 text-xs text-[#9B8A6B] bg-[#FAF8F0] px-3 py-1.5 rounded-xl border border-[#E8E0D4] hover:bg-[#F0EAD8] transition"
                            >
                              Salle de classe →
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Find tutor CTA */}
              <div className="bg-[#1C1008] rounded-2xl p-6 flex items-center justify-between gap-6">
                <div>
                  <p className="text-[#F5C400] font-bold text-lg mb-1">{t.findTutor}</p>
                  <p className="text-white/50 text-sm">{t.findTutorSub}</p>
                </div>
                <Link href="/find-tutors" className="flex-shrink-0 bg-[#F5C400] text-[#5C3D00] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#FFDE59] transition shadow-[0_4px_14px_rgba(245,196,0,0.35)] whitespace-nowrap">
                  {t.browseTutors}
                </Link>
              </div>
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
                    { label: t.sessionsCompleted, value: "0",                   icon: "📅" },
                    { label: t.flashcardsCreated,  value: "0",                   icon: "🗂️" },
                    { label: t.streak,             value: `0 ${t.days}`,         icon: "🔥" },
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

              {/* Payment methods */}
              <Suspense fallback={null}>
                <PaymentMethodsCard />
              </Suspense>

              {/* Discovery session */}
              <div className="bg-[#FFF3B0] border border-[#F5C400]/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#F5C400] animate-pulse" />
                  <p className="text-xs font-bold text-[#5C3D00] uppercase tracking-wide">{t.discovery}</p>
                </div>
                <p className="text-sm text-[#6B5E44] mb-4 leading-relaxed">
                  {t.discoverySub.replace(/\.$/, "")} <span className="font-bold text-[#5C3D00]">à petit prix</span>.
                </p>
                <Link href="/find-tutors" className="block w-full text-center bg-[#5C3D00] text-[#F5C400] py-2.5 rounded-xl font-bold text-sm hover:bg-[#3d2900] transition">
                  {t.bookNow}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile edit panel */}
      {editOpen && (
        <ProfileEditPanel
          email={p.email}
          firstName={firstName}
          lastName={lastName}
          image={p.image ?? null}
          hasPendingImage={p.hasPendingImage ?? false}
          initials={p.initials}
          onClose={() => setEditOpen(false)}
          onSaved={(f, l) => { setFirstName(f); setLastName(l); setEditOpen(false); }}
        />
      )}
    </>
  );
}
