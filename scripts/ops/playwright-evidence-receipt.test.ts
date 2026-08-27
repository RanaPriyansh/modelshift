import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildBoundedFailureReceipt,
  buildPlaywrightEvidenceReceipt,
  MAX_REPORT_BYTES,
  parsePlaywrightJsonReport,
  PLAYWRIGHT_EVIDENCE_SCOPES,
  PlaywrightEvidenceInputError,
  readPlaywrightJsonReport,
  readScopedPlaywrightJsonReport,
  resolvePlaywrightEvidencePaths,
  writePlaywrightEvidenceReceipt,
} from "./playwright-evidence-receipt";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

function testCase(
  projectName: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    projectName,
    status: "expected",
    expectedStatus: "passed",
    results: [{ status: "passed" }],
    ...overrides,
  };
}

function report(
  spec = "tests/e2e/university-foundation.spec.ts",
  tests: readonly Record<string, unknown>[] = [
    testCase("desktop"),
    testCase("mobile"),
  ],
  errors: readonly unknown[] = [],
): Record<string, unknown> {
  return {
    errors,
    stats: { expected: 999_999, unexpected: 0 },
    suites: [{
      file: spec,
      specs: [{ title: "test title must not enter the receipt", tests }],
    }],
  };
}

function summaryFor(
  value: unknown,
  scope: "development_foundation" | "development_semester_desk" = "development_foundation",
) {
  const parsed = parsePlaywrightJsonReport(value);
  const expected = PLAYWRIGHT_EVIDENCE_SCOPES[scope].expected;
  return buildPlaywrightEvidenceReceipt({
    receiptScope: scope,
    testedSha: SHA,
    expectedSpecs: expected.specs,
    expectedProjects: expected.projects,
    report: parsed,
  });
}

async function testResultsRoot(): Promise<string> {
  const container = await mkdtemp(resolve(tmpdir(), "forge-browser-receipt-"));
  temporaryDirectories.push(container);
  const root = resolve(container, "test-results");
  await mkdir(root);
  return root;
}

describe("Playwright browser evidence receipt", () => {
  it("summarizes only bounded test outcomes and ignores inflated report stats", () => {
    const summary = parsePlaywrightJsonReport(report());

    expect(summary).toEqual({
      specs: ["tests/e2e/university-foundation.spec.ts"],
      projects: ["desktop", "mobile"],
      passedSpecs: ["tests/e2e/university-foundation.spec.ts"],
      passedProjects: ["desktop", "mobile"],
      counts: {
        total: 2,
        passed: 2,
        failed: 0,
        skipped: 0,
        flaky: 0,
        timed_out: 0,
      },
      rootErrors: 0,
      failureReasons: [],
    });
  });

  it("keeps expected and observed coverage separate for each receipt scope", () => {
    expect(PLAYWRIGHT_EVIDENCE_SCOPES.development_foundation.report_path)
      .not.toBe(PLAYWRIGHT_EVIDENCE_SCOPES.development_semester_desk.report_path);
    expect(PLAYWRIGHT_EVIDENCE_SCOPES.development_foundation.output_path)
      .not.toBe(PLAYWRIGHT_EVIDENCE_SCOPES.production_artifact.output_path);

    const foundation = summaryFor(report());
    const semesterDesk = summaryFor(
      report("tests/e2e/university-semester-desk.spec.ts"),
      "development_semester_desk",
    );
    expect(foundation.expected.specs).toEqual(["tests/e2e/university-foundation.spec.ts"]);
    expect(foundation.observed.specs).toEqual(["tests/e2e/university-foundation.spec.ts"]);
    expect(semesterDesk.expected.specs).toEqual(["tests/e2e/university-semester-desk.spec.ts"]);
    expect(semesterDesk.observed.specs).toEqual(["tests/e2e/university-semester-desk.spec.ts"]);
    expect(foundation.receipt_scope).toBe("development_foundation");
    expect(semesterDesk.receipt_scope).toBe("development_semester_desk");
  });

  it("rejects coverage inflation when an expected spec or project has no passed test", () => {
    const parsed = parsePlaywrightJsonReport(report(
      "tests/e2e/university-foundation.spec.ts",
      [
        testCase("desktop"),
        testCase("mobile", {
          status: "skipped",
          expectedStatus: "skipped",
          results: [{ status: "skipped" }],
        }),
      ],
    ));
    const receipt = buildPlaywrightEvidenceReceipt({
      receiptScope: "development_foundation",
      testedSha: SHA,
      expectedSpecs: [
        "tests/e2e/university-foundation.spec.ts",
        "tests/e2e/university-semester-desk.spec.ts",
      ],
      expectedProjects: ["desktop", "mobile"],
      report: parsed,
    });

    expect(receipt.status).toBe("fail");
    expect(receipt.failure_reasons).toEqual(expect.arrayContaining([
      "coverage_mismatch",
      "missing_passed_project",
      "missing_passed_spec",
    ]));
    expect(receipt.counts.total).toBe(2);
    expect(receipt.counts.passed).toBe(1);
  });

  it("does not allow all-skipped coverage to pass", () => {
    const receipt = summaryFor(report(undefined, [
      testCase("desktop", {
        status: "skipped",
        expectedStatus: "skipped",
        results: [{ status: "skipped" }],
      }),
      testCase("mobile", {
        status: "skipped",
        expectedStatus: "skipped",
        results: [{ status: "skipped" }],
      }),
    ]));

    expect(receipt.status).toBe("fail");
    expect(receipt.counts).toMatchObject({ total: 2, passed: 0, skipped: 2 });
    expect(receipt.failure_reasons).toEqual(expect.arrayContaining([
      "no_passed_tests",
      "missing_passed_project",
      "missing_passed_spec",
    ]));
  });

  it("rejects retry timeout evidence even when the final retry passed", () => {
    const receipt = summaryFor(report(undefined, [
      testCase("desktop", {
        status: "flaky",
        results: [{ status: "timedOut" }, { status: "passed" }],
      }),
      testCase("mobile"),
    ]));

    expect(receipt.status).toBe("fail");
    expect(receipt.counts).toMatchObject({ total: 2, passed: 1, flaky: 1, timed_out: 1 });
    expect(receipt.failure_reasons).toEqual(expect.arrayContaining([
      "flaky_test",
      "timed_out_test",
    ]));
  });

  it("rejects expected failures from pass coverage", () => {
    const receipt = summaryFor(report(undefined, [
      testCase("desktop", {
        expectedStatus: "failed",
        results: [{ status: "failed" }],
      }),
      testCase("mobile"),
    ]));

    expect(receipt.status).toBe("fail");
    expect(receipt.counts).toMatchObject({ total: 2, passed: 1, failed: 1 });
    expect(receipt.failure_reasons).toContain("failed_test");
  });

  it("rejects a nonempty Playwright root error list", () => {
    const receipt = summaryFor(report(undefined, undefined, [{ message: "bounded root error" }]));
    expect(receipt.status).toBe("fail");
    expect(receipt.root_errors).toBe(1);
    expect(receipt.failure_reasons).toContain("root_error");
  });

  it("rejects unknown test, expected, and result status enums", () => {
    for (const [field, reason, value] of [
      ["status", "unknown_test_status", "unknown"],
      ["expectedStatus", "unknown_expected_status", "unknown"],
    ] as const) {
      expect(() => parsePlaywrightJsonReport(report(undefined, [
        testCase("desktop", { [field]: value }),
      ]))).toThrowError(PlaywrightEvidenceInputError);
      try {
        parsePlaywrightJsonReport(report(undefined, [
          testCase("desktop", { [field]: value }),
        ]));
      } catch (error: unknown) {
        expect(error).toMatchObject({ reason });
      }
    }
    expect(() => parsePlaywrightJsonReport(report(undefined, [
      testCase("desktop", { results: [{ status: "unknown" }] }),
    ]))).toThrowError(PlaywrightEvidenceInputError);
  });

  it.each([
    ["missing", "missing_report", undefined],
    ["corrupt", "malformed_report", "{"],
    ["oversized", "oversized_report", "x"],
  ] as const)("creates a bounded fail receipt for a %s report", async (name, reason, contents) => {
    const root = await testResultsRoot();
    const path = resolve(root, "university-foundation", "playwright-report.json");
    if (name !== "missing") {
      await mkdir(resolve(root, "university-foundation"));
      await writeFile(
        path,
        name === "oversized" ? Buffer.alloc(MAX_REPORT_BYTES + 1, 0x78) : contents,
      );
    }
    const paths = await resolvePlaywrightEvidencePaths("development_foundation", { rootDirectory: root });
    let actualReason = reason;
    try {
      await readScopedPlaywrightJsonReport("development_foundation", paths);
    } catch (error: unknown) {
      actualReason = error instanceof PlaywrightEvidenceInputError ? error.reason : "malformed_report";
    }
    const receipt = buildBoundedFailureReceipt({
      receiptScope: "development_foundation",
      testedSha: SHA,
      expectedSpecs: PLAYWRIGHT_EVIDENCE_SCOPES.development_foundation.expected.specs,
      expectedProjects: PLAYWRIGHT_EVIDENCE_SCOPES.development_foundation.expected.projects,
      reason: actualReason,
    });
    await writePlaywrightEvidenceReceipt("development_foundation", receipt, paths);
    expect(receipt.status).toBe("fail");
    expect(receipt.failure_reasons).toContain(reason);
    expect((await readFile(paths.output, "utf8")).length).toBeLessThan(64 * 1024);
  });

  it("writes a bounded fail receipt when the input suite directory is a symlink", async () => {
    const root = await testResultsRoot();
    const outside = resolve(root, "..", "outside-suite");
    await mkdir(outside);
    await writeFile(resolve(outside, "playwright-report.json"), JSON.stringify(report()));
    await symlink(outside, resolve(root, "university-foundation"));
    const paths = await resolvePlaywrightEvidencePaths("development_foundation", { rootDirectory: root });

    await expect(readScopedPlaywrightJsonReport("development_foundation", paths))
      .rejects.toMatchObject({ reason: "unsafe_report" });
    const receipt = buildBoundedFailureReceipt({
      receiptScope: "development_foundation",
      testedSha: SHA,
      expectedSpecs: PLAYWRIGHT_EVIDENCE_SCOPES.development_foundation.expected.specs,
      expectedProjects: PLAYWRIGHT_EVIDENCE_SCOPES.development_foundation.expected.projects,
      reason: "unsafe_report",
    });
    await writePlaywrightEvidenceReceipt("development_foundation", receipt, paths);
    await expect(lstat(paths.output)).resolves.toMatchObject({ isFile: expect.any(Function) });
    await expect(readFile(resolve(outside, "playwright-report.json"))).resolves.toBeTruthy();
  });

  it("rejects an input report symlink without reading its target", async () => {
    const root = await testResultsRoot();
    const suite = resolve(root, "university-foundation");
    const outside = resolve(root, "outside-report.json");
    await mkdir(suite);
    await writeFile(outside, JSON.stringify(report()));
    await symlink(outside, resolve(suite, "playwright-report.json"));
    const paths = await resolvePlaywrightEvidencePaths("development_foundation", { rootDirectory: root });

    await expect(readScopedPlaywrightJsonReport("development_foundation", paths))
      .rejects.toMatchObject({ reason: "unsafe_report" });
  });

  it("rejects an output symlink and preserves its target", async () => {
    const root = await testResultsRoot();
    const releaseOps = resolve(root, "release-ops");
    const outside = resolve(root, "outside-receipt.json");
    await mkdir(releaseOps);
    await writeFile(outside, "preserve me");
    await symlink(outside, resolve(releaseOps, "forge-browser-evidence-development-foundation.json"));

    await expect(resolvePlaywrightEvidencePaths("development_foundation", { rootDirectory: root }))
      .rejects.toMatchObject({ reason: "unsafe_report" });
    await expect(readFile(outside, "utf8")).resolves.toBe("preserve me");
  });

  it("rejects an output collision without overwriting existing evidence", async () => {
    const root = await testResultsRoot();
    const releaseOps = resolve(root, "release-ops");
    const output = resolve(releaseOps, "forge-browser-evidence-development-foundation.json");
    await mkdir(releaseOps);
    await writeFile(output, "existing evidence");

    await expect(resolvePlaywrightEvidencePaths("development_foundation", { rootDirectory: root }))
      .rejects.toMatchObject({ reason: "output_collision" });
    await expect(readFile(output, "utf8")).resolves.toBe("existing evidence");
  });

  it("records a caller-requested browser failure even with valid observed tests", () => {
    const parsed = parsePlaywrightJsonReport(report());
    const receipt = buildPlaywrightEvidenceReceipt({
      receiptScope: "development_foundation",
      testedSha: SHA,
      expectedSpecs: PLAYWRIGHT_EVIDENCE_SCOPES.development_foundation.expected.specs,
      expectedProjects: PLAYWRIGHT_EVIDENCE_SCOPES.development_foundation.expected.projects,
      report: parsed,
      requestedStatus: "fail",
    });
    expect(receipt.status).toBe("fail");
    expect(receipt.failure_reasons).toContain("requested_fail");
  });

  it("requires a full positive count and exact expected and observed sets", () => {
    const parsed = parsePlaywrightJsonReport(report());
    const receipt = buildPlaywrightEvidenceReceipt({
      receiptScope: "development_foundation",
      testedSha: SHA,
      expectedSpecs: PLAYWRIGHT_EVIDENCE_SCOPES.development_foundation.expected.specs,
      expectedProjects: PLAYWRIGHT_EVIDENCE_SCOPES.development_foundation.expected.projects,
      report: parsed,
    });
    expect(receipt.status).toBe("pass");
    expect(receipt.counts.total).toBeGreaterThan(0);
    expect(receipt.counts.passed).toBeGreaterThan(0);
    expect(receipt.counts.failed).toBe(0);
    expect(receipt.counts.flaky).toBe(0);
    expect(receipt.counts.timed_out).toBe(0);
    expect(receipt.expected).toEqual(receipt.observed);
  });
});
