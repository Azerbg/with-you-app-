import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#FDFAF4] flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center py-24">
        <div className="w-14 h-14 bg-[#F5C400] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="#5C3D00" strokeWidth="2" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[#2D1A00] mb-4">Contact us</h1>
        <p className="text-[#6B5E44] mb-2 leading-relaxed">
          Have a question or need help? Reach us at:
        </p>
        <a href="mailto:support@withyou.app" className="text-[#5C3D00] font-bold hover:underline text-lg">
          support@withyou.app
        </a>
        <div className="mt-8">
          <Link href="/" className="inline-block bg-[#F5C400] text-[#5C3D00] px-6 py-3 rounded-full font-bold hover:bg-[#FFDE59] transition">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
