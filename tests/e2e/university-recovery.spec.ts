import { expect, test, type Page } from "@playwright/test";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("moves across every recovery state with native keyboard controls", async ({ page }) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-recovery");

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Rebuild from what fits now.",
  })).toBeVisible();
  const reset = page.getByRole("radio", { name: "Reset fits" });
  await reset.focus();
  await expect(reset).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Protect the learning. Choose the trade-off.",
  })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Ask before carrying the conflict forward.",
  })).toBeVisible();
  await expect(page.getByText("Prepared, not sent", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Resolve the copied deadline first.",
  })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Protect now" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Review source copies" })).toBeVisible();
  expect(consoleFailures).toEqual([]);
});

test("enters recovery from a tight Today state without implying state transfer", async ({ page }) => {
  await page.goto("/internal/university-today");
  await page.getByRole("radio", { name: "Tight window" }).press("Space");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "The activity fits only at the low estimate.",
  })).toBeVisible();
  await expect(page.getByRole("link", { name: "Preview activity" })).toHaveCount(0);
  const recoveryLink = page.getByRole("link", { name: "Open recovery draft" });
  await expect(recoveryLink).toBeVisible();
  await expect(page.getByText(
    "This opens a separate synthetic fixture. No capacity, work item, deadline, or decision is transferred or saved.",
    { exact: true },
  )).toBeVisible();
  await recoveryLink.click();
  await expect(page).toHaveURL(/\/internal\/university-recovery$/);
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Rebuild from what fits now.",
  })).toBeVisible();
});

test("has no horizontal overflow at exactly 320 CSS pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/internal/university-recovery");
  await page.getByRole("radio", { name: "Ask for help" }).press("Space");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Ask before carrying the conflict forward.",
  })).toBeVisible();

  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths).toEqual({ document: 320, body: 320, client: 320 });
});

test("collapses control transitions when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/internal/university-recovery");
  const mediaMatches = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const transitionDuration = await page.locator('input[value="reset-fits"] + span')
    .evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(mediaMatches).toBe(true);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.000_01);
});

test("keeps selected and focused controls distinguishable in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/internal/university-recovery");
  const choice = page.getByRole("radio", { name: "Choice needed" });
  await choice.focus();
  await page.keyboard.press("Space");
  await expect(choice).toBeChecked();
  const mediaMatches = await page.evaluate(() => matchMedia("(forced-colors: active)").matches);
  const visibleControlStyle = await page.locator('input[value="choice-needed"] + span')
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
        color: style.color,
      };
    });

  expect(mediaMatches).toBe(true);
  expect(visibleControlStyle.borderStyle).toBe("solid");
  expect(visibleControlStyle.borderWidth).not.toBe("0px");
  expect(visibleControlStyle.color).not.toBe("");
});
