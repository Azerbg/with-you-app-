/**
 * seed-booking.mjs — Crée une réservation CONFIRMED entre les comptes de test
 * pour pouvoir tester la session vidéo live à tout moment.
 *
 * Run from Windows PowerShell:
 *   $env:DATABASE_URL = "postgresql://postgres:withyou2026@localhost:5444/withyou_dev"
 *   node scripts/seed-booking.mjs
 *
 * Comptes utilisés :
 *   STUDENT  → student@test.com
 *   TUTOR    → tutor@test.com
 *
 * La session est planifiée dans 5 minutes (rejoignable immédiatement).
 * Le script peut être relancé à tout moment — il crée une nouvelle réservation à chaque fois.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const student = await db.user.findUnique({ where: { email: "student@test.com" } });
const tutor   = await db.user.findUnique({ where: { email: "tutor@test.com" } });

if (!student) {
  console.error("❌ student@test.com introuvable — lance d'abord: node scripts/seed-test.mjs");
  process.exit(1);
}
if (!tutor) {
  console.error("❌ tutor@test.com introuvable — lance d'abord: node scripts/seed-test.mjs");
  process.exit(1);
}

// Planifié dans 5 minutes pour être rejoignable immédiatement
const scheduledAt = new Date(Date.now() + 5 * 60 * 1000);

const booking = await db.booking.create({
  data: {
    studentId:        student.id,
    tutorId:          tutor.id,
    sessionType:      "DISCOVERY",
    status:           "CONFIRMED",
    durationMins:     30,
    scheduledAt,
    studentPriceUsd:  0,
    tutorPayoutAmount: 0,
    platformMargin:   0,
  },
});

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Réservation créée avec succès ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ID          : ${booking.id}
  Status      : CONFIRMED
  Planifiée à : ${scheduledAt.toLocaleString("fr-FR")} (dans 5 min)
  Durée       : 30 min

  Liens de test :
  ÉTUDIANT → /classroom/${booking.id}  (student@test.com)
  TUTEUR   → /classroom/${booking.id}  (tutor@test.com)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

await db.$disconnect();
