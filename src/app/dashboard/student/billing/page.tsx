import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import PaymentSetupClient from "@/app/settings/payment/PaymentSetupClient";

interface Props {
  searchParams: Promise<{ setup_complete?: string }>;
}

export default async function BillingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const params = await searchParams;
  const setupComplete = params.setup_complete === "true";
  const locale = (session.user as { locale?: string }).locale ?? "fr";

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      <PaymentSetupClient lang={locale} setupComplete={setupComplete} />
    </div>
  );
}
