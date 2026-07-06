import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Find a student user
  const student = await db.user.findFirst({
    where: { role: "STUDENT" },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!student) {
    console.error("No STUDENT user found. Register a student account first.");
    process.exit(1);
  }

  // Find an active tutor
  const tutor = await db.user.findFirst({
    where: {
      role: "TUTOR",
      hrApplication: { status: "ACTIVE" },
    },
    select: { id: true, email: true, hrApplication: { select: { fullName: true } } },
  });

  if (!tutor) {
    console.error("No ACTIVE tutor found. Complete the HR flow to activate a tutor first.");
    process.exit(1);
  }

  // Schedule session for right now so the "Rejoindre" button appears immediately
  const scheduledAt = new Date();

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

  console.log("\n✅ Test booking created!");
  console.log("─────────────────────────────────────────");
  console.log("Booking ID  :", booking.id);
  console.log("Student     :", student.firstName ?? student.email, "(", student.id, ")");
  console.log("Tutor       :", tutor.hrApplication?.fullName ?? tutor.email, "(", tutor.id, ")");
  console.log("Scheduled   :", scheduledAt.toLocaleString());
  console.log("─────────────────────────────────────────");
  console.log("Classroom URL: http://localhost:3000/classroom/" + booking.id);
  console.log("");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
