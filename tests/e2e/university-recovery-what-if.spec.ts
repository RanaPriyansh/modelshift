import { expect, test, type Page } from "@playwright/test";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("keeps evidence before neutral choices and preserves native keyboard focus", async ({
  page,
}) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-recovery");

  const evidence = page.getByRole("heading", {
    level: 2,
    name: "Held fixed in every what-if",
  });
  const group = page.getByRole("group", {
    name: "Try a sample amount of available time",
  });
  await expect(page.getByRole("heading", {
    level: 1,
    name: "What changes if the time you can use changes?",
  })).toBeVisible();
  await expect(evidence).toBeVisible();
  await expect(group).toBeVisible();
  expect(await evidence.evaluate((element) => (
    (() => {
      const fieldset = document.querySelector("fieldset");
      return fieldset !== null && Boolean(
        element.compareDocumentPosition(fieldset)
        & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    })()
  ))).toBe(true);

  const first = page.getByRole("radio", { name: /4 h available/ });
  const second = page.getByRole("radio", {
    name: /2 h 10 min available/,
  });
  const third = page.getByRole("radio", {
    name: /1 h 40 min available/,
  });
  await first.focus();
  await expect(first).toBeFocused();
  await expect(first).not.toBeChecked();
  await expect(second).not.toBeChecked();
  await expect(third).not.toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(second).toBeFocused();
  await expect(second).toBeChecked();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Only the low estimate fits.",
  })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(third).toBeFocused();
  await expect(page.getByText("Prepared, not sent", { exact: true }))
    .toBeVisible();

  await page.getByRole("button", { name: "Reset what-if" }).click();
  await expect(first).toBeFocused();
  await expect(first).not.toBeChecked();
  await expect(second).not.toBeChecked();
  await expect(third).not.toBeChecked();
  await expect(page.getByLabel("No what-if result selected")).toBeVisible();
  await expect(page.getByRole("button", { name: /save|apply|accept|send/i }))
    .toHaveCount(0);
  expect(consoleFailures).toEqual([]);
});

test("keeps a single-flow layout without overflow at exactly 320 CSS pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/internal/university-recovery");
  await page.getByRole("radio", { name: /1 h 40 min available/ }).press("Space");
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Even the low estimate does not fit.",
  })).toBeVisible();

  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  const controlHeights = await page.getByRole("radio").evaluateAll(
    (controls) => controls.map((control) => (
      control.parentElement?.getBoundingClientRect().height ?? 0
    )),
  );

  expect(widths).toEqual({ document: 320, body: 320, client: 320 });
  controlHeights.forEach((height) => expect(height).toBeGreaterThanOrEqual(44));
});

test("collapses nonessential transitions when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/internal/university-recovery");
  const transitionDuration = await page.locator(
    'input[value="available-240"] + span',
  ).evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(await page.evaluate(() => (
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ))).toBe(true);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.000_01);
});

test("preserves selected and focused controls in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/internal/university-recovery");
  const choice = page.getByRole("radio", { name: /2 h 10 min available/ });
  await choice.focus();
  await choice.press("Space");
  const style = await page.locator(
    'input[value="available-130"] + span',
  ).evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      borderStyle: computed.borderStyle,
      borderWidth: computed.borderWidth,
      color: computed.color,
    };
  });

  await expect(choice).toBeFocused();
  await expect(choice).toBeChecked();
  expect(await page.evaluate(() => (
    matchMedia("(forced-colors: active)").matches
  ))).toBe(true);
  expect(style.borderStyle).toBe("solid");
  expect(style.borderWidth).not.toBe("0px");
  expect(style.color).not.toBe("");
});
