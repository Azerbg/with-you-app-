/**
 * cleanup-demo.mjs
 *
 * One-time pre-launch cleanup. Run once before going live:
 *   node scripts/cleanup-demo.mjs
 *
 * What it does:
 *  1. Deletes all Review rows where the student OR tutor has a @withyou-demo.com email.
 *  2. Resets averageRating and totalReviews on every TutorProfile to reflect only the
 *     remaining published reviews (should be 0 for demo tutors after step 1).
 *
 * Safe to run multiple times (idempotent after first run).
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // ── 1. Collect all demo user IDs ────────────────────────────────────────────
  const demoUsers = await db.user.findMany({
    where: { email: { endsWith: "@withyou-demo.com" } },
    select: { id: true, email: true },
  });

  if (demoUsers.length === 0) {
    console.log("[cleanup-demo] No @withyou-demo.com users found — nothing to clean.");
    await db.$disconnect();
    return;
  }

  const demoIds = demoUsers.map((u) => u.id);
  console.log(`[cleanup-demo] Found ${demoUsers.length} demo user(s): ${demoUsers.map((u) => u.email).join(", ")}`);

  // ── 2. Delete reviews authored by or targeting demo users ─────────────────
  const deleted = await db.review.deleteMany({
    where: { OR: [{ studentId: { in: demoIds } }, { tutorId: { in: demoIds } }] },
  });
  console.log(`[cleanup-demo] Deleted ${deleted.count} review(s) linked to demo users.`);

  // ── 3. Recompute averageRating / totalReviews for every tutor ─────────────
  //    (Not just demo tutors — ensures all stats are consistent.)
  const allProfiles = await db.tutorProfile.findMany({ select: { userId: true } });

  let updated = 0;
  for (const { userId } of allProfiles) {
    const reviews = await db.review.findMany({
      where: {
        tutorId: userId,
        isPublished: true,
        booking: { status: "COMPLETED" },
      },
      select: { ratingComposite: true },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((s, r) => s + r.ratingComposite, 0) / totalReviews
        : 0;

    await db.tutorProfile.update({
      where: { userId },
      data: { totalReviews, averageRating },
    });
    updated++;
  }

  console.log(`[cleanup-demo] Recomputed ratings for ${updated} tutor profile(s).`);
  console.log("[cleanup-demo] Done.");
}

main()
  .catch((err) => {
    console.error("[cleanup-demo]", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
