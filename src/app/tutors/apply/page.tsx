import type { Metadata } from "next";
import { cookies } from "next/headers";
import TutorApplyWizard from "./TutorApplyWizard";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "en" ? "en" : "fr";
  return lang === "en"
    ? { title: "Become a tutor · WithYou", description: "Join WithYou as a tutor and teach French or English to learners worldwide." }
    : { title: "Devenir tuteur · WithYou", description: "Rejoignez WithYou en tant que tuteur et enseignez le français ou l'anglais à des apprenants du monde entier." };
}

export default function TutorApplyPage() {
  return <TutorApplyWizard />;
}
