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

function termBoundary(page: Page) {
  return page.getByRole("heading", {
    level: 2,
    name: "The term stays one boundary.",
  }).locator("..");
}

test("inspects every course without choosing, ranking, or acting", async ({
  page,
}) => {
  await page.goto("/internal/university-semester-overview");

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Every course. No false priority.",
  })).toBeVisible();
  await expect(page.getByText(
    "Ready for inspection does not mean the semester is ready.",
  )).toBeVisible();
  await expect(termBoundary(page).getByText("Term Recovery")).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(1);
  const group = page.getByRole("group", {
    name: "Select research scenario for this view",
  });
  await expect(group.getByRole("radio")).toHaveCount(4);
  await expect(page.getByRole("radio", {
    name: /^Mixed term\./,
  })).toBeChecked();

  const ledger = page.getByRole("list", {
    name: "Current-course inspection ledger",
  });
  const workspace = page.locator("main article");
  await expect(ledger.getByRole("listitem")).toHaveCount(4);
  await expect(ledger.getByRole("heading", { level: 3 })).toHaveText([
    "CS102: Evidence and computation",
    "MATH110: Discrete structures",
    "HIST204: Modern history",
    "BIO120: Cell systems",
  ]);
  await expect(workspace.getByRole("link")).toHaveCount(0);
  await expect(workspace.getByRole("button")).toHaveCount(1);
  await expect(workspace.getByRole("button", { name: "Reset view" }))
    .toBeDisabled();
  await expect(workspace.getByText(
    /recommended|highest priority|best course/i,
  ))
    .toHaveCount(0);
});

test("keeps four aggregate scenarios keyboard-operable and refresh-clear", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__forgeOverviewInitialStorage", {
      configurable: false,
      enumerable: false,
      value: {
        local: JSON.stringify({ ...localStorage }),
        session: JSON.stringify({ ...sessionStorage }),
      },
      writable: false,
    });
  });
  await page.goto("/internal/university-semester-overview");
  const storageBefore = await page.evaluate(() => (
    window as typeof window & {
      readonly __forgeOverviewInitialStorage: {
        readonly local: string;
        readonly session: string;
      };
    }
  ).__forgeOverviewInitialStorage);
  expect(await page.evaluate(() => ({
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
  }))).toEqual(storageBefore);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  const mixed = page.getByRole("radio", { name: /^Mixed term\./ });
  const sourceReview = page.getByRole("radio", {
    name: /^Term source review\./,
  });
  const capacity = page.getByRole("radio", { name: /^Capacity choice\./ });
  const worldChanged = page.getByRole("radio", { name: /^World changed\./ });
  const liveStatus = page.getByRole("status");
  await expect(liveStatus).toHaveCount(1);

  await page.evaluate(() => window.scrollTo(0, 120));
  const stableScrollStart = await page.evaluate(() => window.scrollY);
  await mixed.focus();
  await page.keyboard.press("ArrowRight");
  await expect(sourceReview).toBeFocused();
  await expect(sourceReview).toBeChecked();
  expect(Math.abs(
    await page.evaluate(() => window.scrollY) - stableScrollStart,
  )).toBeLessThanOrEqual(1);
  await expect(liveStatus).toHaveText(
    "4 courses are available for shallow inspection. "
    + "Term recovery is source review required.",
  );
  await expect(termBoundary(page).getByText(
    "source review required",
    { exact: true },
  )).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(capacity).toBeFocused();
  await expect(capacity).toBeChecked();
  await expect(termBoundary(page).getByText(
    "learner choice required",
    { exact: true },
  )).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(worldChanged).toBeFocused();
  await expect(worldChanged).toBeChecked();
  await expect(liveStatus).toHaveText(
    "4 courses are available for shallow inspection. "
    + "Term recovery is draft ready.",
  );
  await expect(page.getByRole("listitem").first().getByText(
    "world review required",
    { exact: true },
  )).toBeVisible();

  await page.getByRole("button", { name: "Reset view" }).click();
  await expect(mixed).toBeFocused();
  await expect(mixed).toBeChecked();
  expect(await page.evaluate(() => ({
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
  }))).toEqual(storageBefore);
  expect(requests).toEqual([]);

  await page.reload();
  await expect(page.getByRole("radio", {
    name: /^Mixed term\./,
  })).toBeChecked();
});

test("recomposes at exactly 320 CSS pixels without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/internal/university-semester-overview");

  await expect(page.getByRole("navigation", {
    name: "Mobile navigation",
  })).toHaveCount(0);
  const widths = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  const radioRows = await page.getByRole("radio").evaluateAll(
    (controls) => controls.map((control) => (
      control.parentElement?.getBoundingClientRect().height ?? 0
    )),
  );

  expect(widths).toEqual({ body: 320, client: 320, document: 320 });
  radioRows.forEach((height) => expect(height).toBeGreaterThanOrEqual(44));

  const mixed = page.getByRole("radio", { name: /^Mixed term\./ });
  const sourceReview = page.getByRole("radio", {
    name: /^Term source review\./,
  });
  await page.evaluate(() => window.scrollTo(0, 80));
  const stableScrollStart = await page.evaluate(() => window.scrollY);
  await mixed.focus();
  await page.keyboard.press("ArrowRight");
  await expect(sourceReview).toBeFocused();
  expect(Math.abs(
    await page.evaluate(() => window.scrollY) - stableScrollStart,
  )).toBeLessThanOrEqual(1);
  await expect(page.getByRole("status")).toHaveText(
    "4 courses are available for shallow inspection. "
    + "Term recovery is source review required.",
  );

  const reset = page.getByRole("button", { name: "Reset view" });
  await reset.focus();
  await page.getByText("Navigation explanation only").scrollIntoViewIfNeeded();
  await page.keyboard.press("Enter");
  await expect(mixed).toBeFocused();
  await expect(mixed).toBeChecked();
  expect(await mixed.evaluate((control) => {
    const bounds = control.getBoundingClientRect();
    return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
  })).toBe(true);
});

test("removes nonessential motion and preserves native forced-color controls", async ({
  page,
}) => {
  await page.emulateMedia({
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  await page.goto("/internal/university-semester-overview");
  const selected = page.getByRole("radio", { name: /^Mixed term\./ });
  await selected.focus();
  const styles = await selected.evaluate((control) => {
    const label = control.closest("label")!;
    const inputStyle = getComputedStyle(control);
    const labelStyle = getComputedStyle(label);
    return {
      appearance: inputStyle.appearance,
      height: control.getBoundingClientRect().height,
      labelBorderWidth: labelStyle.borderTopWidth,
      labelOutlineStyle: labelStyle.outlineStyle,
      transitionDuration: labelStyle.transitionDuration,
      visibility: inputStyle.visibility,
      width: control.getBoundingClientRect().width,
    };
  });

  expect(await page.evaluate(() => ({
    forcedColors: matchMedia("(forced-colors: active)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  }))).toEqual({ forcedColors: true, reducedMotion: true });
  expect(styles.appearance).not.toBe("none");
  expect(styles.visibility).not.toBe("hidden");
  expect(styles.width).toBeGreaterThanOrEqual(18);
  expect(styles.height).toBeGreaterThanOrEqual(18);
  expect(styles.labelBorderWidth).not.toBe("0px");
  expect(styles.labelOutlineStyle).not.toBe("none");
  expect(Number.parseFloat(styles.transitionDuration)).toBeLessThanOrEqual(
    0.000_01,
  );
});
