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
    bio: "Bonjour ! Je m'appelle Yasmine et j'enseigne le français depuis 8 ans — mais pour moi, chaque séance est bien plus qu'un cours : c'est une vraie conversation.\n\nJ'ai accompagné des centaines d'apprenants de A1 à C2 : des étudiants qui voulaient décrocher un stage à Paris, des professionnels qui préparaient une réunion en français, des passionnés qui rêvaient simplement de regarder des films sans sous-titres. Ce qui me motive ? Voir le moment où vous commencez à vous exprimer sans chercher vos mots.\n\nMes séances sont dynamiques et concrètes : jeux de rôle, simulations de la vie réelle, débats sur des sujets qui vous intéressent vraiment. Pas de manuel ennuyeux — on part de votre quotidien. Certifiée CELTA et DALF C1, j'adapte chaque séance à votre rythme et à vos objectifs.\n\nRéservez une séance de découverte et voyons ensemble comment vous faire progresser.",
    languagesTaught: ['Arabic', 'French'],
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
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
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
    bio: "Salut ! Je suis Karim, et je pense que la plus grande erreur en apprentissage des langues, c'est d'attendre d'être « prêt » pour parler. Chez moi, on parle dès la première minute.\n\nDepuis 4 ans, j'accompagne des débutants et des apprenants intermédiaires (A1–B2) qui veulent se sentir à l'aise à l'oral — pas réciter des conjugaisons par cœur. Mes séances sont détendues, bienveillantes, et axées sur des situations réelles : commander au restaurant, appeler un service client, raconter votre weekend.\n\nJe suis certifié TEFL et j'ai une règle d'or : on ne juge pas les erreurs, on les transforme en apprentissage. Beaucoup de mes apprenants me disent qu'ils n'avaient jamais osé parler français avant nos séances — et maintenant ils ne s'arrêtent plus.\n\nSi vous êtes débutant ou si vous avez des bases mais manquez de confiance, on va très bien s'entendre. À bientôt !",
    languagesTaught: ['Arabic', 'French'],
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
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
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
    bio: "Bonjour, je suis Mehdi — linguiste de formation, tuteur par vocation.\n\nAprès un Master en Linguistique Appliquée et les certifications CELTA et TESOL, j'ai appris une chose essentielle : la grammaire parfaite ne sert à rien si vous ne pouvez pas tenir une vraie conversation. C'est pourquoi mes séances combinent toujours structure solide et pratique authentique.\n\nJ'enseigne le français et l'anglais aux niveaux A2–C2, avec une vraie spécialisation en communication professionnelle. J'aide des commerciaux à préparer leurs appels en français, des managers à rédiger leurs rapports sans fautes, et des candidats à décrocher des postes dans des entreprises francophones. J'accompagne aussi des étudiants pour le DELF et le DALF.\n\nChaque apprenant est différent — j'adapte toujours le contenu à vos objectifs concrets. Pas de méthode générique : on construit ensemble un plan de progression qui vous ressemble.\n\nCurieux de voir comment on peut travailler ensemble ? Réservez une séance de découverte.",
    languagesTaught: ['Arabic', 'French', 'English'],
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
    photo: 'https://randomuser.me/api/portraits/men/75.jpg',
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
    bio: "Je m'appelle Nadia, et j'ai une conviction profonde : tout le monde peut parler français couramment — il faut juste le bon environnement pour oser.\n\nDiplômée en Lettres Francophones, j'ai passé mes années d'études à observer ce qui bloque les apprenants : la peur du jugement, la honte de faire des erreurs, l'impression de ne jamais progresser assez vite. Dans mes séances, il n'y a aucun jugement — seulement de la curiosité, de la bienveillance, et beaucoup de pratique.\n\nJe travaille avec tous les niveaux, de A1 à C2. Que vous partiez de zéro ou que vous ayez des bases mais manquiez de fluidité, on trouvera ensemble le rythme qui vous correspond. Mes séances sont disponibles du lundi au vendredi, avec une grande flexibilité horaire.\n\nJe viens tout juste de rejoindre WithYou, et je suis impatiente de rencontrer mes premiers apprenants. Si vous cherchez quelqu'un de disponible, attentif et vraiment motivé à vous voir progresser — je suis là.",
    languagesTaught: ['Arabic', 'French'],
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
    photo: 'https://randomuser.me/api/portraits/women/68.jpg',
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
    bio: "Bonjour, je suis Salma — Docteure en Sciences du Langage, certifiée DELTA, et passionnée par la précision du français écrit et oral.\n\nDepuis 9 ans, j'accompagne des étudiants en master et des professionnels qui ont besoin d'un français irréprochable : chercheurs qui rédigent des articles scientifiques, ingénieurs qui présentent leurs travaux à des comités francophones, juristes qui négocient des contrats en français. Mon domaine, c'est le français de haut niveau — B1 à C2.\n\nMes séances sont structurées, exigeantes, et toujours orientées vers un objectif concret. Je ne survole pas : on creuse, on analyse, on comprend pourquoi une formulation est plus juste qu'une autre. Mes apprenants repartent non seulement avec moins d'erreurs, mais avec une vraie compréhension des mécanismes de la langue.\n\nSi vous avez des ambitions élevées — un concours, une publication, un poste dans une organisation internationale — c'est ici que ça se passe.",
    languagesTaught: ['Arabic', 'French'],
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
    photo: 'https://randomuser.me/api/portraits/women/26.jpg',
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
    bio: "12 ans. 94 % de taux de réussite. Plus de 150 apprenants certifiés DALF, TEF ou DELF. Ce ne sont pas juste des chiffres — c'est la preuve que la méthode fonctionne.\n\nJe suis Omar, Docteur en Littérature Française et certifié DELTA. Je travaille exclusivement avec des apprenants de niveau C1 et C2 qui ont un objectif précis : décrocher une certification officielle, intégrer une école française, postuler à la fonction publique francophone, ou atteindre un niveau d'excellence dans leur vie professionnelle.\n\nMa méthode est intensive et chirurgicale. On ne perd pas de temps sur ce que vous savez déjà : on identifie exactement ce qui va faire la différence à l'examen, et on travaille dessus jusqu'à ce que ce soit maîtrisé. Productions écrites, compréhension orale, expression spontanée — on couvre tout ce que les examinateurs attendent.\n\nJe suis sélectif sur les profils que j'accepte, parce que je m'engage sur les résultats. Si vous êtes sérieux, motivé, et prêt à travailler — réservez une séance et voyons si on est fait pour travailler ensemble.",
    languagesTaught: ['Arabic', 'French'],
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
    photo: 'https://randomuser.me/api/portraits/men/55.jpg',
  },
];

// ─── Demo reviewer students ───────────────────────────────────────────────────
const DEMO_REVIEWERS = [
  { email: 'marie.kowalski@withyou-demo.com',  firstName: 'Marie',  lastName: 'Kowalski' },
  { email: 'sami.belhaj@withyou-demo.com',     firstName: 'Sami',   lastName: 'Belhaj'   },
  { email: 'leila.hamdi@withyou-demo.com',     firstName: 'Leila',  lastName: 'Hamdi'    },
  { email: 'thomas.vidal@withyou-demo.com',    firstName: 'Thomas', lastName: 'Vidal'    },
  { email: 'amal.chatti@withyou-demo.com',     firstName: 'Amal',   lastName: 'Chatti'   },
];

// comm / struct / acc / val → ratingComposite = avg
const TUTOR_REVIEWS = {
  'yasmine.bensalah@withyou-demo.com': [
    { reviewer: 'marie.kowalski@withyou-demo.com', comm:5,struct:5,acc:5,val:5, text:"Yasmine est une professeure exceptionnelle ! Ses séances sont vivantes, rythmées et toujours adaptées à mon niveau. En deux mois, ma confiance à l'oral a explosé. Je recommande à 100 %.", daysAgo: 10 },
    { reviewer: 'sami.belhaj@withyou-demo.com',    comm:5,struct:5,acc:5,val:5, text:"Chaque séance est un plaisir. Elle sait exactement comment corriger sans décourager. Mon accent s'est vraiment amélioré depuis que je travaille avec elle.", daysAgo: 25 },
    { reviewer: 'leila.hamdi@withyou-demo.com',    comm:5,struct:5,acc:5,val:5, text:"Très professionnelle et à l'écoute. Elle prépare chaque séance avec soin et me donne des exercices pratiques à faire entre les cours. Excellent suivi !", daysAgo: 40 },
    { reviewer: 'thomas.vidal@withyou-demo.com',   comm:5,struct:5,acc:5,val:5, text:"La meilleure professeure que j'ai eue pour le français conversationnel. Patiente, dynamique et très pédagogue. Je progresse à chaque séance.", daysAgo: 60 },
    { reviewer: 'amal.chatti@withyou-demo.com',    comm:5,struct:5,acc:5,val:4, text:"Super expérience ! Yasmine rend le français vivant et accessible. Je me sens beaucoup plus à l'aise pour parler maintenant.", daysAgo: 80 },
  ],
  'omar.khelil@withyou-demo.com': [
    { reviewer: 'marie.kowalski@withyou-demo.com', comm:5,struct:5,acc:5,val:5, text:"Omar est brillant. Grâce à lui, j'ai obtenu mon DALF C1 du premier coup. Méthode rigoureuse et parfaitement adaptée aux attentes des examinateurs.", daysAgo: 12 },
    { reviewer: 'sami.belhaj@withyou-demo.com',    comm:5,struct:5,acc:5,val:5, text:"Préparation DALF de très haute qualité. Omar connaît parfaitement les attendus officiels. Je me suis senti pleinement préparé le jour J.", daysAgo: 30 },
    { reviewer: 'leila.hamdi@withyou-demo.com',    comm:5,struct:5,acc:4,val:5, text:"Très rigoureux et exigeant — exactement ce dont j'avais besoin. Les corrections sont précises et les explications limpides. Tuteur de haut niveau.", daysAgo: 55 },
    { reviewer: 'thomas.vidal@withyou-demo.com',   comm:5,struct:5,acc:5,val:5, text:"Omar a transformé ma façon d'aborder les examens. Grâce à ses techniques, j'ai gagné confiance et méthode. Indispensable pour la préparation TEF/DALF.", daysAgo: 75 },
    { reviewer: 'amal.chatti@withyou-demo.com',    comm:5,struct:5,acc:5,val:4, text:"Excellent pour les niveaux avancés. Il pousse vraiment à se surpasser. Si vous visez C1 ou C2, c'est le tuteur qu'il vous faut.", daysAgo: 95 },
  ],
  'mehdi.trabelsi@withyou-demo.com': [
    { reviewer: 'marie.kowalski@withyou-demo.com', comm:5,struct:5,acc:5,val:4, text:"Mehdi est très polyvalent. Il m'a aidée à la fois pour la conversation et pour mes emails professionnels. Je recommande particulièrement pour le français des affaires.", daysAgo: 15 },
    { reviewer: 'sami.belhaj@withyou-demo.com',    comm:4,struct:5,acc:5,val:4, text:"Bon tuteur, très structuré. Les séances sont bien organisées et Mehdi maîtrise parfaitement la grammaire. Un peu plus de spontanéité serait bienvenue.", daysAgo: 45 },
    { reviewer: 'thomas.vidal@withyou-demo.com',   comm:5,struct:5,acc:4,val:5, text:"Mehdi adapte vraiment les séances à mes besoins. Très disponible entre les cours pour répondre aux questions. Je progresse bien !", daysAgo: 70 },
  ],
  'karim.nasri@withyou-demo.com': [
    { reviewer: 'leila.hamdi@withyou-demo.com',    comm:4,struct:4,acc:4,val:4, text:"Karim est sympathique et patient. Il m'a mise à l'aise dès le début. Parfait pour les débutants qui ont peur de parler. Bonne ambiance à chaque séance !", daysAgo: 20 },
    { reviewer: 'amal.chatti@withyou-demo.com',    comm:4,struct:4,acc:3,val:4, text:"Bien pour commencer et gagner en confiance. Les séances sont décontractées et il encourage beaucoup. Pour les niveaux plus avancés, je conseillerais un autre profil.", daysAgo: 50 },
  ],
  'salma.gharbi@withyou-demo.com': [
    { reviewer: 'marie.kowalski@withyou-demo.com', comm:5,struct:5,acc:4,val:3, text:"Salma est une professeure très compétente. Les séances sont exigeantes et extrêmement bien structurées. Idéale pour la rédaction académique et les rapports professionnels.", daysAgo: 18 },
    { reviewer: 'thomas.vidal@withyou-demo.com',   comm:4,struct:5,acc:5,val:4, text:"Excellente pour le français académique. Son approche est très pédagogique et ses corrections très précises. J'ai beaucoup progressé en rédaction scientifique.", daysAgo: 50 },
  ],
};

async function seedReviewers() {
  const map = {};
  for (const r of DEMO_REVIEWERS) {
    let user = await db.user.findUnique({ where: { email: r.email } });
    if (!user) {
      user = await db.user.create({
        data: { email: r.email, firstName: r.firstName, lastName: r.lastName, role: 'STUDENT', emailVerified: new Date() },
      });
    }
    map[r.email] = user.id;
  }
  return map;
}

async function seedReviews(reviewerMap) {
  let created = 0, skipped = 0;
  for (const [tutorEmail, reviewList] of Object.entries(TUTOR_REVIEWS)) {
    const tutor = await db.user.findUnique({ where: { email: tutorEmail } });
    if (!tutor) { console.log(`  SKIP reviews for ${tutorEmail} — tutor not found`); continue; }

    for (const rv of reviewList) {
      const studentId = reviewerMap[rv.reviewer];
      if (!studentId) continue;

      // Skip if this exact student-tutor demo review already exists
      const paymentIntentId = `pi_demo_${tutor.id.slice(-6)}_${studentId.slice(-6)}_${rv.daysAgo}`;
      const existingBooking = await db.booking.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
      if (existingBooking) { skipped++; continue; }

      const scheduledAt = new Date(Date.now() - rv.daysAgo * 24 * 60 * 60 * 1000);
      const composite = (rv.comm + rv.struct + rv.acc + rv.val) / 4;

      const booking = await db.booking.create({
        data: {
          studentId,
          tutorId: tutor.id,
          sessionType: 'DISCOVERY',
          status: 'COMPLETED',
          durationMins: 30,
          scheduledAt,
          startedAt: scheduledAt,
          endedAt: new Date(scheduledAt.getTime() + 30 * 60 * 1000),
          studentPriceUsd: 15,
          stripePaymentIntentId: paymentIntentId,
          reviewLeft: true,
        },
      });

      await db.review.create({
        data: {
          bookingId: booking.id,
          studentId,
          tutorId: tutor.id,
          ratingCommunication: rv.comm,
          ratingStructure: rv.struct,
          ratingAccuracy: rv.acc,
          ratingValue: rv.val,
          ratingComposite: composite,
          text: rv.text,
          isPublished: true,
          publishedAt: scheduledAt,
        },
      });
      created++;
    }
  }
  console.log(`REVIEWS  ${created} créés, ${skipped} déjà existants`);
}

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
      // Tuteur déjà créé : mise à jour photo + bio
      await db.user.update({ where: { id: exists.id }, data: { image: t.photo } });
      await db.tutorProfile.update({ where: { userId: exists.id }, data: { profilePhotoUrl: t.photo, bio: t.bio } });
      await db.hrApplication.update({ where: { userId: exists.id }, data: { bio: t.bio } });
      console.log(`UPDATE ${t.fullName} — photo + bio mis à jour`);
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
        image: t.photo,
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
        profilePhotoUrl: t.photo,
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

  // Seed reviewer students + reviews
  const reviewerMap = await seedReviewers();
  await seedReviews(reviewerMap);

  console.log('\nDone. Go to /find-tutors while logged in as your student account.');
  console.log('You should see tutors sorted by match score descending.\n');
}

main()
  .catch(e => { console.error('\nError:', e.message); process.exit(1); })
  .finally(() => db.$disconnect());
