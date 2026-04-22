import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import HrKanban from "./HrKanban";

export const metadata = { title: "HR Console · WithYou" };

export default async function HrConsolePage() {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    redirect("/auth/login");
  }
  return <HrKanban hrEmail={session.user.email!} />;
}
