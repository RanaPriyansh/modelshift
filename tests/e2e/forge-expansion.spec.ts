import { expect, test } from "@playwright/test";

import lessonDraftResponse from "../fixtures/lesson-draft-response.json";
import { compileLessonDraftPipeline } from "../../src/lib/lesson-studio/pipeline.server";
import { lessonDraftSchema } from "../../src/lib/lesson-studio/schema";

const lessonDraft = lessonDraftSchema.parse(lessonDraftResponse.draft);
const lessonDraftResponseWithPipeline = {
  ...lessonDraftResponse,
  draft: lessonDraft,
  pipeline: compileLessonDraftPipeline(lessonDraft),
  provenance: {
    ...lessonDraftResponse.provenance,
    correlationId: "86fe2328-56f8-4f49-8532-b71066170df2",
    keyHandling: "request_only",
    budget: {
      timeoutMs: 25_000,
      maxOutputTokens: 2_400,
      maxEstimatedCostMicros: 140_000,
      estimatedCostMicros: 80_000,
    },
  },
};

const DEVICE_PROFILE_KEY = "forge.device-profile:v1";

async function seedDeviceProfile(page: import("@playwright/test").Page, ageMode: "child_with_grown_up" | "teen" | "adult") {
  await page.addInitScript(({ key, mode }) => {
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      profileId: "9be711de-d7a6-4911-b903-f2d829da83d5",
      ageMode: mode,
      guardianPresent: mode === "child_with_grown_up",
      createdAt: "2026-07-22T00:00:00.000Z",
    }));
  }, { key: DEVICE_PROFILE_KEY, mode: ageMode });
}

async function seedCorruptDeviceProfile(page: import("@playwright/test").Page) {
  await page.addInitScript((key) => localStorage.setItem(key, "not-json"), DEVICE_PROFILE_KEY);
}

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
    await seedDeviceProfile(page, "teen");
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

  test("does not let forged teen or adult URLs bypass the local device selection gate", async ({ page }) => {
    for (const route of ["/learn/proportional-reasoning", "/learn/primary-source-reasoning"]) {
      await page.goto(`${route}?audience=teen`);
      await expect(page.getByTestId("world-device-profile-gate")).toBeVisible();
      await expect(page.getByRole("radio", { name: /Teen/ })).toBeChecked();
      await expect(page.getByTestId(/(ratio-stage-mystery|stage-mystery)/)).toHaveCount(0);

      await page.goto(`${route}?audience=adult`);
      await expect(page.getByTestId("world-device-profile-gate")).toBeVisible();
      await expect(page.getByRole("radio", { name: /Adult/ })).toBeChecked();
      await expect(page.getByTestId(/(ratio-stage-mystery|stage-mystery)/)).toHaveCount(0);
    }
  });

  test("does not server-render either World from an audience query", async ({ request }) => {
    const ratio = await request.get("/learn/proportional-reasoning?audience=teen");
    expect(await ratio.text()).not.toContain("The two citrus mixes");

    const primarySource = await request.get("/learn/primary-source-reasoning?audience=adult");
    expect(await primarySource.text()).not.toContain("What can this photograph prove?");
  });

  test("holds guardianManaged deep links and corrupt device preferences at the same selection gate", async ({ page }) => {
    await page.goto("/learn/primary-source-reasoning?audience=child_with_grown_up&guardianManaged=true");
    await expect(page.getByTestId("world-device-profile-gate")).toBeVisible();
    await expect(page.getByTestId("stage-mystery")).toHaveCount(0);

    await seedCorruptDeviceProfile(page);
    await page.goto("/learn/primary-source-reasoning?audience=adult");
    await expect(page.getByTestId("world-device-profile-gate")).toBeVisible();
    await expect(page.getByTestId("stage-mystery")).toHaveCount(0);
  });

  test("a child device preference overrides a forged teen query and survives reload behind confirmation", async ({ page }) => {
    await seedDeviceProfile(page, "child_with_grown_up");
    await page.goto("/learn/proportional-reasoning?audience=teen&guardianManaged=true");
    await expect(page.getByTestId("local-grown-up-confirmation")).toBeVisible();
    await expect(page.getByTestId("ratio-stage-mystery")).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId("local-grown-up-confirmation")).toBeVisible();
    await expect(page.getByTestId("ratio-stage-mystery")).toHaveCount(0);
  });

  test("renders teen, adult, and child Worlds only from valid local device paths", async ({ page }) => {
    await seedDeviceProfile(page, "teen");
    await page.goto("/learn/proportional-reasoning");
    await expect(page.getByTestId("world-local-profile-disclosure")).toContainText("Local Teen preference");
    await expect(page.getByTestId("ratio-stage-mystery")).toBeVisible();

    await seedDeviceProfile(page, "adult");
    await page.goto("/learn/primary-source-reasoning");
    await expect(page.getByTestId("world-local-profile-disclosure")).toContainText("Local Adult preference");
    await expect(page.getByTestId("stage-mystery")).toBeVisible();

    await seedDeviceProfile(page, "child_with_grown_up");
    await page.goto("/learn/proportional-reasoning");
    await expect(page.getByTestId("local-grown-up-confirmation")).toBeVisible();
    await page.getByRole("button", { name: "I’m the grown-up managing this session" }).click();
    await expect(page.getByTestId("world-local-profile-disclosure")).toContainText("Local Child + grown-up preference");
    await expect(page.getByTestId("ratio-stage-mystery")).toBeVisible();
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
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(lessonDraftResponseWithPipeline) });
    });
    await page.goto("/studio");
    await page.getByLabel("Provider").selectOption("anthropic");
    await page.getByLabel(/API key/).fill("temporary-provider-key-123");
    await page.getByRole("button", { name: "Generate unverified lesson draft" }).click();

    await expect(page.getByText(/Unverified lesson draft/)).toBeVisible();
    await expect(page.getByText("Reading 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Reading 2", { exact: true })).toBeVisible();
    await expect(page.getByText("Separating test", { exact: true })).toBeVisible();
    await expect(page.getByText("AI withdraws · unfamiliar transfer", { exact: true })).toBeVisible();
    await expect(page.getByText("Still untested", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/API key/)).toHaveValue("");
  });
});
