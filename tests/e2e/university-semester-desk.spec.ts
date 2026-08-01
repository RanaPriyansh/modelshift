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

async function storageSnapshot(page: Page) {
  return page.evaluate(() => ({
    local: Object.entries(localStorage).sort(([left], [right]) => (
      left.localeCompare(right)
    )),
    session: Object.entries(sessionStorage).sort(([left], [right]) => (
      left.localeCompare(right)
    )),
  }));
}

function scenarioGroup(page: Page) {
  return page.getByRole("group", {
    name: "Select research scenario for this view",
  });
}

function courseGroup(page: Page) {
  return page.getByRole("group", {
    name: "Choose one course to inspect",
  });
}

test("starts with no course chosen and exposes exact authority boundaries", async ({
  page,
}) => {
  await page.goto("/internal/university-semester-desk");

  await expect(page.getByRole("heading", {
    level: 1,
    name: "See the whole term. Choose where to look closer.",
  })).toBeVisible();
  await expect(scenarioGroup(page).getByRole("radio")).toHaveCount(4);
  await expect(scenarioGroup(page).getByRole("radio", {
    name: /^Mixed term\./,
  })).toBeChecked();

  const courses = courseGroup(page).getByRole("radio");
  await expect(courses).toHaveCount(4);
  await expect(courseGroup(page).locator('input[type="radio"]:checked'))
    .toHaveCount(0);
  await expect(page.getByRole("button", {
    name: "Clear course inspection",
  })).toHaveCount(0);

  await expect(page.getByText("Course ID, not priority", {
    exact: true,
  })).toBeVisible();
  await expect(page.getByText(
    "Caller-asserted synthetic input; not verified",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByText("Tenant isolation", { exact: true }))
    .toBeVisible();
  await expect(page.getByText("Rights enforcement", { exact: true }))
    .toBeVisible();
  await expect(page.getByText(
    "Institutional completeness",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByText(
    "Allowed only for explicit refresh-clear synthetic inspection",
    { exact: true },
  )).toBeVisible();

  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByText(
    "Inspectable does not mean the term, Recovery plan, or any course is ready or feasible.",
  )).toBeVisible();
  await expect(page.getByRole("article", {
    name: "See the whole term. Choose where to look closer.",
  }).getByRole("link")).toHaveCount(0);
});

test("keeps scenario and course inspection keyboard-owned and reversible", async ({
  page,
}) => {
  await page.goto("/internal/university-semester-desk");
  const initialStorage = await storageSnapshot(page);
  const interactionRequests: string[] = [];
  page.on("request", (request) => interactionRequests.push(request.url()));

  const mixed = scenarioGroup(page).getByRole("radio", {
    name: /^Mixed term\./,
  });
  const sourceReview = scenarioGroup(page).getByRole("radio", {
    name: /^Term source review\./,
  });
  const capacity = scenarioGroup(page).getByRole("radio", {
    name: /^Capacity choice\./,
  });
  await mixed.focus();
  await page.keyboard.press("ArrowRight");
  await expect(sourceReview).toBeFocused();
  await expect(sourceReview).toBeChecked();
  await expect(courseGroup(page).locator('input[type="radio"]:checked'))
    .toHaveCount(0);

  const firstCourse = courseGroup(page).getByRole("radio", {
    name: /CS102: Evidence and computation/i,
  });
  const secondCourse = courseGroup(page).getByRole("radio", {
    name: /MATH110: Discrete structures/i,
  });
  await firstCourse.focus();
  await page.keyboard.press("Space");
  await expect(firstCourse).toBeFocused();
  await expect(firstCourse).toBeChecked();
  await expect(page.getByText(
    "You choose what to inspect. FORGE does not choose what to do.",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "CS102: Evidence and computation",
  })).toBeVisible();
  const journey = page.getByRole("region", {
    name: "Selected course semester loop",
  });
  await expect(journey.getByText("Sources", { exact: true })).toBeVisible();
  await expect(journey.getByText("Today", { exact: true })).toBeVisible();
  await expect(journey.getByText("Recovery", { exact: true })).toBeVisible();
  await expect(journey.getByText("Protected study", { exact: true }))
    .toBeVisible();
  await expect(journey.getByText("Return", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText(
    "selected for inspection",
  );

  await page.keyboard.press("ArrowDown");
  await expect(secondCourse).toBeFocused();
  await expect(secondCourse).toBeChecked();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "MATH110: Discrete structures",
  })).toBeVisible();

  const clear = page.getByRole("button", {
    name: "Clear course inspection",
  });
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(secondCourse).toBeFocused();
  await expect(courseGroup(page).locator('input[type="radio"]:checked'))
    .toHaveCount(0);
  await expect(clear).toHaveCount(0);
  await expect(page.getByRole("heading", {
    level: 2,
    name: "MATH110: Discrete structures",
  })).toHaveCount(0);

  await firstCourse.focus();
  await page.keyboard.press("Space");
  await sourceReview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(capacity).toBeChecked();
  await expect(courseGroup(page).locator('input[type="radio"]:checked'))
    .toHaveCount(0);
  await expect(page.getByRole("button", {
    name: "Clear course inspection",
  })).toHaveCount(0);

  expect(await storageSnapshot(page)).toEqual(initialStorage);
  expect(interactionRequests).toEqual([]);

  await page.reload();
  await expect(scenarioGroup(page).getByRole("radio", {
    name: /^Mixed term\./,
  })).toBeChecked();
  await expect(courseGroup(page).locator('input[type="radio"]:checked'))
    .toHaveCount(0);
});

test("recomposes at exactly 320 CSS pixels with visible focus and no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/internal/university-semester-desk");

  await expect(page.getByRole("navigation", {
    name: "Mobile navigation",
  })).toHaveCount(0);
  const widths = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths).toEqual({ body: 320, client: 320, document: 320 });

  const radioRows = await page.getByRole("radio").evaluateAll(
    (controls) => controls.map((control) => (
      control.closest("label")?.getBoundingClientRect().height ?? 0
    )),
  );
  radioRows.forEach((height) => expect(height).toBeGreaterThanOrEqual(44));

  const firstCourseRow = courseGroup(page).getByRole("listitem").first();
  await expect(firstCourseRow.getByText("Today", { exact: true }))
    .toBeVisible();
  await expect(firstCourseRow.getByText("Semester loop", { exact: true }))
    .toBeVisible();

  const lastCourse = courseGroup(page).getByRole("radio", {
    name: /BIO120: Cell systems/i,
  });
  await lastCourse.focus();
  await page.keyboard.press("Space");
  await expect(lastCourse).toBeChecked();
  await expect(lastCourse).toBeFocused();
  expect(await lastCourse.evaluate((control) => {
    const bounds = control.getBoundingClientRect();
    return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
  })).toBe(true);
  expect(await page.evaluate(() => ({
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }))).toEqual({ body: 320, client: 320, document: 320 });

  const clear = page.getByRole("button", {
    name: "Clear course inspection",
  });
  await expect(clear).toBeVisible();
  await clear.scrollIntoViewIfNeeded();
  await expect(clear).toBeInViewport();
  expect(await clear.evaluate((control) => (
    control.getBoundingClientRect().height
  ))).toBeGreaterThanOrEqual(44);
  await clear.click();
  await expect(lastCourse).toBeFocused();
  expect(await lastCourse.evaluate((control) => {
    const bounds = control.getBoundingClientRect();
    return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
  })).toBe(true);

  expect(await page.evaluate(() => ({
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }))).toEqual({ body: 320, client: 320, document: 320 });
});

test("removes nonessential motion and preserves native forced-color controls", async ({
  page,
}) => {
  await page.emulateMedia({
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  await page.goto("/internal/university-semester-desk");
  const selected = scenarioGroup(page).getByRole("radio", {
    name: /^Mixed term\./,
  });
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
