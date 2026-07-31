import { expect, test, type Page } from "@playwright/test";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("production exposes only the post-attempt repair unavailable shell", async ({
  page,
}) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-post-attempt-repair");
  const main = page.locator("main");

  await expect(main.getByRole("heading", {
    level: 1,
    name: "Post-attempt repair is unavailable.",
  })).toBeVisible();
  await expect(main.getByRole("radio")).toHaveCount(0);
  await expect(main.getByRole("button")).toHaveCount(0);
  await expect(main.getByText("After the attempt")).toHaveCount(0);
  await expect(main.getByText(
    "Repair the boundary, not the answer.",
  )).toHaveCount(0);
  await expect(main.getByText(
    "Name the missing comparison.",
  )).toHaveCount(0);
  await expect(main.getByText(
    "Test one claim against two sources",
  )).toHaveCount(0);
  await expect(main.getByText(
    /exact server-owned development fixture/i,
  )).toBeVisible();
  expect(consoleFailures).toEqual([]);
});
