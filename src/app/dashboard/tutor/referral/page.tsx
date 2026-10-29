import { cookies } from "next/headers";
import ReferralClient from "@/app/dashboard/student/referral/ReferralClient";

export async function generateMetadata() {
  const lang = (await cookies()).get("wy_lang")?.value === "en" ? "en" : "fr";
  return {
    title: lang === "en" ? "Referral — WithYou" : "Parrainage — WithYou",
  };
}

// Tutor earnings and referral rewards are always displayed in TND
export default function TutorReferralPage() {
  return <ReferralClient overrideZoneCode="TND" />;
}
