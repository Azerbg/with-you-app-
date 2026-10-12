import { Suspense } from "react";
import { cookies } from "next/headers";
import DisputesClient from "./DisputesClient";

export async function generateMetadata() {
  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "fr" ? "fr" : "en";
  return { title: lang === "fr" ? "Litiges — Admin" : "Disputes — Admin" };
}

export default function AdminDisputesPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-[#9B8A6B]">Chargement…</div>}>
      <DisputesClient />
    </Suspense>
  );
}
