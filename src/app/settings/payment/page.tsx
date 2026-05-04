import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import PaymentSetupClient from "./PaymentSetupClient";

interface Props {
  searchParams: Promise<{ setup_complete?: string }>;
}

export default async function PaymentSettingsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const params = await searchParams;
  const setupComplete = params.setup_complete === "true";
  const locale = (session.user as { locale?: string }).locale ?? "en";

  return <PaymentSetupClient lang={locale} setupComplete={setupComplete} />;
}
