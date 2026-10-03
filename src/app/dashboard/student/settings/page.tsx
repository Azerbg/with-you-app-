import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NotifPreferencesTab from "@/components/NotifPreferencesTab";

export const metadata = { title: "Paramètres — WithYou" };

export default async function StudentSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#2D1A00] mb-2">Paramètres</h1>
      <p className="text-sm text-[#9B8A6B] mb-8">Gérez vos préférences de notifications.</p>

      <div className="mb-4">
        <h2 className="text-sm font-bold text-[#3d2900] uppercase tracking-widest mb-4">
          Notifications
        </h2>
        <NotifPreferencesTab />
      </div>
    </div>
  );
}
