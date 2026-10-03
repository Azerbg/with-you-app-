import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveTitle(/error/i);
    // Page should not show a 500 error
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("login page loads and shows form", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test("register page loads and shows form", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test("find-tutors page loads", async ({ page }) => {
    await page.goto("/find-tutors");
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });
});
