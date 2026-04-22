"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm font-semibold text-[#F5C400] hover:text-[#FFDE59] border border-[#F5C400]/40 px-3 py-1.5 rounded-full hover:border-[#F5C400] transition"
    >
      Log out
    </button>
  );
}
