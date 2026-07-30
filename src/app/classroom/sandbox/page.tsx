import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SandboxClient from "./SandboxClient";

export const metadata = { title: "Salle sandbox — WithYou" };

export default async function SandboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/classroom/sandbox");

  return <SandboxClient />;
}
