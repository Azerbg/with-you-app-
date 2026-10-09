import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import NotificationsClient from "@/app/dashboard/tutor/notifications/NotificationsClient";
import { cookies } from "next/headers";

export async function generateMetadata() {
  const lang = (await cookies()).get("wy_lang")?.value === "en" ? "en" : "fr";
  return { title: lang === "en" ? "Notifications — WithYou" : "Notifications — WithYou" };
}

export default async function StudentNotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  await db.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  return <NotificationsClient notifications={notifications} />;
}
