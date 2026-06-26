import { Suspense } from "react";
import BookingsClient from "./BookingsClient";

export const metadata = { title: "Réservations — Admin" };

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-[#9B8A6B]">Chargement…</div>}>
      <BookingsClient />
    </Suspense>
  );
}
