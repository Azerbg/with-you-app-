import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
        <p className="text-gray-500 mb-6">You don&apos;t have permission to access this page.</p>
        <Link
          href="/dashboard"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
