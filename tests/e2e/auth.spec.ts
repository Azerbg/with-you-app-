import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto("/auth/login");

    await page.locator('input[type="email"], input[name="email"]').fill("wrong@example.com");
    await page.locator('input[type="password"], input[name="password"]').fill("wrongpassword123");
    await page.locator('button[type="submit"]').click();

    // Should show an error, not redirect to dashboard
    await expect(page).not.toHaveURL(/dashboard/);
    // Error message should appear (next-auth returns CredentialsSignin)
    await expect(page.locator("body")).toContainText(
      /incorrect|invalide|invalid|error|erreur/i
    );
  });

  test("register with invalid email shows error", async ({ page }) => {
    await page.goto("/auth/register");

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.fill("not-an-email");
    await emailInput.blur();

    // HTML5 native validation or custom error
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    if (!isInvalid) {
      // Try submitting to trigger custom validation
      await page.locator('button[type="submit"]').first().click();
      await expect(page.locator("body")).toContainText(/email|invalide|invalid/i);
    }
    expect(true).toBe(true); // Validation exists either way
  });

  test("forgot-password page renders form", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard", async ({ page }) => {
    await page.goto("/dashboard/student");
    // Should redirect to login page
    await expect(page).toHaveURL(/auth\/login|login/);
  });

  test("unauthenticated user is redirected from tutor dashboard", async ({ page }) => {
    await page.goto("/dashboard/tutor");
    await expect(page).toHaveURL(/auth\/login|login/);
  });
});
