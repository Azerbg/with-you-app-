import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import NotificationsClient from "@/app/dashboard/tutor/notifications/NotificationsClient";

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
