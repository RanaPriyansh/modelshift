import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildPlaywrightEvidenceReceipt,
  parsePlaywrightJsonReport,
} from "./playwright-evidence-receipt";
import {
  PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS,
  readTrustedCiReceipt,
  validatePlaywrightEvidenceReceiptForCi,
} from "./validate-playwright-evidence-receipts";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const roots: string[] = [];

function foundationReport() {
  return {
    errors: [],
    suites: [{
      specs: [{
        file: "tests/e2e/university-foundation.spec.ts",
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

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "forge-ci-receipt-policy-"));
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

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Playwright CI receipt enforcement", () => {
  it("accepts a complete pass receipt", () => {
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      validFoundationReceipt(),
      passExpectation(),
      SHA,
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
      flaky: 0,
      timed_out: 0,
      interrupted: 0,
    };

    expect(() => validatePlaywrightEvidenceReceiptForCi(
      forged,
      passExpectation(),
      SHA,
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
    )).toThrow();

    const forgedCounts = mutableReceipt();
    forgedCounts.counts = {
      total: 2,
      passed: 2,
      failed: 1,
      skipped: 0,
      flaky: 0,
      timed_out: 0,
      interrupted: 0,
    };
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      forgedCounts,
      passExpectation(),
      SHA,
    )).toThrow();
  });

  it("accepts a fail receipt only when the expected browser gate failed", () => {
    const failReceipt = buildPlaywrightEvidenceReceipt({
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "fail",
      summary: parsePlaywrightJsonReport(foundationReport()),
    });
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      failReceipt,
      { ...passExpectation(), expectedStatus: "fail" },
      SHA,
    )).not.toThrow();
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      failReceipt,
      passExpectation(),
      SHA,
    )).toThrow();
  });

  it("keeps writer-error receipt paths in the workflow upload", async () => {
    const workflow = await readFile(resolve(process.cwd(), ".github/workflows/quality-gates.yml"), "utf8");
    expect(workflow).toContain("validate-playwright-evidence-receipts.ts");
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
    )).toThrow();

    const tooManyTests = mutableReceipt();
    tooManyTests.counts = {
      total: 4097,
      passed: 4097,
      failed: 0,
      skipped: 0,
      flaky: 0,
      timed_out: 0,
      interrupted: 0,
    };
    expect(() => validatePlaywrightEvidenceReceiptForCi(
      tooManyTests,
      passExpectation(),
      SHA,
    )).toThrow();
  });
});
