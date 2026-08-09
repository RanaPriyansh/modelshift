import { expect, test, type Page } from "@playwright/test";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("production exposes only the semester overview unavailable shell", async ({
  page,
}) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-semester-overview");
  const main = page.locator("main");

  await expect(main.getByRole("heading", {
    level: 1,
    name: "Semester overview is unavailable.",
  })).toBeVisible();
  await expect(main.getByRole("radio")).toHaveCount(0);
  await expect(main.getByRole("button")).toHaveCount(0);
  await expect(main.getByRole("link")).toHaveCount(0);
  await expect(main.getByText("Every course. No false priority."))
    .toHaveCount(0);
  await expect(main.getByText("CS102: Evidence and computation"))
    .toHaveCount(0);
  await expect(main.getByText("Ready for inspection does not mean"))
    .toHaveCount(0);
  await expect(main.getByText(
    /exact server-owned development fixture/i,
  )).toBeVisible();
  expect(consoleFailures).toEqual([]);
});
