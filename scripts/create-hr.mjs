import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const email = "hr@gmail.com";
const password = "HrWithYou2026!";

const existing = await db.user.findUnique({ where: { email } });

if (existing) {
  await db.user.update({ where: { email }, data: { role: "HR" } });
  console.log("✅ Role updated to HR for", email);
} else {
  await db.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 12),
      role: "HR",
      emailVerified: new Date(),
    },
  });
  console.log("✅ HR user created — Email: hr@gmail.com | Password: HrWithYou2026!");
}

await db.$disconnect();
