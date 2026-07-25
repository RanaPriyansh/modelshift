import { expect, test } from "@playwright/test";

test.describe("FORGE focused first-run product contract", () => {
  test("desktop starts with one goal, one action, and optional personalization", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "What do you want to understand?" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Your question" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Shape my first move" })).toBeVisible();

    const personalization = page.locator("details.forge-intake-details");
    await expect(personalization).not.toHaveAttribute("open", "");
    await expect(
      page.getByPlaceholder("Optional: name relevant knowledge, experience, or the point where you get stuck."),
    ).not.toBeVisible();

    const primary = page.getByRole("navigation", { name: "Primary navigation" });
    await expect(primary.getByRole("link", { name: "Paths" })).toBeVisible();
    await expect(primary.getByRole("link", { name: "Evidence" })).toBeVisible();
    await expect(primary.getByRole("link", { name: "Access" })).toBeVisible();
    await expect(primary.getByRole("link", { name: "Studio" })).toHaveCount(0);
    await expect(primary.getByRole("link", { name: "Trail" })).toHaveCount(0);

    await expect(page.locator("body")).not.toContainText("ModelShift");
    await expect(page.getByText("The Forge method", { exact: true })).toBeVisible();
  });

  test("examples populate a real goal and outcome without auto-submitting", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await page.getByRole("button", { name: "Use example: Judge an AI claim" }).click();

    await expect(page.getByRole("textbox", { name: "Your question" })).toHaveValue(
      "How can I tell whether an AI-generated factual claim is actually supported?",
    );
    await expect(page.getByTestId("forge-plan-grounded")).toHaveCount(0);
    await expect(page.getByTestId("forge-plan-exploratory")).toHaveCount(0);

    await page.locator("details.forge-intake-details > summary").click();
    await expect(page.locator("details.forge-intake-details")).toHaveAttribute("open", "");
    await expect(
      page.getByPlaceholder("Optional: explain a decision, build an artifact, solve a real problem, or perform a skill."),
    ).toHaveValue("Trace one claim to sources and state what remains uncertain.");
  });

  test("mobile keeps personalization discoverable and keyboard-operable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const personalization = page.locator("details.forge-intake-details");
    await expect(personalization).not.toHaveAttribute("open", "");

    const summary = personalization.locator("summary");
    await summary.focus();
    await expect(summary).toBeFocused();
    await summary.press("Enter");

    await expect(personalization).toHaveAttribute("open", "");
    await expect(page.getByRole("radio", { name: "Adult Self-directed" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Time available now" })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
