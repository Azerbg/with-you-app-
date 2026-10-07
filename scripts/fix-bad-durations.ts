/**
 * One-off script: fix bookings with invalid durationMins (< 15 or > 240).
 * Run once: npx tsx scripts/fix-bad-durations.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const bad = await db.booking.findMany({
    where: { OR: [{ durationMins: { lt: 15 } }, { durationMins: { gt: 240 } }] },
    select: { id: true, durationMins: true, sessionType: true },
  });

  if (bad.length === 0) {
    console.log("No bad records found.");
    return;
  }

  console.log(`Fixing ${bad.length} booking(s) with invalid duration:`);
  for (const b of bad) {
    const fixed = b.sessionType === "SINGLE" ? 50 : 30;
    console.log(`  ${b.id}: ${b.durationMins} min → ${fixed} min`);
    await db.booking.update({ where: { id: b.id }, data: { durationMins: fixed } });
  }
  console.log("Done.");
}

main().finally(() => db.$disconnect());
