import { describe, expect, it } from "vitest";

import {
  buildPlaywrightEvidenceReceipt,
  parsePlaywrightJsonReport,
} from "./playwright-evidence-receipt";

const SHA = "0123456789abcdef0123456789abcdef01234567";

describe("Playwright browser evidence receipt", () => {
  it("summarizes specs, projects, and final test outcomes without retaining test text", () => {
    const summary = parsePlaywrightJsonReport({
      suites: [
        {
          file: "tests/e2e/second.spec.ts",
          specs: [
            {
              title: "skipped title must not enter the receipt",
              tests: [
                {
                  projectName: "mobile",
                  status: "skipped",
                  results: [{ status: "skipped" }],
                },
              ],
            },
          ],
        },
        {
          suites: [
            {
              file: "tests/e2e/first.spec.ts",
              specs: [
                {
                  title: "passed title must not enter the receipt",
                  tests: [
                    {
                      projectName: "desktop",
                      status: "expected",
                      results: [{ status: "passed" }],
                    },
                    {
                      projectName: "desktop",
                      status: "unexpected",
                      results: [{ status: "timedOut" }],
                    },
                    {
                      projectName: "desktop",
                      status: "flaky",
                      results: [{ status: "failed" }, { status: "passed" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(summary).toEqual({
      specs: ["tests/e2e/first.spec.ts", "tests/e2e/second.spec.ts"],
      projects: ["desktop", "mobile"],
      counts: {
        total: 4,
        passed: 1,
        failed: 1,
        skipped: 1,
        flaky: 1,
        timed_out: 1,
      },
    });
  });

  it("keeps an explicit failed gate visible when a report is missing", () => {
    expect(buildPlaywrightEvidenceReceipt({
      testedSha: SHA.toUpperCase(),
      requestedStatus: "fail",
      missingReports: 1,
      specs: ["tests/e2e/known.spec.ts"],
      projects: ["desktop", "mobile"],
    })).toEqual({
      schema_version: "1.0",
      receipt_kind: "forge_ci_browser_evidence",
      tested_sha: SHA,
      specs: ["tests/e2e/known.spec.ts"],
      projects: ["desktop", "mobile"],
      status: "fail",
      counts: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        flaky: 0,
        timed_out: 0,
      },
    });
  });

  it("fails the receipt when an observed test fails even if the caller says pass", () => {
    const receipt = buildPlaywrightEvidenceReceipt({
      testedSha: SHA,
      requestedStatus: "pass",
      reports: [{
        specs: ["tests/e2e/known.spec.ts"],
        projects: ["desktop"],
        counts: {
          total: 1,
          passed: 0,
          failed: 1,
          skipped: 0,
          flaky: 0,
          timed_out: 0,
        },
      }],
    });
    expect(receipt.status).toBe("fail");
  });
});
