import { expect, test, type Page } from "@playwright/test";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("production exposes only the protected-study unavailable shell", async ({
  page,
}) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-protected-study");

  await expect(page.getByRole("heading", {
    level: 1,
    name: "No protected-study research state is available.",
  })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByText("CS102: Evidence and computation")).toHaveCount(0);
  await expect(page.getByText("Test one claim against two sources")).toHaveCount(0);
  await expect(page.getByRole("link", {
    name: "Preview exact reviewed World",
  })).toHaveCount(0);
  expect(consoleFailures).toEqual([]);
});
