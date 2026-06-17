"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ContactButton({ tutorUserId }: { tutorUserId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleContact() {
    setLoading(true);
    try {
      const res = await fetch("/api/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId: tutorUserId }),
      });
      if (res.ok) {
        router.push("/dashboard/student/messages");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleContact}
      disabled={loading}
      className="flex-1 text-center text-xs font-bold border-2 border-[#5C3D00]/20 text-[#5C3D00] rounded-full py-2 hover:border-[#5C3D00] hover:bg-[#5C3D00] hover:text-white transition disabled:opacity-50"
    >
      {loading ? "…" : "Contacter"}
    </button>
  );
}
