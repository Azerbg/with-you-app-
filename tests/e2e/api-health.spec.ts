import { test, expect } from "@playwright/test";

/**
 * API health checks: verify critical routes exist and return expected status codes.
 * These are smoke tests — they don't need auth, just confirm routes don't crash (500)
 * and return the expected shape (401/403 for protected routes, 200 for public ones).
 */
test.describe("API health checks", () => {
  test.describe("Protected routes return 401 (not 500)", () => {
    const protectedRoutes = [
      "/api/notifications",
      "/api/messages/threads",
      "/api/referral",
      "/api/auth/me",
    ];

    for (const route of protectedRoutes) {
      test(`GET ${route}`, async ({ request }) => {
        const res = await request.get(route);
        expect([401, 403]).toContain(res.status());
      });
    }
  });

  test.describe("Public routes return 200", () => {
    test("GET /api/tutors returns tutor list", async ({ request }) => {
      const res = await request.get("/api/tutors");
      expect(res.status()).toBe(200);
      const body = await res.json();
      // Should be an array or have a tutors field
      expect(Array.isArray(body) || Array.isArray(body.tutors)).toBe(true);
    });
  });

  test.describe("Auth routes return 401 on bad credentials", () => {
    test("POST /api/auth/register with missing fields returns 400", async ({ request }) => {
      const res = await request.post("/api/auth/register", {
        data: { email: "bad" }, // missing password, role
      });
      expect([400, 422]).toContain(res.status());
    });

    test("POST /api/referral/apply without auth returns 401", async ({ request }) => {
      const res = await request.post("/api/referral/apply", {
        data: { code: "TESTCODE" },
      });
      expect([401, 403]).toContain(res.status());
    });
  });
});
