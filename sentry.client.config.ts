import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "https://b07fb338bf6a83a6e131dc4ae1a449fa@o4512175613083648.ingest.us.sentry.io/4512179983286272",
  // Capture 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,
  // Only enable in production
  enabled: process.env.NODE_ENV === "production",
  debug: false,
});
