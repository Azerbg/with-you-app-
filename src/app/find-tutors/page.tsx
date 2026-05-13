import type { Metadata } from "next";
import FindTutorsClient from "./FindTutorsClient";

export const metadata: Metadata = {
  title: "Trouver un tuteur — WithYou",
  description: "Trouvez le tuteur idéal pour apprendre le français ou l'anglais avec WithYou.",
};

export default function FindTutorsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; spec?: string; cefr?: string }>;
}) {
  return <FindTutorsClient searchParamsPromise={searchParams} />;
}
