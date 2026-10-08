import Link from "next/link";

export const metadata = { title: "Help – WithYou" };

const TOPICS = [
  {
    q: "My camera or microphone isn't working",
    a: "Make sure you've granted camera and microphone permission in your browser settings. In Chrome: click the lock icon in the address bar → Site settings → allow Camera and Microphone.",
  },
  {
    q: "The background blur / virtual background isn't loading",
    a: "Background effects require a modern browser (Chrome 90+, Edge 90+, Firefox 110+) and a device with reasonable CPU. If the effect never appears, try refreshing the page. Safari is not supported for background effects.",
  },
  {
    q: "My session disconnected mid-call",
    a: "Check your internet connection. If the issue persists, rejoin the room — your tutor will still be there. Sessions are automatically marked completed once the scheduled time has passed.",
  },
  {
    q: "I was charged but my booking shows Pending",
    a: "Payments can take up to a few minutes to confirm. Refresh your sessions page. If the status hasn't updated after 10 minutes, contact support.",
  },
  {
    q: "How do I cancel a session?",
    a: "Go to Sessions → find the upcoming booking → Cancel. Cancellation policy: >24 h before start = full refund; 12–24 h = credit; <12 h = no refund.",
  },
  {
    q: "I need to report a problem or request account changes",
    a: "Email us at support@withyou.com and we'll get back to you within 24 hours.",
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#F7F5F0] py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#9B8A6B] hover:text-[#5C3D00] transition">← WithYou</Link>
          <h1 className="text-3xl font-bold text-[#2D1A00] mt-4">Help Center</h1>
          <p className="text-[#6B5E44] mt-1">Answers to common questions</p>
        </div>

        <div className="space-y-4">
          {TOPICS.map((item) => (
            <div key={item.q} className="bg-white rounded-2xl border border-black/5 p-6">
              <p className="font-bold text-[#2D1A00] mb-2">{item.q}</p>
              <p className="text-sm text-[#6B5E44] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-[#FFF3B0] border border-[#F5C400]/40 rounded-2xl px-6 py-5 text-center">
          <p className="text-sm font-semibold text-[#5C3D00]">Still need help?</p>
          <p className="text-xs text-[#6B5E44] mt-1">
            Email us at{" "}
            <a href="mailto:support@withyou.com" className="font-bold underline">support@withyou.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
