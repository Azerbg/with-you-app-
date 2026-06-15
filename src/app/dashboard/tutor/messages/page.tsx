import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MessagesClient from "./MessagesClient";

export default async function TutorMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  return <MessagesClient currentUserId={session.user.id} />;
}
