// Placeholder tutor data used on the landing page.
// TODO: Replace avatarBg with real portrait photos (WebP + AVIF, ≥800×1000px)
// saved in /public/images/tutors/. See /src/data/image-credits.ts.

export interface Tutor {
  id: string;
  name: string;
  flag: string;
  langsEn: string;
  langsFr: string;
  specialtyEn: string;
  specialtyFr: string;
  rating: string;
  avatarBg: string; // TODO: replace with photo: string (path to WebP)
}

export const TUTORS: Tutor[] = [
  {
    id: "1",
    name: "Yasmine B.",
    flag: "🇫🇷",
    langsEn: "French · Native",
    langsFr: "Français · Natif",
    specialtyEn: "Conversational French",
    specialtyFr: "Français conversationnel",
    rating: "4.9",
    avatarBg: "#5C4A3A",
  },
  {
    id: "2",
    name: "Carlos R.",
    flag: "🇪🇸",
    langsEn: "Spanish · Native",
    langsFr: "Espagnol · Natif",
    specialtyEn: "Business Spanish",
    specialtyFr: "Espagnol professionnel",
    rating: "4.8",
    avatarBg: "#3A4A5C",
  },
  {
    id: "3",
    name: "Amara S.",
    flag: "🇸🇳",
    langsEn: "French · C2",
    langsFr: "Français · C2",
    specialtyEn: "French for exams (DELF/DALF)",
    specialtyFr: "Français pour examens (DELF/DALF)",
    rating: "4.9",
    avatarBg: "#4A3A5C",
  },
  {
    id: "4",
    name: "David K.",
    flag: "🇬🇧",
    langsEn: "English · Native",
    langsFr: "Anglais · Natif",
    specialtyEn: "IELTS / TOEFL preparation",
    specialtyFr: "Préparation IELTS / TOEFL",
    rating: "4.7",
    avatarBg: "#3A5C4A",
  },
];
