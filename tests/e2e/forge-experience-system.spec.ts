import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  { path: "/", heading: "What do you want to understand?", main: "#forge-main" },
  { path: "/studio", heading: "Turn a learning question into a testable lesson draft.", main: "#forge-main" },
  { path: "/login", heading: "Pick where your learning trail lives.", main: "#forge-main" },
  { path: "/account", heading: "Continuity is optional. Your work stays yours.", main: "#forge-main" },
  { path: "/learn/force-and-motion", heading: "The engine is off. What happens next?", main: "#world-content" },
  { path: "/learn/proportional-reasoning", heading: "The two citrus mixes", main: "#world-content" },
  { path: "/learn/ai-and-learning", heading: "Commit before the evidence appears.", main: "#world-content" },
  { path: "/learn/primary-source-reasoning", heading: "What can this photograph prove?", main: "#world-content" },
  { path: "/evidence", heading: "Proof should say exactly what happened.", main: "#forge-main" },
  { path: "/trail", heading: "A map of questions and evidence—not a level.", main: "#forge-main" },
] as const;

async function tabTo(page: Page, selector: string, maximumTabs = 6) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await page.locator(selector).evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Keyboard focus did not reach ${selector}.`);
}

async function mobileContract(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const styles = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return styles.display !== "none" && styles.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
    };
    const targetSelector = [
      "a",
      "button",
      'input:not([type="radio"]):not([type="checkbox"]):not([type="range"])',
      "textarea",
      "select",
      'label:has(input[type="radio"])',
      'label:has(input[type="checkbox"])',
    ].join(",");
    const undersized = Array.from(document.querySelectorAll<HTMLElement>(targetSelector))
      .filter(visible)
      .filter((element) => element.tagName !== "A" || getComputedStyle(element).display !== "inline")
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName,
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
        };
      })
      .filter(({ width, height }) => width < 44 || height < 44);
    const inputSizes = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select"))
      .filter(visible)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'));
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      undersized,
      inputSizes,
      rovingTabContract: tabs.length === 0 || (tabs.filter((tab) => tab.tabIndex === 0).length === 1 && tabs.every((tab) => tab.tabIndex === 0 || tab.tabIndex === -1)),
    };
  });
}

test.describe("FORGE Packet A experience system", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The explicit 320px contract runs once in Chromium.");
    await page.setViewportSize({ width: 320, height: 800 });
  });

  test("all owned routes reflow at 320px with named controls and mobile input floors", async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
      await expect(page.locator(route.main)).toBeVisible();

      const contract = await mobileContract(page);
      expect(contract.overflow, `${route.path} should not create a horizontal canvas`).toBeLessThanOrEqual(1);
      expect(contract.undersized, `${route.path} should preserve 44px actionable controls`).toEqual([]);
      expect(contract.inputSizes.every((size) => size >= 16), `${route.path} should preserve 16px mobile form text`).toBe(true);
      expect(contract.rovingTabContract, `${route.path} should retain a valid roving-tab contract when tabs are present`).toBe(true);
    }
  });

  test("keyboard skip links, home controls, and unique visible action names remain operable", async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path);
      const skip = page.locator(".forge-skip-link");
      await expect(skip).toHaveCount(1);
      await tabTo(page, ".forge-skip-link");
      await expect(skip).toBeFocused();
      await page.keyboard.press("Enter");
      expect(await page.evaluate(() => document.activeElement?.id), `${route.path} skip target`).toBe(route.main.slice(1));
    }

    await page.goto("/");
    const visibleActionNames = await page.evaluate(() => {
      const visible = (element: Element) => {
        const styles = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return styles.display !== "none" && styles.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
      };
      return Array.from(document.querySelectorAll<HTMLElement>("a, button"))
        .filter(visible)
        .map((element) => element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "")
        .filter(Boolean);
    });
    expect(visibleActionNames).toHaveLength(new Set(visibleActionNames).size);

    const question = page.getByRole("textbox", { name: "Your question" });
    await question.fill("Why does motion continue after a push ends?");
    await expect(question).toHaveValue("Why does motion continue after a push ends?");
    const adultMode = page.getByRole("radio", { name: "Adult Self-directed" });
    await adultMode.press("Space");
    await expect(adultMode).toBeChecked();
  });

  test("reduced motion, forced colors, and increased contrast retain visible meaning", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const coreContrasts = await page.evaluate(() => {
      const rgb = (value: string) => value.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
      const luminance = (channels: number[]) => {
        const [red, green, blue] = channels.map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      };
      const ratio = (foreground: string, background: string) => {
        const [lighter, darker] = [luminance(rgb(foreground)), luminance(rgb(background))]
          .sort((left, right) => right - left);
        return (lighter + 0.05) / (darker + 0.05);
      };
      return {
        heading: ratio("rgb(17, 23, 20)", "rgb(247, 244, 237)"),
        body: ratio("rgb(94, 99, 95)", "rgb(247, 244, 237)"),
        intake: ratio("rgb(241, 237, 228)", "rgb(8, 13, 18)"),
        action: ratio("rgb(23, 18, 10)", "rgb(232, 185, 78)"),
      };
    });
    for (const [name, ratio] of Object.entries(coreContrasts)) {
      expect(ratio, `${name} text should meet the 4.5:1 AA contrast floor`).toBeGreaterThanOrEqual(4.5);
    }
    const motion = await page.locator(".forge-shell").evaluate((shell) => {
      const toMilliseconds = (raw: string) => raw.split(",").map((part) => {
        const value = part.trim();
        return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1_000;
      });
      return Array.from(shell.querySelectorAll("*")).flatMap((element) => {
        const styles = getComputedStyle(element);
        const durations = [...toMilliseconds(styles.animationDuration), ...toMilliseconds(styles.transitionDuration)];
        return durations.some((duration) => Number.isFinite(duration) && duration > 20)
          ? [`${element.tagName.toLowerCase()}.${element.className}`]
          : [];
      });
    });
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    expect(motion).toEqual([]);
    await expect(page.locator(".forge-status").filter({ hasText: "Working model World" })).toHaveCount(2);

    await page.emulateMedia({ forcedColors: "active" });
    await page.reload();
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    await expect(page.getByRole("heading", { name: "What do you want to understand?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Shape my first move" })).toBeVisible();

    await page.emulateMedia({ contrast: "more" });
    await page.reload();
    expect(await page.evaluate(() => matchMedia("(prefers-contrast: more)").matches)).toBe(true);
    await page.keyboard.press("Tab");
    await expect(page.locator(".forge-skip-link")).toBeFocused();
  });
});
