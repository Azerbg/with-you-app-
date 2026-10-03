import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Run tests in parallel
  fullyParallel: true,
  // Fail the build on CI if test.only is left in
  forbidOnly: !!process.env.CI,
  // Retry once on CI
  retries: process.env.CI ? 1 : 0,
  // Single worker locally to avoid port conflicts
  workers: process.env.CI ? 2 : 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    // Base URL: use PLAYWRIGHT_BASE_URL env var, or localhost in dev
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    // Capture screenshot on failure
    screenshot: "only-on-failure",
    // Capture trace on retry
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Start dev server automatically when running locally
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
