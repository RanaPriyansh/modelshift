import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const REVIEW_DIR = join("test-results", "forge-review");

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
  providerId: null,
  modelId: null,
  policyId: "policy.force-and-motion.interpretation.v1",
} as const;

type RouteCase = {
  path: string;
  slug: string;
  title: RegExp;
  heading: RegExp;
  world: boolean;
  deviceProfile?: "child_with_grown_up" | "teen" | "adult";
};

const ROUTES: readonly RouteCase[] = [
  {
    path: "/",
    slug: "home",
    title: /FORGE/i,
    heading: /What do you want to understand\?/i,
    world: false,
  },
  {
    path: "/learn/force-and-motion",
    slug: "force-and-motion",
    title: /Force & motion — FORGE/i,
    heading: /The engine is off\. What happens next\?/i,
    world: true,
  },
  {
    path: "/learn/ai-and-learning",
    slug: "ai-and-learning",
    title: /AI & learning — FORGE/i,
    heading: /Commit before the evidence appears\./i,
    world: true,
  },
  {
    path: "/learn/proportional-reasoning",
    slug: "proportional-reasoning",
    title: /Proportional reasoning — FORGE/i,
    heading: /The two citrus mixes/i,
    world: true,
    deviceProfile: "teen",
  },
  {
    path: "/trail",
    slug: "trail",
    title: /Your Trail — FORGE/i,
    heading: /A map of questions and evidence—not a level\./i,
    world: false,
  },
  {
    path: "/evidence",
    slug: "evidence",
    title: /Evidence — FORGE/i,
    heading: /Proof should say exactly what happened\./i,
    world: false,
  },
  {
    path: "/pathways",
    slug: "pathways",
    title: /Current availability — FORGE/i,
    heading: /What FORGE can—and cannot—offer today\./i,
    world: false,
  },
] as const;

function capturePageFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  return failures;
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function captureViewport(page: Page, testInfo: TestInfo, slug: string): Promise<void> {
  await mkdir(REVIEW_DIR, { recursive: true });
  await page.screenshot({
    path: join(REVIEW_DIR, `${testInfo.project.name}-${slug}.png`),
    fullPage: false,
  });
}

async function tabTo(page: Page, target: Locator, maximumTabs = 45): Promise<void> {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Keyboard focus did not reach ${await target.textContent() ?? "the target"}.`);
}

async function installPhysicsFallback(page: Page): Promise<void> {
  await page.route("**/api/interpret", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FALLBACK_INTERPRETATION),
    });
  });
}

async function seedDeviceProfile(page: Page, ageMode: "child_with_grown_up" | "teen" | "adult"): Promise<void> {
  await page.addInitScript((mode) => {
    localStorage.setItem("forge.device-profile:v1", JSON.stringify({
      schemaVersion: 1,
      profileId: "9be711de-d7a6-4911-b903-f2d829da83d5",
      ageMode: mode,
      guardianPresent: mode === "child_with_grown_up",
      createdAt: "2026-07-22T00:00:00.000Z",
    }));
  }, ageMode);
}

async function reachPhysicsProof(page: Page): Promise<void> {
  await installPhysicsFallback(page);
  await page.goto("/learn/force-and-motion");
  await page.getByRole("radio", { name: "Gradually slows" }).press("Space");
  await page.getByTestId("commit-prediction").click();
  await page.getByRole("textbox", { name: "Your explanation" }).fill(
    "I think motion needs a continuing push, so the craft may gradually slow.",
  );
  await page.getByTestId("submit-explanation").click();
  await expect(page.getByTestId("stage-interpret")).toBeVisible();
  await page.getByRole("radio", { name: /Only the friction track/ }).press("Space");
  await page.getByTestId("commit-probe-prediction").click();
  await page.getByTestId("run-experiment").click();
  await page.getByRole("textbox", { name: /What do you notice after the push ends\?/ }).fill(
    "Only the friction track changes velocity after the push ends.",
  );
  await page.getByTestId("submit-reflection").click();
  await page.getByRole("textbox", { name: "Your causal rule" }).fill(
    "Net force causes acceleration, and acceleration changes velocity; zero net force keeps velocity constant.",
  );
  await page.getByTestId("enter-proof").click();
  await expect(page.getByTestId("stage-proof")).toBeVisible();
}

async function reachEvidenceWorldProof(page: Page): Promise<void> {
  await page.goto("/learn/ai-and-learning");
  await page.getByRole("radio", { name: /It depends/i }).press("Space");
  await page.getByRole("textbox", { name: /Why do you hold that stance\?/i }).fill(
    "The role, access conditions, and later measurement probably change the result.",
  );
  await page.getByTestId("commit-encounter").click();
  await expect(page.getByTestId("stage-compiler")).toBeVisible();
  await page.getByTestId("accept-two-readings").click();
  await page.getByRole("radio", { name: /better support Reading 02/i }).press("Space");
  await page.getByTestId("commit-test-prediction").click();
  await page.getByTestId("review-bastani-pnas").click();
  await page.getByTestId("review-tutor-copilot").click();
  await page.getByTestId("continue-from-evidence").click();
  await page.getByRole("radio", { name: /Who receives the output/i }).press("Space");
  await page.getByTestId("commit-difference").click();

  const readingOne = page.getByRole("group", { name: "Reading 01" });
  const readingTwo = page.getByRole("group", { name: "Reading 02" });
  await readingOne.getByRole("radio", { name: "Overreaches the cards" }).press("Space");
  await readingTwo.getByRole("radio", { name: "Fits both cards" }).press("Space");
  await page.getByTestId("commit-readings").click();
  await page.getByRole("radio", { name: /In these studies, learning outcomes differed/i }).press("Space");
  await page.getByTestId("commit-bounded-claim").click();
  await expect(page.getByTestId("stage-withdrawal")).toBeVisible();
  await page.getByTestId("acknowledge-withdrawal").click();
  await expect(page.getByTestId("stage-transfer")).toBeVisible();
}

async function reachRatioProof(page: Page): Promise<void> {
  await seedDeviceProfile(page, "teen");
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
  await expect(page.getByTestId("ratio-stage-transfer")).toBeVisible();
}

test.describe("FORGE cross-route release contract", () => {
  for (const route of ROUTES) {
    test(`${route.slug} renders cleanly without horizontal overflow`, async ({ page }, testInfo) => {
      const failures = capturePageFailures(page);
      if (route.deviceProfile) await seedDeviceProfile(page, route.deviceProfile);
      const response = await page.goto(route.path);

      expect(response?.ok(), `${route.path} should return a successful document`).toBe(true);
      await expect(page).toHaveTitle(route.title);
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "FORGE Learning OS home" })).toBeVisible();
      const frameworkPortalText = await page.locator("nextjs-portal").allTextContents();
      expect(frameworkPortalText.join(" ")).not.toMatch(
        /Unhandled Runtime Error|Build Error|Application error|Failed to compile/i,
      );

      if (route.world) {
        await expect(page.getByRole("link", { name: /Exit world/i })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(0);
        await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
        expect(await page.evaluate(() => window.scrollY), `${route.path} should preserve its FORGE worldbar on entry`).toBe(0);
      }

      await expectNoHorizontalOverflow(page);
      await captureViewport(page, testInfo, route.slug);
      expect(failures).toEqual([]);
    });
  }

  test("pathway availability exposes four working World mappings and five non-actionable gaps", async ({ page }) => {
    const failures = capturePageFailures(page);
    await page.goto("/pathways");

    const map = page.getByRole("list", { name: "Current pathway availability by entitlement area" });
    await expect(map).toBeVisible();
    await expect(map.getByText("Working World mapping", { exact: true })).toHaveCount(4);
    await expect(map.getByText("Identified gap", { exact: true })).toHaveCount(5);
    await expect(map.getByRole("link", { name: /Open .+ World/ })).toHaveCount(4);
    await expect(page.getByText("4 working World mappings appear across 9 entitlement areas. 5 identified gaps remain visible instead of being filled with a course list, a generated lesson, or a promise.")).toBeVisible();
    await expect(page.getByText("Not a curriculum, recommendation, or coverage claim.")).toBeVisible();
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveCount(1);
    await expect(description).toHaveAttribute("content", "A read-only map of current working World mappings and explicit entitlement gaps, not a coverage claim.");
    await expect(page.getByRole("heading", { name: "Compare and scale proportional relationships" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Distinguish net force from velocity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Keep historical claims inside their evidence boundary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Corroborate a model-generated factual claim" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/capability coverage/i);

    for (const area of ["language-literacy", "arts-design", "practical-life", "civic-media", "health-movement"]) {
      const gap = page.getByTestId(`pathway-identified-gap-${area}`);
      await expect(gap.getByRole("link")).toHaveCount(0);
      await expect(gap).not.toContainText(/return proof|recommended|schedule/i);
    }
    expect(failures).toEqual([]);
  });

  test("home planner renders grounded and exploratory paths from real typed questions", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Planner semantics are viewport-independent; home layout runs in both projects.");
    const failures = capturePageFailures(page);
    await page.goto("/");

    const question = page.getByRole("textbox", { name: "Your question" });
    await question.fill("Help me understand force and motion after a push ends.");
    await page.getByRole("button", { name: /Shape my first move/ }).click();
    const grounded = page.getByTestId("forge-plan-grounded");
    await expect(grounded).toBeVisible();
    await expect(grounded).toContainText("Current working World route");
    await expect(grounded.getByRole("link", { name: /Enter working World/ })).toHaveAttribute(
      "href",
      "/learn/force-and-motion",
    );

    await question.fill("How do fungi and tree roots trade nutrients under a forest floor?");
    await page.getByRole("button", { name: /Shape my first move/ }).click();
    const exploratory = page.getByTestId("forge-plan-exploratory");
    await expect(exploratory).toBeVisible();
    await expect(exploratory).toContainText("not yet verified");
    await expect(exploratory).toContainText("Your question was used for this response and was not added to a learner profile.");
    expect(failures).toEqual([]);
  });

  test("planner API distinguishes reviewed, unknown, and child-safety boundaries", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The planner API contract is viewport-independent.");
    await page.goto("/");
    const origin = new URL(page.url()).origin;
    const base = {
      ageMode: "teen",
      depth: "standard",
      startingPoint: "curious",
      successShape: "explain",
      guardianManaged: false,
      sourceMode: "curated",
    } as const;
    const post = (data: Record<string, unknown>) => page.request.post("/api/forge/plan", {
      data,
      headers: { Origin: origin, "Content-Type": "application/json" },
    });

    const groundedResponse = await post({ ...base, question: "Help me understand force and motion" });
    expect(groundedResponse.status()).toBe(200);
    const grounded = await groundedResponse.json();
    expect(grounded).toMatchObject({
      contractKind: "grounded_learning",
      route: { topicId: "force_motion", worldId: "world.force-and-motion" },
      grounding: { status: "grounded_in_authored_sources" },
    });
    expect(grounded.grounding.sourceIds).toEqual(["source.openstax.newtons-first-law"]);

    const exploratoryResponse = await post({ ...base, question: "How do fungi trade nutrients with tree roots?" });
    expect(exploratoryResponse.status()).toBe(200);
    const exploratory = await exploratoryResponse.json();
    expect(exploratory).toMatchObject({
      contractKind: "exploratory_source_plan",
      route: { topicId: null, worldId: null, confidence: "no_authored_match" },
      grounding: { status: "unverified_exploratory", sourceIds: [], sources: [] },
    });

    const childWithoutGuardian = await post({
      ...base,
      question: "Help me understand force and motion",
      ageMode: "child",
    });
    expect(childWithoutGuardian.status()).toBe(403);
    await expect(childWithoutGuardian.json()).resolves.toMatchObject({
      contractKind: "refusal",
      reason: "guardian_required",
    });

    const childForceWithGuardian = await post({
      ...base,
      question: "Help me understand force and motion",
      ageMode: "child",
      guardianManaged: true,
    });
    expect(childForceWithGuardian.status()).toBe(403);
    await expect(childForceWithGuardian.json()).resolves.toMatchObject({
      contractKind: "refusal",
      reason: "world_not_reviewed_for_age",
    });

    const childOpenWeb = await post({
      ...base,
      question: "Help me understand force and motion",
      ageMode: "child",
      guardianManaged: true,
      sourceMode: "open_web",
    });
    expect(childOpenWeb.status()).toBe(403);
    await expect(childOpenWeb.json()).resolves.toMatchObject({
      contractKind: "refusal",
      reason: "child_source_mode_disallowed",
    });
  });

  test("child planning requires an explicit grown-up-present confirmation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The child safety form contract is viewport-independent.");
    let plannerRequests = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/forge/plan") plannerRequests += 1;
    });
    await page.goto("/");
    await page.getByRole("textbox", { name: "Your question" }).fill("Help me understand proportional reasoning and ratios.");
    await page.getByRole("radio", { name: /Child \+ grown-up/ }).press("Space");

    const confirmation = page.getByRole("checkbox", { name: /A grown-up is here and managing this session/i });
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toHaveAttribute("required", "");
    await expect(confirmation).not.toBeChecked();
    await page.getByRole("button", { name: /Shape my first move/ }).click();
    await expect(confirmation).toBeFocused();
    expect(plannerRequests).toBe(0);
    await expect(page.getByTestId(/forge-plan-/)).toHaveCount(0);

    await confirmation.press("Space");
    await expect(confirmation).toBeChecked();
    await page.getByRole("button", { name: /Shape my first move/ }).click();
    const grounded = page.getByTestId("forge-plan-grounded");
    await expect(grounded).toBeVisible();
    await expect(grounded.getByRole("link", { name: /Enter working World/ })).toHaveAttribute(
      "href",
      "/learn/proportional-reasoning?audience=child_with_grown_up",
    );
    expect(plannerRequests).toBe(1);
  });

  test("direct under-13 ratio route needs a local child profile and a grown-up confirmation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The direct-route safety gate is viewport-independent.");
    await page.goto("/learn/proportional-reasoning?audience=child_with_grown_up&guardianManaged=true");
    await expect(page.getByTestId("world-device-profile-gate")).toBeVisible();
    await expect(page.getByTestId("ratio-stage-mystery")).toHaveCount(0);
    await seedDeviceProfile(page, "child_with_grown_up");
    await page.goto("/learn/proportional-reasoning?audience=teen&guardianManaged=true");
    await expect(page.getByRole("heading", { name: "A grown-up needs to join this learning session." })).toBeVisible();
    await expect(page.getByTestId("ratio-stage-mystery")).toHaveCount(0);
    await expect(page.getByText(/does not verify identity/i)).toBeVisible();

    await page.getByRole("button", { name: "I’m the grown-up managing this session" }).click();
    await expect(page.getByTestId("ratio-stage-mystery")).toBeVisible();
    await expect(page.getByRole("heading", { name: "The two citrus mixes" })).toBeVisible();
  });

  test("real input unlocks the force and ratio world actions", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Input-state semantics are viewport-independent.");
    await installPhysicsFallback(page);
    await page.goto("/learn/force-and-motion");
    const physicsCommit = page.getByTestId("commit-prediction");
    await expect(physicsCommit).toBeDisabled();
    await page.getByRole("radio", { name: "Gradually slows" }).press("Space");
    await expect(physicsCommit).toBeEnabled();
    await physicsCommit.click();
    const physicsExplanation = page.getByTestId("submit-explanation");
    await expect(physicsExplanation).toBeDisabled();
    await page.getByRole("textbox", { name: "Your explanation" }).fill("The engine stopped, so I expect the push to end.");
    await expect(physicsExplanation).toBeEnabled();

    await seedDeviceProfile(page, "teen");
    await page.goto("/learn/proportional-reasoning");
    const ratioCommit = page.getByTestId("ratio-commit-initial");
    await expect(ratioCommit).toBeDisabled();
    await page.getByRole("radio", { name: "Jug B tastes stronger" }).press("Space");
    await expect(ratioCommit).toBeEnabled();
    await ratioCommit.click();
    const ratioExplanation = page.getByTestId("ratio-commit-explanation");
    await expect(ratioExplanation).toBeDisabled();
    await page.getByRole("textbox", { name: "Your exact words" }).fill("I compared concentrate per cup of water.");
    await expect(ratioExplanation).toBeEnabled();
  });

  test("AI World moves keyboard focus into each newly opened stage", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Focus continuity uses the shared DOM behavior.");
    await page.goto("/learn/ai-and-learning");
    await page.getByRole("radio", { name: /It depends/i }).press("Space");
    await page.getByRole("textbox", { name: /Why do you hold that stance\?/i }).fill(
      "The role, access conditions, and later measurement probably change the result.",
    );
    await page.getByTestId("commit-encounter").click();
    await expect(page.getByRole("main", { name: "compiler learning stage" })).toBeFocused();
    await page.getByTestId("accept-two-readings").click();
    await page.getByRole("radio", { name: /better support Reading 02/i }).press("Space");
    await page.getByTestId("commit-test-prediction").click();
    await expect(page.getByRole("main", { name: "evidence learning stage" })).toBeFocused();
    await page.getByTestId("review-bastani-pnas").click();
    await page.getByTestId("review-tutor-copilot").click();
    await page.getByTestId("continue-from-evidence").click();
    await expect(page.getByRole("main", { name: "difference learning stage" })).toBeFocused();
    await page.getByRole("radio", { name: /Who receives the output/i }).press("Space");
    await page.getByTestId("commit-difference").click();
    await expect(page.getByRole("main", { name: "readings learning stage" })).toBeFocused();
    await page.getByRole("group", { name: "Reading 01" }).getByRole("radio", { name: "Overreaches the cards" }).press("Space");
    await page.getByRole("group", { name: "Reading 02" }).getByRole("radio", { name: "Fits both cards" }).press("Space");
    await page.getByTestId("commit-readings").click();
    await expect(page.getByRole("main", { name: "reconstruct learning stage" })).toBeFocused();
    await page.getByRole("radio", { name: /In these studies, learning outcomes differed/i }).press("Space");
    await page.getByTestId("commit-bounded-claim").click();
    await expect(page.getByRole("main", { name: "withdrawal learning stage" })).toBeFocused();
    await page.getByTestId("acknowledge-withdrawal").click();
    await expect(page.getByRole("main", { name: "transfer learning stage" })).toBeFocused();
  });

  test("AI World preserves visible radio focus and native state in forced colors", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Forced-colors focus styling is shared across viewport projects.");
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/learn/ai-and-learning");
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);

    const stance = page.getByRole("radio", { name: /Agree The claim fits/i });
    await tabTo(page, stance, 12);
    await expect(stance).toBeFocused();
    const renderedFocus = await stance.evaluate((input) => {
      const control = input as HTMLInputElement;
      const indicator = control.nextElementSibling as HTMLElement | null;
      const label = control.closest("label");
      if (!indicator || !label) throw new Error("The authored radio control is missing its visible shell.");
      const controlStyle = getComputedStyle(control);
      const indicatorStyle = getComputedStyle(indicator);
      const labelStyle = getComputedStyle(label);
      return {
        appearance: controlStyle.appearance,
        indicatorDisplay: indicatorStyle.display,
        labelBorderStyle: labelStyle.borderTopStyle,
        labelBorderWidth: Number.parseFloat(labelStyle.borderTopWidth),
        opacity: controlStyle.opacity,
        outlineStyle: controlStyle.outlineStyle,
        outlineWidth: Number.parseFloat(controlStyle.outlineWidth),
        pointerEvents: controlStyle.pointerEvents,
        position: controlStyle.position,
      };
    });
    expect(renderedFocus).toMatchObject({
      indicatorDisplay: "none",
      labelBorderStyle: "solid",
      opacity: "1",
      outlineStyle: "solid",
      pointerEvents: "auto",
      position: "static",
    });
    expect(renderedFocus.appearance).not.toBe("none");
    expect(renderedFocus.labelBorderWidth).toBeGreaterThanOrEqual(1);
    expect(renderedFocus.outlineWidth).toBeGreaterThanOrEqual(3);

    await stance.press("Space");
    await expect(stance).toBeChecked();
  });

  test("force world removes assistance and accepts only one proof submission", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The full force journey already receives cross-viewport smoke coverage.");
    const failures = capturePageFailures(page);
    await reachPhysicsProof(page);

    const proof = page.getByTestId("stage-proof");
    await expect(proof).toHaveAttribute("data-proof-locked", "true");
    await expect(proof.getByRole("button", { name: /hint|help|support|replay|ask|contrast|principle|AI/i })).toHaveCount(0);
    await expect(proof.getByText(/How this test was chosen|Deterministic fallback/)).toHaveCount(0);
    await page.getByRole("radio", { name: /stays constant above zero/ }).press("Space");
    await page.getByRole("textbox", { name: /Explain your choice in one or two sentences/ }).fill(
      "Zero net force means zero acceleration, so the existing velocity stays constant.",
    );
    await page.getByTestId("submit-proof").click();

    const result = page.getByTestId("stage-result");
    await expect(result).toContainText("An evidence trail, not a mastery score");
    for (const label of ["Before", "Test", "Support", "Alone", "Later"]) {
      await expect(result.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByTestId("submit-proof")).toHaveCount(0);
    expect(failures).toEqual([]);
  });

  test("evidence world seals the desk, submits once, and emits a bounded record", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The full evidence journey already receives cross-viewport smoke coverage.");
    const failures = capturePageFailures(page);
    await page.setViewportSize({ width: 320, height: 844 });
    await reachEvidenceWorldProof(page);

    const proof = page.getByTestId("stage-transfer");
    await expect(proof).toContainText("Evidence desk closed");
    await expect(proof.getByRole("button")).toHaveCount(1);
    await expect(proof.getByRole("button", { name: /hint|help|support|replay|ask|AI/i })).toHaveCount(0);
    await expect(proof.getByTestId(/evidence-card-/)).toHaveCount(0);
    await page.getByRole("radio", { name: /These sources do not warrant “always”/i }).press("Space");
    await page.getByRole("radio", { name: /held constant/i }).press("Space");
    await page.getByTestId("submit-transfer").click();

    const result = page.getByTestId("stage-result");
    await expect(result).toContainText("Delayed retention remains untested and no return is scheduled.");
    await expect(result.getByTestId("runtime-receipt-limits")).toContainText("honour-based");
    await expect(result.getByTestId("runtime-receipt-limits")).toContainText("not persisted");
    await expect(result.getByTestId("runtime-receipt-limits")).toContainText("incomplete");
    await expect(result.getByText("Return proof", { exact: true })).toHaveCount(0);
    for (const id of ["started-with", "tested-with", "support-used", "did-alone", "still-open", "this-attempt"]) {
      await expect(result.getByTestId(`record-${id}`)).toBeVisible();
    }
    await expect(page.getByTestId("submit-transfer")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  });

  test("ratio world removes the instrument and records only bounded transfer evidence", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The full ratio journey already receives cross-viewport smoke coverage.");
    const failures = capturePageFailures(page);
    await reachRatioProof(page);

    const proof = page.getByTestId("ratio-stage-transfer");
    await expect(proof).toHaveAttribute("data-assistance", "off");
    await expect(proof.getByRole("button", { name: /hint|help|support|replay|ask|AI/i })).toHaveCount(0);
    await expect(proof.getByTestId(/ratio-request-support|ratio-run-experiment/)).toHaveCount(0);
    await page.getByRole("radio", { name: "32 km" }).press("Space");
    await page.getByRole("textbox", { name: "Show the relationship you used" }).fill(
      "12 divided by 3 is 4, so I multiply 8 by 4 to get 32 in the same relationship.",
    );
    await page.getByTestId("ratio-submit-proof").click();

    const result = page.getByTestId("ratio-stage-evidence");
    await expect(result).toContainText("Bounded evidence · not a mastery score");
    await expect(result).toContainText("Demonstrated on this attempt");
    await expect(result).toContainText("Not tested yet");
    await expect(result).toContainText("Return proof");
    await expect(page.getByTestId("ratio-submit-proof")).toHaveCount(0);
    expect(failures).toEqual([]);
  });

  test("completed proof becomes a learner-controlled local evidence record", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Browser-storage ownership is viewport-independent.");
    const failures = capturePageFailures(page);
    await page.goto("/");
    await page.evaluate(() => window.localStorage.removeItem("forge.evidence-ledger"));

    await reachRatioProof(page);
    await page.getByRole("radio", { name: "32 km" }).press("Space");
    await page.getByRole("textbox", { name: "Show the relationship you used" }).fill(
      "12 divided by 3 is 4, so I multiply 8 by 4 to get 32 in the same relationship.",
    );
    await page.getByTestId("ratio-submit-proof").click();
    await expect(page.getByTestId("ratio-stage-evidence")).toBeVisible();
    await expect.poll(async () => page.evaluate(() => {
      const raw = window.localStorage.getItem("forge.evidence-ledger");
      if (!raw) return 0;
      return (JSON.parse(raw) as { entries?: unknown[] }).entries?.length ?? 0;
    })).toBe(1);

    await page.goto("/evidence");
    const ledger = page.getByRole("region", { name: "Your evidence, under your control." });
    await expect(ledger).toContainText("1 bounded record");
    await expect(ledger.getByRole("heading", { name: "Proportional relationships" })).toBeVisible();
    await expect(ledger).toContainText("Matched this World’s protected transfer criteria (local record)");

    const educatorToggle = ledger.getByRole("button", { name: "Include in educator copy" });
    await educatorToggle.click();
    await expect(ledger.getByRole("button", { name: "Remove from educator copy" })).toHaveAttribute("aria-pressed", "true");
    await expect(ledger).toContainText("This record will be included if you download an educator copy.");
    await expect.poll(async () => page.evaluate(() => {
      const raw = window.localStorage.getItem("forge.evidence-ledger");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { entries?: Array<{ sharing?: { status?: string; scope?: string } }> };
      return parsed.entries?.[0]?.sharing ?? null;
    })).toMatchObject({ status: "shared_by_learner", scope: "educator" });

    const deleteTrigger = ledger.getByRole("button", { name: "Delete record" });
    await deleteTrigger.click();
    await expect(ledger).toContainText("Delete locally?");
    await expect(ledger.getByRole("group", { name: /Confirm deletion of Proportional relationships/ })).toBeFocused();
    await expect(ledger.getByRole("button", { name: "Yes, delete" })).toBeVisible();
    await expect(ledger).toContainText("1 bounded record");
    await ledger.getByRole("button", { name: "Cancel" }).click();
    await expect(ledger.getByText("Delete locally?")).toHaveCount(0);
    await expect(deleteTrigger).toBeFocused();

    const clearTrigger = ledger.getByRole("button", { name: "Clear this browser" });
    await clearTrigger.click();
    await expect(ledger).toContainText("Delete every local record?");
    await expect(ledger.getByRole("group", { name: "Confirm clearing all local FORGE evidence" })).toBeFocused();
    await expect(ledger).toContainText("1 bounded record");
    await ledger.getByRole("button", { name: "Yes, clear all" }).click();
    await expect(ledger).toContainText("0 bounded records");
    await expect(ledger).toContainText("No proof records yet.");
    await expect(ledger.getByRole("heading", { name: "Your evidence, under your control." })).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("forge.evidence-ledger"))).toBeNull();
    expect(failures).toEqual([]);
  });

  test("keyboard-only navigation reaches a working world and its main question", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Keyboard traversal runs once against the shared DOM order.");
    await page.goto("/");

    await page.keyboard.press("Tab");
    const homeSkip = page.getByRole("link", { name: "Skip to main content" });
    await expect(homeSkip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#forge-main")).toBeFocused();

    const openWorld = page.getByRole("link", { name: "Open Force & motion World" });
    await tabTo(page, openWorld);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/learn\/force-and-motion$/);
    await expect(page.getByTestId("stage-predict")).toBeVisible();

    await page.keyboard.press("Tab");
    const worldSkip = page.getByRole("link", { name: "Skip to learning world" });
    await expect(worldSkip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#world-content")).toBeFocused();
  });

  test("reduced motion removes authored animation and transition time", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Reduced-motion styles are shared across viewport projects.");
    await page.emulateMedia({ reducedMotion: "reduce" });

    await seedDeviceProfile(page, "teen");
    for (const path of ["/", "/pathways", "/learn/ai-and-learning", "/learn/proportional-reasoning"]) {
      await page.goto(path);
      const motion = await page.evaluate(() => {
        const milliseconds = (raw: string) => raw.split(",").map((part) => {
          const value = part.trim();
          return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1_000;
        });
        const offenders = [...document.querySelectorAll("*")].flatMap((element) => {
          const styles = getComputedStyle(element);
          const durations = [...milliseconds(styles.animationDuration), ...milliseconds(styles.transitionDuration)];
          return durations.some((duration) => Number.isFinite(duration) && duration > 1)
            ? [`${element.tagName.toLowerCase()}.${element.className}`]
            : [];
        });
        return { matches: matchMedia("(prefers-reduced-motion: reduce)").matches, offenders };
      });
      expect(motion.matches).toBe(true);
      expect(motion.offenders, `${path} should not retain motion above 1ms`).toEqual([]);
    }
  });
});
