import { expect, test, type Locator, type Page } from "@playwright/test";

const DEVICE_PROFILE_KEY = "forge.device-profile:v1";

const WORLD_CASES = [
  {
    route: "/learn/force-and-motion",
    allowedLabels: ["Teen", "Adult"],
    worldTestId: "stage-predict",
  },
  {
    route: "/learn/ai-and-learning",
    allowedLabels: ["Teen", "Adult"],
    worldTestId: "evidence-learning-world",
  },
  {
    route: "/learn/proportional-reasoning",
    allowedLabels: ["Child + grown-up", "Teen", "Adult"],
    worldTestId: "ratio-stage-mystery",
  },
  {
    route: "/learn/primary-source-reasoning",
    allowedLabels: ["Child + grown-up", "Teen", "Adult"],
    worldTestId: "stage-mystery",
  },
] as const;

async function seedDeviceProfile(
  page: Page,
  ageMode: "child_with_grown_up" | "teen" | "adult",
) {
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

async function tabTo(page: Page, target: Locator, maximumTabs = 12) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error("Keyboard focus did not reach the registry-derived device-mode control.");
}

test.describe("registry-driven World entry eligibility", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The eligibility contract runs once in Chromium.");
  });

  test("gates every direct World route and offers exactly its released registry modes", async ({ page }) => {
    for (const world of WORLD_CASES) {
      await page.goto(world.route);

      const gate = page.getByTestId("world-device-profile-gate");
      await expect(gate).toBeVisible();
      await expect(page.getByTestId(world.worldTestId)).toHaveCount(0);
      const radios = gate.getByRole("radio");
      await expect(radios).toHaveCount(world.allowedLabels.length);
      expect(await radios.evaluateAll((controls) => controls.map((control) => (
        (control as HTMLInputElement).value
      )))).toEqual(world.allowedLabels.map((label) => (
        label === "Child + grown-up" ? "child_with_grown_up" : label.toLowerCase()
      )));
    }
  });

  test("does not let URL hints add child eligibility or render a World", async ({ page }) => {
    await page.goto("/learn/force-and-motion?audience=child_with_grown_up&guardianManaged=true");

    await expect(page.getByTestId("world-device-profile-gate")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Child \+ grown-up/ })).toHaveCount(0);
    await expect(page.getByTestId("stage-predict")).toHaveCount(0);
  });

  test("server-renders the gate instead of World content for every direct URL", async ({ request }) => {
    const stageCopyByRoute = new Map([
      ["/learn/force-and-motion", "The engine is off. What happens next?"],
      ["/learn/ai-and-learning", "Commit before the evidence appears."],
      ["/learn/proportional-reasoning", "The two citrus mixes"],
      ["/learn/primary-source-reasoning", "What can this photograph prove?"],
    ]);

    for (const world of WORLD_CASES) {
      const response = await request.get(`${world.route}?audience=adult&guardianManaged=true`);
      const html = await response.text();
      expect(response.ok()).toBe(true);
      expect(html).toContain("Choose a device learning mode before opening");
      expect(html).not.toContain(stageCopyByRoute.get(world.route));
    }
  });

  test("refuses child-profile direct entry when the released World excludes child mode", async ({ page }) => {
    await seedDeviceProfile(page, "child_with_grown_up");

    for (const world of WORLD_CASES.slice(0, 2)) {
      await page.goto(world.route);
      const refusal = page.getByTestId("world-device-profile-refusal");
      await expect(refusal).toBeVisible();
      await expect(page.getByTestId(world.worldTestId)).toHaveCount(0);
      await expect(refusal.getByRole("alert")).toContainText("direct entry stays closed");
      await expect(page.getByText("No cloud account, provider, or external service was contacted.")).toBeVisible();
    }
  });

  test("pins an eligible local mode before rendering and restores it across all four Worlds", async ({ page }) => {
    await page.goto("/learn/force-and-motion?audience=teen");
    const teen = page.getByRole("radio", { name: /Teen/ });
    await expect(teen).toBeChecked();
    await page.getByRole("button", { name: "Use this device mode" }).click();
    await expect(page.getByTestId("stage-predict")).toBeVisible();

    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), DEVICE_PROFILE_KEY);
    expect(stored).toMatchObject({
      schemaVersion: 1,
      ageMode: "teen",
      guardianPresent: false,
    });

    for (const world of WORLD_CASES) {
      await page.goto(world.route);
      await expect(page.getByTestId("world-local-profile-disclosure")).toContainText(
        "accepted against this World's registry",
      );
      await expect(page.getByTestId(world.worldTestId)).toBeVisible();
    }
  });

  test("keeps the gate keyboard-operable and bounded at 320px with reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/learn/force-and-motion");

    const teen = page.getByRole("radio", { name: /Teen/ });
    await tabTo(page, teen);
    await expect(teen).toBeFocused();
    await teen.press("Space");
    await expect(teen).toBeChecked();
    await expect(page.getByRole("button", { name: "Use this device mode" })).toBeEnabled();

    const layout = await page.getByTestId("world-device-profile-gate").evaluate((gate) => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      labels: Array.from(gate.querySelectorAll<HTMLLabelElement>("fieldset > label")).map((label) => (
        label.getBoundingClientRect().height
      )),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    }));
    expect(layout.overflow).toBeLessThanOrEqual(1);
    expect(layout.labels.every((height) => height >= 44)).toBe(true);
    expect(layout.reducedMotion).toBe(true);
  });

  test("keeps Studio authoring unavailable without a distinct server author entitlement", async ({ page }) => {
    await page.goto("/studio");

    await expect(page).toHaveURL(/\/author$/);
    await expect(page.getByRole("heading", { name: "The author workspace is not available." })).toBeVisible();
    await expect(page.getByLabel(/API key/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Generate unverified lesson draft" })).toHaveCount(0);
  });
});
