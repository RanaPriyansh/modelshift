import { expect, test, type Locator, type Page } from "@playwright/test";

async function tabTo(page: Page, target: Locator, maximumTabs = 24) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Keyboard focus did not reach ${await target.getAttribute("aria-label") ?? await target.textContent()}.`);
}

test.describe("FORGE production design primitives", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The explicit 320px contract runs once in Chromium.");
    await page.setViewportSize({ width: 320, height: 800 });
  });

  test("320px shell reflows without overflow and preserves production target sizes", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "What do you want to understand?" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(page.locator(".forge-world-row")).toHaveCount(6);

    const contract = await page.locator(".forge-shell").evaluate((shell) => {
      const interactive = Array.from(shell.querySelectorAll("a, button"))
        .filter((element) => {
          const styles = getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          return styles.display !== "none" && styles.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
        })
        .map((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName,
            width: Math.round(bounds.width),
            height: Math.round(bounds.height),
          };
        });
      const inputSizes = Array.from(shell.querySelectorAll("input, textarea, select")).map(
        (element) => Number.parseFloat(getComputedStyle(element).fontSize),
      );
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        undersized: interactive.filter(({ width, height }) => width < 44 || height < 44),
        inputSizes,
      };
    });

    expect(contract.overflow).toBeLessThanOrEqual(1);
    expect(contract.undersized).toEqual([]);
    expect(contract.inputSizes.every((size) => size >= 16)).toBe(true);
  });

  test("320px keyboard path reaches main content and changes native form state", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#forge-main")).toBeFocused();

    const question = page.getByRole("textbox", { name: "Your question" });
    await tabTo(page, question);
    await page.keyboard.type("Why does motion continue after a push ends?");
    await expect(question).toHaveValue("Why does motion continue after a push ends?");

    const adultMode = page.getByRole("radio", { name: /Adult/ });
    await adultMode.press("Space");
    await expect(adultMode).toBeChecked();
  });

  test("320px reduced-motion mode removes authored timing without hiding evidence", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const motion = await page.locator(".forge-shell").evaluate((shell) => {
      const toMilliseconds = (raw: string) => raw.split(",").map((part) => {
        const value = part.trim();
        return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1_000;
      });
      return Array.from(shell.querySelectorAll("*")).flatMap((element) => {
        const styles = getComputedStyle(element);
        const durations = [...toMilliseconds(styles.animationDuration), ...toMilliseconds(styles.transitionDuration)];
        return durations.some((duration) => Number.isFinite(duration) && duration > 1)
          ? [`${element.tagName.toLowerCase()}.${element.className}`]
          : [];
      });
    });

    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    expect(motion).toEqual([]);
    await expect(page.getByRole("heading", { name: "Learner acts. AI assists. Evidence decides." })).toBeVisible();
  });
});
