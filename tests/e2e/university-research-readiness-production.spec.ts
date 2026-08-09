import { expect, test, type Page } from "@playwright/test";

const expectedReleaseSha = process.env.FORGE_EXPECTED_RELEASE_SHA;

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("production exposes only the research-readiness unavailable shell", async ({
  page,
}) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-research-readiness");
  const unavailable = page.locator("main");

  await expect(unavailable.getByRole("heading", {
    level: 1,
    name: "No university research-readiness state is available.",
  })).toBeVisible();
  await expect(unavailable.getByRole("radio")).toHaveCount(0);
  await expect(unavailable.getByText("Invalid protocol")).toHaveCount(0);
  await expect(unavailable.getByText("Synthetic plan coherent")).toHaveCount(0);
  await expect(unavailable.getByText("Rehearsal is not permission.")).toHaveCount(0);
  await expect(unavailable.getByRole("link")).toHaveCount(0);
  await expect(unavailable.getByText(
    /No protocol, approval, operator plan, comparator, sample, participant, recording, or research evidence was exposed/,
  )).toBeVisible();
  expect(consoleFailures).toEqual([]);
});

test("the exact-build harness binds the denial to its release identity", async ({
  request,
}) => {
  test.skip(
    !expectedReleaseSha,
    "Exact release identity is available only through the production browser harness.",
  );

  const response = await request.get("/api/health", {
    headers: { "Cache-Control": "no-cache" },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-forge-release-sha"]).toBe(expectedReleaseSha);
  expect(response.headers()["x-forge-build-source-sha"])
    .toBe(expectedReleaseSha);
  const health = await response.json() as {
    build_source_sha?: unknown;
    release_sha?: unknown;
  };
  expect(health.release_sha).toBe(expectedReleaseSha);
  expect(health.build_source_sha).toBe(expectedReleaseSha);
});
