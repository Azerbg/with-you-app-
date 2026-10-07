"use client";

import { signOut } from "next-auth/react";

interface Props {
  className?: string;
  children: React.ReactNode;
}

export default function SignOutButton({ className, children }: Props) {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })} className={className}>
      {children}
    </button>
  );
}
