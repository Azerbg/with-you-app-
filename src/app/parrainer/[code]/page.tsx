import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "Rejoignez WithYou — Offre de parrainage",
  description: "Votre ami vous invite à rejoindre WithYou Learning. Inscrivez-vous et obtenez un bonus sur votre première séance.",
};

interface Props {
  params: Promise<{ code: string }>;
}

export default async function ReferralLandingPage({ params }: Props) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // Verify the code exists
  const referrer = await db.user.findUnique({
    where: { referralCode: upperCode },
    select: {
      firstName: true,
      lastName: true,
      hrApplication: { select: { fullName: true } },
    },
  });

  if (!referrer) notFound();

  const referrerName =
    referrer.firstName
      ? referrer.firstName
      : referrer.hrApplication?.fullName?.split(" ")[0] ?? "Un ami";

  const registerUrl = `/auth/register?ref=${upperCode}`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdfaf4 0%, #fffef9 40%, #f8f3e8 100%)" }}>
      {/* Header */}
      <header className="px-6 py-4">
        <Link href="/" className="text-[#3d2900] font-bold text-xl tracking-tight">
          With<span className="text-[#F5C400]">You</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden">

            {/* Top banner */}
            <div className="bg-[#3d2900] px-8 py-8 text-center">
              <div className="w-16 h-16 bg-[#F5C400] rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">
                🎁
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {referrerName} vous invite !
              </h1>
              <p className="text-white/60 text-sm">
                Rejoignez WithYou Learning et commencez à apprendre
              </p>
            </div>

            {/* Body */}
            <div className="px-8 py-7">

              {/* Bonus highlight */}
              <div className="bg-[#FFF3B0] border border-[#F5C400]/40 rounded-2xl p-5 mb-6 text-center">
                <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-1">Votre bonus de bienvenue</p>
                <p className="text-3xl font-bold text-[#5C3D00] mb-1">10 TND offerts</p>
                <p className="text-xs text-[#9B8A6B]">crédités après votre première séance payante</p>
              </div>

              {/* Steps */}
              <div className="space-y-3 mb-7">
                {[
                  { n: "1", text: "Créez votre compte gratuitement" },
                  { n: "2", text: "Trouvez un tuteur et réservez votre première séance" },
                  { n: "3", text: "Recevez automatiquement 10 TND de crédit" },
                ].map((step) => (
                  <div key={step.n} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#F5C400] text-[#5C3D00] font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {step.n}
                    </div>
                    <p className="text-sm text-[#5C3D00]">{step.text}</p>
                  </div>
                ))}
              </div>

              {/* Code display */}
              <div className="flex items-center justify-between bg-[#F7F5F0] rounded-xl px-4 py-3 mb-6">
                <div>
                  <p className="text-xs text-[#9B8A6B] mb-0.5">Code de parrainage</p>
                  <p className="font-bold text-[#3d2900] tracking-widest text-lg">{upperCode}</p>
                </div>
                <svg className="w-5 h-5 text-[#F5C400]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 10l1.293-1.293zm2.586 0l1.293 1.293L12.293 10l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414l1.293-1.293z" clipRule="evenodd" />
                </svg>
              </div>

              {/* CTA */}
              <Link
                href={registerUrl}
                className="block w-full bg-[#F5C400] text-[#5C3D00] font-bold text-center py-4 rounded-2xl hover:bg-[#FFDE59] transition shadow-[0_4px_20px_rgba(245,196,0,0.3)]"
              >
                Créer mon compte gratuitement →
              </Link>

              <p className="text-center text-xs text-[#9B8A6B] mt-4">
                Déjà inscrit ?{" "}
                <Link href={`/auth/login`} className="text-[#C49200] hover:underline font-semibold">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-[#C4BAA8] mt-6">
            Le code sera appliqué automatiquement à votre inscription.
          </p>
        </div>
      </main>
    </div>
  );
}
