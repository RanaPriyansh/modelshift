import { expect, test, type Page } from "@playwright/test";

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

const ROUTES = [
  {
    path: "/internal/university-command-center",
    heading: "University workspace map is unavailable.",
    forbiddenCopy: "Choose a bounded university workspace.",
  },
  {
    path: "/internal/university-degree-map",
    heading: "Degree map is unavailable.",
    forbiddenCopy: "Inspect the map. Keep the decision.",
  },
  {
    path: "/internal/university-learning-map",
    heading: "University learning map is unavailable.",
    forbiddenCopy: "See the map. Keep the limits.",
  },
] as const;

for (const route of ROUTES) {
  test(`production denies the ${route.path} fixture and prefetch effects`, async ({
    page,
  }) => {
    const consoleFailures = captureConsoleFailures(page);
    const requestUrls: string[] = [];
    page.on("request", (request) => requestUrls.push(request.url()));

    await page.goto(route.path);
    await page.waitForLoadState("networkidle");
    const main = page.locator("main");

    await expect(main.getByRole("heading", {
      level: 1,
      name: route.heading,
    })).toBeVisible();
    await expect(main.getByRole("article")).toHaveCount(0);
    await expect(main.getByText(route.forbiddenCopy)).toHaveCount(0);

    const unrelatedRscRequests = requestUrls.filter((url) => {
      const parsed = new URL(url);
      return parsed.searchParams.has("_rsc") && parsed.pathname !== route.path;
    });
    expect(unrelatedRscRequests).toEqual([]);
    expect(consoleFailures).toEqual([]);
  });
}
