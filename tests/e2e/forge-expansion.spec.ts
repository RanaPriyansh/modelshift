import { expect, test } from "@playwright/test";

import lessonDraftResponse from "../fixtures/lesson-draft-response.json";

test.describe("FORGE expanded learning system", () => {
  test("publishes four honest working Worlds and an account route", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "What can a photograph prove?" })).toBeVisible();
    await expect(page.locator('.forge-world-row a[href^="/learn/"]')).toHaveCount(4);
    await expect(page.locator('a[href="/account"]')).toHaveCount(2);
    expect(await page.locator("html").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  });

  test("creates and restores a privacy-minimal adult device profile", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Pick where your learning trail lives." })).toBeVisible();
    await expect(page.getByText("Cloud identity · not configured")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);

    await page.getByRole("button", { name: "Use FORGE on this device" }).click();
    await expect(page.getByRole("heading", { name: "Adult learning mode" })).toBeVisible();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("forge.device-profile:v1") ?? "null"));
    expect(stored).toMatchObject({ schemaVersion: 1, ageMode: "adult", guardianPresent: false });
    expect(Object.keys(stored).sort()).toEqual(["ageMode", "createdAt", "guardianPresent", "profileId", "schemaVersion"]);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Adult learning mode" })).toBeVisible();
  });

  test("requires a grown-up confirmation for a child device profile", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("radio", { name: /Child \+ grown-up/ }).check();
    const submit = page.getByRole("button", { name: "Use FORGE on this device" });
    await submit.click();
    await expect(page.getByRole("heading", { name: "Child + grown-up learning mode" })).toHaveCount(0);

    await page.getByLabel("A grown-up is here and managing this device session.").check();
    await submit.click();
    await expect(page.getByRole("heading", { name: "Child + grown-up learning mode" })).toBeVisible();
  });

  test("loads the historical primary-source instrument with authentic source images", async ({ page }) => {
    await page.goto("/learn/primary-source-reasoning");

    await expect(page.getByTestId("stage-mystery")).toBeVisible();
    await expect(page.getByRole("heading", { name: "What can this photograph prove?" })).toBeVisible();
    const sourceImage = page.getByRole("img", {
      name: "A sepia stereograph card containing two near-identical views of a crowded street with horse-drawn vehicles, a streetcar, pedestrians, and storefront signs.",
    });
    await expect(sourceImage).toHaveCount(1);
    await expect.poll(() => sourceImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    expect(await page.locator("html").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  });

  test("offers four provider adapters without retaining a BYOK credential", async ({ page }) => {
    await page.goto("/studio");

    await expect(page.getByRole("heading", { name: "Turn a learning question into a testable lesson draft." })).toBeVisible();
    const provider = page.getByLabel("Provider");
    await expect(provider.locator("option")).toHaveCount(4);
    await provider.selectOption("anthropic");
    await expect(page.getByLabel("Model ID")).toHaveValue("claude-sonnet-5");

    const key = page.getByLabel(/API key/);
    await key.fill("temporary-provider-key-123");
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("temporary-provider-key-123");
    await page.reload();
    await expect(page.getByLabel(/API key/)).toHaveValue("");
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.locator("html").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  });

  test("renders a provider draft as two readings, a separating test, and bounded cold proof", async ({ page }) => {
    await page.route("**/api/forge/lesson-draft", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(lessonDraftResponse) });
    });
    await page.goto("/studio");
    await page.getByLabel("Provider").selectOption("anthropic");
    await page.getByLabel(/API key/).fill("temporary-provider-key-123");
    await page.getByRole("button", { name: "Generate unverified lesson draft" }).click();

    await expect(page.getByText("Unverified lesson draft", { exact: true })).toBeVisible();
    await expect(page.getByText("Reading 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Reading 2", { exact: true })).toBeVisible();
    await expect(page.getByText("Separating test", { exact: true })).toBeVisible();
    await expect(page.getByText("AI withdraws · unfamiliar transfer", { exact: true })).toBeVisible();
    await expect(page.getByText("Still untested", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/API key/)).toHaveValue("");
  });
});
