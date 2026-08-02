import { readFile } from "node:fs/promises";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

const FIRST_COURSE = "Mathematical methods";
const FIRST_WORK = "Prepare the first problem set";
const PRACTICE_NOTE = "I used my lecture notes to work through the first proof step.";
const PROOF_NOTE = "I can now explain the method without the practice prompt.";

function captureBrowserFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  return failures;
}

async function expectNoHorizontalOverflow(page: Page, width: number) {
  await expect.poll(() => page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
  }))).toEqual({ document: width, body: width, client: width });
}

async function localDesk(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) => (
      key.startsWith("forge.semester-desk-v2.v1.profile.")
    ));
    return entry ? JSON.parse(entry[1]) : null;
  });
}

async function waitForStoredDesk(page: Page) {
  await expect.poll(async () => (await localDesk(page)) !== null).toBe(true);
}

async function futureLocalMinute(page: Page): Promise<string> {
  return page.evaluate(() => {
    const value = new Date(Date.now() + (2 * 60 * 1000));
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
      + `T${pad(value.getHours())}:${pad(value.getMinutes())}`;
  });
}

async function captureViewport(page: Page, testInfo: TestInfo, width: number) {
  await page.setViewportSize({ width, height: 844 });
  await expectNoHorizontalOverflow(page, width);
  await page.screenshot({
    path: testInfo.outputPath(`semester-desk-v2-${width}.png`),
    fullPage: true,
  });
}

test("helps a student rebuild a semester, study, return, and continue on one local desk", async ({
  page,
}, testInfo) => {
  const browserFailures = captureBrowserFailures(page);
  await page.goto("/app");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  await expect(page.getByRole("heading", {
    name: "Start with what is real.",
  })).toBeVisible();

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#semester-desk-main")).toBeFocused();

  await page.getByLabel("Semester title").fill("Spring 2030");
  await page.getByLabel("Course code").fill("MATH201");
  await page.getByLabel("Course name").fill(FIRST_COURSE);
  await page.getByLabel("Course detail").fill("Final assessment");
  await page.getByLabel("What it says").fill("60% project");
  await page.getByLabel("Where you saw it").fill("Course handbook");
  await page.getByLabel("Work title").fill(FIRST_WORK);
  await page.getByLabel("Planned date").fill("2030-01-22");
  await page.getByLabel("Minutes you expect").fill("90");
  await page.getByRole("button", { name: "Open your Semester Desk" }).click();

  await expect(page.getByRole("heading", {
    name: "Every course stays visible.",
  })).toBeVisible();
  await waitForStoredDesk(page);

  const addCourse = page.locator("form").filter({ hasText: "ADD A COURSE" });
  await addCourse.getByLabel("Course code").fill("CS210");
  await addCourse.getByLabel("Course name").fill("Data structures");
  await addCourse.getByRole("button", { name: "Add course" }).click();
  await expect(page.getByRole("heading", { name: "Data structures" })).toBeVisible();

  const firstCourse = page.getByRole("heading", {
    name: FIRST_COURSE,
  }).locator("xpath=ancestor::li[1]");
  const detail = firstCourse.locator("details").filter({
    hasText: "Add a course detail",
  });
  await detail.locator("summary").click();
  const detailForm = detail.locator("form");
  await detailForm.getByLabel("Detail").fill("Assessment date");
  await detailForm.getByLabel("What it says").fill("24 January in the portal");
  await detailForm.getByLabel("Status").selectOption({
    label: "Changed since last check",
  });
  await detailForm.getByLabel("Where you saw it").fill("Course portal");
  await detailForm.getByRole("button", { name: "Add course detail" }).click();
  await expect(firstCourse.locator('[data-status="changed-since-last-check"]')).toBeVisible();

  const conflict = firstCourse.locator("details").filter({
    hasText: "Record a conflict",
  });
  await conflict.locator("summary").click();
  const conflictForm = conflict.locator("form");
  await conflictForm.getByRole("checkbox", {
    name: "Final assessment: 60% project",
  }).check();
  await conflictForm.getByRole("checkbox", {
    name: "Assessment date: 24 January in the portal",
  }).check();
  await conflictForm.getByLabel("Describe the conflict").fill(
    "The handbook and portal show different assessment information.",
  );
  await conflictForm.getByRole("button", { name: "Record conflict" }).click();
  await expect(firstCourse.locator("header").getByText("Needs review", {
    exact: true,
  })).toBeVisible();
  await firstCourse.getByRole("button", { name: "Mark checked" }).click();
  await firstCourse.getByRole("button", { name: "Mark reviewed" }).click();

  const capacity = page.getByLabel("Available minutes this week");
  await capacity.fill("120");
  await page.getByRole("button", { name: "Set this time" }).click();
  await page.getByRole("button", { name: "Confirm 2 hrs" }).click();
  await expect(page.getByText("You confirmed 2 hrs.", { exact: true })).toBeVisible();

  const recoveryChoice = page.getByLabel("Keep, move, reduce, or defer");
  await recoveryChoice.selectOption({ label: "Make it shorter" });
  await page.getByLabel("New minutes").fill("45");
  await page.getByPlaceholder("Write why this is honest today").fill(
    "I can complete a shorter focused review before the deadline.",
  );
  await page.getByRole("button", { name: "Review these changes" }).click();
  await expect(page.getByRole("button", {
    name: "Confirm these changes",
  })).toBeVisible();
  await page.getByRole("button", { name: "Confirm these changes" }).click();
  const changeLog = page.getByRole("region", { name: "What changed" });
  await expect(changeLog).toBeVisible();
  await expect(changeLog.getByText(/1 hr 30 min → 45 min\./)).toBeVisible();

  const chooseWork = page.getByRole("button", { name: "Choose this work" });
  await expect(chooseWork).toBeEnabled();
  await chooseWork.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Your next action" })).toBeVisible();
  await page.getByRole("button", { name: "Start protected study" }).click();

  await expect(page.getByRole("heading", { name: FIRST_WORK })).toBeVisible();
  await page.getByLabel("Your working notes").fill(PRACTICE_NOTE);
  await page.getByRole("button", { name: "Finish practice" }).click();
  await expect(page.getByLabel("Your answer")).toBeVisible();

  await page.getByLabel("Your answer").fill(PROOF_NOTE);
  await page.getByRole("button", { name: "I showed my understanding" }).click();
  await expect(page.getByLabel("Return date and time")).toBeVisible();
  await page.clock.install({ time: Date.now() });
  await page.getByLabel("Return date and time").fill(await futureLocalMinute(page));
  await page.getByRole("button", { name: "Set this return" }).click();
  await page.clock.fastForward(2 * 60 * 1000);
  await page.getByRole("button", { name: "Open return" }).click();
  await expect(page.getByRole("button", { name: "I retained it" })).toBeVisible();
  await page.getByRole("button", { name: "I retained it" }).click();
  await expect(page.getByRole("heading", { name: "What you completed." })).toBeVisible();

  const persistedAfterReturn = await localDesk(page);
  expect(JSON.stringify(persistedAfterReturn)).not.toContain(PRACTICE_NOTE);
  expect(JSON.stringify(persistedAfterReturn)).not.toContain(PROOF_NOTE);
  expect((persistedAfterReturn?.progressEvidence as unknown[]) ?? []).toHaveLength(3);

  await page.reload();
  await expect(page.getByRole("heading", {
    name: "Every course stays visible.",
  })).toBeVisible();
  await expect(page.getByRole("list", {
    name: "Completed learning actions",
  }).getByRole("listitem")).toHaveCount(3);

  await captureViewport(page, testInfo, 390);
  await captureViewport(page, testInfo, 320);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download local JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("forge-semester-desk-local.json");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = JSON.parse(await readFile(downloadPath!, "utf8")) as {
    readonly title?: string;
    readonly progressEvidence?: readonly unknown[];
  };
  expect(exported.title).toBe("Spring 2030");
  expect(exported.progressEvidence).toHaveLength(3);

  await page.getByRole("button", { name: "Reset this device" }).last().click();
  const resetDialog = page.getByRole("alertdialog", {
    name: "Remove this local desk?",
  });
  await expect(resetDialog).toBeVisible();
  await expect(resetDialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(resetDialog).toHaveCount(0);
  await page.getByRole("button", { name: "Reset this device" }).last().click();
  await resetDialog.getByRole("button", { name: "Remove local desk" }).click();
  await expect(page.getByRole("heading", {
    name: "Start with what is real.",
  })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", {
    name: "Start with what is real.",
  })).toBeVisible();
  expect(await localDesk(page)).toBeNull();
  expect(browserFailures).toEqual([]);
});
