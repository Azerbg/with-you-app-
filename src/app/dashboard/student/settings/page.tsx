import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StudentSettingsClient from "./StudentSettingsClient";

export const metadata = { title: "Settings — WithYou" };

export default async function StudentSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  return <StudentSettingsClient />;
}
