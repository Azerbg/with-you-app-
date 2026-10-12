import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HrKanban from "./HrKanban";

export async function generateMetadata() {
  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "fr" ? "fr" : "en";
  return { title: lang === "fr" ? "Console RH · WithYou" : "HR Console · WithYou" };
}

export default async function HrConsolePage() {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    redirect("/auth/login");
  }
  return <HrKanban hrEmail={session.user.email!} role={session.user.role ?? undefined} />;
}
