import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {},
  async headers() {
    const livekitWss = process.env.NEXT_PUBLIC_LIVEKIT_URL
      ? process.env.NEXT_PUBLIC_LIVEKIT_URL.replace(/^wss?:\/\//, "wss://")
      : "";
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      `connect-src 'self' ${livekitWss} https://withyoou-a5l2xy7a.livekit.cloud wss://withyoou-a5l2xy7a.livekit.cloud https://*.livekit.cloud wss://*.livekit.cloud https://js.stripe.com https://api.stripe.com https://cdn.jsdelivr.net https://storage.googleapis.com`,
      `media-src 'self' blob:`,
      "worker-src 'self' blob:",
      "frame-src https://js.stripe.com",
      "frame-ancestors 'none'",
      `script-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net`,
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy",   value: csp },
          { key: "X-Frame-Options",            value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()" },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "C:\\DumpStack.log.tmp",
        "C:\\hiberfil.sys",
        "C:\\pagefile.sys",
        "C:\\swapfile.sys",
      ],
    };
    return config;
  },
};

// Wrap with Sentry only if properly installed and configured
async function buildConfig() {
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey) {
    throw new Error(
      "[next.config] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Must start with pk_test_ or pk_live_.",
    );
  }
  if (!stripeKey.startsWith("pk_")) {
    throw new Error(
      `[next.config] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is invalid (got "${stripeKey.slice(0, 7)}…"). Must start with pk_test_ or pk_live_.`,
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentry = await import("@sentry/nextjs") as any;
    const withSentryConfig = sentry.withSentryConfig;
    if (typeof withSentryConfig !== "function") return nextConfig;
    return withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      telemetry: false,
    });
  } catch {
    return nextConfig;
  }
}

export default buildConfig();
