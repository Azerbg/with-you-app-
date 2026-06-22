import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import FindTutorsClient from "./FindTutorsClient";

export const metadata: Metadata = {
  title: "Trouver un tuteur — WithYou",
  description: "Trouvez le tuteur idéal pour apprendre le français ou l'anglais avec WithYou.",
};

export const dynamic = "force-dynamic";

export default async function FindTutorsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; spec?: string; cefr?: string }>;
}) {
  const session = await auth();
  let studentCefrLevel: string | null = null;

  if (session?.user?.role === "STUDENT") {
    const profile = await db.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { cefrLevel: true },
    });
    studentCefrLevel = profile?.cefrLevel ?? null;
  }

  return (
    <>
      {/* A — Satisfaction guarantee banner */}
      <div className="bg-[#5C3D00] text-white px-6 py-3">
        <p className="text-sm text-center max-w-3xl mx-auto">
          <span className="font-bold text-[#F5C400]">Satisfait ou Reessaye</span>
          {" "}— Si votre premiere seance ne vous convient pas, essayez un autre tuteur{" "}
          <span className="font-semibold">gratuitement</span>, autant de fois que necessaire jusqu&apos;a trouver le bon.
        </p>
      </div>

      <FindTutorsClient
        searchParamsPromise={searchParams}
        studentCefrLevel={studentCefrLevel}
      />
    </>
  );
}
