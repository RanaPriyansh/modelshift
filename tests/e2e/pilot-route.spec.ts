import { expect, test, type Page } from "@playwright/test";

const REVIEW_FIXTURE_TOKEN = "forge-reviewed-adult-pilot-route.v1";
const reviewFixtureEnabled = process.env.FORGE_ADULT_PILOT_REVIEW_FIXTURE === REVIEW_FIXTURE_TOKEN;
const productionBrowserEnabled = process.env.FORGE_PILOT_PRODUCTION_BROWSER === "1";
const NEXT_DEVELOPMENT_DEBUG_CHANNEL_PREFIX = "__next_debug_channel:";

function storageSnapshot(page: Page) {
  return page.evaluate(() => {
    const entries = (storage: Storage) => Object.fromEntries(Array.from({ length: storage.length }, (_, index) => {
      const key = storage.key(index);
      return key === null ? [] : [key, storage.getItem(key)];
    }).filter((entry): entry is [string, string | null] => entry.length === 2));
    return { local: entries(localStorage), session: entries(sessionStorage) };
  });
}

async function captureDevelopmentStorageBaseline(page: Page) {
  const exactNextDevelopmentDebugKey = await currentNextDevelopmentDebugKey(page);

  return Object.freeze({
    snapshot: await storageSnapshot(page),
    exactNextDevelopmentDebugKeys: Object.freeze(exactNextDevelopmentDebugKey ? [exactNextDevelopmentDebugKey] : []),
  });
}

async function currentNextDevelopmentDebugKey(page: Page) {
  return page.evaluate((prefix) => {
    const requestId = (globalThis as typeof globalThis & { __next_r?: unknown }).__next_r;
    return typeof requestId === "string" && requestId.length > 0 ? `${prefix}${requestId}` : null;
  }, NEXT_DEVELOPMENT_DEBUG_CHANNEL_PREFIX);
}

async function expectDevelopmentStorageUnchanged(
  page: Page,
  baseline: Awaited<ReturnType<typeof captureDevelopmentStorageBaseline>>,
) {
  const current = await storageSnapshot(page);
  const currentNextDevelopmentDebugKeyValue = await currentNextDevelopmentDebugKey(page);
  const exactNextDevelopmentDebugKeys = Object.freeze([
    ...new Set([
      ...baseline.exactNextDevelopmentDebugKeys,
      ...(currentNextDevelopmentDebugKeyValue ? [currentNextDevelopmentDebugKeyValue] : []),
    ]),
  ]);
  const expectedSession = { ...baseline.snapshot.session };
  for (const key of exactNextDevelopmentDebugKeys) {
    if (Object.hasOwn(current.session, key)) expectedSession[key] = current.session[key];
  }

  // No namespace is excluded. The only permitted framework writes are the
  // exact full keys derived from the current and already-observed documents.
  expect(current).toEqual({ local: baseline.snapshot.local, session: expectedSession });
  return Object.freeze({ snapshot: current, exactNextDevelopmentDebugKeys });
}

function crossOriginRequests(requestUrls: readonly string[], page: Page) {
  const pageOrigin = new URL(page.url()).origin;
  return requestUrls.filter((url) => {
    try {
      return new URL(url).origin !== pageOrigin;
    } catch {
      return false;
    }
  });
}

async function reachMapDecision(page: Page) {
  await page.getByRole("textbox", { name: "What do you want to understand or make?" }).fill("I want to compare practical mixtures.");
  await page.getByRole("textbox", { name: "What practical outcome would make that useful?" }).fill("Choose a proportion for a recipe.");
  await page.getByRole("button", { name: "Record my intent and outcome" }).click();
  await page.getByRole("button", { name: "Inspect this candidate map" }).click();
  await page.getByRole("textbox", { name: "State your decision in your own words" }).fill("I can explain why this route is useful.");
}

async function commitProse(page: Page, label: string, actionLabel: string, value: string) {
  await page.getByRole("textbox", { name: label }).fill(value);
  await page.getByRole("button", { name: actionLabel }).click();
}

test.describe("adult pilot route default denial", () => {
  test.skip(reviewFixtureEnabled, "This run intentionally starts the exact server-owned review fixture.");

  test("fails closed on direct navigation and ignores forged browser enablement paths without fixture leakage", async ({ context, page, request }) => {
    const response = await request.get(`/pilot?review=${REVIEW_FIXTURE_TOKEN}`, {
      headers: { cookie: `FORGE_ADULT_PILOT_REVIEW_FIXTURE=${REVIEW_FIXTURE_TOKEN}` },
    });
    const responseBody = await response.text();
    expect(responseBody).not.toContain("journey.fixture.adult-ratio-route");
    expect(responseBody).not.toContain("Equal quantities comparison");

    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("FORGE_ADULT_PILOT_REVIEW_FIXTURE", token);
      sessionStorage.setItem("FORGE_ADULT_PILOT_REVIEW_FIXTURE", token);
    }, REVIEW_FIXTURE_TOKEN);
    await context.addCookies([{ name: "FORGE_ADULT_PILOT_REVIEW_FIXTURE", value: REVIEW_FIXTURE_TOKEN, url: page.url() }]);
    let storageBefore = await captureDevelopmentStorageBaseline(page);
    const requestUrls: string[] = [];
    page.on("request", (entry) => requestUrls.push(entry.url()));

    await page.goto(`/pilot?review=${REVIEW_FIXTURE_TOKEN}&audience=adult`);
    await expect(page.getByTestId("pilot-route-unavailable")).toBeVisible();
    await expect(page.getByTestId("pilot-route-unavailable")).toContainText("cannot make it available");
    await expect(page.getByTestId("pilot-review-route")).toHaveCount(0);
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(await page.evaluate(() => Array.from(document.querySelectorAll("[src], [href]")).map((element) => element.getAttribute("src") ?? element.getAttribute("href") ?? "").filter((value) => /youtube|youtu\.be/i.test(value)))).toEqual([]);
    storageBefore = await expectDevelopmentStorageUnchanged(page, storageBefore);
    expect(crossOriginRequests(requestUrls, page)).toEqual([]);

    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.reload();
    await expect(page.getByTestId("pilot-route-unavailable")).toBeVisible();
    expect(await page.locator("html").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await expectDevelopmentStorageUnchanged(page, storageBefore);
  });
});

test.describe("adult pilot production browser storage", () => {
  test.skip(!productionBrowserEnabled, "This assertion runs only against an explicit production next start server.");

  test("does not mutate any browser storage on direct production navigation", async ({ page }) => {
    await page.goto("/");
    const storageBeforePilot = await storageSnapshot(page);

    await page.goto("/pilot");
    await expect(page.getByTestId("pilot-route-unavailable")).toBeVisible();
    expect(await storageSnapshot(page)).toEqual(storageBeforePilot);
  });
});

test.describe("adult pilot reviewed-fixture route", () => {
  test.skip(!reviewFixtureEnabled, "Run this spec with the exact server-owned review fixture flag.");

  test("walks the controller through proof withdrawal without network, storage, media, or evidence authority", async ({ page }) => {
    const correction = "EPHEMERAL-READING-CORRECTION: scale both quantities together before comparing.";
    const requestUrls: string[] = [];
    page.on("request", (entry) => requestUrls.push(entry.url()));
    await page.goto("/");
    let storageBefore = await captureDevelopmentStorageBaseline(page);
    await page.goto("/pilot");
    storageBefore = await expectDevelopmentStorageUnchanged(page, storageBefore);

    await expect(page.getByTestId("pilot-review-route")).toBeVisible();
    await expect(page.getByRole("heading", { name: "What practical outcome do you want to work toward?" })).toBeVisible();
    await reachMapDecision(page);
    await page.getByRole("button", { name: "Retain this reviewed route" }).click();
    await commitProse(page, "Your starting strategy", "Commit my starting strategy", "I will compare equal quantities before deciding.");
    await page.getByRole("button", { name: "Show the two uncertain readings" }).click();
    await expect(page.getByRole("button", { name: "Correct reading 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject reading 2" })).toBeVisible();
    await page.getByRole("button", { name: "Correct reading 1" }).click();
    await page.getByRole("textbox", { name: "Your correction for reading 1" }).fill(correction);
    await page.getByRole("button", { name: "Use my correction for reading 1" }).click();
    await page.getByRole("button", { name: "Reject reading 2" }).click();
    await page.getByRole("button", { name: "Select the equal-quantity comparison" }).click();
    await page.getByRole("button", { name: "Use this reviewed checkpoint" }).click();
    await commitProse(page, "Your reconstruction", "Commit my reconstruction", "I can reconstruct the comparison without the route.");
    await commitProse(page, "Your practice plan", "Commit my practice", "I will rehearse a new ratio.");
    await commitProse(page, "Your project explanation", "Commit my individual project", "I will make an individual explanation.");
    await commitProse(page, "Your critique", "Commit my critique", "I will revise one limitation.");
    await commitProse(page, "Your individual defence", "Commit my individual defence", "I can defend my individual choice.");
    await page.getByRole("button", { name: "Withdraw in-product support" }).click();

    const proof = page.getByTestId("pilot-proof");
    await expect(proof).toHaveAttribute("data-proof-locked", "true");
    await expect(page.getByTestId("pilot-resource-surface")).toHaveCount(0);
    await expect(page.getByText(correction)).toHaveCount(0);
    await expect(proof.getByRole("button", { name: /hint|model|resource|route|support/i })).toHaveCount(0);
    const accessControl = proof.getByRole("button", { name: "screen reader" });
    await accessControl.click();
    await expect(accessControl).toHaveAttribute("aria-pressed", "true");
    await commitProse(page, "Your unfamiliar comparison", "Submit this unfamiliar comparison", "I compare the multiplier for both quantities first.");
    await page.getByRole("button", { name: "Record this fixture attempt as untested" }).click();
    await page.getByRole("button", { name: "Set the reviewed fixture return" }).click();
    await page.getByRole("button", { name: "Record delayed return as untested" }).click();
    await expect(page.getByTestId("pilot-completed")).toContainText("remains untested");
    await expect(page.getByText(/No capability, evidence, retention, or mastery claim was created/)).toBeVisible();

    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.locator("html").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.reload();
    await expect(page.getByRole("heading", { name: "What practical outcome do you want to work toward?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Record my intent and outcome" })).toBeVisible();
    await expect(page.getByText(correction)).toHaveCount(0);
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await expect(page.getByRole("textbox", { name: "What do you want to understand or make?" })).toHaveValue("");
    await expectDevelopmentStorageUnchanged(page, storageBefore);
    expect(await page.locator("iframe")).toHaveCount(0);
    expect(crossOriginRequests(requestUrls, page)).toEqual([]);
  });

  test("keeps the opening decision and proof access control keyboard-operable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Keyboard traversal is covered once; the review fixture walkthrough runs in both viewports.");
    await page.goto("/pilot");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#forge-main")).toBeFocused();

    const intent = page.getByRole("textbox", { name: "What do you want to understand or make?" });
    await intent.focus();
    await page.keyboard.type("I want to compare mixtures.");
    const outcome = page.getByRole("textbox", { name: "What practical outcome would make that useful?" });
    await outcome.focus();
    await page.keyboard.type("Choose a recipe proportion.");
    const record = page.getByRole("button", { name: "Record my intent and outcome" });
    await record.focus();
    await expect(record).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Inspect this candidate map" })).toBeVisible();
  });
});
