import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import TutorSettingsClient from "./TutorSettingsClient";

export default async function TutorSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "TUTOR") redirect("/dashboard");

  const [app, user, profile] = await Promise.all([
    db.hrApplication.findUnique({
      where: { userId: session.user.id },
      select: { status: true, fullName: true, phone: true, city: true, country: true },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, password: true },
    }),
    db.tutorProfile.findUnique({
      where: { userId: session.user.id },
      select: { isHidden: true },
    }),
  ]);

  if (app?.status !== "ACTIVE") redirect("/dashboard/tutor");

  return (
    <TutorSettingsClient
      email={user?.email ?? ""}
      hasPassword={!!user?.password}
      isHidden={profile?.isHidden ?? false}
      contact={{
        fullName: app?.fullName ?? "",
        phone: app?.phone ?? null,
        city: app?.city ?? null,
        country: app?.country ?? null,
      }}
    />
  );
}
