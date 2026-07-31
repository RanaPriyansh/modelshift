import { expect, test, type Page } from "@playwright/test";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("production exposes only the recovery unavailable shell", async ({
  page,
}) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-recovery");
  const unavailable = page.locator("main");

  await expect(unavailable.getByRole("heading", {
    level: 1,
    name: "University recovery is unavailable.",
  })).toBeVisible();
  await expect(unavailable.getByRole("radio")).toHaveCount(0);
  await expect(unavailable.getByRole("button")).toHaveCount(0);
  await expect(unavailable.getByText("Recovery capacity what-if")).toHaveCount(0);
  await expect(unavailable.getByText(
    "What changes if the time you can use changes?",
  )).toHaveCount(0);
  await expect(unavailable.getByText("Argument analysis")).toHaveCount(0);
  await expect(unavailable.getByText("4 h available")).toHaveCount(0);
  await expect(unavailable.getByText(
    /This route accepts only an exact server-owned development fixture/,
  )).toBeVisible();
  expect(consoleFailures).toEqual([]);
});
