import { expect, test, type Page } from "@playwright/test";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("moves through all seven semester states with native keyboard controls", async ({
  page,
}) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-semester-loop");

  await expect(page.getByRole("heading", {
    level: 1,
    name: "One semester. One honest next move.",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Inspect how help turns off before proof.",
  })).toBeVisible();

  // Exercise one label transition before the keyboard loop so the client
  // island is hydrated rather than changing only the server-rendered input.
  await page.getByRole("radio", { name: "Source review" }).check({
    force: true,
  });
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Review what the copied sources disagree about.",
  })).toBeVisible();
  await page.getByRole("radio", { name: "Ready" }).check({ force: true });
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Inspect how help turns off before proof.",
  })).toBeVisible();

  const ready = page.getByRole("radio", { name: "Ready" });
  await ready.focus();
  await expect(ready).toBeFocused();

  const nextStates = [
    "Review what the copied sources disagree about.",
    "Rebuild from the time you actually have.",
    "You decide whether this tight window is workable.",
    "The reviewed learning activity changed.",
    "This action is complete. The course is not.",
    "The accepted action is blocked. Do not route around it.",
  ];
  for (const heading of nextStates) {
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", {
      level: 2,
      name: heading,
    })).toBeVisible();
  }

  await expect(page.getByRole("radio", { name: "Path blocked" })).toBeChecked();
  await expect(page.locator("main article").getByRole("link")).toHaveCount(0);
  expect(consoleFailures).toEqual([]);
});

test("exposes only the route matched to the selected safe job", async ({ page }) => {
  await page.goto("/internal/university-semester-loop");
  const workspace = page.locator("main article");

  await expect(workspace.getByRole("link", {
    name: "Inspect protected study brief",
  })).toHaveAttribute("href", "/internal/university-protected-study");
  await expect(workspace.getByRole("link")).toHaveCount(1);

  await page.getByRole("radio", { name: "Source review" }).check({
    force: true,
  });
  await expect(workspace.getByRole("link", {
    name: "Review copied sources",
  })).toHaveAttribute("href", "/internal/university-source-review");
  await expect(workspace.getByRole("link")).toHaveCount(1);

  await page.getByRole("radio", { name: "Capacity break" }).check({
    force: true,
  });
  await expect(workspace.getByRole("link", {
    name: "Inspect recovery draft",
  })).toHaveAttribute("href", "/internal/university-recovery");
  await expect(workspace.getByRole("link")).toHaveCount(1);

  for (const label of [
    "Tight window",
    "World changed",
    "Path complete",
    "Path blocked",
  ]) {
    await page.getByRole("radio", { name: label }).check({ force: true });
    await expect(workspace.getByRole("link")).toHaveCount(0);
  }
});

test("resets to the ready fixture on reload without network or storage mutation", async ({
  page,
}) => {
  await page.goto("/internal/university-semester-loop");
  const storageBefore = await page.evaluate(() => ({
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
  }));
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.getByRole("radio", { name: "World changed" }).check({
    force: true,
  });
  await expect(page.getByRole("heading", {
    level: 2,
    name: "The reviewed learning activity changed.",
  })).toBeVisible();
  const storageAfterSelection = await page.evaluate(() => ({
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
  }));

  expect(storageAfterSelection).toEqual(storageBefore);
  expect(requests).toEqual([]);

  await page.reload();
  await expect(page.getByRole("radio", { name: "Ready" })).toBeChecked();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Inspect how help turns off before proof.",
  })).toBeVisible();
});

test("has no horizontal overflow at exactly 320 CSS pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/internal/university-semester-loop");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "One semester. One honest next move.",
  })).toBeVisible();

  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths).toEqual({ document: 320, body: 320, client: 320 });
});

test("collapses scenario-control transitions under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/internal/university-semester-loop");
  const mediaMatches = await page.evaluate(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const transitionDuration = await page
    .locator('input[value="ready"] + span')
    .evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(mediaMatches).toBe(true);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.000_01);
});

test("keeps focused and selected scenario controls visible in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/internal/university-semester-loop");
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
