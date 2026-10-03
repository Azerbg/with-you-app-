# WithYou Learning

Plateforme de tutorat de langues en ligne (Phase 1). Étudiants et tuteurs se connectent, réservent des séances vidéo en direct, et progressent ensemble.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Base de données | PostgreSQL via [Neon](https://neon.tech) |
| ORM | Prisma |
| Auth | NextAuth v5 (credentials + Google OAuth) |
| Paiements | Stripe (PaymentIntents + Connect) |
| Vidéo | LiveKit |
| Email | Brevo (transactionnel) |
| Monitoring | Sentry |
| Rate limiting | Upstash Redis (optionnel) |
| Tests E2E | Playwright |
| Déploiement | Vercel |

---

## Installation locale

### Prérequis

- Node.js >= 20
- npm >= 10

### 1. Cloner et installer

```bash
git clone <repo-url>
cd with_you_app
npm install
```

### 2. Variables d'environnement

Copier `.env` et remplir les valeurs :

```bash
cp .env .env.local
```

Voir la section [Variables d'environnement](#variables-denvironnement) ci-dessous.

### 3. Base de données

```bash
npx prisma generate
npx prisma db push
```

### 4. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

---

## Variables d'environnement

Créer un fichier `.env` (ou `.env.local` pour surcharger localement) avec les variables suivantes :

```env
# ── Base de données ────────────────────────────────────────────
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# ── NextAuth ───────────────────────────────────────────────────
AUTH_SECRET="generate-with: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"          # URL de prod en production
AUTH_TRUST_HOST=true                      # local uniquement

# ── Google OAuth ───────────────────────────────────────────────
AUTH_GOOGLE_ID="xxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxx"

# ── Email (Brevo) ──────────────────────────────────────────────
BREVO_API_KEY="xkeysib-xxxx"
EMAIL_FROM="noreply@withyou.com"

# ── Stripe ─────────────────────────────────────────────────────
STRIPE_SECRET_KEY="sk_test_xxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxx"       # optionnel, webhooks Stripe

# ── LiveKit ────────────────────────────────────────────────────
LIVEKIT_API_KEY="APIxxxx"
LIVEKIT_API_SECRET="xxxx"
NEXT_PUBLIC_LIVEKIT_URL="wss://your-app.livekit.cloud"

# ── Sentry (optionnel) ─────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN="https://xxxx@oxxxx.ingest.sentry.io/xxxx"

# ── Upstash Redis — rate limiting (optionnel) ──────────────────
UPSTASH_REDIS_REST_URL="https://xxxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxx..."

# ── Cron ───────────────────────────────────────────────────────
CRON_SECRET="generate-with: openssl rand -hex 32"
```

> Les variables `UPSTASH_*` et `NEXT_PUBLIC_SENTRY_DSN` sont optionnelles. L'app fonctionne sans elles (rate limiting silencieusement désactivé, erreurs non reportées à Sentry).

---

## Scripts

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production (prisma generate + next build)
npm run start        # Serveur de production
npm run lint         # ESLint
npm run test:e2e     # Tests Playwright (headless)
npm run test:e2e:ui  # Tests Playwright (interface graphique)
```

---

## Déploiement sur Vercel

### 1. Importer le projet

Dans [vercel.com/new](https://vercel.com/new), importer le dépôt Git.

### 2. Variables d'environnement

Dans **Settings > Environment Variables**, ajouter toutes les variables du tableau ci-dessus (valeurs de production).

Variables clés à ne pas oublier :
- `DATABASE_URL` — URL Neon production
- `AUTH_SECRET` — valeur aléatoire sécurisée
- `AUTH_URL` — `https://votre-domaine.vercel.app`
- `STRIPE_SECRET_KEY` — clé live (`sk_live_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — clé live (`pk_live_...`)
- `NEXT_PUBLIC_SENTRY_DSN` — DSN Sentry
- `CRON_SECRET` — secret partagé pour les crons Vercel

### 3. Build command

Vercel détecte automatiquement Next.js. Le `build` est `prisma generate && next build` (défini dans `package.json`).

### 4. Premier déploiement

```bash
git push origin main
```

Vercel déclenche automatiquement le build.

---

## Crons Vercel

Définis dans `vercel.json` :

| Route | Planning | Description |
|---|---|---|
| `/api/cron/reminders` | Toutes les heures | Rappels 24h/1h avant séance + invitation avis 2h après |
| `/api/stripe/payouts/trigger` | Vendredi 08h00 UTC | Virements hebdomadaires aux tuteurs |

Les crons s'authentifient avec le header `Authorization: Bearer $CRON_SECRET`.

Pour déclencher manuellement (admin) :

```bash
curl -X POST https://votre-app.vercel.app/api/stripe/payouts \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Guide admin

### Accéder au back-office

URL : `/console` (rôle `ADMIN` requis).

Pour promouvoir un utilisateur admin directement en base :

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@withyou.com';
```

### Fonctionnalités console

- **Candidatures tuteurs** — valider/refuser les dossiers RH (`/console/hr`)
- **Utilisateurs** — liste, détails, désactivation (`/console/users`)
- **Réservations** — historique global (`/console/bookings`)
- **Virements** — déclencher un payout manuellement (`/console/payouts`)

### Niveaux de vérification tuteurs

| Tier | Description |
|---|---|
| `BASIC` | Profil validé, séance 50 min à $25 |
| `VERIFIED` | Documents vérifiés, séance à $30 |
| `TOP_TUTOR` | Meilleure note, séance à $35 |

---

## Programme de parrainage

- Chaque étudiant obtient un **code de parrainage unique** visible dans `/dashboard/student/referral`.
- Un filleul s'inscrit via `/parrainer/[code]` ou `/auth/register?ref=CODE`.
- À la **première séance payante complétée** par le filleul :
  - Filleul : **+10 TND** crédités sur son solde plateforme
  - Parrain : **+15 TND** crédités
- Les crédits sont automatiquement déduits du prochain paiement Stripe (taux : 1 TND = $0.32 USD).

---

## Architecture

```
src/
  app/
    api/              Routes API (Next.js Route Handlers)
    auth/             Pages login / register / verify-email
    dashboard/
      student/        Dashboard étudiant
      tutor/          Dashboard tuteur
    console/          Back-office admin
    parrainer/[code]  Landing page parrainage public
    legal/            CGU + Politique de confidentialité
  components/         Composants réutilisables
  lib/                Utilitaires (db, auth, email, stripe, slots...)
  context/            LanguageContext (fr/en)
prisma/
  schema.prisma       Schéma de base de données
tests/
  e2e/                Tests Playwright
vercel.json           Crons Vercel
```

---

## Tests E2E

```bash
# Installer les navigateurs Playwright (une seule fois)
npx playwright install

# Lancer les tests
npm run test:e2e
```

Les tests couvrent : inscription, connexion, réservation, messagerie, avis, parrainage, et les pages légales.

---

## Licence

Propriétaire — WithYou Learning Inc. Tous droits réservés.
