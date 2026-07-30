import { expect, test, type Page } from "@playwright/test";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("production exposes only the semester-loop unavailable shell", async ({
  page,
}) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-semester-loop");
  const unavailable = page.locator("main");

  await expect(unavailable.getByRole("heading", {
    level: 1,
    name: "No university semester-loop research state is available.",
  })).toBeVisible();
  await expect(unavailable.getByRole("radio")).toHaveCount(0);
  await expect(unavailable.getByText("CS102: Evidence and computation")).toHaveCount(0);
  await expect(unavailable.getByText("One semester. One honest next move.")).toHaveCount(0);
  await expect(unavailable.getByRole("link")).toHaveCount(0);
  await expect(unavailable.getByText(
    /No source, action, recovery draft, World, session, message, or evidence was exposed/,
  )).toBeVisible();
  expect(consoleFailures).toEqual([]);
});
