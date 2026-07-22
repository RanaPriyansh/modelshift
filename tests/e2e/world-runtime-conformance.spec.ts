import { expect, test, type Locator, type Page } from "@playwright/test";

const FALLBACK_INTERPRETATION = {
  schema_version: "1.0",
  hypotheses: [{
    id: "mixed_or_unclear",
    support: "low",
    evidence_spans: [],
    rationale: "More than one interpretation fits the explanation.",
  }],
  missing_distinctions: [],
  recommended_probe_id: "neutral_core_probe",
  recommended_level_1_question_id: "neutral_observation_prompt",
  abstain: true,
  abstain_reason: "model_uncertain",
  source: "fallback",
  fallback_reason: "missing_key",
  providerId: null,
  modelId: null,
  policyId: "policy.force-and-motion.interpretation.v1",
} as const;

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

async function tabTo(page: Page, target: Locator, maximumTabs = 30): Promise<void> {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Keyboard focus did not reach ${await target.getAttribute("aria-label") ?? await target.textContent() ?? "proof control"}.`);
}

async function reachForceProof(page: Page): Promise<Locator> {
  await page.route("**/api/interpret", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FALLBACK_INTERPRETATION),
    });
  });
  await page.goto("/learn/force-and-motion");
  await page.getByRole("radio", { name: "Gradually slows" }).press("Space");
  await page.getByTestId("commit-prediction").click();
  await page.getByRole("textbox", { name: "Your explanation" }).fill(
    "I think motion needs a continuing push, so the craft may gradually slow.",
  );
  await page.getByTestId("submit-explanation").click();
  await page.getByRole("radio", { name: /Only the friction track/ }).press("Space");
  await page.getByTestId("commit-probe-prediction").click();
  await page.getByTestId("run-experiment").click();
  await page.getByRole("textbox", { name: /What do you notice after the push ends\?/ }).fill(
    "Only the friction track changes velocity after the push ends.",
  );
  await page.getByTestId("submit-reflection").click();
  await page.getByRole("textbox", { name: "Your causal rule" }).fill(
    "Net force causes acceleration, and zero net force leaves velocity constant.",
  );
  await page.getByTestId("enter-proof").click();
  return page.getByTestId("stage-proof");
}

async function reachSourceCorroborationProof(page: Page): Promise<Locator> {
  await page.goto("/learn/ai-and-learning");
  await page.getByRole("radio", { name: /It depends/i }).press("Space");
  await page.getByRole("textbox", { name: /Why do you hold that stance\?/i }).fill(
    "The role, access conditions, and later measurement probably change the result.",
  );
  await page.getByTestId("commit-encounter").click();
  await page.getByTestId("accept-two-readings").click();
  await page.getByRole("radio", { name: /better support Reading 02/i }).press("Space");
  await page.getByTestId("commit-test-prediction").click();
  await page.getByTestId("review-bastani-pnas").click();
  await page.getByTestId("review-tutor-copilot").click();
  await page.getByTestId("continue-from-evidence").click();
  await page.getByRole("radio", { name: /Who receives the output/i }).press("Space");
  await page.getByTestId("commit-difference").click();
  await page.getByRole("group", { name: "Reading 01" }).getByRole("radio", { name: "Overreaches the cards" }).press("Space");
  await page.getByRole("group", { name: "Reading 02" }).getByRole("radio", { name: "Fits both cards" }).press("Space");
  await page.getByTestId("commit-readings").click();
  await page.getByRole("radio", { name: /In these studies, learning outcomes differed/i }).press("Space");
  await page.getByTestId("commit-bounded-claim").click();
  await page.getByTestId("acknowledge-withdrawal").click();
  return page.getByTestId("stage-transfer");
}

async function reachRatioProof(page: Page): Promise<Locator> {
  await seedTeenDeviceProfile(page);
  await page.goto("/learn/proportional-reasoning");
  await page.getByRole("radio", { name: "Jug B tastes stronger" }).press("Space");
  await page.getByTestId("ratio-commit-initial").click();
  await page.getByRole("textbox", { name: "Your exact words" }).fill(
    "I compared how much concentrate there is for each cup of water.",
  );
  await page.getByTestId("ratio-commit-explanation").click();
  await page.getByRole("radio", { name: "The drinks should taste equally strong." }).press("Space");
  await page.getByTestId("ratio-commit-test-prediction").click();
  await page.getByTestId("ratio-run-experiment").click();
  await page.getByTestId("ratio-begin-reconstruction").click();
  await page.getByRole("textbox", { name: "Your proportional rule" }).fill(
    "The relationship stays proportional when both quantities are multiplied by the same factor.",
  );
  await page.getByTestId("ratio-submit-reconstruction").click();
  await page.getByTestId("ratio-begin-proof").click();
  return page.getByTestId("ratio-stage-transfer");
}

async function reachPrimarySourceProof(page: Page): Promise<Locator> {
  await seedTeenDeviceProfile(page);
  await page.goto("/learn/primary-source-reasoning");
  await page.getByRole("radio", { name: "People, vehicles, a streetcar, and storefront signs are visible." }).press("Space");
  await page.getByTestId("commit-initial").click();
  await page.getByLabel("What made this claim seem supported?").fill(
    "A reader can distinguish visible detail from a claim needing the catalog or historical interpretation.",
  );
  await page.getByTestId("commit-explanation").click();
  await page.getByRole("radio", { name: "At least one reading is plausible enough to test." }).press("Space");
  await page.getByTestId("accept-compiler").click();
  await page.getByRole("radio", { name: "The catalog will distinguish claims the photograph alone cannot establish." }).press("Space");
  await page.getByTestId("commit-test-prediction").click();
  await page.getByTestId("open-catalog").click();
  for (const [index, category] of ["observation", "catalog_fact", "inference", "open_question"].entries()) {
    await page.getByLabel("Evidence layer").nth(index).selectOption(category);
  }
  await page.getByTestId("submit-worked-test").click();
  await page.getByRole("radio", { name: "Each claim should be limited to what its evidence layer can establish." }).press("Space");
  await page.getByLabel("State the rule in your own words").fill(
    "Each claim stays within what the image, catalog, inference, or open question can establish.",
  );
  await page.getByTestId("submit-reconstruction").click();
  await page.getByTestId("acknowledge-withdrawal").click();
  return page.getByTestId("stage-transfer");
}

type RoutedWorldFixture = {
  readonly name: string;
  readonly reachProof: (page: Page) => Promise<Locator>;
};

const ROUTED_WORLDS: readonly RoutedWorldFixture[] = [
  { name: "Force and Motion", reachProof: reachForceProof },
  { name: "Source Corroboration", reachProof: reachSourceCorroborationProof },
  { name: "Proportional Reasoning", reachProof: reachRatioProof },
  { name: "Primary Source Reasoning", reachProof: reachPrimarySourceProof },
];

test.describe("all released runtime World proof surfaces", () => {
  for (const world of ROUTED_WORLDS) {
    test(`${world.name} preserves proof isolation, focus, access media, and viewport bounds`, async ({ page }, testInfo) => {
      const failures: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") failures.push(`console: ${message.text()}`);
      });
      page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));

      const isCompact = testInfo.project.name === "mobile";
      await page.setViewportSize({ width: isCompact ? 320 : 1440, height: isCompact ? 800 : 900 });
      await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
      const proof = await world.reachProof(page);

      await expect(proof).toBeVisible();
      await expect(proof.getByRole("button", { name: /hint|help|support|replay|ask|contrast|principle|AI/i })).toHaveCount(0);

      const stageMain = page.locator('main[tabindex="-1"]').last();
      await expect(stageMain).toBeFocused();
      const firstProofControl = proof.locator('input:not([type="hidden"]), select, textarea, button').first();
      await tabTo(page, firstProofControl);
      await expect(firstProofControl).toBeFocused();

      const media = await page.evaluate(() => ({
        forcedColors: matchMedia("(forced-colors: active)").matches,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(media).toEqual({ forcedColors: true, reducedMotion: true, overflow: expect.any(Number) });
      expect(media.overflow).toBeLessThanOrEqual(1);

      const visibleMotion = await stageMain.evaluate((main) => {
        const milliseconds = (value: string) => value.split(",").map((entry) => {
          const normalized = entry.trim();
          return normalized.endsWith("ms") ? Number.parseFloat(normalized) : Number.parseFloat(normalized) * 1_000;
        });
        return Array.from(main.querySelectorAll("*")).filter((element) => {
          const styles = getComputedStyle(element);
          return [...milliseconds(styles.animationDuration), ...milliseconds(styles.transitionDuration)]
            .some((duration) => Number.isFinite(duration) && duration > 20);
        }).length;
      });
      expect(visibleMotion).toBe(0);
      expect(failures).toEqual([]);
    });
  }
});
