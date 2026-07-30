import { expect, test, type Page } from "@playwright/test";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("moves across every protected-study boundary with native keyboard controls", async ({
  page,
}) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-protected-study");

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Understand it. Then prove it without help.",
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "Preview exact reviewed World",
  })).toBeVisible();

  const ready = page.getByRole("radio", { name: "Ready brief" });
  await ready.focus();
  await expect(ready).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Resolve the course context before studying.",
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "Preview exact reviewed World",
  })).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "The reviewed World changed.",
  })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "This reviewed World is paused.",
  })).toBeVisible();
  expect(consoleFailures).toEqual([]);
});

test("enters the protected brief from ready Today without transferring state", async ({
  page,
}) => {
  await page.goto("/internal/university-today");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Test one claim against two sources",
  })).toBeVisible();
  const briefLink = page.getByRole("link", {
    name: "Inspect protected study brief",
  });
  await expect(briefLink).toBeVisible();
  await expect(page.getByText(
    "This opens a separate synthetic integrity brief. No action, course state, or session is transferred or saved.",
    { exact: true },
  )).toBeVisible();
  await briefLink.click();

  await expect(page).toHaveURL(/\/internal\/university-protected-study$/);
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Understand it. Then prove it without help.",
  })).toBeVisible();
  await expect(page.getByText(
    "Preview only. This fixture does not create a learner-owned session, transfer course state, or record completion.",
    { exact: true },
  )).toBeVisible();
});

test("has no horizontal overflow at exactly 320 CSS pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/internal/university-protected-study");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Understand it. Then prove it without help.",
  })).toBeVisible();

  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths).toEqual({ document: 320, body: 320, client: 320 });
});

test("collapses control transitions when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/internal/university-protected-study");
  const mediaMatches = await page.evaluate(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const transitionDuration = await page
    .locator('input[value="ready"] + span')
    .evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(mediaMatches).toBe(true);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.000_01);
});

test("keeps selected and focused controls distinguishable in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/internal/university-protected-study");
  const changed = page.getByRole("radio", { name: "World changed" });
  await changed.focus();
  await page.keyboard.press("Space");
  await expect(changed).toBeChecked();
  const mediaMatches = await page.evaluate(
    () => matchMedia("(forced-colors: active)").matches,
  );
  const visibleControlStyle = await page
    .locator('input[value="world-changed"] + span')
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
