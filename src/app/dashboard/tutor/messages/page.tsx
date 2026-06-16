import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import MessagesClient from "./MessagesClient";

export default async function TutorMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const app = await db.hrApplication.findUnique({
    where: { userId: session.user.id },
    select: { status: true },
  });
  if (app?.status !== "ACTIVE") redirect("/dashboard/tutor");

  return <MessagesClient currentUserId={session.user.id} />;
}
