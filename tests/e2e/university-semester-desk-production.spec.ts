import { expect, test, type Page } from "@playwright/test";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("production exposes only the semester desk unavailable shell", async ({
  page,
}) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-semester-desk");
  const main = page.locator("main");

  await expect(main.getByRole("heading", {
    level: 1,
    name: "Semester desk is unavailable.",
  })).toBeVisible();
  await expect(main.getByRole("radio")).toHaveCount(0);
  await expect(main.getByRole("button")).toHaveCount(0);
  await expect(main.getByRole("link")).toHaveCount(0);
  await expect(main.getByText(
    "See the whole term. Choose where to look closer.",
  )).toHaveCount(0);
  await expect(main.getByText("Course ID, not priority")).toHaveCount(0);
  await expect(main.getByText(
    "Caller-asserted synthetic input; not verified",
  )).toHaveCount(0);
  await expect(main.getByText(
    "CS102: Evidence and computation",
  )).toHaveCount(0);
  await expect(main.getByText(
    /No term boundary, course inspection, learner choice, source, capacity,/i,
  )).toBeVisible();
  expect(consoleFailures).toEqual([]);
});
