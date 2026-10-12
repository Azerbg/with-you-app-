import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PayoutsClient from "./PayoutsClient";

export const metadata = { title: "Virements tuteurs — WithYou Admin" };

export default async function PayoutsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/auth/login");

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      <PayoutsClient />
    </div>
  );
}
