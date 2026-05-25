import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import StudentSidebar from "@/components/StudentSidebar";
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

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
  });

  const email    = session.user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();
  const tier     = studentProfile?.programTier ?? "CORE";
  const cefr     = studentProfile?.cefrLevel ?? null;
  const locale   = (session.user as { locale?: string }).locale ?? "fr";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F2EFE9" }}>
      <StudentSidebar
        email={email}
        cefrLevel={cefr}
        tier={tier}
        initials={initials}
        activePage="billing"
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Top bar */}
        <div className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-8 flex-shrink-0">
          <h1 className="text-base font-bold text-[#5C3D00]">Paiement</h1>
          <div className="w-8 h-8 rounded-lg bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-xs">
            {initials}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <PaymentSetupClient lang={locale} setupComplete={setupComplete} />
        </div>
      </div>
    </div>
  );
}
