import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import StudentsClient from "./StudentsClient";

export const dynamic = "force-dynamic";

export default async function TutorStudentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "TUTOR" && session.user.role !== "ADMIN") redirect("/dashboard");

  // Verify tutor is ACTIVE
  const app = await db.hrApplication.findUnique({
    where: { userId: session.user.id },
    select: { status: true },
  });
  if (app?.status !== "ACTIVE") redirect("/dashboard/tutor");

  // All bookings for this tutor (confirmed or completed)
  const bookings = await db.booking.findMany({
    where: {
      tutorId: session.user.id,
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    select: {
      studentId: true,
      scheduledAt: true,
      status: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          image: true,
          studentProfile: { select: { cefrLevel: true, targetLanguage: true } },
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  // Aggregate per student
  const map = new Map<string, {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
    cefrLevel: string | null;
    targetLanguage: string | null;
    totalSessions: number;
    completedSessions: number;
    lastSessionAt: string | null;
    firstSessionAt: string | null;
  }>();

  for (const b of bookings) {
    const s = b.student;
    if (!map.has(s.id)) {
      map.set(s.id, {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        image: s.image,
        cefrLevel: s.studentProfile?.cefrLevel ?? null,
        targetLanguage: s.studentProfile?.targetLanguage ?? null,
        totalSessions: 0,
        completedSessions: 0,
        lastSessionAt: null,
        firstSessionAt: null,
      });
    }
    const entry = map.get(s.id)!;
    entry.totalSessions++;
    if (b.status === "COMPLETED") {
      entry.completedSessions++;
      const iso = b.scheduledAt.toISOString();
      if (!entry.lastSessionAt || iso > entry.lastSessionAt) entry.lastSessionAt = iso;
      if (!entry.firstSessionAt || iso < entry.firstSessionAt) entry.firstSessionAt = iso;
    }
  }

  // Fetch notes
  const notes = await db.tutorStudentNote.findMany({
    where: { tutorId: session.user.id },
    select: { studentId: true, content: true, updatedAt: true },
  });
  const noteMap = new Map(notes.map((n) => [n.studentId, { content: n.content, updatedAt: n.updatedAt.toISOString() }]));

  const students = Array.from(map.values()).map((s) => ({
    ...s,
    note: noteMap.get(s.id) ?? null,
  }));

  // Sort: completed sessions first (by last session desc), then upcoming-only
  students.sort((a, b) => {
    if (a.completedSessions > 0 && b.completedSessions === 0) return -1;
    if (a.completedSessions === 0 && b.completedSessions > 0) return 1;
    if (a.lastSessionAt && b.lastSessionAt) return b.lastSessionAt.localeCompare(a.lastSessionAt);
    return 0;
  });

  return <StudentsClient initialStudents={students} />;
}
