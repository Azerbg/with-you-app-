import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const students = await db.user.findMany({
    where: { role: "STUDENT", studentProfile: { onboardingCompleted: true } },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  const tutors = await db.user.findMany({
    where: { role: "TUTOR", hrApplication: { status: "ACTIVE" } },
    select: { id: true, email: true, hrApplication: { select: { fullName: true } } },
  });

  console.log(`\nFound ${students.length} student(s) and ${tutors.length} active tutor(s)\n`);

  if (students.length === 0) { console.error("No students found."); process.exit(1); }
  if (tutors.length === 0)   { console.error("No ACTIVE tutors found."); process.exit(1); }

  const student = students[0];
  const tutor   = tutors[0];

  // Delete any old test bookings for this pair to start clean
  await db.booking.deleteMany({
    where: {
      studentId: student.id,
      tutorId: tutor.id,
      stripePaymentIntentId: { startsWith: "pi_test_" },
    },
  });

  // Schedule 10 minutes from now — gives time to open the app and join
  const scheduledAt = new Date(Date.now() + 10 * 60 * 1000);

  const booking = await db.booking.create({
    data: {
      studentId: student.id,
      tutorId: tutor.id,
      sessionType: "DISCOVERY",
      status: "CONFIRMED",
      durationMins: 30,
      scheduledAt,
      studentPriceUsd: 15,
      studentCurrency: "USD",
      stripePaymentIntentId: "pi_test_" + Date.now(),
    },
  });

  const tutorName   = tutor.hrApplication?.fullName ?? tutor.email;
  const studentName = student.firstName
    ? `${student.firstName} ${student.lastName ?? ""}`.trim()
    : student.email;

  console.log("✅ Test booking created!");
  console.log("─────────────────────────────────────────────────────");
  console.log("Booking ID  :", booking.id);
  console.log("Student     :", studentName, `(${student.email})`);
  console.log("Tutor       :", tutorName,   `(${tutor.email})`);
  console.log("Scheduled   :", scheduledAt.toLocaleString(), "(dans 10 min)");
  console.log("─────────────────────────────────────────────────────");
  console.log("\n🔗 Classroom — accès direct (pas besoin d'attendre) :");
  console.log("  Production : https://with-you-app-red.vercel.app/classroom/" + booking.id);
  console.log("  Local      : http://localhost:3000/classroom/" + booking.id);
  console.log("\nConnectez-vous en tant que :");
  console.log("  Étudiant : " + student.email);
  console.log("  Tuteur   : " + tutor.email);
  console.log("");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
