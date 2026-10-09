"use client";

import { useEffect } from "react";

/** Sets preferred_currency in localStorage from the student's profile on mount.
 *  This syncs the display currency across devices/sessions. */
export default function CurrencyInit({ currency }: { currency: string }) {
  useEffect(() => {
    if (currency && currency !== "TND") {
      localStorage.setItem("preferred_currency", currency);
    }
  }, [currency]);
  return null;
}
