import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const email = "hr@gmail.com";
  const password = "HrWithYou2026!";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({
      where: { email },
      data: { role: "HR" },
    });
    console.log("✅ User already exists — role updated to HR");
    return;
  }

  await db.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 12),
      role: "HR",
      emailVerified: new Date(),
    },
  });

  console.log("✅ HR user created:");
  console.log("   Email:    hr@gmail.com");
  console.log("   Password: HrWithYou2026!");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
