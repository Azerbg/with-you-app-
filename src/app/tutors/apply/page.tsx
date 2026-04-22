import type { Metadata } from "next";
import TutorApplyWizard from "./TutorApplyWizard";

export const metadata: Metadata = {
  title: "Devenir tuteur · WithYou",
  description: "Rejoignez WithYou en tant que tuteur et enseignez le français ou l'anglais à des apprenants du monde entier.",
};

export default function TutorApplyPage() {
  return <TutorApplyWizard />;
}
