import { cookies } from "next/headers";
import ReferralClient from "./ReferralClient";

export async function generateMetadata() {
  const lang = (await cookies()).get("wy_lang")?.value === "en" ? "en" : "fr";
  return {
    title: lang === "en" ? "Referral — WithYou" : "Parrainage — WithYou",
  };
}

export default function StudentReferralPage() {
  return <ReferralClient />;
}
