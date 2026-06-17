/**
 * seed-test.mjs — Creates test accounts for local development
 *
 * Run from Windows PowerShell:
 *   $env:DATABASE_URL = "postgresql://postgres:withyou2026@localhost:5444/withyou_dev"
 *   node scripts/seed-test.mjs
 *
 * Accounts created:
 *   STUDENT  → student@test.com  / Test1234!
 *   TUTOR    → tutor@test.com    / Test1234!  (ACTIVE, profile + availability set)
 *   HR       → hr@gmail.com      / HrWithYou2026!
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PASS = await bcrypt.hash("Test1234!", 12);

// ─── helpers ────────────────────────────────────────────────────────────────

async function upsertUser({ email, password, role, firstName, lastName }) {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({
      where: { email },
      data: { role, firstName, lastName, emailVerified: new Date() },
    });
    console.log(`  ↻ updated  ${email}`);
    return existing.id;
  }
  const u = await db.user.create({
    data: { email, password, role, firstName, lastName, emailVerified: new Date() },
  });
  console.log(`  + created  ${email}`);
  return u.id;
}

// ─── HR ─────────────────────────────────────────────────────────────────────

console.log("\n[HR]");
const hrPass = await bcrypt.hash("HrWithYou2026!", 12);
const existingHr = await db.user.findUnique({ where: { email: "hr@gmail.com" } });
if (existingHr) {
  await db.user.update({ where: { email: "hr@gmail.com" }, data: { role: "HR" } });
  console.log("  ↻ updated  hr@gmail.com");
} else {
  await db.user.create({
    data: { email: "hr@gmail.com", password: hrPass, role: "HR", emailVerified: new Date() },
  });
  console.log("  + created  hr@gmail.com");
}

// ─── STUDENT ─────────────────────────────────────────────────────────────────

console.log("\n[STUDENT]");
const studentId = await upsertUser({
  email: "student@test.com",
  password: PASS,
  role: "STUDENT",
  firstName: "Alice",
  lastName: "Dupont",
});

await db.studentProfile.upsert({
  where: { userId: studentId },
  update: {
    onboardingCompleted: true,
    onboardingCompletedAt: new Date(),
    nativeLanguage: "Arabic",
    targetLanguage: "French",
    learningObjective: "CONVERSATIONAL",
    selfReportedLevel: "B1",
    cefrLevel: "B1",
    programTier: "STARTER",
    sessionFrequency: "TWICE",
    programDuration: "ONE_MONTH",
    availabilityDays: ["MON", "WED", "FRI"],
    timeWindowPreference: ["EVENING"],
    country: "Tunisia",
    tutorLanguages: ["French"],
  },
  create: {
    userId: studentId,
    onboardingCompleted: true,
    onboardingCompletedAt: new Date(),
    nativeLanguage: "Arabic",
    targetLanguage: "French",
    learningObjective: "CONVERSATIONAL",
    selfReportedLevel: "B1",
    cefrLevel: "B1",
    programTier: "STARTER",
    sessionFrequency: "TWICE",
    programDuration: "ONE_MONTH",
    availabilityDays: ["MON", "WED", "FRI"],
    timeWindowPreference: ["EVENING"],
    country: "Tunisia",
    tutorLanguages: ["French"],
  },
});
console.log("  ✓ studentProfile set (onboardingCompleted=true)");

// ─── TUTOR ───────────────────────────────────────────────────────────────────

console.log("\n[TUTOR]");
const tutorId = await upsertUser({
  email: "tutor@test.com",
  password: PASS,
  role: "TUTOR",
  firstName: "Yassine",
  lastName: "Ben Ali",
});

// HR Application → ACTIVE
await db.hrApplication.upsert({
  where: { userId: tutorId },
  update: { status: "ACTIVE", fullName: "Yassine Ben Ali" },
  create: {
    userId: tutorId,
    status: "ACTIVE",
    fullName: "Yassine Ben Ali",
    firstName: "Yassine",
    lastName: "Ben Ali",
    languagesTaught: ["French", "English"],
    specializations: ["CONVERSATIONAL", "PROFESSIONAL"],
    certifications: [],
    linguisticCerts: [],
    teachingCerts: [],
    academicDegrees: [],
    availabilityDays: ["MON", "TUE", "WED", "THU", "FRI"],
    timeWindowPreference: ["MORNING", "AFTERNOON", "EVENING"],
    certificateUrls: [],
    attestationUrls: [],
    interviewSlots: [],
  },
});
console.log("  ✓ hrApplication → ACTIVE");

// Tutor Profile
await db.tutorProfile.upsert({
  where: { userId: tutorId },
  update: {
    bio: "Professeur de français expérimenté, spécialisé dans la conversation et le français professionnel. 5 ans d'expérience avec des étudiants internationaux.",
    languagesTaught: ["French", "English"],
    specializations: ["CONVERSATIONAL", "PROFESSIONAL"],
    certifications: ["CELTA"],
    yearsExperience: 5,
    cefrTeachingMin: "A1",
    cefrTeachingMax: "C1",
    verificationTier: "VERIFIED",
    verificationStatus: "VERIFIED",
  },
  create: {
    userId: tutorId,
    bio: "Professeur de français expérimenté, spécialisé dans la conversation et le français professionnel. 5 ans d'expérience avec des étudiants internationaux.",
    languagesTaught: ["French", "English"],
    specializations: ["CONVERSATIONAL", "PROFESSIONAL"],
    certifications: ["CELTA"],
    yearsExperience: 5,
    cefrTeachingMin: "A1",
    cefrTeachingMax: "C1",
    verificationTier: "VERIFIED",
    verificationStatus: "VERIFIED",
  },
});
console.log("  ✓ tutorProfile created");

// Tutor Compensation
await db.tutorCompensation.upsert({
  where: { userId: tutorId },
  update: { hourlyRateTnd: 45, hourlyRateCad: 20, maxWeeklyHours: 20 },
  create: { userId: tutorId, hourlyRateTnd: 45, hourlyRateCad: 20, maxWeeklyHours: 20 },
});
console.log("  ✓ tutorCompensation set");

// Availability: Mon–Fri 14:00–20:00 Tunisia time
const tutorProfile = await db.tutorProfile.findUnique({ where: { userId: tutorId } });
if (tutorProfile) {
  await db.tutorAvailability.deleteMany({ where: { tutorProfileId: tutorProfile.id } });
  await db.tutorAvailability.createMany({
    data: [0, 1, 2, 3, 4].map((day) => ({
      tutorProfileId: tutorProfile.id,
      dayOfWeek: day,
      startTime: "14:00",
      endTime: "20:00",
      isRecurring: true,
    })),
  });
  console.log("  ✓ availability: Mon–Fri 14:00–20:00");
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Test accounts ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STUDENT  student@test.com  /  Test1234!
  TUTOR    tutor@test.com    /  Test1234!
  HR       hr@gmail.com      /  HrWithYou2026!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

await db.$disconnect();
