import { Suspense } from "react";
import AdminMessagesClient from "./AdminMessagesClient";

export const metadata = { title: "Messages — Admin" };

export default function AdminMessagesPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-[#9B8A6B]">Chargement…</div>}>
      <AdminMessagesClient />
    </Suspense>
  );
}
