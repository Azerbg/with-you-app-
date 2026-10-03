import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
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
  try {
    const { withSentryConfig } = await import("@sentry/nextjs");
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
