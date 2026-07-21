import { expect, test, type Locator, type Page } from "@playwright/test";

const FALLBACK_INTERPRETATION = {
  schema_version: "1.0",
  hypotheses: [
    {
      id: "mixed_or_unclear",
      support: "low",
      evidence_spans: [],
      rationale: "More than one interpretation fits the explanation.",
    },
  ],
  missing_distinctions: [],
  recommended_probe_id: "neutral_core_probe",
  recommended_level_1_question_id: "neutral_observation_prompt",
  abstain: true,
  abstain_reason: "model_uncertain",
  source: "fallback",
  fallback_reason: "missing_key",
};

const ADAPTIVE_INTERPRETATION = {
  schema_version: "1.0",
  hypotheses: [
    {
      id: "continuous_force_required",
      support: "high",
      evidence_spans: ["motion needs a continuing push"],
      rationale: "The learner connects continued motion to a continuing push.",
    },
  ],
  missing_distinctions: [
    "force_changes_velocity_not_velocity_itself",
    "zero_net_force_means_zero_acceleration",
  ],
  recommended_probe_id: "friction_contrast",
  recommended_level_1_question_id: "what_differs_between_cases",
  abstain: false,
  abstain_reason: "none",
  source: "model",
};

const EXPLANATION = "The craft may slow because I think motion needs a continuing push.";
const REFLECTION = "Only the friction track changes velocity after the push ends.";
const RECONSTRUCTION = "Net force causes acceleration, and acceleration changes velocity; zero net force keeps velocity constant.";
const TRANSFER_EXPLANATION = "After the thrust ends, zero net force means zero acceleration, so the existing velocity stays constant.";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

async function installNoKeyFallback(page: Page) {
  await page.route("**/api/interpret", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FALLBACK_INTERPRETATION),
    });
  });
}

async function installAdaptiveInterpretation(page: Page) {
  await page.route("**/api/interpret", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ADAPTIVE_INTERPRETATION),
    });
  });
}

async function commitInitialPrediction(page: Page) {
  await page.getByRole("radio", { name: "Gradually slows" }).press("Space");
  await page.getByRole("slider", { name: "How confident are you?" }).fill("55");
  await page.getByRole("button", { name: /Commit prediction/ }).click();
  await expect(page.getByRole("heading", { name: "What makes you think that?" })).toBeVisible();
}

async function reachProofMode(page: Page, useSupport: boolean) {
  await commitInitialPrediction(page);
  await page.getByRole("textbox", { name: "Your explanation" }).fill(EXPLANATION);
  await page.getByRole("button", { name: /Use my explanation/ }).click();

  await expect(page.getByRole("heading", { name: "The test that separates the models" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("baseline test");
  await page.getByText("How this test was chosen").click();
  await expect(page.getByText(/Deterministic fallback \(missing_key\)/)).toBeVisible();

  await page.getByRole("radio", { name: /Only the friction track/ }).press("Space");
  await page.getByRole("button", { name: /Commit and open the test/ }).click();
  await expect(page.getByRole("heading", { name: "The baseline coast test" })).toBeVisible();

  await page.getByRole("button", { name: /Run experiment/ }).click();
  await expect(page.getByText(/Same short push\. Different force afterward\./)).toBeVisible();
  if (useSupport) {
    await page.getByRole("button", { name: /ask one question/ }).click();
    await expect(page.getByText(/Attention cue • Level 1/)).toBeVisible();
  }

  await page.getByRole("textbox", { name: "What do you notice after the push ends?" }).fill(REFLECTION);
  await page.getByRole("button", { name: /Rebuild the rule/ }).click();
  await expect(page.getByRole("heading", { name: "Build the rule in your own words" })).toBeVisible();

  await page.getByRole("textbox", { name: "Your causal rule" }).fill(RECONSTRUCTION);
  await page.getByRole("button", { name: /Enter proof mode/ }).click();
  await expect(page.getByRole("heading", { name: "New cargo pod. Explain and prove." })).toBeVisible();
}

async function tabTo(page: Page, locator: Locator, maximumTabs = 40) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await locator.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Could not reach ${await locator.getAttribute("aria-label") ?? await locator.textContent() ?? "target"} with Tab`);
}

async function keyboardActivate(page: Page, locator: Locator) {
  await tabTo(page, locator);
  await page.keyboard.press("Space");
}

async function keyboardType(page: Page, locator: Locator, value: string) {
  await tabTo(page, locator);
  await page.keyboard.type(value);
}

test.describe("ModelShift production journey", () => {
  test("completes the no-key fallback loop and records truthful evidence", async ({ page }) => {
    const consoleFailures = captureConsoleFailures(page);
    await installNoKeyFallback(page);

    await page.goto("/");
    await expect(page).toHaveTitle("ModelShift — Proof after help");
    await expect(page.getByRole("heading", { name: "The engine is off. What happens next?" })).toBeVisible();

    await reachProofMode(page, true);

    const proof = page.getByTestId("stage-proof");
    await expect(proof).toHaveAttribute("data-proof-locked", "true");
    await expect(page.getByText("AI assistance is now off")).toBeVisible();
    await expect(page.getByText("No hints • no replay • submit once")).toBeVisible();
    await expect(proof.getByRole("button", { name: /hint|help|support|replay|ask|contrast|principle|AI/i })).toHaveCount(0);
    await expect(proof.getByText(/How this test was chosen|Deterministic fallback/)).toHaveCount(0);

    await page.getByRole("radio", { name: /stays constant above zero/ }).press("Space");
    await page.getByRole("textbox", { name: "Explain your choice in one or two sentences." }).fill(TRANSFER_EXPLANATION);
    await page.getByRole("button", { name: /Submit once/ }).click();

    await expect(page.getByRole("heading", { name: "An evidence trail, not a mastery score" })).toBeVisible();
    const evidence = page.getByTestId("stage-result");
    await expect(evidence.getByText("Before", { exact: true })).toBeVisible();
    await expect(evidence.getByText("Test", { exact: true })).toBeVisible();
    await expect(evidence.getByText("Support", { exact: true })).toBeVisible();
    await expect(evidence.getByText("Alone", { exact: true })).toBeVisible();
    await expect(evidence.getByText("Later", { exact: true })).toBeVisible();
    await expect(evidence.getByText("One attention cue", { exact: true })).toBeVisible();
    await expect(evidence.getByText("Matched the new representation", { exact: true })).toBeVisible();
    await expect(evidence.getByText("Not tested yet", { exact: true })).toBeVisible();

    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
    expect(consoleFailures).toEqual([]);
  });

  test("is operable end to end with keyboard input only", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Keyboard traversal is covered once; the complete journey runs in both viewports.");
    const consoleFailures = captureConsoleFailures(page);
    await installNoKeyFallback(page);
    await page.goto("/");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to the experiment" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();

    await keyboardActivate(page, page.getByRole("radio", { name: "Stops immediately" }));
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio", { name: "Gradually slows" })).toBeChecked();
    await tabTo(page, page.getByRole("slider", { name: "How confident are you?" }));
    await page.keyboard.press("ArrowLeft");
    await keyboardActivate(page, page.getByRole("button", { name: /Commit prediction/ }));

    await keyboardType(page, page.getByRole("textbox", { name: "Your explanation" }), EXPLANATION);
    await keyboardActivate(page, page.getByRole("button", { name: /Use my explanation/ }));
    await expect(page.getByRole("heading", { name: "The test that separates the models" })).toBeVisible();

    await keyboardActivate(page, page.getByRole("radio", { name: /Only the friction track/ }));
    await keyboardActivate(page, page.getByRole("button", { name: /Commit and open the test/ }));
    await keyboardActivate(page, page.getByRole("button", { name: /Run experiment/ }));
    await keyboardType(page, page.getByRole("textbox", { name: "What do you notice after the push ends?" }), REFLECTION);
    await keyboardActivate(page, page.getByRole("button", { name: /Rebuild the rule/ }));
    await keyboardType(page, page.getByRole("textbox", { name: "Your causal rule" }), RECONSTRUCTION);
    await keyboardActivate(page, page.getByRole("button", { name: /Enter proof mode/ }));

    await expect(page.getByText("AI assistance is now off")).toBeVisible();
    await keyboardActivate(page, page.getByRole("radio", { name: /returns to zero/ }));
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio", { name: /stays constant above zero/ })).toBeChecked();
    await keyboardType(page, page.getByRole("textbox", { name: "Explain your choice in one or two sentences." }), TRANSFER_EXPLANATION);
    await keyboardActivate(page, page.getByRole("button", { name: /Submit once/ }));
    await expect(page.getByText("Matched the new representation", { exact: true })).toBeVisible();
    expect(consoleFailures).toEqual([]);
  });

  test("uses the authored fallback when the interpretation request times out", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The network failure contract is viewport-independent.");
    const consoleFailures = captureConsoleFailures(page);
    let delayedRouteSettled = false;
    await page.route("**/api/interpret", async (route) => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 7_600));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ADAPTIVE_INTERPRETATION),
        });
      } catch {
        // The client is expected to abort this still-pending request first.
      } finally {
        delayedRouteSettled = true;
      }
    });
    await page.goto("/");

    await commitInitialPrediction(page);
    await page.getByRole("textbox", { name: "Your explanation" }).fill(EXPLANATION);
    const submittedAt = Date.now();
    await page.getByRole("button", { name: /Use my explanation/ }).click();

    await expect(page.getByRole("heading", { name: "The test that separates the models" })).toBeVisible({ timeout: 10_000 });
    expect(Date.now() - submittedAt).toBeGreaterThanOrEqual(6_500);
    await expect(page.getByRole("status")).toContainText("baseline test");
    await page.getByText("How this test was chosen").click();
    await expect(page.getByText(/Deterministic fallback \(timeout\)/)).toBeVisible();
    await expect.poll(() => delayedRouteSettled, { timeout: 2_000 }).toBe(true);
    expect(consoleFailures).toEqual([]);
  });

  test("completes a valid adaptive journey and reloads to a clean Predict stage", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The full adaptive contract is covered once on desktop.");
    const consoleFailures = captureConsoleFailures(page);
    await installAdaptiveInterpretation(page);
    await page.goto("/");

    await commitInitialPrediction(page);
    await page.getByRole("textbox", { name: "Your explanation" }).fill(EXPLANATION);
    await page.getByRole("button", { name: /Use my explanation/ }).click();

    await expect(page.getByRole("heading", { name: "The test that separates the models" })).toBeVisible();
    await expect(page.getByText("Friction or no friction?", { exact: true })).toBeVisible();
    await page.getByText("How this test was chosen").click();
    await expect(page.getByText(/GPT-5\.6, after schema and semantic validation/)).toBeVisible();

    await page.getByRole("radio", { name: /The no-resistance puck/ }).press("Space");
    await page.getByRole("button", { name: /Commit and open the test/ }).click();
    await expect(page.getByRole("heading", { name: "Friction or no friction?" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Friction strength" })).toBeVisible();
    await page.getByRole("button", { name: /Run experiment/ }).click();
    await expect(page.getByText(/Same short push\. Different force afterward\./)).toBeVisible();

    await page.getByRole("textbox", { name: "What do you notice after the push ends?" }).fill(REFLECTION);
    await page.getByRole("button", { name: /Rebuild the rule/ }).click();
    await page.getByRole("textbox", { name: "Your causal rule" }).fill(RECONSTRUCTION);
    await page.getByRole("button", { name: /Enter proof mode/ }).click();
    await expect(page.getByText("AI assistance is now off")).toBeVisible();

    await page.getByRole("radio", { name: /stays constant above zero/ }).press("Space");
    await page.getByRole("textbox", { name: "Explain your choice in one or two sentences." }).fill(TRANSFER_EXPLANATION);
    await page.getByRole("button", { name: /Submit once/ }).click();

    const evidence = page.getByTestId("stage-result");
    await expect(evidence.getByText("Friction contrast", { exact: true })).toBeVisible();
    await expect(evidence.getByText("No conceptual help", { exact: true })).toBeVisible();
    await expect(evidence.getByText("Matched the new representation", { exact: true })).toBeVisible();

    await page.reload();

    await expect(page.getByTestId("stage-predict")).toBeVisible();
    await expect(page.getByRole("heading", { name: "The engine is off. What happens next?" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Gradually slows" })).not.toBeChecked();
    await expect(page.getByRole("slider", { name: "How confident are you?" })).toHaveValue("70");
    await expect(page.getByTestId("stage-experiment")).toHaveCount(0);
    await expect(page.getByText("Friction or no friction?", { exact: true })).toHaveCount(0);
    expect(consoleFailures).toEqual([]);
  });

  test("honors the reduced-motion preference", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Reduced-motion CSS is shared across viewports.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const preferences = await page.getByTestId("stage-predict").evaluate((stage) => {
      const durationToMilliseconds = (duration: string) => Math.max(
        ...duration.split(",").map((value) => {
          const normalized = value.trim();
          return normalized.endsWith("ms") ? Number.parseFloat(normalized) : Number.parseFloat(normalized) * 1000;
        }),
      );
      const stageStyles = getComputedStyle(stage);
      const buttonStyles = getComputedStyle(stage.querySelector("button")!);
      return {
        mediaMatches: matchMedia("(prefers-reduced-motion: reduce)").matches,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        animationMilliseconds: durationToMilliseconds(stageStyles.animationDuration),
        transitionMilliseconds: durationToMilliseconds(buttonStyles.transitionDuration),
      };
    });

    expect(preferences.mediaMatches).toBe(true);
    expect(preferences.scrollBehavior).toBe("auto");
    expect(preferences.animationMilliseconds).toBeLessThanOrEqual(1);
    expect(preferences.transitionMilliseconds).toBeLessThanOrEqual(1);
  });
});
