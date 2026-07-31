import { expect, test, type Page } from "@playwright/test";

const consoleFailuresByPage = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const failures: string[] = [];
  consoleFailuresByPage.set(page, failures);
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      failures.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    failures.push(`pageerror: ${error.message}`);
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const failures = consoleFailuresByPage.get(page) ?? [];
  if (failures.length > 0) {
    await testInfo.attach("browser-errors", {
      body: failures.join("\n"),
      contentType: "text/plain",
    });
  }
  expect(failures, "unexpected browser console or page errors").toEqual([]);
});

async function waitForLayoutAndScrollAnchoring(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

test("keeps evidence before neutral choices and preserves native keyboard focus", async ({
  page,
}) => {
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
});

test("keeps a single-flow layout without overflow at exactly 320 CSS pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/internal/university-recovery");
  const group = page.getByRole("group", {
    name: "Try a sample amount of available time",
  });
  const second = page.getByRole("radio", {
    name: /2 h 10 min available/,
  });
  const third = page.getByRole("radio", {
    name: /1 h 40 min available/,
  });
  await second.press("Space");
  await group.evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
  const visibleControlBounds = await page.locator(
    'input[value="available-130"], input[value="available-100"]',
  ).evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      bottom: bounds.bottom,
      top: bounds.top,
      viewportHeight: window.innerHeight,
    };
  }));
  visibleControlBounds.forEach(({ bottom, top, viewportHeight }) => {
    expect(top).toBeGreaterThanOrEqual(0);
    expect(bottom).toBeLessThanOrEqual(viewportHeight);
  });

  const scrollBeforeResultChange = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("ArrowRight");
  await expect(third).toBeFocused();
  await expect(third).toBeChecked();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Even the low estimate does not fit.",
  })).toBeVisible();
  await expect(page.getByText("Prepared, not sent", { exact: true }))
    .toBeVisible();
  await waitForLayoutAndScrollAnchoring(page);
  const scrollAfterResultChange = await page.evaluate(() => window.scrollY);

  await page.keyboard.press("ArrowLeft");
  await expect(second).toBeFocused();
  await expect(second).toBeChecked();
  await expect(page.getByText("Prepared, not sent", { exact: true }))
    .toHaveCount(0);
  await waitForLayoutAndScrollAnchoring(page);
  const scrollAfterResultContraction = await page.evaluate(
    () => window.scrollY,
  );

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
  expect(Math.abs(scrollAfterResultChange - scrollBeforeResultChange))
    .toBeLessThan(0.5);
  expect(Math.abs(scrollAfterResultContraction - scrollBeforeResultChange))
    .toBeLessThan(0.5);
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
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor,
      borderStyle: computed.borderStyle,
      borderTopWidth: computed.borderTopWidth,
      color: computed.color,
      outlineColor: computed.outlineColor,
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
    };
  });
  const unselectedStyle = await page.locator(
    'input[value="available-240"] + span',
  ).evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor,
      color: computed.color,
    };
  });

  await expect(choice).toBeFocused();
  await expect(choice).toBeChecked();
  expect(await page.evaluate(() => (
    matchMedia("(forced-colors: active)").matches
  ))).toBe(true);
  expect(style.borderStyle).toBe("solid");
  expect(style.borderTopWidth).not.toBe("0px");
  expect(style.color).not.toBe("");
  expect(style.outlineStyle).not.toBe("none");
  expect(style.outlineWidth).not.toBe("0px");
  expect(style.outlineColor).not.toBe(style.backgroundColor);
  expect({
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    color: style.color,
  }).not.toEqual({
    backgroundColor: unselectedStyle.backgroundColor,
    borderColor: unselectedStyle.borderColor,
    color: unselectedStyle.color,
  });
});
