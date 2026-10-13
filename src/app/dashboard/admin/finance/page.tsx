import { cookies } from "next/headers";
import FinanceClient from "./FinanceClient";

export async function generateMetadata() {
  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "fr" ? "fr" : "en";
  return {
    title: lang === "fr" ? "Finance — Admin · WithYou" : "Finance — Admin · WithYou",
  };
}

export default function FinancePage() {
  return <FinanceClient />;
}
