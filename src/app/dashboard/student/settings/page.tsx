import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StudentSettingsClient from "./StudentSettingsClient";
import { cookies } from "next/headers";

export async function generateMetadata() {
  const lang = (await cookies()).get("wy_lang")?.value === "en" ? "en" : "fr";
  return { title: lang === "en" ? "Settings — WithYou" : "Paramètres — WithYou" };
}

export default async function StudentSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  return <StudentSettingsClient />;
}
