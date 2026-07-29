import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "forge.project-sprints:v1";
const SPRINT_ID = "sprint-e2e-local";
const TITLE = "Campus Event Matcher";

function localStore() {
  return {
    version: 1,
    revision: 1,
    sprints: [{
      schemaVersion: 1,
      id: SPRINT_ID,
      title: TITLE,
      audience: "Students choosing useful campus events.",
      finishLine: "Students can filter campus events and open one useful event detail page.",
      startingPoint: "A small event data fixture and a basic application shell.",
      dailyMinutes: 60,
      templateId: "campus-tool",
      status: "active",
      currentDay: 1,
      createdAt: "2026-07-29T00:00:00.000Z",
      updatedAt: "2026-07-29T00:00:00.000Z",
      days: Array.from({ length: 7 }, (_, index) => ({
        day: index + 1,
        workNotes: "",
        change: "",
        evidenceLinks: [],
        completedAt: null,
      })),
      proofLab: {
        explainWithoutNotes: "",
        changeWithoutAi: "",
        realityCheck: "",
        coreOutcomeShown: false,
        evidenceIsInspectable: false,
        canExplainScope: false,
        aiUse: "not_declared",
        status: "not_started",
      },
      whatShipped: [],
      reflection: "",
      openQuestions: [],
    }],
  };
}

async function seedSprint(page: Page) {
  await page.goto("/");
  await page.evaluate(({ key, value }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: STORAGE_KEY, value: localStore() });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )).toBeLessThanOrEqual(1);
}

test.describe("FORGE sprint product routes", () => {
  test("starts from the homepage and creates a persistent local workspace after validation", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole("heading", { name: /Build something real\.\s*Prove it’s yours\./i })).toBeVisible();
    await page.getByRole("textbox", { name: "What do you want to ship in 7 days?" }).fill(TITLE);
    await page.getByRole("button", { name: "Start a Forge Sprint" }).click();
    await expect(page).toHaveURL(/\/build\/new\?idea=Campus(?:%20|\+)Event(?:%20|\+)Matcher/);

    await page.getByRole("textbox", { name: "Who is it for?" }).fill("x");
    await page.getByRole("textbox", { name: "What should work by Day 7?" }).fill("short");
    await page.getByRole("textbox", { name: "What do you already have?" }).fill("x");
    await page.getByRole("button", { name: "Build my 7-day map" }).click();
    await expect(page.locator(".forge-form-alert")).toContainText("Make the sprint a little more concrete.");
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();

    await page.getByRole("textbox", { name: "Who is it for?" }).fill("Students looking for useful events on campus.");
    await page.getByRole("textbox", { name: "What should work by Day 7?" }).fill(
      "Students can filter events and open one useful event detail page.",
    );
    await page.getByRole("textbox", { name: "What do you already have?" }).fill(
      "Event fixture data and a small application shell.",
    );
    await page.getByRole("button", { name: "Build my 7-day map" }).click();
    await expect(page).toHaveURL(/\/build\/sprint-[A-Za-z0-9-]+$/);
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();

    const notes = page.getByRole("textbox", { name: "Work notes" });
    await notes.fill("I mapped the event filters and wrote the first useful empty state.");
    await page.getByRole("button", { name: "Save today’s move" }).click();
    await expect(page.getByText("Saved on this browser.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(notes).toHaveValue("I mapped the event filters and wrote the first useful empty state.");
  });

  test("keeps primary actions legible and the sprint skip link keyboard-first", async ({ page }) => {
    await page.goto("/");

    const primaryColors = await page.locator(".forge-button--primary").evaluateAll((buttons) =>
      buttons.map((button) => {
        const style = getComputedStyle(button);
        return { background: style.backgroundColor, foreground: style.color };
      }),
    );
    expect(primaryColors).toHaveLength(2);
    for (const colors of primaryColors) {
      expect(colors.foreground).toBe("rgb(255, 255, 255)");
      expect(colors.foreground).not.toBe(colors.background);
    }

    const skip = page.locator(".forge-sprint-skip");
    await expect(skip).toHaveCount(1);
    expect(await skip.evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await expect.poll(() => skip.evaluate((element) => element.getBoundingClientRect().top))
      .toBeGreaterThanOrEqual(0);
    await skip.press("Enter");
    await expect(page.locator("#forge-sprint-main")).toBeFocused();
  });

  test("fails closed for an unknown local proof and renders the example proof", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/proof/not-on-this-browser");
    await expect(page.getByRole("heading", { name: /proof not found|sprint not found/i })).toBeVisible();
    await expect(page.getByText(/does not match.*stored in this browser/i)).toBeVisible();

    await page.goto("/proof/example");
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    await expect(page.getByText(/example|local proof preview/i).first()).toBeVisible();
    await expect(page.getByText(/self-declared|learner-declared/i).first()).toBeVisible();
  });

  test("reflows the primary sprint surfaces at 390px and 320px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The explicit compact-width contract runs once in Chromium.");
    await seedSprint(page);

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of ["/", "/build/new?template=campus-tool", "/build/" + SPRINT_ID, "/proof/example"]) {
        await page.goto(path);
        await expect(page.locator("main").first()).toBeVisible();
        await expectNoHorizontalOverflow(page);
      }
    }
  });
});
