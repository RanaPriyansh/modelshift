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

async function settleLayout(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

test("keeps exact evidence before one repair and preserves native keyboard state", async ({
  page,
}) => {
  await page.goto("/internal/university-post-attempt-repair");

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Repair the boundary, not the answer.",
  })).toBeVisible();
  const group = page.getByRole("group", {
    name: "Select a closed synthetic result",
  });
  const first = page.getByRole("radio", {
    name: /One check open\. One fixed authored mapping/i,
  });
  const second = page.getByRole("radio", {
    name: /Two checks open\. No authored repair mapping/i,
  });
  await expect(first).toBeChecked();
  await expect(page.getByText("1 of 2 authored checks")).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Name the missing comparison.",
  })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.locator('[aria-current="page"]')).toHaveCount(0);
  await expect(page.getByText(
    "Illustrative response shape — not an input",
  )).toBeVisible();

  const evidence = page.getByRole("heading", {
    level: 2,
    name: "1 of 2 authored checks",
  });
  const repair = page.getByRole("heading", {
    level: 2,
    name: "Name the missing comparison.",
  });
  expect(await evidence.evaluate((element, repairElement) => (
    Boolean(
      element.compareDocumentPosition(repairElement as Node)
      & Node.DOCUMENT_POSITION_FOLLOWING,
    )
  ), await repair.elementHandle())).toBe(true);

  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(second).toBeFocused();
  await expect(second).toBeChecked();
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Stop before inventing advice.",
  })).toBeVisible();
  await expect(page.getByText(
    /Check-level repair detail is withheld/i,
  )).toBeVisible();

  await page.getByRole("button", { name: "Reset result" }).click();
  await expect(first).toBeFocused();
  await expect(first).toBeChecked();
  await expect(page.getByText("Why this move")).toBeVisible();
  await page.getByText("Why this move").click();
  await expect(page.getByText(
    /fixed mapping for that result, not an inference about the learner/i,
  )).toBeVisible();
  await expect(group.getByRole("radio")).toHaveCount(4);
  await expect(page.getByRole("button", {
    name: /start|save|submit|retry|rescore|apply|accept/i,
  })).toHaveCount(0);
});

test("recomposes at 320 CSS pixels without overflow or scroll anchoring jumps", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/internal/university-post-attempt-repair");
  await expect(page.getByRole("navigation", {
    name: "Mobile navigation",
  })).toHaveCount(0);

  const first = page.getByRole("radio", { name: /One check open/i });
  const second = page.getByRole("radio", { name: /Two checks open/i });
  const third = page.getByRole("radio", { name: /Both checks held/i });
  const fourth = page.getByRole("radio", { name: /Receipt unavailable/i });
  await second.evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
  const bounds = await page.getByRole("radio").evaluateAll(
    (controls) => controls.map((control) => (
      control.parentElement?.getBoundingClientRect().height ?? 0
    )),
  );
  const scrollPositions: number[] = [await page.evaluate(() => window.scrollY)];
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(second).toBeFocused();
  await expect(second).toBeChecked();
  await settleLayout(page);
  scrollPositions.push(await page.evaluate(() => window.scrollY));
  await page.keyboard.press("ArrowRight");
  await expect(third).toBeFocused();
  await expect(third).toBeChecked();
  await settleLayout(page);
  scrollPositions.push(await page.evaluate(() => window.scrollY));
  await page.keyboard.press("ArrowRight");
  await expect(fourth).toBeFocused();
  await expect(fourth).toBeChecked();
  await settleLayout(page);
  scrollPositions.push(await page.evaluate(() => window.scrollY));
  await page.getByRole("button", { name: "Reset result" }).click();
  await expect(first).toBeFocused();
  await expect(first).toBeChecked();
  await settleLayout(page);
  scrollPositions.push(await page.evaluate(() => window.scrollY));
  const widths = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));

  expect(widths).toEqual({ body: 320, client: 320, document: 320 });
  for (const position of scrollPositions.slice(1)) {
    expect(Math.abs(position - scrollPositions[0]!)).toBeLessThanOrEqual(1);
  }
  bounds.forEach((height) => expect(height).toBeGreaterThanOrEqual(44));
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Repair the boundary, not the answer.",
  })).toBeVisible();
});

test("removes nonessential transitions under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/internal/university-post-attempt-repair");
  const transitionDuration = await page.locator(
    'label:has(input[value="one-check-open"])',
  ).evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(await page.evaluate(() => (
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ))).toBe(true);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.000_01);
});

test("preserves selected, focused, held, and open boundaries in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/internal/university-post-attempt-repair");
  const selected = page.getByRole("radio", { name: /One check open/i });
  await selected.focus();
  const selectedStyle = await page.locator(
    'label:has(input[value="one-check-open"])',
  ).evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      borderTopWidth: computed.borderTopWidth,
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
      radio: {
        appearance: getComputedStyle(
          element.querySelector("input")!,
        ).appearance,
        opacity: getComputedStyle(element.querySelector("input")!).opacity,
        visibility:
          getComputedStyle(element.querySelector("input")!).visibility,
        width: element.querySelector("input")!.getBoundingClientRect().width,
        height: element.querySelector("input")!.getBoundingClientRect().height,
      },
      bounds: {
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      },
    };
  });
  const unselectedBounds = await page.locator(
    'label:has(input[value="two-checks-open"])',
  ).evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  const checkBorders = await page.locator(
    "ol li[data-state]",
  ).evaluateAll((elements) => elements.map((element) => (
    getComputedStyle(element).borderColor
  )));

  await expect(selected).toBeFocused();
  await expect(selected).toBeChecked();
  expect(await page.evaluate(() => (
    matchMedia("(forced-colors: active)").matches
  ))).toBe(true);
  expect(selectedStyle.borderTopWidth).not.toBe("0px");
  expect(selectedStyle.outlineStyle).not.toBe("none");
  expect(selectedStyle.outlineWidth).not.toBe("0px");
  expect(selectedStyle.radio.appearance).not.toBe("none");
  expect(selectedStyle.radio.opacity).not.toBe("0");
  expect(selectedStyle.radio.visibility).not.toBe("hidden");
  expect(selectedStyle.radio.width).toBeGreaterThanOrEqual(18);
  expect(selectedStyle.radio.height).toBeGreaterThanOrEqual(18);
  expect(Math.abs(
    selectedStyle.bounds.width - unselectedBounds.width,
  )).toBeLessThanOrEqual(0.5);
  expect(Math.abs(
    selectedStyle.bounds.height - unselectedBounds.height,
  )).toBeLessThanOrEqual(0.5);
  expect(checkBorders).toHaveLength(2);
  checkBorders.forEach((border) => expect(border).not.toBe(""));
});
