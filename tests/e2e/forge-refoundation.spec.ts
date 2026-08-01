import { expect, test, type Locator, type Page } from "@playwright/test";

const PUBLIC_SURFACES = [
  { path: "/", heading: /Learn what matters next/i, truth: /Each released World uses reviewed sources/i },
  { path: "/how-forge-works", heading: /A path is credible when every move earns its place/i, truth: /The system can propose.*The learner accepts/i },
  { path: "/explore", heading: /Choose an outcome, not a shelf of courses/i, truth: /Candidate direction.*not a released path/i },
  { path: "/paths/ai-literacy", heading: /Use AI without outsourcing your judgment/i, truth: /not a released end-to-end path/i },
  { path: "/pricing", heading: /No paid Forge plan is for sale in this build/i, truth: /There is no checkout, subscription, trial clock, or account upgrade/i },
] as const;

const RESPONSIVE_SURFACES = [
  "/", "/how-it-works", "/start", "/paths", "/app", "/app/path", "/app/paths",
  "/app/projects", "/app/evidence", "/app/settings", "/modelshift", "/learn/force-and-motion",
] as const;

const COMPATIBILITY_SURFACES = [
  { path: "/home", canonical: "/app" },
  { path: "/plan", canonical: "/app/path" },
  { path: "/orient", canonical: "/start" },
  { path: "/study/ai-foundations", canonical: "/learn/ai-and-learning" },
  { path: "/explore-auth", canonical: "/paths" },
  { path: "/projects", canonical: "/app/projects" },
  { path: "/profile", canonical: "/app/settings" },
] as const;

async function seedAdultDeviceMode(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("forge.device-profile:v1", JSON.stringify({
      ageMode: "adult",
      createdAt: "2026-07-24T00:00:00.000Z",
      guardianPresent: false,
      profileId: "9be711de-d7a6-4911-b903-f2d829da83d5",
      schemaVersion: 1,
    }));
  });
}

async function expectHealthyRoute(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), `${path} should respond successfully`).toBe(200);
  await expect(page.getByText("Loading the requested FORGE surface…", { exact: true })).toHaveCount(0);
  await expect(page.locator("main"), `${path} should expose one semantic main landmark`).toHaveCount(1);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("main").getByRole("heading").first(), `${path} should expose a visible heading`).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page, path: string) {
  await expect.poll(
    () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    { message: `${path} should not create a horizontal canvas at 320px` },
  ).toBeLessThanOrEqual(1);
}

async function mobileControlContract(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
    };
    const selector = [
      "a", "button", 'input:not([type="radio"]):not([type="checkbox"]):not([type="range"])',
      "textarea", "select", 'label:has(input[type="radio"])', 'label:has(input[type="checkbox"])',
    ].join(",");
    return {
      wrappedMobileNavigation: (() => {
        const navigation = document.querySelector<HTMLElement>(".forge-mobile-nav");
        if (!navigation || !visible(navigation)) return false;
        const rows = new Set(
          Array.from(navigation.children)
            .filter(visible)
            .map((element) => Math.round(element.getBoundingClientRect().top)),
        );
        return rows.size > 1;
      })(),
      undersized: Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter(visible)
        .map((element) => ({
          name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName,
          rect: element.getBoundingClientRect(),
        }))
        .filter(({ rect }) => rect.width < 44 || rect.height < 44)
        .map(({ name, rect }) => ({ name, width: Math.round(rect.width), height: Math.round(rect.height) })),
      smallFormText: Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select"))
        .filter(visible)
        .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 16)
        .map((element) => element.getAttribute("aria-label") ?? element.tagName),
    };
  });
}

async function activeMotion(page: Page) {
  return page.evaluate(() => {
    const maximumDuration = (value: string) =>
      value.split(",").reduce((maximum, part) => {
        const token = part.trim();
        const parsed = Number.parseFloat(token);
        if (!Number.isFinite(parsed)) return maximum;
        return Math.max(maximum, token.endsWith("ms") ? parsed : parsed * 1_000);
      }, 0);
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && bounds.width > 0
        && bounds.height > 0;
    };

    return Array.from(document.querySelectorAll<HTMLElement>("*"))
      .filter(visible)
      .flatMap((element) => {
        const style = getComputedStyle(element);
        const animationDuration = style.animationName === "none"
          ? 0
          : maximumDuration(style.animationDuration);
        const transitionDuration = style.transitionProperty === "none"
          ? 0
          : maximumDuration(style.transitionDuration);
        if (animationDuration <= 1 && transitionDuration <= 1) return [];
        return [{
          animationDuration,
          element: element.getAttribute("aria-label") ?? element.id ?? element.tagName.toLowerCase(),
          transitionDuration,
        }];
      });
  });
}

async function tabTo(page: Page, target: Locator, maximumTabs = 40) {
  for (let index = 0; index < maximumTabs; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Keyboard focus did not reach the requested target.");
}

test.describe("FORGE refoundation acceptance contract", () => {
  test("keeps every public chapter semantic and publication-honest", async ({ page }) => {
    for (const surface of PUBLIC_SURFACES) {
      await expectHealthyRoute(page, surface.path);
      await expect(page.getByRole("heading", { level: 1, name: surface.heading })).toBeVisible();
      await expect(page.locator("body")).toContainText(surface.truth);
    }
    await page.goto("/pricing");
    await expect(page.getByRole("button", { name: /buy|checkout|subscribe|start trial/i })).toHaveCount(0);
  });

  test("hands a public goal to Start through tab-local state, not a URL", async ({ page }) => {
    const goal = "Help me understand force and motion after a push ends.";
    await page.goto("/");
    await page.getByRole("textbox", { name: /Your next goal/i }).fill(goal);
    await page.getByRole("button", { name: "Start learning" }).click();

    await expect.poll(() => new URL(page.url()).pathname).toBe("/start");
    expect(new URL(page.url()).searchParams.toString()).toBe("");
    await expect(page.getByRole("textbox", { name: /Your words/i })).toHaveValue(goal);
    await page.getByRole("button", { name: /Name the outcome/i }).click();
    await page.getByRole("textbox", { name: /Meaningful outcome/i }).fill("Predict a new velocity graph without hints.");
    await page.getByRole("button", { name: /Set route context/i }).click();
    await page.getByRole("checkbox", { name: /Use these exact fields for one first-party planning response/i }).check();
    await page.getByRole("button", { name: /Build inspectable candidate/i }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Force & motion" })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Reviewed World match.*acceptance required/i);
    await expect(page.getByRole("link", { name: /Enter working World/i })).toHaveCount(0);
  });

  test("keeps compatibility redirects and canonical private surfaces honest about authority", async ({ page }) => {
    await seedAdultDeviceMode(page);
    for (const surface of COMPATIBILITY_SURFACES) {
      await expectHealthyRoute(page, surface.path);
      expect(new URL(page.url()).pathname).toBe(surface.canonical);
    }
    await page.goto("/app");
    await expect(page.locator("body")).toContainText(/no active path|nothing will start/i);
    await page.goto("/app/evidence");
    await expect(page.locator("body")).toContainText(/browser|device.local|no cloud/i);
    await page.goto("/modelshift");
    await expect(page.locator("body")).toContainText(/AI is a bounded interpretation layer/i);
  });

  test("previews a global path command without mutating local records", async ({ page }) => {
    await expectHealthyRoute(page, "/app");
    const before = await page.evaluate(() => ({ ...localStorage }));

    await page.getByRole("button", { name: "Plan a change" }).click();
    const dialog = page.getByRole("dialog", { name: "What should Forge reconsider?" });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("textbox", { name: "Ask a question or preview a direction change" })
      .fill("I have only three hours this week.");
    await dialog.getByRole("button", { name: "Preview" }).click();

    await expect(dialog).toContainText("Proposed review");
    await expect(dialog).toContainText("Weekly availability");
    await expect(dialog).toContainText(/Nothing changes until a reviewed proposal is inspected and accepted/i);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  });

  test("shows exactly two provisional compiler readings before the authored test", async ({ page }) => {
    await seedAdultDeviceMode(page);
    await expectHealthyRoute(page, "/learn/force-and-motion");

    const prediction = page.getByRole("radio", { name: "Continues at constant velocity" });
    await prediction.focus();
    await page.keyboard.press("Space");
    await expect(prediction).toBeChecked();
    const commit = page.getByRole("button", { name: /Commit prediction/i });
    await commit.focus();
    await page.keyboard.press("Enter");

    const uncertainty = page.getByRole("button", { name: /I genuinely don't know/i });
    await expect(uncertainty).toBeVisible();
    await uncertainty.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("compiler-reading")).toHaveCount(2);
  });

  test("reflows canonical surfaces at 320px with usable target and form floors", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The explicit 320px contract runs once in Chromium.");
    await seedAdultDeviceMode(page);
    await page.setViewportSize({ width: 320, height: 800 });
    for (const path of RESPONSIVE_SURFACES) {
      await expectHealthyRoute(page, path);
      await expectNoHorizontalOverflow(page, path);
      const contract = await mobileControlContract(page);
      expect(contract.wrappedMobileNavigation, `${path} should keep mobile navigation on one row`).toBe(false);
      expect(contract.undersized, `${path} should preserve 44px pointer targets`).toEqual([]);
      expect(contract.smallFormText, `${path} should preserve 16px mobile form text`).toEqual([]);
    }
  });

  test("offers keyboard skip links that move focus into canonical main content", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Keyboard focus order is viewport-independent.");
    await seedAdultDeviceMode(page);
    for (const path of ["/", "/how-it-works", "/start", "/app", "/app/path", "/modelshift", "/learn/force-and-motion", "/app/evidence"]) {
      await expectHealthyRoute(page, path);
      const skipLink = page.getByRole("link", { name: /skip/i }).first();
      const target = await skipLink.getAttribute("href");
      expect(target, `${path} skip link target`).toMatch(/^#[a-z][\w-]*$/i);
      await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
      await tabTo(page, skipLink);
      await expect(skipLink).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator(target!)).toBeFocused();
    }
  });

  test("keeps one explicit theme choice across public and application surfaces", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The stored theme contract runs once.");
    await page.goto("/");

    const publicTheme = page.getByRole("combobox", { name: "Color theme" });
    await publicTheme.focus();
    await expect(publicTheme).toBeFocused();
    await publicTheme.selectOption("dark");
    await expect(page.locator("html")).toHaveAttribute("data-forge-theme", "dark");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("forge.color-theme.v1"))).toBe("dark");

    await page.reload();
    await expect(publicTheme).toHaveValue("dark");
    await expect(page.locator("html")).toHaveAttribute("data-forge-theme", "dark");

    await page.goto("/app");
    const appTheme = page.getByRole("combobox", { name: "Color theme" });
    await expect(appTheme).toHaveValue("dark");
    await expect(page.locator("html")).toHaveAttribute("data-forge-theme", "dark");
    await expect(page.locator(".forge-today-empty")).toBeVisible();

    await appTheme.selectOption("light");
    await expect(page.locator("html")).toHaveAttribute("data-forge-theme", "light");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("forge.color-theme.v1"))).toBe("light");
  });

  test("removes active motion for reduced-motion users on canonical surfaces", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The reduced-motion media contract runs once.");
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const path of ["/", "/start", "/app", "/modelshift"]) {
      await expectHealthyRoute(page, path);
      expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
      expect(await activeMotion(page), `${path} should not retain active motion over 1ms`).toEqual([]);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).not.toBe("smooth");
    }
  });
});
