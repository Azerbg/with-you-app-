import { Suspense } from "react";
import DisputesClient from "./DisputesClient";

export const metadata = { title: "Litiges — Admin" };

export default function AdminDisputesPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-[#9B8A6B]">Chargement…</div>}>
      <DisputesClient />
    </Suspense>
  );
}
