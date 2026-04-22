# WithYou — Development Progress

> Last updated: 2026-03-24
> Stack: Next.js 16, TypeScript, Tailwind CSS, Prisma, PostgreSQL, NextAuth v5
> FRD Reference: `with_you_frd_v3.docx` (v3.0, 2026)
> Phase 1 Guide: `Phase1.md`

---

## Overall Progress

| Milestone | Description | Weeks | Status |
|-----------|-------------|-------|--------|
| M1 | Foundation & Authentication | 1–2 | ✅ Complete |
| M2 | Student Onboarding & Assessment | 3–5 | ✅ Complete |
| M3 | Tutor Recruitment & HR Console | 6–8 | ⬜ Not Started |
| M4 | Search, Matching & Booking | 9–10 | ⬜ Not Started |
| M5 | Virtual Classroom Integration | 11–12 | ⬜ Not Started |
| M6 | Dashboards, Payments & Financial System | 13–14 | ⬜ Not Started |
| M7 | Final Integration & Launch Prep | 15–16 | ⬜ Not Started |

---

## M1 — Foundation & Authentication ✅
**Weeks 1–2 · Completed: 2026-03-24**

### Deliverables
- [x] Next.js 16.2.1, TypeScript, Tailwind CSS, ESLint
- [x] Prisma ORM v6 + PostgreSQL local database (`withyou_dev`)
- [x] NextAuth v5 — credentials provider (email + password)
- [x] NextAuth v5 — Google OAuth provider (keys not filled yet)
- [x] JWT session strategy — `id` and `role` in token
- [x] TypeScript session type augmentation (`next-auth.d.ts`)
- [x] Register API (`POST /api/auth/register`) with bcrypt cost 12
- [x] Auto-create `StudentProfile` or `TutorProfile` on register
- [x] Email verification flow (token → email → `/api/auth/verify-email`)
- [x] Forgot password + reset password flows
- [x] RBAC middleware — protects `/dashboard/*` and `/onboarding`
- [x] Zod validation schemas (password: 10 chars min, 1 uppercase, 1 number, 1 special char)
- [x] Auth pages: login, register, forgot-password, reset-password, error
- [x] Unauthorized page
- [x] Landing page with hero + CTA

### Known Gaps (deferred)
- [ ] Apple SSO (FRD §3.1.1) — Phase 1 nice-to-have
- [ ] 2FA mandatory for HR Manager and Admin (FRD §4.2) — implement before HR/Admin roles go live in M3
- [ ] `httpOnly` cookie session storage (FRD §4.2) — verify NextAuth v5 config
- [ ] Access token 15 min / refresh token 7 days (FRD §4.2) — verify config

### Key Files
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Full database schema |
| `src/lib/auth.ts` | NextAuth configuration |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/email.ts` | Nodemailer — transactional emails |
| `src/lib/validations/auth.ts` | Zod schemas (password policy per FRD §4.2) |
| `src/middleware.ts` | RBAC route protection |
| `src/app/api/auth/register/route.ts` | Register endpoint |

### Notes
- Email verification bypassed in `NODE_ENV=development` for easier testing
- SMTP: Gmail via `azer.boughrara@polytechnicien.tn` (dev only — switch to Resend/SendGrid for prod)
- Google OAuth credentials not yet filled in `.env`

---

## M2 — Student Onboarding & Assessment ✅
**Weeks 3–5 · Completed: 2026-03-24**

### What Was Built
- [x] Schema migration: full onboarding fields on `StudentProfile`
- [x] Multi-step onboarding wizard (`/onboarding`) — 5 steps
  - [x] Step 1: Timezone (auto-detected via `Intl` API + manual override — IANA database)
  - [x] Step 2: Native language + target language (French/English only — Phase 1) + learning objective
  - [x] Step 3: Self-reported level, availability days, **time windows** (morning/afternoon/evening), frequency, program type
  - [x] Step 4: Adaptive CEFR placement quiz (10 questions — correct → harder, wrong → easier)
  - [x] Step 5: Personalized price shown + Stripe card setup (or skip)
- [x] Adaptive CEFR quiz (`src/lib/cefr-quiz.ts`) — 10 questions (4 grammar + 3 vocab + 3 reading)
- [x] Pricing engine (`src/lib/pricing.ts`) — full FRD formula, stored in **CAD** internally
- [x] Onboarding API (`POST /api/onboarding`) — saves profile + pricing
- [x] `StudentProgramPricing` table — confidential, tutor has NO access
- [x] Stripe SetupIntent API — saves card, no charge
- [x] Student dashboard (`/dashboard/student`) — shows CEFR, tier, pricing, schedule, logout
- [x] Generic `/dashboard` → redirects to role-specific dashboard

### Pricing Logic (FRD §3.16)
```
Internal currency: CAD (all stored in CAD, displayed in student's currency)

Base rate/session (CAD placeholder — will be set by ops team in admin pricing module):
  A1/A2 (STARTER):    CA$34/session
  B1/B2 (CORE):       CA$47/session
  C1/C2 (INTENSIVE):  CA$61/session

Objective premium:
  PROFESSIONAL: +10%
  EXAM_PREP:    +15%
  CONVERSATIONAL / ACADEMIC: +0%

Frequency multiplier (sessions/month × bundle discount):
  1×/week:  4 sessions × 1.0 (no discount)
  2×/week:  8 sessions × 0.95 (5% bundle)
  3×/week: 12 sessions × 0.90 (10% bundle)

Duration discount:
  PAY_PER_SESSION: 0%  (on-demand)
  1 month:         0%
  3 months:       10%
  6 months:       18%

Monthly price (CAD) = base_rate × 4 × freq_mult × objective_mult × (1 − duration_discount)
Discovery Session: CA$20 / US$15 / €13 (fixed, required before program enrollment)
```

> ⚠️ Phase 1 note: Prices above are placeholder constants in `src/lib/pricing.ts`.
> Per FRD §3.9.5, exact prices must be set by ops team via the **Admin Pricing Management module** (M6).
> The `PlatformPricing` DB table is the authoritative source — hardcoded values are temporary.

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/cefr-quiz.ts` | Adaptive quiz (10 questions, A1–C1 adaptive scoring) |
| `src/lib/pricing.ts` | Pricing engine — CAD-primary, FRD §3.16 formula |
| `src/lib/program-tier.ts` | Tier descriptions |
| `src/app/onboarding/OnboardingWizard.tsx` | 5-step client wizard |
| `src/app/api/onboarding/route.ts` | Save onboarding data + calculate price |
| `src/app/api/stripe/setup-intent/route.ts` | Stripe SetupIntent (save card, no charge) |
| `src/app/dashboard/student/page.tsx` | Student dashboard |

### Known Gaps (deferred to M4/M6)
- [ ] Currency auto-detection by IP (FRD §3.1.1) — currently defaults to USD; implement in M4
- [ ] Currency override in settings (FRD §3.16.1) — M6 (student settings page)
- [ ] After onboarding → show curated tutor shortlist (FRD §3.1.1 Step 7) — M4 (matching)
- [ ] Discovery Session booking (FRD §3.1.1 Step 8) — M4 (booking system)
- [ ] Admin pricing management UI (FRD §3.9.5) — M6

---

## M3 — Tutor Recruitment & HR Console ⬜
**Weeks 6–8**

### Deliverables to Build
- [ ] **Tutor application page** at `/tutors/apply/tunisia` (NOT `/become-a-tutor`)
  - [ ] Multi-language UI: French / Arabic / English (FRD §3.1.2)
  - [ ] Form: full name, national ID, city (Tunis/Sfax/Sousse/Other), phone, languages, specializations, certifications, years experience, bio (500–1000 words), video intro (60–90 sec)
  - [ ] Automated pre-screening: email verification, phone OTP (Twilio), bio plagiarism check, video profanity scan
- [ ] **HR Console** at `/console/hr` (NOT `/dashboard/hr`)
  - [ ] Kanban pipeline: New → Stage 1 Review → Interview Scheduled → Interview Complete → Offer Pending → Signed → Active / Rejected
  - [ ] HR rubric scoring (5 dimensions, 1–5 each): language proficiency, audio/video quality, professional presentation, teaching philosophy, cultural fit
    - Score 20–25 → advance | 15–19 → borderline | < 15 → reject
  - [ ] Cross-timezone interview scheduler (HR in Canada EST/PST ↔ Tutor in Tunisia CET/CEST)
    - HR proposes 2–3 slots → auto-convert to Tunisia time → candidate self-selects
  - [ ] Pre-interview materials auto-sent 24h before (in French or Arabic)
  - [ ] Offer & rate management: assign programs, set hourly rate (TND or CAD), weekly cap
  - [ ] Digital agreement via DocuSign/Dropbox Sign in French or Arabic
  - [ ] Rejection flow with templated emails (French/Arabic) + 90-day reapplication block
  - [ ] Tutor performance monitoring (rating trend, no-show rate, cancellation rate)
  - [ ] Performance Improvement Notice (PIN) with 60-day remediation window
  - [ ] Account suspension / reactivation
- [ ] **Stripe Connect onboarding** — triggered after agreement signature
  - [ ] Tunisian bank account (IBAN for TND) or international bank (SWIFT for CAD)
  - [ ] Stripe Identity — government ID verification before first payout
- [ ] 2FA mandatory for HR Manager role (TOTP — Google Authenticator/Authy)
- [ ] `TutorCompensation` record created after offer signed
- [ ] `HrApplication` pipeline fully implemented

### Key URLs
| Route | Description |
|-------|-------------|
| `/tutors/apply/tunisia` | Public Tunisia recruitment landing page |
| `/console/hr` | HR Console home |
| `/console/hr/applicants` | Kanban pipeline |
| `/console/hr/applicants/[id]` | Full application detail |
| `/console/hr/applicants/[id]/schedule-interview` | Interview scheduler |
| `/console/hr/applicants/[id]/generate-offer` | Offer builder |
| `/console/hr/tutors/[id]/performance` | Tutor performance monitoring |

### Integrations Needed
| Service | Purpose |
|---------|---------|
| Twilio | SMS OTP for phone verification (Tunisia numbers) |
| DocuSign or Dropbox Sign | Tutor agreement e-signature (FR/AR) |
| Stripe Connect | Tutor bank account linking |
| Stripe Identity | Government ID verification |

---

## M4 — Search, Matching & Booking ⬜
**Weeks 9–10**

### Deliverables to Build
- [ ] **Public tutor profiles** at `/tutors/[first-name]-[language]-[specialization]`
  - [ ] SEO meta tags, Schema.org markup
  - [ ] Video intro (auto-plays muted), bio, certifications, specializations
  - [ ] Availability calendar preview (7 days, in student's timezone)
  - [ ] Star rating + reviews
  - [ ] ❌ NO pricing shown — confidential
  - [ ] ❌ NO geographic location shown — internal operational detail
  - [ ] "Book Discovery Session" CTA + "Message Tutor" CTA
- [ ] **Tutor search** at `/find-tutors`
  - [ ] Filters: language, specialization, availability, certification, rating, response time
  - [ ] ❌ Price is NOT a filter (FRD §3.2.1 — deliberate product decision)
  - [ ] Matching algorithm (weighted composite score):
    - CEFR alignment (25%) + availability overlap (20%) + review score (20%)
    - Specialization match (15%) + response time (10%) + program assignment (10%)
  - [ ] Algolia or Elasticsearch for sub-100ms search (FRD §6.2)
- [ ] **Tutor availability management** — `/dashboard/tutor/availability`
  - [ ] Visual weekly grid (Tunisia timezone CET/CEST)
  - [ ] Recurring availability + date blocks (vacation, Ramadan, public holidays)
  - [ ] Buffer time between sessions (15/30/60 min, tutor-configurable)
  - [ ] Max weekly hours cap (agreed with HR)
  - [ ] Google Calendar / iCal two-way sync (timezone conversion automatic)
- [ ] **Booking system**
  - [ ] Discovery Session: 30 min, fixed price (CA$20/US$15/€13), max 1 per student
  - [ ] Single session: 30/45/60/90 min, derived from student's program tier price
  - [ ] Program sessions (1/3/6 months), Recurring subscription
  - [ ] Payment captured immediately → held in Stripe escrow
  - [ ] Tutor payout released 24h after session completed
  - [ ] Confirmation emails in both timezones (student timezone + Tunisia CET)
  - [ ] `.ics` calendar files for Google/iCal/Outlook
  - [ ] Reminders: 24h before + 1h before (email + SMS opt-in)
- [ ] **Cancellation policy** (FRD §3.3.4)
  - [ ] Student > 24h: 100% refund | Student < 24h: platform credit
  - [ ] Student no-show: no refund, tutor gets 100%
  - [ ] Tutor no-show: 100% refund + $5 courtesy credit + HR warning
  - [ ] 3rd tutor no-show in 90 days: account suspended
- [ ] Currency auto-detection by IP + manual override
- [ ] After onboarding: curated shortlist of 3–5 matched tutors

### Key URLs
| Route | Description |
|-------|-------------|
| `/tutors/[slug]` | Public tutor profile |
| `/find-tutors` | Tutor search & filtering |
| `/dashboard/tutor/availability` | Tutor availability management |
| `/booking/[tutorId]` | Booking flow |
| `/booking/confirmation/[bookingId]` | Booking confirmation |

---

## M5 — Virtual Classroom Integration ⬜
**Weeks 11–12**

### Deliverables to Build
- [ ] **Video classroom** at `/classroom/[session-id]`
  - [ ] Phase 1: Zoom Video SDK embedded (no app download — in-browser)
  - [ ] Alternatives to evaluate: Daily.co, Whereby Embedded, Twilio Video
  - [ ] Access control: signed JWT token, only student + tutor enrolled in session
  - [ ] Automatic quality fallback (1080p → 720p → 480p → audio-only)
  - [ ] Screen sharing (both tutor and student)
  - [ ] Session timer visible in header
  - [ ] "Join" button appears 5 min before session on dashboard
- [ ] **Collaborative whiteboard** (custom — Canvas API + Socket.io CRDT)
  - [ ] Tools: freehand pen (multi-color), shapes, text boxes, highlighter, eraser, selection
  - [ ] Contextual widgets: Dictionary, Image, Conjugation Table, Audio Clip
  - [ ] Real-time sync < 100ms latency
  - [ ] Auto-saved at session end → student can view for 12 months
  - [ ] Export as PNG or PDF
- [ ] **In-class chat**
  - [ ] Persistent collapsible panel
  - [ ] Click-to-Translate (Google Cloud Translation / DeepL — FR/EN/AR)
  - [ ] Pinned messages (max 5 per session — tutor only)
  - [ ] Chat log saved to lesson history
- [ ] **In-class assessment tools**
  - [ ] Quick Poll (2–4 options, instant results)
  - [ ] Fill-in-the-Blank Cards
- [ ] **Lesson recording** (opt-in, both parties must consent)
  - [ ] Consent dialog before each session
  - [ ] Stored encrypted in DigitalOcean Spaces
  - [ ] Available for download for 90 days → auto-deleted
- [ ] **Session lifecycle**
  - [ ] No-show detection (student 15 min / tutor 10 min)
  - [ ] "Report No-Show" button
  - [ ] Technical failure reporting button
  - [ ] Session ends → `Lesson` record saved, `Booking` marked COMPLETED
  - [ ] Escrow release triggered (24h delay)
  - [ ] Review prompt sent 2h after session end

### Key Tech Decisions (FRD §3.4 + §6.1)
| Component | Phase 1 | Phase 2 |
|-----------|---------|---------|
| Video | Zoom SDK / Daily.co / Whereby | LiveKit self-hosted (AWS/GCP) |
| Whiteboard | Canvas API + Socket.io | Same |
| Object Storage | DigitalOcean Spaces | AWS S3 / GCP Cloud Storage |
| Transcription | None | OpenAI Whisper via AWS SageMaker |

---

## M6 — Dashboards, Payments & Financial System ⬜
**Weeks 13–14**

### Deliverables to Build
- [ ] **Full Student Dashboard** (`/dashboard/student`)
  - [ ] Upcoming sessions (next 3) with "Join" button (5 min before)
  - [ ] Weekly goal tracker (target minutes/week, progress bar)
  - [ ] Learning streak counter (consecutive weeks with completed session)
  - [ ] Program summary card (tier, sessions remaining, expiry date)
  - [ ] Quick access: flashcards, lesson history, my tutors, messages
  - [ ] CEFR progress chart placeholder → "AI-powered — coming in Phase 2"
  - [ ] Lesson history (`/dashboard/student/lessons`) — receipts (PDF), whiteboard, chat log
  - [ ] Flashcard manager (`/dashboard/student/flashcards`) — manual creation, spaced repetition (Leitner), export to Anki/Quizlet
  - [ ] Settings (`/dashboard/student/settings`) — profile, timezone, currency, notifications, billing
  - [ ] Goal tracking: target certification (DELF/IELTS/TEF) + target date
  - [ ] Achievement badges (10h/50h/100h, CEFR milestones) + LinkedIn sharing
- [ ] **Full Tutor Dashboard** (`/dashboard/tutor`)
  - [ ] Earnings tracker (confirmed + pending + lifetime) in TND or CAD
  - [ ] Next payout estimate (Friday)
  - [ ] My Students list with private notes (not visible to student)
  - [ ] Lesson materials library (upload PDF/PPTX/images/audio, organize into lesson packs)
  - [ ] Performance analytics (rating trend, retention rate, profile views)
  - [ ] ❌ NO student-facing prices shown anywhere (FRD §3.7.2)
- [ ] **Admin Console** (`/console/admin`)
  - [ ] User management: CRUD, bulk suspend/reinstate, activity log
  - [ ] **Pricing management** (FRD §3.9.5): Update tier prices without code deploy
  - [ ] Dispute resolution center (48h SLA) with resolution options
  - [ ] Financial dashboard (GMV in CAD, margin breakdown, tutor payout reconciliation)
  - [ ] Content moderation queue (reviews, messages)
  - [ ] Audit log (every admin action logged with before/after)
  - [ ] Promotional codes (% or fixed discount, usage limit, expiry)
  - [ ] 2FA mandatory for Admin role (TOTP)
- [ ] **Stripe Connect** — tutor payouts
  - [ ] Weekly automatic payouts every Friday at 00:00 UTC
  - [ ] Min threshold: 50 TND or CA$25
  - [ ] TND → Tunisian bank (IBAN) | CAD → international bank (SWIFT)
  - [ ] Annual earnings statement (PDF) for tax filing
- [ ] **Multi-currency**
  - [ ] Open Exchange Rates API → weekly FX update → `CurrencyExchangeRate` table
  - [ ] All financial reports normalized to CAD
  - [ ] Canadian GST/HST/QST applied automatically by province
- [ ] **PDF receipt** per session (shown in student's currency)
- [ ] **Reviews & ratings system**
  - [ ] 4 dimensions: Communication, Structure, Language Accuracy, Overall Value
  - [ ] Prompt 2h after session (email + in-app)
  - [ ] Tutor response: 1 per review, max 300 chars
  - [ ] Moderation: profanity filter before publication
  - [ ] Rating floor: 6-month rolling < 3.5 stars → automated HR alert + PIN
- [ ] **Messaging** (`/messages`)
  - [ ] Thread-based inbox, unread badge
  - [ ] Types: text, image, audio clip (< 2 min), file
  - [ ] Anti-bypass detection (phone numbers, external emails, third-party video links)
  - [ ] Tutor response time tracked and displayed on profile
  - [ ] Messages retained 24 months (admin accessible for disputes)
- [ ] **Notifications** (all channels: email + in-app + push + SMS opt-in)
  - [ ] Booking confirmed, session reminders (24h + 1h), session completed
  - [ ] New message, payout processed, review received
  - [ ] Tutor application updates, tutor cancels session
  - [ ] Program expiry warning (14 days before)
  - [ ] HR alert — tutor performance drop
  - [ ] Firebase Cloud Messaging (web + mobile push)
  - [ ] Twilio SMS (opt-in, session reminders)
  - [ ] All notifications in user's preferred language (EN/FR/AR)

---

## M7 — Final Integration & Launch Prep ⬜
**Weeks 15–16**

### Deliverables
- [ ] Referral program (`/refer/[code]`) — CA$10 credit for referring student; discount for referred
- [ ] Gamification: XP points (lesson +100, flashcards +10), achievement badges, Top Tutor badge (monthly)
- [ ] i18n: all UI strings in external JSON locale files (en, fr, ar)
- [ ] WCAG 2.1 Level AA accessibility audit (axe-core / WAVE — zero critical violations)
- [ ] OWASP Top 10 security audit
- [ ] End-to-end tests: student journey, tutor journey, HR console journey
- [ ] Performance: LCP < 3.0s, API P95 < 500ms, DB P99 < 200ms
- [ ] Public status page (Betterstack or Statuspage.io)
- [ ] DigitalOcean production deployment (App Platform + Managed PostgreSQL)
- [ ] Sentry error tracking
- [ ] README + API docs (OpenAPI 3.1 via zod-to-openapi, Swagger UI at `/api/docs`)
- [ ] PIPEDA compliance (data export + deletion within 30 days)
- [ ] GDPR cookie consent banner (for EU visitors)
- [ ] Canadian GST/HST registration and remittance
- [ ] Tunisian legal review: tutor employment classification (contractor vs employee) per Code du Travail

---

## Database Schema Summary

### Current Tables (post-M2 migration)
| Table | Description |
|-------|-------------|
| `users` | All users (student/tutor/hr/admin) |
| `accounts` | OAuth accounts (NextAuth) |
| `sessions` | NextAuth sessions |
| `verification_tokens` | Email verification + password reset |
| `student_profiles` | Onboarding data, CEFR level, schedule prefs |
| `student_program_pricing` | **Confidential** — student's personalized price (CAD primary) |
| `tutor_profiles` | Bio, video, languages, CEFR range, certifications, ratings |
| `tutor_compensation` | **Confidential** — tutor's hourly rate (TND or CAD) |
| `tutor_availability` | Recurring weekly slots + date blocks (Tunisia timezone) |
| `hr_applications` | Full HR pipeline: application → interview → offer → signed |
| `bookings` | Sessions with escrow amounts, cancellation, no-show |
| `lessons` | What happened in the room (recording, whiteboard, chat) |
| `flashcards` | Student vocabulary cards — manual creation (Phase 1) |
| `reviews` | 4-dimension ratings, moderation, tutor response |
| `message_threads` | Student ↔ tutor messaging threads |
| `messages` | Individual messages (text/image/audio/file) |
| `payouts` | Weekly Stripe Connect payouts to tutors |
| `platform_pricing` | **Admin-configurable** tier prices (not hardcoded) |
| `audit_logs` | Every admin action, retained indefinitely |
| `currency_exchange_rates` | Weekly FX rates for CAD normalization |
| `disputes` | Session disputes (48h SLA) |
| `promo_codes` | Admin-issued promotional discounts |

### Confidentiality Rules (FRD §3.7.2 + §5.2)
| Table | Student API | Tutor API | HR API | Admin API |
|-------|-------------|-----------|--------|-----------|
| `student_program_pricing` | ✅ own only | ❌ hidden | ❌ hidden | ✅ all |
| `tutor_compensation` | ❌ hidden | ✅ own only | ✅ all | ✅ all |
| `platform_pricing` | ❌ hidden | ❌ hidden | ❌ hidden | ✅ all |
| `bookings.studentPriceUsd` | ✅ own | ❌ hidden | ❌ hidden | ✅ all |
| `bookings.tutorPayoutAmount` | ❌ hidden | ✅ own | ✅ all | ✅ all |
| `bookings.platformMargin` | ❌ hidden | ❌ hidden | ❌ hidden | ✅ all |

---

## Environment Variables Checklist

| Variable | Dev | Prod | Notes |
|----------|-----|------|-------|
| `DATABASE_URL` | ✅ | ⬜ | DigitalOcean Managed PostgreSQL in prod |
| `AUTH_SECRET` | ⬜ change! | ⬜ | Min 32 chars random string |
| `AUTH_URL` | ✅ | ⬜ | Production domain |
| `AUTH_GOOGLE_ID` | ⬜ | ⬜ | Google Cloud Console |
| `AUTH_GOOGLE_SECRET` | ⬜ | ⬜ | Google Cloud Console |
| `EMAIL_SERVER_*` | ✅ Gmail dev | ⬜ | Switch to Resend/SendGrid for prod |
| `STRIPE_SECRET_KEY` | ⬜ test key | ⬜ | dashboard.stripe.com |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⬜ test key | ⬜ | dashboard.stripe.com |
| `TWILIO_ACCOUNT_SID` | ⬜ M3 | ⬜ | SMS OTP for tutor phone verification |
| `TWILIO_AUTH_TOKEN` | ⬜ M3 | ⬜ | |
| `TWILIO_PHONE_NUMBER` | ⬜ M3 | ⬜ | |
| `DOCUSIGN_*` or `DROPBOX_SIGN_*` | ⬜ M3 | ⬜ | Tutor agreement e-signature |
| `ZOOM_SDK_KEY` | ⬜ M5 | ⬜ | Or Daily.co / Whereby key |
| `ZOOM_SDK_SECRET` | ⬜ M5 | ⬜ | |
| `GOOGLE_TRANSLATE_API_KEY` | ⬜ M5 | ⬜ | In-class click-to-translate |
| `FIREBASE_*` | ⬜ M6 | ⬜ | Push notifications (FCM) |
| `OPEN_EXCHANGE_RATES_APP_ID` | ⬜ M6 | ⬜ | Weekly FX rate updates |
| `ALGOLIA_APP_ID` | ⬜ M4 | ⬜ | Tutor search |
| `ALGOLIA_ADMIN_KEY` | ⬜ M4 | ⬜ | |
| `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY` | ⬜ M4 | ⬜ | |

---

## Tech Stack Reference (FRD §6.2)

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 16 (TypeScript, App Router) | SSR/SSG for SEO |
| Styling | Tailwind CSS | Radix UI for accessible components (add in M3+) |
| State | Zustand + TanStack Query | Add in M4+ |
| ORM | Prisma v6 + PostgreSQL | |
| Auth | NextAuth v5 | JWT sessions |
| Video (P1) | Zoom SDK / Daily.co / Whereby | Decide in M5 |
| Video (P2) | LiveKit self-hosted | Post-launch |
| Payments | Stripe (Payments + Connect + Identity) | |
| Email | Nodemailer (dev) → Resend/SendGrid (prod) | |
| Search | Algolia | Add in M4 |
| Push | Firebase Cloud Messaging | Add in M6 |
| SMS | Twilio | Add in M3 |
| E-Sign | DocuSign or Dropbox Sign | Add in M3 |
| Storage | DigitalOcean Spaces (S3-compatible) | |
| CI/CD | GitHub Actions → DigitalOcean App Platform | |
| Monitoring | Sentry (errors) + DigitalOcean Monitoring | |
| Analytics | PostHog or Mixpanel | Add post-launch |

---

_Update this file after every session. Reference FRD v3 (`with_you_frd_v3.docx`) for any ambiguity._
