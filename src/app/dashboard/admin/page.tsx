import { cookies } from "next/headers";
import OverviewClient from "./OverviewClient";

export async function generateMetadata() {
  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "fr" ? "fr" : "en";
  return { title: lang === "fr" ? "Vue d'ensemble — Admin" : "Overview — Admin" };
}

export default function AdminOverviewPage() {
  return <OverviewClient />;
}
