import { createHash } from "node:crypto";
import { link, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildPlaywrightEvidenceReceipt,
  parsePlaywrightJsonReport,
} from "./playwright-evidence-receipt";
import {
  PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS,
  assertTrustedReceiptDigest,
  readTrustedCiReceipt,
  readTrustedCiReceiptBytes,
  validatePlaywrightEvidenceReceiptAtRoot,
  validatePlaywrightEvidenceReceiptForCi,
} from "./validate-playwright-evidence-receipts";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const REPORT_SHA256 = "a".repeat(64);
const roots: string[] = [];

function foundationReport() {
  return {
    errors: [],
    suites: [{
      specs: [{
        file: "university-foundation.spec.ts",
        tests: [
          { projectName: "desktop", status: "expected", expectedStatus: "passed", results: [{ status: "passed" }] },
          { projectName: "mobile", status: "expected", expectedStatus: "passed", results: [{ status: "passed" }] },
        ],
      }],
    }],
  };
}

function validFoundationReceipt() {
  return buildPlaywrightEvidenceReceipt({
    target: "foundation",
    testedSha: SHA,
    requestedStatus: "pass",
    summary: parsePlaywrightJsonReport(foundationReport()),
    reportSha256: REPORT_SHA256,
  });
}

function mutableReceipt(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(validFoundationReceipt())) as Record<string, unknown>;
}

function passExpectation() {
  return {
    ...PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS[0],
    expectedStatus: "pass" as const,
  };
}

function failExpectation() {
  return {
    ...PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS[0],
    expectedStatus: "fail" as const,
  };
}

async function temporaryRoot(): Promise<string> {
  const root = await realpath(await mkdtemp(resolve(tmpdir(), "forge-ci-receipt-policy-")));
  roots.push(root);
  return root;
}

async function writeReceiptFile(root: string, value: unknown): Promise<string> {
  const path = resolve(root, PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS[0].outputFile);
  await mkdir(resolve(root, "test-results/release-ops"), { recursive: true });
  await writeFile(path, typeof value === "string" || Buffer.isBuffer(value)
    ? value
    : JSON.stringify(value));
  return path;
}

function reportBytes(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), "utf8");
}

async function writeFoundationReport(root: string, bytes: Buffer): Promise<string> {
  const path = resolve(root, "test-results/university-foundation/playwright-report.json");
  await mkdir(resolve(root, "test-results/university-foundation"), { recursive: true });
  await writeFile(path, bytes);
  return path;
}

function sameSizeJson(left: unknown, right: unknown): [Buffer, Buffer] {
  const leftBase = JSON.stringify({ ...(left as Record<string, unknown>), padding: "" });
  const rightBase = JSON.stringify({ ...(right as Record<string, unknown>), padding: "" });
  const targetLength = Math.max(
    Buffer.byteLength(leftBase, "utf8"),
    Buffer.byteLength(rightBase, "utf8"),
  );
  return [
    reportBytes({
      ...(left as Record<string, unknown>),
      padding: "x".repeat(targetLength - Buffer.byteLength(leftBase, "utf8")),
    }),
    reportBytes({
      ...(right as Record<string, unknown>),
      padding: "x".repeat(targetLength - Buffer.byteLength(rightBase, "utf8")),
    }),
  ];
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Playwright CI receipt enforcement", () => {
  it("accepts a complete pass receipt", () => {
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      validFoundationReceipt(),
      passExpectation(),
      SHA,
      REPORT_SHA256,
    )).not.toThrow();
  });

  it("rejects a forged fail-to-pass receipt", () => {
    const forged = mutableReceipt();
    forged.input_status = "malformed";
    forged.observed = {
      specs: [],
      projects: [],
      passed_specs: [],
      passed_projects: [],
    };
    forged.counts = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      did_not_run: 0,
      flaky: 0,
      timed_out: 0,
      interrupted: 0,
    };

    expect(() => validatePlaywrightEvidenceReceiptForCi(
      forged,
      passExpectation(),
      SHA,
      REPORT_SHA256,
    )).toThrow();
  });

  it("rejects project coverage inflation and invalid count arithmetic", () => {
    const forgedCoverage = mutableReceipt();
    forgedCoverage.observed = {
      specs: ["tests/e2e/university-foundation.spec.ts"],
      projects: ["desktop"],
      passed_specs: ["tests/e2e/university-foundation.spec.ts"],
      passed_projects: ["desktop"],
    };
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      forgedCoverage,
      passExpectation(),
      SHA,
      REPORT_SHA256,
    )).toThrow();

    const forgedCounts = mutableReceipt();
    forgedCounts.counts = {
      total: 2,
      passed: 2,
      failed: 1,
      skipped: 0,
      did_not_run: 0,
      flaky: 0,
      timed_out: 0,
      interrupted: 0,
    };
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      forgedCounts,
      passExpectation(),
      SHA,
      REPORT_SHA256,
    )).toThrow();
  });

  it("rejects did-not-run counts and invalid did-not-run arithmetic", () => {
    const didNotRun = mutableReceipt();
    didNotRun.counts = {
      total: 2,
      passed: 1,
      failed: 0,
      skipped: 0,
      did_not_run: 1,
      flaky: 0,
      timed_out: 0,
      interrupted: 0,
    };
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      didNotRun,
      passExpectation(),
      SHA,
      REPORT_SHA256,
    )).toThrow();

    const invalidArithmetic = mutableReceipt();
    invalidArithmetic.counts = {
      total: 2,
      passed: 2,
      failed: 0,
      skipped: 0,
      did_not_run: 1,
      flaky: 0,
      timed_out: 0,
      interrupted: 0,
    };
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      invalidArithmetic,
      passExpectation(),
      SHA,
      REPORT_SHA256,
    )).toThrow();
  });

  it("accepts a fail receipt only when the expected browser gate failed", () => {
    const failReceipt = buildPlaywrightEvidenceReceipt({
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "fail",
      summary: parsePlaywrightJsonReport(foundationReport()),
      reportSha256: REPORT_SHA256,
    });
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      failReceipt,
      { ...passExpectation(), expectedStatus: "fail" },
      SHA,
      REPORT_SHA256,
    )).not.toThrow();
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      failReceipt,
      passExpectation(),
      SHA,
      REPORT_SHA256,
    )).toThrow();
  });

  it("requires the producer report digest for a pass receipt", () => {
    const receipt = validFoundationReceipt();
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      receipt,
      passExpectation(),
      SHA,
      "b".repeat(64),
    )).toThrow();
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      receipt,
      passExpectation(),
      SHA,
    )).toThrow();
  });

  it("validates current report bytes for valid pass and fail evidence", async () => {
    const root = await temporaryRoot();
    const passBytes = reportBytes(foundationReport());
    const passDigest = createHash("sha256").update(passBytes).digest("hex");
    await writeFoundationReport(root, passBytes);
    const passReceipt = buildPlaywrightEvidenceReceipt({
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
      summary: parsePlaywrightJsonReport(foundationReport()),
      reportSha256: passDigest,
    });
    await writeReceiptFile(root, passReceipt);
    await expect(validatePlaywrightEvidenceReceiptAtRoot(
      passReceipt,
      passExpectation(),
      SHA,
      root,
      passDigest,
    )).resolves.toBeUndefined();

    const failReport = {
      errors: [],
      suites: [{
        specs: [{
          file: "university-foundation.spec.ts",
          tests: [
            { projectName: "desktop", status: "unexpected", expectedStatus: "passed", results: [{ status: "failed" }] },
            { projectName: "mobile", status: "unexpected", expectedStatus: "passed", results: [{ status: "failed" }] },
          ],
        }],
      }],
    };
    const failBytes = reportBytes(failReport);
    const failDigest = createHash("sha256").update(failBytes).digest("hex");
    await writeFoundationReport(root, failBytes);
    const failReceipt = buildPlaywrightEvidenceReceipt({
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "fail",
      summary: parsePlaywrightJsonReport(failReport),
      reportSha256: failDigest,
    });
    await expect(validatePlaywrightEvidenceReceiptAtRoot(
      failReceipt,
      failExpectation(),
      SHA,
      root,
      failDigest,
    )).resolves.toBeUndefined();
  });

  it("preserves a useful fail receipt when no producer report digest exists", async () => {
    const root = await temporaryRoot();
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "foundation",
      testedSha: SHA,
      inputStatus: "missing",
      requestedStatus: "fail",
    });
    await expect(validatePlaywrightEvidenceReceiptAtRoot(
      receipt,
      failExpectation(),
      SHA,
      root,
    )).resolves.toBeUndefined();
  });

  it("rejects a same-size report replacement after receipt creation", async () => {
    const root = await temporaryRoot();
    const [originalBytes, replacementBytes] = sameSizeJson(foundationReport(), {
      ...foundationReport(),
      marker: "replacement",
    });
    expect(replacementBytes.byteLength).toBe(originalBytes.byteLength);
    const reportPath = await writeFoundationReport(root, originalBytes);
    const digest = createHash("sha256").update(originalBytes).digest("hex");
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
      summary: parsePlaywrightJsonReport(foundationReport()),
      reportSha256: digest,
    });
    await writeReceiptFile(root, receipt);
    const replacementPath = resolve(root, "replacement-report.json");
    await writeFile(replacementPath, replacementBytes);
    await rm(reportPath);
    await rename(replacementPath, reportPath);

    await expect(validatePlaywrightEvidenceReceiptAtRoot(
      receipt,
      passExpectation(),
      SHA,
      root,
      digest,
    )).rejects.toThrow();
  });

  it("rejects a deleted current report", async () => {
    const root = await temporaryRoot();
    const bytes = reportBytes(foundationReport());
    const reportPath = await writeFoundationReport(root, bytes);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
      summary: parsePlaywrightJsonReport(foundationReport()),
      reportSha256: digest,
    });
    await rm(reportPath);

    await expect(validatePlaywrightEvidenceReceiptAtRoot(
      receipt,
      passExpectation(),
      SHA,
      root,
      digest,
    )).rejects.toThrow();
  });

  it("rejects a symlink replacement for the current report", async () => {
    const root = await temporaryRoot();
    const bytes = reportBytes(foundationReport());
    const reportPath = await writeFoundationReport(root, bytes);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
      summary: parsePlaywrightJsonReport(foundationReport()),
      reportSha256: digest,
    });
    const outsidePath = resolve(root, "outside-report.json");
    await writeFile(outsidePath, bytes);
    await rm(reportPath);
    await symlink(outsidePath, reportPath);

    await expect(validatePlaywrightEvidenceReceiptAtRoot(
      receipt,
      passExpectation(),
      SHA,
      root,
      digest,
    )).rejects.toThrow();
  });

  it("rejects a hard-link replacement for the current report", async () => {
    const root = await temporaryRoot();
    const bytes = reportBytes(foundationReport());
    const reportPath = await writeFoundationReport(root, bytes);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
      summary: parsePlaywrightJsonReport(foundationReport()),
      reportSha256: digest,
    });
    const replacementPath = resolve(root, "replacement-report.json");
    await writeFile(replacementPath, bytes);
    await rm(reportPath);
    await link(replacementPath, reportPath);

    await expect(validatePlaywrightEvidenceReceiptAtRoot(
      receipt,
      passExpectation(),
      SHA,
      root,
      digest,
    )).rejects.toThrow();
  });

  it("keeps writer-error receipt paths in the workflow upload", async () => {
    const workflow = await readFile(resolve(process.cwd(), ".github/workflows/quality-gates.yml"), "utf8");
    expect(workflow).toContain("validate-playwright-evidence-receipts.ts");
    expect(workflow).toContain("run-playwright-with-report-digest.ts");
    expect(workflow).toContain("steps.foundation_browser.outputs.report_sha256");
    expect(workflow).toContain("steps.foundation_receipt.outputs.receipt_sha256");
    expect(workflow).toContain("--foundation-report-sha256");
    expect(workflow).toContain("--foundation-receipt-sha256");
    for (const expectation of PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS) {
      const target = expectation.target;
      expect(workflow).toContain(`forge-browser-${target === "semesterDesk" ? "semester-desk" : target}-writer-error-receipt.json`);
    }
  });

  it("rejects symlink, oversized, malformed, and swapped receipt input", async () => {
    const valid = validFoundationReceipt();
    const symlinkRoot = await temporaryRoot();
    const symlinkPath = await writeReceiptFile(symlinkRoot, valid);
    const outsidePath = resolve(symlinkRoot, "outside-receipt.json");
    await writeFile(outsidePath, JSON.stringify(valid));
    await rm(symlinkPath);
    await symlink(outsidePath, symlinkPath);
    await expect(readTrustedCiReceipt(
      symlinkRoot,
      PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS[0].outputFile,
    )).rejects.toThrow();

    const oversizedRoot = await temporaryRoot();
    await writeReceiptFile(oversizedRoot, Buffer.alloc(64 * 1024 + 1, 0x20));
    await expect(readTrustedCiReceipt(
      oversizedRoot,
      PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS[0].outputFile,
    )).rejects.toThrow();

    const malformedRoot = await temporaryRoot();
    await writeReceiptFile(malformedRoot, "{not-json");
    await expect(readTrustedCiReceipt(
      malformedRoot,
      PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS[0].outputFile,
    )).rejects.toThrow();

    const swappedRoot = await temporaryRoot();
    const swappedPath = await writeReceiptFile(swappedRoot, valid);
    const replacementPath = resolve(swappedRoot, "replacement-receipt.json");
    await writeFile(replacementPath, JSON.stringify(valid));
    await expect(readTrustedCiReceipt(
      swappedRoot,
      PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS[0].outputFile,
      {
        afterLstat: async (path) => {
          await rename(path, resolve(swappedRoot, "original-receipt.json"));
          await rename(replacementPath, swappedPath);
        },
      },
    )).rejects.toThrow();
  });

  it("binds the exact receipt bytes before JSON parsing", async () => {
    const root = await temporaryRoot();
    const receipt = validFoundationReceipt();
    const path = await writeReceiptFile(root, receipt);
    const bytes = await readFile(path);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const read = await readTrustedCiReceiptBytes(
      root,
      PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS[0].outputFile,
    );
    expect(read.bytes).toEqual(bytes);
    expect(read.digest).toBe(digest);

    const forged = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
    forged.tested_sha = "fedcba9876543210fedcba9876543210fedcba98";
    const forgedBytes = Buffer.from(JSON.stringify(forged));
    expect(forgedBytes.byteLength).toBe(bytes.byteLength);
    expect(() => assertTrustedReceiptDigest(forgedBytes, digest, "foundation receipt"))
      .toThrow();
    await writeFile(path, forgedBytes);
    expect(createHash("sha256").update(forgedBytes).digest("hex")).not.toBe(digest);
    const current = await readTrustedCiReceiptBytes(
      root,
      PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS[0].outputFile,
    );
    expect(current.digest).not.toBe(digest);
    expect(current.bytes).toEqual(forgedBytes);
  });

  it("rejects bounded array and count overflow", () => {
    const tooManySpecs = mutableReceipt();
    tooManySpecs.observed = {
      specs: [
        "tests/e2e/university-foundation.spec.ts",
        ...Array.from({ length: 64 }, (_, index) => `tests/e2e/overflow-${index}.spec.ts`),
      ],
      projects: ["desktop", "mobile"],
      passed_specs: ["tests/e2e/university-foundation.spec.ts"],
      passed_projects: ["desktop", "mobile"],
    };
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      tooManySpecs,
      passExpectation(),
      SHA,
      REPORT_SHA256,
    )).toThrow();

    const tooManyTests = mutableReceipt();
    tooManyTests.counts = {
      total: 4097,
      passed: 4097,
      failed: 0,
      skipped: 0,
      did_not_run: 0,
      flaky: 0,
      timed_out: 0,
      interrupted: 0,
    };
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      tooManyTests,
      passExpectation(),
      SHA,
      REPORT_SHA256,
    )).toThrow();
  });
});
