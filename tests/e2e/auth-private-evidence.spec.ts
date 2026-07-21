import { expect, test } from "@playwright/test";

test.describe("adult auth and private evidence fallback", () => {
  test("keeps evidence device-only when Supabase is not configured", async ({ page }) => {
    await page.goto("/evidence");

    await expect(page.getByRole("heading", { name: "Your evidence, under your control." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "This evidence remains on your device." })).toBeVisible();
    await expect(page.getByText("Learning, local export, and local deletion continue to work.")).toBeVisible();
  });

  test("renders the adult-only sign-in boundary without creating an account", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Keep a private evidence copy across devices." })).toBeVisible();
    await expect(page.getByText("Accounts and cloud evidence are not offered to anyone under 18 in this slice.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Email me a secure sign-in link" })).toBeDisabled();
  });
});
