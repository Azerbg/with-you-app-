// Image credits and TODOs for the landing page.
// All images must be saved as WebP + AVIF in /public/images/.
// Hero: ≥1600px wide. Portraits: ≥800×1000px (4:5 ratio).
//
// Unsplash search queries used for placeholder selection:
//   hero:         "woman video call smiling laptop window light"
//   tutors:       "professional portrait natural light neutral background"
//   testimonials: "candid portrait young professional"

export interface ImageCredit {
  file: string;
  alt: string;
  unsplashUrl?: string;
  photographerName?: string;
  photographerUrl?: string;
  status: "placeholder" | "confirmed";
}

export const IMAGE_CREDITS: ImageCredit[] = [
  {
    file: "/hero-tutor.webp",
    alt: "Tutor in a live language session, natural window light",
    status: "placeholder",
    // TODO: replace with a licensed portrait photo (woman, 20–45, window light, neutral tones)
    // unsplashUrl: "https://unsplash.com/photos/...",
  },
  // TODO: Add one entry per tutor photo once /public/images/tutors/ portraits are added.
  // TODO: Add one entry per testimonial photo once /public/images/testimonials/ are added.
];
