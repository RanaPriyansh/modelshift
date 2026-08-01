import { expect, test, type Locator, type Page } from "@playwright/test";

const ROUTES = [
  { path: "/start", heading: /Turn a goal into a credible first path/i, main: "#forge-main" },
  { path: "/paths", heading: /Learn toward something you want to do/i, main: "#forge-main" },
  { path: "/app", heading: /What do you want to be able to do/i, main: "#forge-main" },
  { path: "/app/paths", heading: /Inspect what you accepted/i, main: "#forge-main" },
  { path: "/app/evidence", heading: /Proof should say exactly what happened/i, main: "#forge-main" },
  { path: "/learn/force-and-motion", heading: /The engine is off\. What happens next/i, main: "#world-content", world: true },
  { path: "/learn/proportional-reasoning", heading: /The two citrus mixes/i, main: "#world-content", world: true },
  { path: "/learn/ai-and-learning", heading: /Commit before the evidence appears/i, main: "#world-content", world: true },
  { path: "/learn/primary-source-reasoning", heading: /What can this photograph prove/i, main: "#world-content", world: true },
] as const;

async function seedTeenDeviceProfile(page: Page) {
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

async function visit(page: Page, route: (typeof ROUTES)[number]) {
  if ("world" in route && route.world) await seedTeenDeviceProfile(page);
  await page.goto(route.path);
}

async function tabTo(page: Page, target: Locator, maximumTabs = 45) {
  for (let index = 0; index < maximumTabs; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Keyboard focus did not reach the requested target.");
}

async function mobileContract(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const styles = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return styles.display !== "none" && styles.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
    };
    const selector = ["a", "button", 'input:not([type="radio"]):not([type="checkbox"]):not([type="range"])', "textarea", "select", 'label:has(input[type="radio"])', 'label:has(input[type="checkbox"])'].join(",");
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      undersized: Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter(visible)
        .map((element) => ({ name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width < 44 || rect.height < 44)
        .map(({ name, rect }) => ({ name, width: Math.round(rect.width), height: Math.round(rect.height) })),
      smallFormText: Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select"))
        .filter(visible)
        .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 16)
        .map((element) => element.getAttribute("aria-label") ?? element.tagName),
    };
  });
}

async function beginStart(page: Page, goal: string, outcome: string) {
  await page.goto("/start");
  await page.getByRole("textbox", { name: /Your words/i }).fill(goal);
  await page.getByRole("button", { name: /Name the outcome/i }).click();
  await page.getByRole("textbox", { name: /Meaningful outcome/i }).fill(outcome);
  await page.getByRole("button", { name: /Set route context/i }).click();
  await page.getByRole("checkbox", { name: /Use these exact fields for one first-party planning response/i }).check();
  await page.getByRole("button", { name: /Build inspectable candidate/i }).click();
}

test.describe("FORGE canonical experience system", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The explicit 320px contract runs once in Chromium.");
    await page.setViewportSize({ width: 320, height: 800 });
  });

  test("canonical owned routes reflow at 320px with named controls and form floors", async ({ page }) => {
    for (const route of ROUTES) {
      await visit(page, route);
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      await expect(page.locator(route.main)).toBeVisible();
      const contract = await mobileContract(page);
      expect(contract.overflow, `${route.path} must not create horizontal overflow`).toBeLessThanOrEqual(1);
      expect(contract.undersized, `${route.path} must retain 44px actionable targets`).toEqual([]);
      expect(contract.smallFormText, `${route.path} must retain 16px mobile form text`).toEqual([]);
    }
  });

  test("unknown goals stay inspectable, non-runnable open questions", async ({ page }) => {
    const goal = "How did Roman aqueduct maintenance shape city planning?";
    await beginStart(page, goal, "Compare maintenance choices against a primary source.");
    const candidate = page.getByRole("region", { name: "Source verification required" });
    await expect(candidate).toBeVisible();
    await expect(candidate).toContainText("Coverage gap · not executable");
    await expect(candidate).toContainText(goal);
    await expect(candidate.getByRole("link", { name: /enter|open.*World/i })).toHaveCount(0);
    await candidate.getByRole("button", { name: /Save as an open question/i }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.locator("body")).toContainText(/saved open question|will not fabricate/i);
  });

  test("Start retains gutter-safe headings under wide fallback metrics", async ({ page }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/start");
      await page.addStyleTag({ content: ".forge-start-page h1 { font-family: monospace !important; }" });
      const contract = await mobileContract(page);
      expect(contract.overflow, `${width}px document overflow`).toBeLessThanOrEqual(1);
      await expect(page.locator(".forge-start-page h1")).toBeVisible();
      expect(await page.locator(".forge-start-page h1").evaluate((heading) => heading.scrollWidth <= heading.clientWidth)).toBe(true);
    }
  });

  test("keyboard skip links move focus into canonical main content", async ({ page }) => {
    for (const route of ROUTES) {
      await visit(page, route);
      const skip = page.getByRole("link", { name: /skip/i }).first();
      await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
      await tabTo(page, skip);
      await expect(skip).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator(route.main)).toBeFocused();
    }
  });

  test("reduced motion and forced colors preserve meaningful canonical controls", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/start");
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    const motion = await page.locator(".forge-shell").evaluate((shell) => Array.from(shell.querySelectorAll<HTMLElement>("*")).flatMap((element) => {
      const style = getComputedStyle(element);
      const toMs = (value: string) => Math.max(...value.split(",").map((part) => part.trim().endsWith("ms") ? Number.parseFloat(part) : Number.parseFloat(part) * 1000));
      return toMs(style.animationDuration) > 20 || toMs(style.transitionDuration) > 20 ? [element.tagName] : [];
    }));
    expect(motion).toEqual([]);

    await page.emulateMedia({ forcedColors: "active" });
    await page.reload();
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    const skip = page.getByRole("link", { name: /skip/i }).first();
    await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    const styles = await skip.evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
    });
    expect(styles.outlineStyle).not.toBe("none");
    expect(styles.outlineWidth).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole("button", { name: /Name the outcome/i })).toBeVisible();
  });
});
