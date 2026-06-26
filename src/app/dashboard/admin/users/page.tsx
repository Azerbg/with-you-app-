import { Suspense } from "react";
import UsersClient from "./UsersClient";

export const metadata = { title: "Utilisateurs — Admin" };

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-[#9B8A6B]">Chargement…</div>}>
      <UsersClient />
    </Suspense>
  );
}
