import { expect, test, type Page } from "@playwright/test";

async function seedTeenDeviceProfile(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("forge.device-profile:v1", JSON.stringify({
      schemaVersion: 1,
      profileId: "9be711de-d7a6-4911-b903-f2d829da83d5",
      ageMode: "teen",
      guardianPresent: false,
      createdAt: "2026-07-22T00:00:00.000Z",
    }));
  });
}

async function reachPrimarySourceProof(page: Page): Promise<void> {
  await page.getByRole("radio", { name: "People, vehicles, a streetcar, and storefront signs are visible." }).press("Space");
  await page.getByTestId("commit-initial").click();
  await page.getByLabel("What made this claim seem supported?").fill(
    "A later reader can distinguish visible details from a claim that needs the catalog or a larger interpretation.",
  );
  await page.getByTestId("commit-explanation").click();
  await page.getByRole("radio", { name: "At least one reading is plausible enough to test." }).press("Space");
  await page.getByTestId("accept-compiler").click();
  await page.getByRole("radio", { name: "The catalog will distinguish claims the photograph alone cannot establish." }).press("Space");
  await page.getByTestId("commit-test-prediction").click();
  await page.getByTestId("open-catalog").click();

  const workedCategories = ["observation", "catalog_fact", "inference", "open_question"];
  for (const [index, category] of workedCategories.entries()) {
    await page.getByLabel("Evidence layer").nth(index).selectOption(category);
  }
  await page.getByTestId("submit-worked-test").click();
  await page.getByRole("radio", { name: "Each claim should be limited to what its evidence layer can establish." }).press("Space");
  await page.getByLabel("State the rule in your own words").fill(
    "Each claim needs to stay within what the photograph, catalog record, or remaining uncertainty can actually establish.",
  );
  await page.getByTestId("submit-reconstruction").click();
  await page.getByTestId("acknowledge-withdrawal").click();
  await expect(page.getByTestId("stage-transfer")).toBeVisible();
}

test.describe("Primary Source runtime proof boundary", () => {
  test("keeps the local age gate, proof isolation, 320px layout, reduced motion, and text alternatives intact", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "This focused 320px proof contract runs once in Chromium.");
    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedTeenDeviceProfile(page);
    await page.goto("/learn/primary-source-reasoning");

    await expect(page.getByTestId("world-local-profile-disclosure")).toContainText("Local Teen preference");
    await expect(page.getByTestId("stage-mystery")).toBeVisible();
    await reachPrimarySourceProof(page);

    const proof = page.getByTestId("stage-transfer");
    await expect(proof.getByAltText(/black-and-white negative/i)).toBeVisible();
    await expect(proof.getByRole("button", { name: /hint|help|support|replay|ask|ai/i })).toHaveCount(0);
    await expect(proof.getByText(/This image is unavailable/i)).toHaveCount(0);

    const transferSelects = proof.locator("select");
    await expect(transferSelects).toHaveCount(4);
    for (const [index, category] of ["observation", "catalog_fact", "inference", "open_question"].entries()) {
      await transferSelects.nth(index).selectOption(category);
    }
    await proof.getByLabel("Why do these boundaries fit?").fill(
      "The image, catalog, interpretation, and open question have different evidence boundaries that should not be collapsed.",
    );
    await proof.getByTestId("submit-transfer").click();
    await expect(page.getByTestId("stage-result")).toBeVisible();
    await expect(page.getByText(/does not claim mastery or delayed retention/i)).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    const visibleMotion = await page.locator("main").evaluate((main) => {
      const asMilliseconds = (value: string) => value.split(",").map((entry) => {
        const trimmed = entry.trim();
        return trimmed.endsWith("ms") ? Number.parseFloat(trimmed) : Number.parseFloat(trimmed) * 1_000;
      });
      return Array.from(main.querySelectorAll("*")).flatMap((element) => {
        const styles = getComputedStyle(element);
        const durations = [...asMilliseconds(styles.animationDuration), ...asMilliseconds(styles.transitionDuration)];
        return durations.some((duration) => Number.isFinite(duration) && duration > 20) ? [element.tagName] : [];
      });
    });
    expect(visibleMotion).toEqual([]);
  });

  test("does not let an audience query establish a device age mode", async ({ page }) => {
    await page.goto("/learn/primary-source-reasoning?audience=teen");
    await expect(page.getByTestId("world-device-profile-gate")).toBeVisible();
    await expect(page.getByTestId("stage-mystery")).toHaveCount(0);
  });
});
