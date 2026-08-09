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
    path: "/internal/university-source-review",
    heading: "Course source review is unavailable.",
    forbiddenCopy: "Review what your course sources say.",
  },
  {
    path: "/internal/university-today",
    heading: "University Today is unavailable.",
    forbiddenCopy: "Test an uncertain state",
  },
  {
    path: "/internal/university-protected-study",
    heading: "No protected-study research state is available.",
    forbiddenCopy: "Test an entry boundary",
  },
] as const;

for (const route of ROUTES) {
  test(`production denies ${route.path} fixtures and prefetch effects`, async ({
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
    await expect(main.getByRole("radio")).toHaveCount(0);
    await expect(main.getByText(route.forbiddenCopy)).toHaveCount(0);

    const unrelatedRscRequests = requestUrls.filter((url) => {
      const parsed = new URL(url);
      return parsed.searchParams.has("_rsc") && parsed.pathname !== route.path;
    });
    expect(unrelatedRscRequests).toEqual([]);
    expect(consoleFailures).toEqual([]);
  });
}
