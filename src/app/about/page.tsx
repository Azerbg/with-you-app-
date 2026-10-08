import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#FDFAF4] flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center py-24">
        <div className="w-14 h-14 bg-[#F5C400] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
            <path d="M5 6l4.5 8 2.5-4.5L14.5 14 19 6" stroke="#5C3D00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[#2D1A00] mb-4">About WithYou</h1>
        <p className="text-[#6B5E44] mb-8 leading-relaxed">
          WithYou connects learners with verified expert tutors for live 1-on-1 language sessions.
          We believe language learning works best when it&apos;s personal, structured, and consistent.
        </p>
        <Link href="/" className="inline-block bg-[#F5C400] text-[#5C3D00] px-6 py-3 rounded-full font-bold hover:bg-[#FFDE59] transition">
          Back to home
        </Link>
      </div>
    </main>
  );
}
