import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const { role, email, id } = session.user;

  // Role-based redirects
  if (role === "STUDENT") redirect("/dashboard/student");
  if (role === "TUTOR") redirect("/dashboard/tutor");
  if (role === "HR") redirect("/console/hr");
  if (role === "ADMIN") redirect("/dashboard/admin");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <p className="text-gray-500 mb-6">Welcome back!</p>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-700">ID:</span>{" "}
            <span className="text-gray-500">{id}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Email:</span>{" "}
            <span className="text-gray-500">{email}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Role:</span>{" "}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {role}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
