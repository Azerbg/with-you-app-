import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PayoutsClient from "./PayoutsClient";

export async function generateMetadata() {
  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "fr" ? "fr" : "en";
  return { title: lang === "fr" ? "Virements tuteurs — Admin" : "Tutor Payouts — Admin" };
}

export default async function PayoutsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/auth/login");

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      <PayoutsClient />
    </div>
  );
}
