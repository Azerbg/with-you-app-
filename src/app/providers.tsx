"use client";

import { SessionProvider } from "next-auth/react";
import { CallProvider } from "@/context/CallContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CallProvider>{children}</CallProvider>
    </SessionProvider>
  );
}
