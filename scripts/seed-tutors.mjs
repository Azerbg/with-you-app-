// scripts/seed-tutors.mjs
// Run from Windows PowerShell in the project root:
//   node scripts/seed-tutors.mjs
//
// Creates 6 fictional ACTIVE tutors with varied profiles to test the matching algorithm.
// Idempotent: skips tutors whose email already exists.
//
// ─── Expected scores for a CONVERSATIONAL French B1 student, available MON–THU ───
//
//   1. Yasmine Ben Salah  ~99  spécialiste conv parfaite, TOP_TUTOR
//   2. Karim Nasri        ~86  TEFL simple + conv, dispo MON/TUE/WED — bat le master grâce à la dispo
//   3. Mehdi Trabelsi     ~85  polyvalent + Master, conv, mais dispo limitée (MON/WED seulement)
//   4. Nadia Ferjani      ~77  nouvelle VERIFIED, 0 avis, conv + pleine dispo MON–VEN
//   5. Salma Gharbi       ~68  docteure, ACADEMIC uniquement, pas de spécialisation conversationnelle
//   6. Omar Khelil        ~68  TOP_TUTOR avec 4.8★ mais enseigne C1–C2 uniquement + pas de conv
//
// Score weights: CEFR 25 | Spec 15 | Rating 20 | Availability 20 | Response 10 | Tier 10

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

// Day index: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
const DOW_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const TUTORS = [
  // ── 1. Yasmine Ben Salah ── spécialiste conversationnelle parfaite ──────────
  // CEFR 25 + Spec 15 + Rating 20 + Avail 20 (4/4) + Response 9 + Tier 10 = ~99
  {
    email: 'yasmine.bensalah@withyou-demo.com',
    firstName: 'Yasmine',
    lastName: 'Ben Salah',
    fullName: 'Yasmine Ben Salah',
    city: 'Tunis',
    bio: "Professeure de français native avec 8 ans d'expérience dans l'enseignement conversationnel. Je travaille avec des apprenants de tous niveaux (A1–C2) pour développer leur aisance à l'oral, leur prononciation et leur expression spontanée. Ancienne enseignante au lycée Sadiki de Tunis, je propose des séances dynamiques basées sur des jeux de rôle, des débats et des situations de la vie réelle. Certifiée CELTA et DALF C1, je m'adapte à chaque profil pour des progrès rapides et durables.",
    languagesTaught: ['French'],
    specializations: ['CONVERSATIONAL'],
    certifications: ['CELTA', 'DALF_C1'],
    linguisticCerts: ['DALF_C1'],
    teachingCerts: ['CELTA'],
    academicDegrees: [],
    yearsExperience: 8,
    cefrTeachingMin: 'A1',
    cefrTeachingMax: 'C2',
    averageRating: 4.9,
    totalReviews: 87,
    verificationTier: 'TOP_TUTOR',
    avgResponseHours: 1.5,
    availabilityDays: [0, 1, 2, 3, 4, 5], // Mon–Sat
  },

  // ── 2. Karim Nasri ── certifié TEFL simple, conv uniquement, A1–B2 ──────────
  // CEFR 25 + Spec 15 + Rating 16 + Avail 15 (3/4) + Response 7 + Tier 8 = ~86
  // Illustre : une spécialisation conv + bonne dispo bat un profil plus diplômé
  {
    email: 'karim.nasri@withyou-demo.com',
    firstName: 'Karim',
    lastName: 'Nasri',
    fullName: 'Karim Nasri',
    city: 'Sousse',
    bio: "Passionné par la transmission du français conversationnel, j'accompagne des apprenants débutants et intermédiaires (A1–B2) depuis 4 ans. Certifié TEFL, je mise sur des échanges naturels, des jeux de rôle et des discussions thématiques pour développer la fluidité à l'oral. Mes séances sont interactives, bienveillantes et adaptées au rythme de chaque apprenant. Disponible en semaine pour des séances régulières.",
    languagesTaught: ['French'],
    specializations: ['CONVERSATIONAL'],
    certifications: ['TEFL'],
    linguisticCerts: [],
    teachingCerts: ['TEFL'],
    academicDegrees: [],
    yearsExperience: 4,
    cefrTeachingMin: 'A1',
    cefrTeachingMax: 'B2',
    averageRating: 4.1,
    totalReviews: 18,
    verificationTier: 'VERIFIED',
    avgResponseHours: 7,
    availabilityDays: [0, 1, 2], // Mon, Tue, Wed
  },

  // ── 3. Mehdi Trabelsi ── polyvalent, Master, conv+pro+exam, dispo limitée ───
  // CEFR 25 + Spec 15 + Rating 18 + Avail 10 (2/4) + Response 9 + Tier 8 = ~85
  // Illustre : master + polyvalence ne compensent pas une dispo insuffisante
  {
    email: 'mehdi.trabelsi@withyou-demo.com',
    firstName: 'Mehdi',
    lastName: 'Trabelsi',
    fullName: 'Mehdi Trabelsi',
    city: 'Sfax',
    bio: "Tuteur polyvalent certifié CELTA et TESOL, titulaire d'un Master en Linguistique Appliquée à l'Université de Sfax. J'enseigne le français et l'anglais aux niveaux A2–C2 avec des spécialisations en expression professionnelle (rédaction de mails, réunions d'affaires), préparation aux examens DELF/DALF, et conversation courante. J'intègre des supports authentiques et des méthodes communicatives pour des résultats concrets.",
    languagesTaught: ['French', 'English'],
    specializations: ['CONVERSATIONAL', 'PROFESSIONAL', 'EXAM_PREP'],
    certifications: ['CELTA', 'TESOL', 'DALF_C1', 'MASTER'],
    linguisticCerts: ['DALF_C1'],
    teachingCerts: ['CELTA', 'TESOL'],
    academicDegrees: ['MASTER'],
    yearsExperience: 5,
    cefrTeachingMin: 'A2',
    cefrTeachingMax: 'C2',
    averageRating: 4.6,
    totalReviews: 42,
    verificationTier: 'VERIFIED',
    avgResponseHours: 3,
    availabilityDays: [0, 2, 4, 5], // Mon, Wed, Fri, Sat
  },

  // ── 4. Nadia Ferjani ── nouvelle VERIFIED, 0 avis, conv + pleine dispo ──────
  // CEFR 25 + Spec 15 + Rating 0 + Avail 20 (4/4) + Response 9 + Tier 8 = ~77
  // Illustre : même avec 0 avis, la spécialisation conv + dispo donnent un bon score
  {
    email: 'nadia.ferjani@withyou-demo.com',
    firstName: 'Nadia',
    lastName: 'Ferjani',
    fullName: 'Nadia Ferjani',
    city: 'Tunis',
    bio: "Jeune professeure de français licenciée en Lettres Francophones à l'Université de la Manouba, je viens d'intégrer la plateforme WithYou. Enthousiaste et disponible du lundi au vendredi, je me spécialise dans le français conversationnel pour tous les niveaux (A1–C2). Je crois en un enseignement chaleureux et sans jugement, où l'erreur fait partie de l'apprentissage. Premiers apprenants bienvenus — séance de découverte offerte à prix réduit !",
    languagesTaught: ['French'],
    specializations: ['CONVERSATIONAL'],
    certifications: ['LICENCE'],
    linguisticCerts: [],
    teachingCerts: [],
    academicDegrees: ['LICENCE'],
    yearsExperience: 1,
    cefrTeachingMin: 'A1',
    cefrTeachingMax: 'C2',
    averageRating: 0,
    totalReviews: 0,
    verificationTier: 'VERIFIED',
    avgResponseHours: 2,
    availabilityDays: [0, 1, 2, 3, 4], // Mon–Fri
  },

  // ── 5. Salma Gharbi ── docteure, ACADEMIC/PROFESSIONAL, pas de conv ────────
  // CEFR 25 + Spec 0 + Rating 17 + Avail 10 (2/4) + Response 8 + Tier 8 = ~68
  // Illustre : diplômes élevés + bonnes notes ne compensent pas l'absence de spé conv
  {
    email: 'salma.gharbi@withyou-demo.com',
    firstName: 'Salma',
    lastName: 'Gharbi',
    fullName: 'Salma Gharbi',
    city: 'Tunis',
    bio: "Docteure en Sciences du Langage et certifiée DELTA, j'enseigne le français académique et professionnel depuis 9 ans, principalement à des étudiants universitaires et des professionnels en reconversion. Je couvre les niveaux B1–C2 et prépare mes apprenants à la rédaction académique, aux présentations professionnelles et aux examens officiels. Mon approche est rigoureuse, structurée et axée sur l'autonomie langagière.",
    languagesTaught: ['French'],
    specializations: ['ACADEMIC', 'PROFESSIONAL'],
    certifications: ['DELTA', 'DOCTORAT'],
    linguisticCerts: [],
    teachingCerts: ['DELTA'],
    academicDegrees: ['DOCTORAT'],
    yearsExperience: 9,
    cefrTeachingMin: 'B1',
    cefrTeachingMax: 'C2',
    averageRating: 4.3,
    totalReviews: 31,
    verificationTier: 'VERIFIED',
    avgResponseHours: 5,
    availabilityDays: [1, 3, 5], // Tue, Thu, Sat
  },

  // ── 6. Omar Khelil ── TOP_TUTOR 4.8★ mais C1–C2 only + pas conv ───────────
  // CEFR 9 (hors range) + Spec 0 + Rating 19 + Avail 20 (4/4) + Response 10 + Tier 10 = ~68
  // Illustre : même le meilleur tuteur se retrouve en bas si son profil ne correspond pas à l'étudiant
  {
    email: 'omar.khelil@withyou-demo.com',
    firstName: 'Omar',
    lastName: 'Khelil',
    fullName: 'Omar Khelil',
    city: 'Tunis',
    bio: "Docteur en Littérature Française et certifié DELTA, je suis préparateur officiel DELF/DALF et TEF/TCF depuis 12 ans. Je me consacre exclusivement aux niveaux avancés C1–C2 et à la préparation intensive aux examens officiels et aux concours de la fonction publique francophone. Mes apprenants obtiennent un taux de réussite de 94 % aux examens. Plus de 150 avis 5 étoiles. Je n'accepte pas les débutants ni les niveaux intermédiaires.",
    languagesTaught: ['French'],
    specializations: ['EXAM_PREP', 'PROFESSIONAL'],
    certifications: ['DELTA', 'DOCTORAT', 'DALF_C2'],
    linguisticCerts: ['DALF_C2'],
    teachingCerts: ['DELTA'],
    academicDegrees: ['DOCTORAT'],
    yearsExperience: 12,
    cefrTeachingMin: 'C1',
    cefrTeachingMax: 'C2',
    averageRating: 4.8,
    totalReviews: 153,
    verificationTier: 'TOP_TUTOR',
    avgResponseHours: 1,
    availabilityDays: [0, 1, 2, 3], // Mon–Thu
  },
];

// ─── Score estimator (mirrors computeMatchScore in src/lib/slots.ts) ─────────
function estimateScore(t, studentCefrIdx = 2, studentDays = [0,1,2,3], studentSpec = 'CONVERSATIONAL') {
  const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const minIdx = CEFR.indexOf(t.cefrTeachingMin);
  const maxIdx = CEFR.indexOf(t.cefrTeachingMax);

  let score = 0;

  // CEFR (25 pts)
  if (studentCefrIdx >= minIdx && studentCefrIdx <= maxIdx) {
    score += 25;
  } else {
    const dist = Math.min(Math.abs(studentCefrIdx - minIdx), Math.abs(studentCefrIdx - maxIdx));
    score += Math.max(0, 25 - dist * 8);
  }

  // Spec (15 pts)
  if (t.specializations.includes(studentSpec)) score += 15;

  // Rating (20 pts)
  score += (t.averageRating / 5) * 20;

  // Availability (20 pts)
  const overlap = t.availabilityDays.filter(d => studentDays.includes(d)).length;
  score += (overlap / studentDays.length) * 20;

  // Response time (10 pts)
  score += Math.max(0, 10 - (t.avgResponseHours / 24) * 10);

  // Verification tier (10 pts)
  if (t.verificationTier === 'TOP_TUTOR') score += 10;
  else if (t.verificationTier === 'VERIFIED') score += 8;

  return Math.round(score);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Seeding demo tutors...\n');
  console.log('Assumed student: French | CONVERSATIONAL | B1 | MON-THU');
  console.log('─'.repeat(60));

  for (const t of TUTORS) {
    const exists = await db.user.findUnique({ where: { email: t.email } });
    if (exists) {
      console.log(`SKIP  ${t.fullName} — already exists`);
      continue;
    }

    // 1. User
    const user = await db.user.create({
      data: {
        email: t.email,
        firstName: t.firstName,
        lastName: t.lastName,
        role: 'TUTOR',
        emailVerified: new Date(),
      },
    });

    // 2. HrApplication (ACTIVE — required for marketplace visibility)
    await db.hrApplication.create({
      data: {
        userId: user.id,
        status: 'ACTIVE',
        fullName: t.fullName,
        firstName: t.firstName,
        lastName: t.lastName,
        city: t.city,
        country: 'TN',
        languagesTaught: t.languagesTaught,
        specializations: t.specializations,
        certifications: t.certifications,
        linguisticCerts: t.linguisticCerts,
        teachingCerts: t.teachingCerts,
        academicDegrees: t.academicDegrees,
        yearsExperience: t.yearsExperience,
        bio: t.bio,
        activatedAt: new Date(),
        emailVerified: true,
        certificateUrls: [],
        attestationUrls: [],
        interviewSlots: [],
        availabilityDays: t.availabilityDays.map(d => DOW_NAMES[d]),
        timeWindowPreference: ['MORNING', 'AFTERNOON', 'EVENING'],
      },
    });

    // 3. TutorProfile (verificationStatus VERIFIED — required for marketplace visibility)
    const profile = await db.tutorProfile.create({
      data: {
        userId: user.id,
        bio: t.bio,
        city: t.city,
        languagesTaught: t.languagesTaught,
        specializations: t.specializations,
        certifications: t.certifications,
        yearsExperience: t.yearsExperience,
        cefrTeachingMin: t.cefrTeachingMin,
        cefrTeachingMax: t.cefrTeachingMax,
        averageRating: t.averageRating,
        totalReviews: t.totalReviews,
        verificationTier: t.verificationTier,
        verificationStatus: 'VERIFIED',
        avgResponseHours: t.avgResponseHours,
        maxWeeklyHours: 20,
      },
    });

    // 4. TutorCompensation
    await db.tutorCompensation.create({
      data: {
        userId: user.id,
        hourlyRateTnd: 45,
        currencyPref: 'TND',
        maxWeeklyHours: 20,
      },
    });

    // 5. TutorAvailability (recurring weekly slots 09:00–20:00 Tunisia time)
    await db.tutorAvailability.createMany({
      data: t.availabilityDays.map(dow => ({
        tutorProfileId: profile.id,
        dayOfWeek: dow,
        startTime: '09:00',
        endTime: '20:00',
        isRecurring: true,
      })),
    });

    const score = estimateScore(t);
    console.log(`OK    ${t.fullName.padEnd(22)} score ~${score}  (${t.verificationTier}, ${t.cefrTeachingMin}-${t.cefrTeachingMax}, spec: [${t.specializations.join(', ')}])`);
  }

  console.log('─'.repeat(60));
  console.log('\nDone. Go to /find-tutors while logged in as your student account.');
  console.log('You should see tutors sorted by match score descending.\n');
}

main()
  .catch(e => { console.error('\nError:', e.message); process.exit(1); })
  .finally(() => db.$disconnect());
