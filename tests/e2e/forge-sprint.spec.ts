import { expect, test, type Page } from "@playwright/test";
import type { ForgeSprintStore } from "../../src/lib/forge-sprint/model";

const STORAGE_KEY = "forge.project-sprints:v1";
const SPRINT_ID = "sprint-e2e-local";
const TITLE = "Campus Event Matcher";

function localStore(): ForgeSprintStore {
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

function contaminatedStore() {
  const store = localStore();
  const sprint = store.sprints[0];
  sprint.status = "completed";
  sprint.currentDay = 7;
  sprint.days = sprint.days.map((day) => ({
    ...day,
    workNotes: `Day ${day.day}: I tested the smallest useful version with a real case.`,
    change: `Day ${day.day}: I changed the core path after observing the result.`,
    evidenceLinks: day.day === 6
      ? [{ id: "evidence-e2e", label: "Recorded test", url: "https://example.test/proof" }]
      : [],
    completedAt: "2026-07-29T00:00:00.000Z",
  }));
  sprint.proofLab = {
    explainWithoutNotes: "The app filters the campus event list and opens one useful event detail.",
    changeWithoutAi: "I removed a misleading category after the test exposed confusion.",
    realityCheck: "I compared the result with the source fixture.",
    coreOutcomeShown: true,
    evidenceIsInspectable: true,
    canExplainScope: true,
    aiUse: "ai_used_or_unsure",
    status: "contaminated",
  };
  sprint.whatShipped = ["A working campus event filter"];
  sprint.reflection = "The user test narrowed the project to one reliable event-discovery flow.";
  sprint.openQuestions = ["Will source event data remain current?"];
  return store;
}

async function seedSprint(page: Page) {
  await page.goto("/build");
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
  test("keeps Learning OS authoritative and creates a persistent local workspace after validation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", {
      name: /Learn what matters next/i,
    })).toBeVisible();
    await page.getByRole("contentinfo")
      .getByRole("link", { name: "Project Sprint" })
      .click();
    await expect(page).toHaveURL(/\/build$/);

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole("heading", { name: /Start smaller\.\s*Finish something real\./i })).toBeVisible();
    await page.getByRole("textbox", { name: "What do you want to ship in 7 days?" }).fill(TITLE);
    await page.getByRole("button", { name: "Start a FORGE Project Sprint" }).click();
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
    await page.goto("/build");

    const primaryColors = await page.locator(".forge-start-form button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const style = getComputedStyle(button);
        return { background: style.backgroundColor, foreground: style.color };
      }),
    );
    expect(primaryColors).toHaveLength(1);
    for (const colors of primaryColors) {
      expect(colors.foreground).toBe("rgb(32, 40, 36)");
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
    await page.goto("/build");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/proof/not-on-this-browser");
    await expect(page.getByRole("heading", { name: /proof not found|sprint not found/i })).toBeVisible();
    await expect(page.getByText(/does not match.*stored in this browser/i)).toBeVisible();

    await page.goto("/proof/example");
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    await expect(page.getByText(/example|local proof preview/i).first()).toBeVisible();
    await expect(page.getByText(/self-declared|learner-declared/i).first()).toBeVisible();
  });

  test("preserves unreadable local bytes for export until the learner explicitly clears them", async ({ page }) => {
    const corrupt = "{ unreadable project sprint bytes";
    await page.goto("/sprints");
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), {
      key: STORAGE_KEY,
      raw: corrupt,
    });
    await page.reload();

    await expect(page.locator(".forge-storage-recovery")).toContainText("could not be read safely");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download unreadable data" }).click();
    expect((await download).suggestedFilename()).toBe(
      "forge-project-sprint-unreadable-data.txt",
    );
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(corrupt);

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Clear unreadable data" }).click();
    await expect(page.getByText("Unreadable data cleared.", { exact: true })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  });

  test("retains AI-contaminated work without presenting an independent-proof claim", async ({ page }) => {
    await page.goto("/build");
    await page.evaluate(({ key, value }) => {
      localStorage.clear();
      localStorage.setItem(key, JSON.stringify(value));
    }, { key: STORAGE_KEY, value: contaminatedStore() });

    await page.goto("/proof/" + SPRINT_ID);
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    await expect(page.getByText("No independent-proof claim", { exact: true })).toBeVisible();
    await expect(page.getByText("AI-assisted or uncertain", { exact: true })).toBeVisible();
    await expect(page.getByText(/Learning attempt retained; independent proof unavailable/i)).toBeVisible();
  });

  test("removes authored motion when the learner requests reduced motion", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The reduced-motion media contract runs once.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/build");
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    expect(await page.locator(".forge-sprint-app").evaluate((root) => {
      const durations = Array.from(root.querySelectorAll("*")).flatMap((element) => {
        const style = getComputedStyle(element);
        return [...style.animationDuration.split(","), ...style.transitionDuration.split(",")]
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => value.endsWith("ms")
            ? Number.parseFloat(value) / 1000
            : Number.parseFloat(value));
      });
      return Math.max(0, ...durations);
    })).toBeLessThanOrEqual(0.001);
  });

  test("reflows the primary sprint surfaces at 390px and 320px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The explicit compact-width contract runs once in Chromium.");
    await seedSprint(page);
    await page.evaluate(({ key, title }) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error("Expected a seeded sprint store.");
      const store = JSON.parse(raw);
      store.sprints[0].title = title;
      localStorage.setItem(key, JSON.stringify(store));
    }, { key: STORAGE_KEY, title: "X".repeat(80) });

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of [
        "/build",
        "/sprints",
        "/templates",
        "/labs",
        "/build/new?template=campus-tool",
        "/build/" + SPRINT_ID,
        "/proof/example",
      ]) {
        await page.goto(path);
        await expect(page.locator("main").first()).toBeVisible();
        await expectNoHorizontalOverflow(page);
        if (path === "/build/" + SPRINT_ID) {
          const projectTitle = page.locator(".forge-workspace-project h1");
          expect(await projectTitle.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          )).toBe(true);
        }
      }
    }
  });
});
