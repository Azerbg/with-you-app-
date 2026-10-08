"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link: string | null;
  createdAt: string | Date;
}

const TYPE_ICON: Record<string, string> = {
  REMINDER_24H: "📅",
  REMINDER_1H:  "⏰",
  NEW_MESSAGE:  "💬",
};

function timeAgo(date: string | Date, lang: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (lang === "en") {
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days}j`;
}

export default function NotificationsClient({ notifications }: { notifications: Notification[] }) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-[#2D1A00] mb-6">Notifications</h1>

          {notifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/5 px-6 py-16 text-center">
              <p className="text-4xl mb-3">🔔</p>
              <p className="text-sm font-semibold text-[#5C3D00]">{t("Aucune notification", "No notifications")}</p>
              <p className="text-xs text-[#9B8A6B] mt-1">{t("Les rappels et alertes apparaîtront ici", "Reminders and alerts will appear here")}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/4 overflow-hidden">
              {notifications.map(n => {
                const inner = (
                  <div className={`flex items-start gap-4 px-6 py-4 hover:bg-[#FFFBEA] transition ${!n.isRead ? "bg-[#FFFBEA]" : ""}`}>
                    <div className="w-10 h-10 rounded-xl bg-[#FFF3B0] flex items-center justify-center text-xl flex-shrink-0">
                      {TYPE_ICON[n.type] ?? "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#2D1A00]">{n.title}</p>
                      <p className="text-xs text-[#6B5E44] mt-0.5">{n.body}</p>
                      <p className="text-[11px] text-[#9B8A6B] mt-1">{timeAgo(n.createdAt, lang)}</p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    )}
                  </div>
                );
                return n.link
                  ? <Link key={n.id} href={n.link}>{inner}</Link>
                  : <div key={n.id}>{inner}</div>;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
