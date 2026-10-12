import { Suspense } from "react";
import { cookies } from "next/headers";
import UsersClient from "./UsersClient";

export async function generateMetadata() {
  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "fr" ? "fr" : "en";
  return { title: lang === "fr" ? "Utilisateurs — Admin" : "Users — Admin" };
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-[#9B8A6B]">Chargement…</div>}>
      <UsersClient />
    </Suspense>
  );
}
