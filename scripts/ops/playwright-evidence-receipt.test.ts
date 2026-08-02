import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  MAX_PLAYWRIGHT_REPORT_BYTES,
  MAX_PLAYWRIGHT_TESTS,
  MAX_OBSERVED_SPECS,
  PLAYWRIGHT_EVIDENCE_TARGETS,
  PLAYWRIGHT_RECEIPT_HELPER_SOURCE_SHA256,
  buildPlaywrightEvidenceReceipt,
  parsePlaywrightJsonReport,
  writePlaywrightEvidenceReceipt as writeReceipt,
} from "./playwright-evidence-receipt";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const FORGED_SHA = "fedcba9876543210fedcba9876543210fedcba98";
const REPORT_SHA256 = "a".repeat(64);
const CLEANUP_ENTRY_LIMIT = 512;
const TEMP_RECEIPT_PREFIX = ".forge-browser-receipt.tmp-";
const roots: string[] = [];

function reportBytes(report: unknown): Buffer {
  return typeof report === "string" || Buffer.isBuffer(report)
    ? Buffer.from(report)
    : Buffer.from(JSON.stringify(report));
}

function reportDigest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameSizeReports(left: unknown, right: unknown): [Buffer, Buffer] {
  const leftBase = JSON.stringify({ ...(left as Record<string, unknown>), padding: "" });
  const rightBase = JSON.stringify({ ...(right as Record<string, unknown>), padding: "" });
  const targetLength = Math.max(
    Buffer.byteLength(leftBase, "utf8"),
    Buffer.byteLength(rightBase, "utf8"),
  );
  const leftBytes = Buffer.from(JSON.stringify({
    ...(left as Record<string, unknown>),
    padding: "x".repeat(targetLength - Buffer.byteLength(leftBase, "utf8")),
  }));
  const rightBytes = Buffer.from(JSON.stringify({
    ...(right as Record<string, unknown>),
    padding: "x".repeat(targetLength - Buffer.byteLength(rightBase, "utf8")),
  }));
  return [leftBytes, rightBytes];
}

function sameLengthPython(source: string, length: number): Buffer {
  const bytes = Buffer.from(source, "utf8");
  if (bytes.length > length) throw new Error("test helper source is longer than the trusted helper");
  return Buffer.concat([bytes, Buffer.alloc(length - bytes.length, 0x20)]);
}

type ResultStatus = "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
type TestStatus = "expected" | "unexpected" | "flaky" | "skipped";

function testRecord(
  projectName: string,
  status: TestStatus,
  resultStatuses: readonly ResultStatus[],
  expectedStatus: "passed" | "failed" | "skipped" = status === "skipped" ? "skipped" : "passed",
) {
  return {
    projectName,
    status,
    expectedStatus,
    results: resultStatuses.map((resultStatus) => ({ status: resultStatus })),
  };
}

function reportForSpecs(
  specs: Readonly<Record<string, readonly ReturnType<typeof testRecord>[]>>,
) {
  return {
    errors: [],
    suites: [{
      title: "e2e",
      specs: Object.entries(specs).map(([file, tests]) => ({
        title: file,
        file,
        tests,
      })),
    }],
  };
}

// Faithful minimal Playwright 1.61.1 `--list --reporter=json` fixture.
// The configured testDir is `./tests/e2e`, so the reporter emits a relative file.
function semesterDeskV2LocalReport(
  tests: readonly ReturnType<typeof testRecord>[] = [
    testRecord("desktop", "expected", ["passed"]),
    testRecord("mobile", "expected", ["passed"]),
  ],
) {
  return reportForSpecs({
    "semester-desk-v2-canonical.spec.ts": tests,
  });
}

function semesterDeskV2ProductionReport() {
  const specs = Object.fromEntries(
    PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Production.expected_specs.map((spec, index) => [
      spec.slice("tests/e2e/".length),
      [
        testRecord("desktop", "expected", ["passed"]),
        ...(index === 0 ? [testRecord("mobile", "expected", ["passed"])] : []),
      ],
    ]),
  );
  return reportForSpecs(specs);
}

function semesterDeskV2LocalReceiptBytes(testedSha = SHA): Buffer {
  const receipt = buildPlaywrightEvidenceReceipt({
    target: "semesterDeskV2Local",
    testedSha,
    requestedStatus: "pass",
    summary: parsePlaywrightJsonReport(semesterDeskV2LocalReport()),
    reportSha256: REPORT_SHA256,
  });
  return Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

function forgedSemesterDeskV2LocalReceiptBytes(): Buffer {
  const receipt = JSON.parse(semesterDeskV2LocalReceiptBytes().toString("utf8")) as Record<string, unknown>;
  receipt.tested_sha = FORGED_SHA;
  return Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

const MALICIOUS_HELPER_SOURCE = `
import json
import os
import sys

args = sys.argv[1:]
values = {args[index]: args[index + 1] for index in range(0, len(args), 2)}
payload = sys.stdin.buffer.read(int(values["--byte-count"]))
forged = payload.replace(b"${SHA}", b"${FORGED_SHA}")
fd = os.open(values["--basename"], os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=int(values["--dir-fd"]))
os.write(fd, forged)
os.fsync(fd)
receipt = os.fstat(fd)
directory = os.fstat(int(values["--dir-fd"]))
os.close(fd)
print(json.dumps({"directory": {"dev": str(directory.st_dev), "ino": str(directory.st_ino)}, "receipt": {"dev": str(receipt.st_dev), "ino": str(receipt.st_ino), "size": receipt.st_size, "digest": values["--sha256"]}}, separators=(",", ":")))
`;

function cleanupLimitProbeHelper(entryCount: number): string {
  return `
import os
import sys

arguments = sys.argv[1:]
values = {arguments[index]: arguments[index + 1] for index in range(0, len(arguments), 2)}
sys.stdin.buffer.read()
for index in range(${entryCount}):
    fd = os.open(
        "${TEMP_RECEIPT_PREFIX}" + format(index, "032x"),
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
        0o600,
        dir_fd=int(values["--dir-fd"]),
    )
    os.close(fd)
sys.exit(7)
`;
}

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "forge-playwright-receipt-"));
  roots.push(root);
  return root;
}

async function writeReport(
  root: string,
  target: keyof typeof PLAYWRIGHT_EVIDENCE_TARGETS,
  report: unknown,
): Promise<string> {
  const path = resolve(
    root,
    "test-results",
    PLAYWRIGHT_EVIDENCE_TARGETS[target].report_directory,
    "playwright-report.json",
  );
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, reportBytes(report));
  return path;
}

async function reportDigestAt(
  root: string,
  target: keyof typeof PLAYWRIGHT_EVIDENCE_TARGETS,
): Promise<string> {
  const path = resolve(
    root,
    "test-results",
    PLAYWRIGHT_EVIDENCE_TARGETS[target].report_directory,
    "playwright-report.json",
  );
  return reportDigest(await readFile(path));
}

async function writePlaywrightEvidenceReceipt(
  options: Parameters<typeof writeReceipt>[0],
): ReturnType<typeof writeReceipt> {
  let reportSha256 = options.reportSha256;
  if (reportSha256 === undefined) {
    try {
      reportSha256 = await reportDigestAt(options.rootDirectory, options.target);
    } catch {
      reportSha256 = undefined;
    }
  }
  return writeReceipt({ ...options, reportSha256 });
}

async function readReceipt(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Playwright browser evidence receipt", () => {
  it("binds the module helper digest to the checked-in helper bytes", async () => {
    const helper = await readFile(resolve(process.cwd(), "scripts/ops/write-exclusive-receipt.py"));
    expect(createHash("sha256").update(helper).digest("hex"))
      .toBe(PLAYWRIGHT_RECEIPT_HELPER_SOURCE_SHA256);
  });

  it("records exact observed coverage and passed coverage without test text", () => {
    const summary = parsePlaywrightJsonReport(semesterDeskV2LocalReport());

    expect(summary).toEqual({
      observed: {
        specs: ["tests/e2e/semester-desk-v2-canonical.spec.ts"],
        projects: ["desktop", "mobile"],
        passed_specs: ["tests/e2e/semester-desk-v2-canonical.spec.ts"],
        passed_projects: ["desktop", "mobile"],
      },
      counts: {
        total: 2,
        passed: 2,
        failed: 0,
        skipped: 0,
        did_not_run: 0,
        flaky: 0,
        timed_out: 0,
        interrupted: 0,
      },
    });
  });

  it("normalizes Playwright 1.61.1 testDir-relative reporter paths", () => {
    const summary = parsePlaywrightJsonReport(semesterDeskV2LocalReport());
    expect(summary.observed.specs).toEqual(["tests/e2e/semester-desk-v2-canonical.spec.ts"]);

    for (const file of [
      "/semester-desk-v2-canonical.spec.ts",
      "../semester-desk-v2-canonical.spec.ts",
      "nested/../semester-desk-v2-canonical.spec.ts",
      "tests/e2e/semester-desk-v2-canonical.spec.ts",
      "./semester-desk-v2-canonical.spec.ts",
      "nested//semester-desk-v2-canonical.spec.ts",
      "semester-desk-v2-canonical.spec.ts\\replacement",
      "semester desk v2 canonical.spec.ts",
      "semester-desk-v2-canonical.ts",
    ]) {
      expect(() => parsePlaywrightJsonReport(reportForSpecs({
        [file]: [testRecord("desktop", "expected", ["passed"])],
      }))).toThrow();
    }
  });

  it("does not inflate one-test coverage to the expected project set", () => {
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      summary: parsePlaywrightJsonReport(semesterDeskV2LocalReport([
        testRecord("desktop", "expected", ["passed"]),
      ])),
    });

    expect(receipt.status).toBe("fail");
    expect(receipt.expected.projects).toEqual(["desktop", "mobile"]);
    expect(receipt.observed.projects).toEqual(["desktop"]);
    expect(receipt.observed.passed_projects).toEqual(["desktop"]);
  });

  it("records skipped cases but does not let them satisfy coverage", () => {
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      summary: parsePlaywrightJsonReport(semesterDeskV2LocalReport([
        testRecord("desktop", "skipped", ["skipped"]),
        testRecord("mobile", "skipped", ["skipped"]),
      ])),
    });

    expect(receipt.status).toBe("fail");
    expect(receipt.counts).toMatchObject({ total: 2, passed: 0, skipped: 2 });
    expect(receipt.observed.passed_specs).toEqual([]);
    expect(receipt.observed.passed_projects).toEqual([]);
  });

  it("accepts zero-result intentional skips with expectedStatus skipped", () => {
    const summary = parsePlaywrightJsonReport(semesterDeskV2LocalReport([
      testRecord("desktop", "skipped", []),
      testRecord("mobile", "skipped", ["skipped"]),
    ]));
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      summary,
    });

    expect(summary.counts).toMatchObject({ total: 2, passed: 0, skipped: 2 });
    expect(summary.observed.specs).toEqual(["tests/e2e/semester-desk-v2-canonical.spec.ts"]);
    expect(summary.observed.projects).toEqual(["desktop", "mobile"]);
    expect(summary.observed.passed_specs).toEqual([]);
    expect(summary.observed.passed_projects).toEqual([]);
    expect(receipt.status).toBe("fail");
  });

  it("records list-mode did-not-run cases and fails mixed pass coverage", () => {
    const summary = parsePlaywrightJsonReport(semesterDeskV2LocalReport([
      testRecord("desktop", "skipped", [], "passed"),
      testRecord("mobile", "expected", ["passed"]),
    ]));
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      summary,
    });

    expect(summary.counts).toMatchObject({
      total: 2,
      passed: 1,
      skipped: 0,
      did_not_run: 1,
    });
    expect(summary.observed.projects).toEqual(["desktop", "mobile"]);
    expect(summary.observed.passed_projects).toEqual(["mobile"]);
    expect(receipt.status).toBe("fail");
    expect(receipt.counts.did_not_run).toBe(1);

    const onlySkippedResult = parsePlaywrightJsonReport(semesterDeskV2LocalReport([
      testRecord("desktop", "skipped", ["skipped"], "passed"),
      testRecord("mobile", "expected", ["passed"]),
    ]));
    expect(onlySkippedResult.counts.did_not_run).toBe(1);
  });

  it("rejects empty expected-passed results and contaminated skipped results", () => {
    const reports = [
      semesterDeskV2LocalReport([
        testRecord("desktop", "expected", []),
      ]),
      semesterDeskV2LocalReport([
        testRecord("desktop", "skipped", ["skipped", "passed"], "passed"),
      ]),
    ];

    for (const report of reports) {
      expect(() => parsePlaywrightJsonReport(report)).toThrow();
    }
  });

  it("rejects a timeout followed by a retry pass", () => {
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      summary: parsePlaywrightJsonReport(semesterDeskV2LocalReport([
        testRecord("desktop", "flaky", ["timedOut", "passed"]),
        testRecord("mobile", "expected", ["passed"]),
      ])),
    });

    expect(receipt.status).toBe("fail");
    expect(receipt.counts).toMatchObject({ total: 2, passed: 1, flaky: 1, timed_out: 1 });
  });

  it("fails closed for expected failures and unknown status values", () => {
    const reports = [
      semesterDeskV2LocalReport([
        testRecord("desktop", "expected", ["failed"], "failed"),
      ]),
      semesterDeskV2LocalReport([
        testRecord("desktop", "unknown" as TestStatus, ["passed"]),
      ]),
      semesterDeskV2LocalReport([
        testRecord("desktop", "expected", ["unknown" as ResultStatus]),
      ]),
    ];

    for (const report of reports) {
      expect(() => parsePlaywrightJsonReport(report)).toThrow();
    }
  });

  it("fails closed for an expected two-project retry history", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport([
      testRecord("desktop", "expected", ["failed", "passed"]),
      testRecord("mobile", "expected", ["failed", "passed"]),
    ]));

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(result.receipt).toMatchObject({
      input_status: "malformed",
      status: "fail",
      observed: {
        specs: [],
        projects: [],
        passed_specs: [],
        passed_projects: [],
      },
      counts: { total: 0, passed: 0 },
    });
  });

  it("fails closed for root errors and interrupted results", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", {
      errors: [{ message: "worker could not start" }],
      suites: [],
    });
    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(result.receipt.input_status).toBe("root_error");
    expect(result.receipt.status).toBe("fail");
    expect(await readReceipt(result.outputPath)).toMatchObject({
      input_status: "root_error",
      status: "fail",
    });

    const interrupted = parsePlaywrightJsonReport(semesterDeskV2LocalReport([
      testRecord("desktop", "unexpected", ["interrupted"]),
      testRecord("mobile", "expected", ["passed"]),
    ]));
    expect(interrupted.counts.interrupted).toBe(1);
    expect(interrupted.counts.failed).toBe(1);
  });

  it.each([
    ["missing", undefined, "missing"],
    ["corrupt", "{not-json", "malformed"],
    ["malformed", JSON.stringify({ errors: [], suites: {} }), "malformed"],
    ["invalid-utf8", Buffer.from([0x7b, 0xff, 0x7d]), "malformed"],
    ["oversized", Buffer.alloc(MAX_PLAYWRIGHT_REPORT_BYTES + 1, 0x20), "oversized"],
  ] as const)("writes a bounded fail receipt for %s input", async (_name, report, inputStatus) => {
    const root = await temporaryRoot();
    if (report !== undefined) await writeReport(root, "semesterDeskV2Local", report);

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
    });
    const output = await readFile(result.outputPath);

    expect(result.receipt.input_status).toBe(inputStatus);
    expect(result.receipt.status).toBe("fail");
    expect(output.byteLength).toBeLessThan(64 * 1024);
  });

  it("rejects a report symlink and still writes a fail receipt", async () => {
    const root = await temporaryRoot();
    const reportPath = await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const outside = resolve(root, "outside-report.json");
    await writeFile(outside, await readFile(reportPath));
    await rm(reportPath);
    await symlink(outside, reportPath);

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(result.receipt.input_status).toBe("unsafe");
    expect(result.receipt.status).toBe("fail");
  });

  it("fails closed when the report inode changes between lstat and open", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const originalPath = resolve(root, "original-report.json");
    const replacementPath = resolve(root, "replacement-report.json");
    await writeFile(replacementPath, JSON.stringify(semesterDeskV2LocalReport()));

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        afterReportLstat: async (path) => {
          await rename(path, originalPath);
          await rename(replacementPath, path);
        },
      },
    });

    expect(result.receipt.input_status).toBe("unsafe");
    expect(result.receipt.status).toBe("fail");
  });

  it("fails closed when the helper source changes between lstat and open", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const helperPath = resolve(root, "receipt-helper.py");
    const originalPath = resolve(root, "original-receipt-helper.py");
    const replacementPath = resolve(root, "replacement-receipt-helper.py");
    await writeFile(helperPath, "raise SystemExit(0)\n");
    await writeFile(replacementPath, "raise SystemExit(0)\n");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        helperPath,
        afterHelperLstat: async (path) => {
          await rename(path, originalPath);
          await rename(replacementPath, path);
        },
      },
    })).rejects.toThrow();

    expect((await readReceipt(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.writer_error_output_file,
    ))).input_status).toBe("writer_error");
  });

  it("does not execute a same-size in-place helper replacement", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const helperPath = resolve(root, "receipt-helper.py");
    const trustedHelperPath = resolve(process.cwd(), "scripts/ops/write-exclusive-receipt.py");
    const trustedHelper = await readFile(trustedHelperPath);
    await writeFile(helperPath, trustedHelper);
    const helperBefore = await lstat(helperPath);
    const marker = resolve(root, "untrusted-helper-marker.txt");
    const primary = resolve(root, PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.output_file);
    const replacement = sameLengthPython(`
import pathlib
pathlib.Path(${JSON.stringify(marker)}).write_text("UNTRUSTED", encoding="utf-8")
pathlib.Path(${JSON.stringify(primary)}).write_text("UNTRUSTED", encoding="utf-8")
`, trustedHelper.length);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        helperPath,
        helperSourceDigest: PLAYWRIGHT_RECEIPT_HELPER_SOURCE_SHA256,
        afterHelperLstat: async (path) => {
          await writeFile(path, replacement);
          const helperAfter = await lstat(path);
          expect(helperAfter.dev).toBe(helperBefore.dev);
          expect(helperAfter.ino).toBe(helperBefore.ino);
          expect(helperAfter.size).toBe(helperBefore.size);
        },
      },
    })).rejects.toThrow();

    await expect(lstat(marker)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(primary)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await readReceipt(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.writer_error_output_file,
    ))).input_status).toBe("writer_error");
  });

  it("rejects helper source symlinks and oversized helper source", async () => {
    const cases = ["symlink", "oversized"] as const;
    for (const name of cases) {
      const root = await temporaryRoot();
      await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
      const helperPath = resolve(root, `receipt-helper-${name}.py`);
      if (name === "symlink") {
        const outside = resolve(root, "outside-receipt-helper.py");
        await writeFile(outside, "raise SystemExit(0)\n");
        await symlink(outside, helperPath);
      } else {
        await writeFile(helperPath, Buffer.alloc(128 * 1024 + 1, 0x20));
      }

      await expect(writePlaywrightEvidenceReceipt({
        rootDirectory: root,
        target: "semesterDeskV2Local",
        testedSha: SHA,
        requestedStatus: "pass",
        hooks: { helperPath },
      })).rejects.toThrow();
      expect((await readReceipt(resolve(
        root,
        PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.writer_error_output_file,
      ))).input_status).toBe("writer_error");
    }
  });

  it("rejects a trusted parent replacement after report read", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const releaseOps = resolve(root, "test-results/release-ops");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        afterReportRead: async () => {
          await rm(releaseOps, { recursive: true, force: true });
          await mkdir(releaseOps);
        },
      },
    })).rejects.toThrow();
  });

  it("rejects a trusted parent replacement after output write", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const releaseOps = resolve(root, "test-results/release-ops");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        afterOutputWrite: async () => {
          await rm(releaseOps, { recursive: true, force: true });
          await mkdir(releaseOps);
        },
      },
    })).rejects.toThrow();
  });

  it("rejects a parent symlink before writing receipt bytes", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const releaseOps = resolve(root, "test-results/release-ops");
    const outside = resolve(root, "outside-release-ops");
    const outsideOutput = resolve(
      outside,
      "forge-browser-semester-desk-v2-local-receipt.json",
    );
    await mkdir(outside);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        beforeOutputDirectoryOpen: async () => {
          await rm(releaseOps, { recursive: true, force: true });
          await symlink(outside, releaseOps);
        },
      },
    })).rejects.toThrow();

    await expect(lstat(outsideOutput)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("writes relative to the opened directory and rejects a directory rename", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const releaseOps = resolve(root, "test-results/release-ops");
    const movedReleaseOps = resolve(root, "moved-release-ops");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        afterOutputDirectoryOpen: async () => {
          await rename(releaseOps, movedReleaseOps);
        },
      },
    })).rejects.toThrow();

    const movedOutput = resolve(movedReleaseOps, "forge-browser-semester-desk-v2-local-receipt.json");
    const movedReceipt = JSON.parse(await readFile(movedOutput, "utf8")) as Record<string, unknown>;
    expect(movedReceipt.status).toBe("pass");
    expect((await readFile(movedOutput)).byteLength).toBeGreaterThan(0);
  });

  it("does not leave a partial final receipt when the relative commit collides", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const output = resolve(root, PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.output_file);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        afterOutputDirectoryOpen: async () => {
          await writeFile(output, "collision");
        },
      },
    })).rejects.toThrow();

    expect(await readFile(output, "utf8")).toBe("collision");
    expect(await readdir(dirname(output))).toEqual([
      "forge-browser-semester-desk-v2-local-receipt.json",
      "forge-browser-semester-desk-v2-local-writer-error-receipt.json",
    ]);
  });

  it("fails closed when the helper fails, times out, or returns malformed output", async () => {
    const cases = [
      ["exit", "import sys\nsys.stdin.buffer.read()\nsys.exit(7)\n", undefined],
      ["malformed", "import sys\nsys.stdin.buffer.read()\nsys.stdout.write('{}\\n')\n", undefined],
      ["timeout", "import os\nimport sys\nimport time\nargs = sys.argv[1:]\nvalues = {args[index]: args[index + 1] for index in range(0, len(args), 2)}\nfd = os.open('.forge-browser-receipt.tmp-' + ('a' * 32), os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=int(values['--dir-fd']))\nos.close(fd)\ntime.sleep(10)\n", 25],
    ] as const;

    for (const [name, helperSource, helperTimeoutMs] of cases) {
      const root = await temporaryRoot();
      await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
      const helperPath = resolve(root, `receipt-helper-${name}.py`);
      await writeFile(helperPath, helperSource);

      await expect(writePlaywrightEvidenceReceipt({
        rootDirectory: root,
        target: "semesterDeskV2Local",
        testedSha: SHA,
        requestedStatus: "pass",
        hooks: { helperPath, helperTimeoutMs },
      })).rejects.toThrow();
      await expect(lstat(resolve(root, PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.output_file)))
        .rejects.toMatchObject({ code: "ENOENT" });
      const fallback = await readReceipt(resolve(
        root,
        PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.writer_error_output_file,
      ));
      const expectedFallback = buildPlaywrightEvidenceReceipt({
        target: "semesterDeskV2Local",
        testedSha: SHA,
        inputStatus: "writer_error",
        requestedStatus: "fail",
      });
      expect(fallback).toEqual(expectedFallback);
      expect(fallback).toMatchObject({
        input_status: "writer_error",
        status: "fail",
        observed: {
          specs: [],
          projects: [],
          passed_specs: [],
          passed_projects: [],
        },
        counts: { total: 0, passed: 0 },
      });
      const fallbackPath = resolve(
        root,
        PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.writer_error_output_file,
      );
      expect(await readFile(fallbackPath)).toEqual(Buffer.from(
        `${JSON.stringify(expectedFallback, null, 2)}\n`,
        "utf8",
      ));
      expect((await lstat(fallbackPath)).nlink).toBe(1);
      expect((await readdir(dirname(fallbackPath)))
        .filter((entry) => entry.startsWith(".forge-browser-receipt.tmp-")))
        .toEqual([]);
    }
  });

  it("cleans exactly the bounded number of temporary entries", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const helperPath = resolve(root, "receipt-helper-cleanup-limit.py");
    await writeFile(helperPath, cleanupLimitProbeHelper(CLEANUP_ENTRY_LIMIT));

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: { helperPath },
    })).rejects.toThrow();

    const releaseOps = dirname(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.writer_error_output_file,
    ));
    expect((await readdir(releaseOps))
      .filter((entry) => entry.startsWith(TEMP_RECEIPT_PREFIX))).toEqual([]);
  });

  it("fails closed before deleting any over-limit temporary entries", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const helperPath = resolve(root, "receipt-helper-cleanup-over-limit.py");
    await writeFile(helperPath, cleanupLimitProbeHelper(CLEANUP_ENTRY_LIMIT + 1));

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: { helperPath },
    })).rejects.toThrow();

    const releaseOps = dirname(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.writer_error_output_file,
    ));
    expect((await readdir(releaseOps))
      .filter((entry) => entry.startsWith(TEMP_RECEIPT_PREFIX))).toHaveLength(CLEANUP_ENTRY_LIMIT + 1);
  });

  it("rejects helper stderr and preserves full receipt integrity", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const helperPath = resolve(root, "receipt-helper-stderr.py");
    await writeFile(helperPath, "import sys\nsys.stdin.buffer.read()\nprint('diagnostic', file=sys.stderr)\n");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: { helperPath },
    })).rejects.toThrow();

    const successRoot = await temporaryRoot();
    await writeReport(successRoot, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const githubOutput = resolve(successRoot, "github-output");
    await writeFile(githubOutput, "");
    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: successRoot,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      githubOutput,
    });
    const receiptBytes = await readFile(result.outputPath);
    expect(JSON.parse(receiptBytes.toString())).toEqual(result.receipt);
    expect(receiptBytes.byteLength).toBeGreaterThan(0);
    expect((await lstat(result.outputPath)).nlink).toBe(1);
    expect(result.receiptSha256).toBe(reportDigest(receiptBytes));
    expect(await readFile(githubOutput, "utf8")).toBe(`receipt_sha256=${result.receiptSha256}\n`);
    expect(await readdir(dirname(result.outputPath))).toEqual([
      "forge-browser-semester-desk-v2-local-receipt.json",
    ]);
  });

  it("rejects a malicious helper that writes a same-size forged pass receipt", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const helperPath = resolve(root, "malicious-receipt-helper.py");
    await writeFile(helperPath, MALICIOUS_HELPER_SOURCE);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: { helperPath },
    })).rejects.toThrow();

    const primary = await readReceipt(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.output_file,
    ));
    expect(primary).toMatchObject({ status: "pass", tested_sha: FORGED_SHA });
    expect((await readFile(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.output_file,
    ))).byteLength).toBe(forgedSemesterDeskV2LocalReceiptBytes().byteLength);
    expect((await readReceipt(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.writer_error_output_file,
    ))).input_status).toBe("writer_error");
  });

  it("rejects a same-size valid JSON replacement after the helper write", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const forgedBytes = forgedSemesterDeskV2LocalReceiptBytes();
    const expectedBytes = semesterDeskV2LocalReceiptBytes();
    expect(forgedBytes.byteLength).toBe(expectedBytes.byteLength);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        afterOutputWrite: async (path) => {
          await rm(path);
          await writeFile(path, forgedBytes);
        },
      },
    })).rejects.toThrow();
    expect((await readReceipt(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.output_file,
    ))).tested_sha).toBe(FORGED_SHA);
  });

  it("rejects a same-size flaky-to-pass report replacement", async () => {
    const root = await temporaryRoot();
    const flakyReport = semesterDeskV2LocalReport([
      testRecord("desktop", "flaky", ["failed", "passed"]),
      testRecord("mobile", "expected", ["passed"]),
    ]);
    const passingReport = semesterDeskV2LocalReport();
    const [flakyBytes, passingBytes] = sameSizeReports(flakyReport, passingReport);
    expect(flakyBytes.byteLength).toBe(passingBytes.byteLength);
    const reportPath = await writeReport(root, "semesterDeskV2Local", flakyBytes);
    const reportBefore = await lstat(reportPath);

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      reportSha256: reportDigest(flakyBytes),
      requestedStatus: "pass",
      hooks: {
        afterReportLstat: async (path) => {
          await writeFile(path, passingBytes);
          const reportAfter = await lstat(path);
          expect(reportAfter.dev).toBe(reportBefore.dev);
          expect(reportAfter.ino).toBe(reportBefore.ino);
          expect(reportAfter.size).toBe(reportBefore.size);
        },
      },
    });

    expect(reportPath).toBe(resolve(
      root,
      "test-results/semester-desk-v2-local/playwright-report.json",
    ));
    expect(result.receipt).toMatchObject({
      input_status: "digest_mismatch",
      status: "fail",
      report_sha256: null,
      observed: {
        specs: [],
        projects: [],
        passed_specs: [],
        passed_projects: [],
      },
    });
  });

  it("fails closed when the report path changes after report bytes are read", async () => {
    const root = await temporaryRoot();
    const [originalBytes, replacementBytes] = sameSizeReports(
      semesterDeskV2LocalReport(),
      semesterDeskV2LocalReport([testRecord("desktop", "expected", ["passed"])]),
    );
    const reportPath = await writeReport(root, "semesterDeskV2Local", originalBytes);
    const parkedPath = resolve(root, "original-report-after-read.json");
    const replacementPath = resolve(root, "replacement-report-after-read.json");
    await writeFile(replacementPath, replacementBytes);
    const originalStat = await lstat(reportPath);
    const replacementStat = await lstat(replacementPath);
    expect(replacementStat.size).toBe(originalStat.size);
    expect(replacementStat.ino).not.toBe(originalStat.ino);

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      reportSha256: reportDigest(originalBytes),
      requestedStatus: "pass",
      hooks: {
        afterReportRead: async (path) => {
          await rename(path, parkedPath);
          await rename(replacementPath, path);
        },
      },
    });

    expect(result.receipt).toMatchObject({
      input_status: "unsafe",
      status: "fail",
      report_sha256: null,
      observed: {
        specs: [],
        projects: [],
        passed_specs: [],
        passed_projects: [],
      },
    });
  });

  it("rejects an exact final-byte mismatch on the same inode", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const forgedBytes = forgedSemesterDeskV2LocalReceiptBytes();
    const output = resolve(root, PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.output_file);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        afterOutputWrite: async () => {
          await writeFile(output, forgedBytes);
        },
      },
    })).rejects.toThrow();
    expect((await readReceipt(output)).tested_sha).toBe(FORGED_SHA);
  });

  it("rejects an output path replacement after the exclusive write", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        afterOutputWrite: async (path) => {
          await rm(path);
          await writeFile(path, "replacement");
        },
      },
    }).catch((error: unknown) => error);

    expect(result).toBeInstanceOf(Error);
    expect(await readFile(resolve(root, PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.output_file), "utf8"))
      .toBe("replacement");
  });

  it("writes an empty bounded fail receipt for many paths below the report limit", async () => {
    const root = await temporaryRoot();
    const report = reportForSpecs(Object.fromEntries(
      Array.from({ length: MAX_OBSERVED_SPECS + 1 }, (_, index) => [
        `overflow-${index}.spec.ts`,
        [testRecord("desktop", "expected", ["passed"])],
      ]),
    ));
    expect(Buffer.byteLength(JSON.stringify(report), "utf8")).toBeLessThan(MAX_PLAYWRIGHT_REPORT_BYTES);
    await writeReport(root, "semesterDeskV2Local", report);

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(result.receipt).toMatchObject({
      input_status: "overflow",
      status: "fail",
      observed: {
        specs: [],
        projects: [],
        passed_specs: [],
        passed_projects: [],
      },
      counts: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        did_not_run: 0,
        flaky: 0,
        timed_out: 0,
        interrupted: 0,
      },
    });
    expect((await readFile(result.outputPath)).byteLength).toBeLessThan(64 * 1024);
  });

  it("writes an empty bounded fail receipt when the test count exceeds the limit", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport(
      Array.from({ length: MAX_PLAYWRIGHT_TESTS + 1 }, () => (
        testRecord("desktop", "expected", ["passed"])
      )),
    ));

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(result.receipt.input_status).toBe("overflow");
    expect(result.receipt.counts.total).toBe(0);
  });

  it("rejects an output symlink without changing its target", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const output = resolve(root, PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.output_file);
    const outside = resolve(root, "outside-receipt.json");
    await mkdir(dirname(output), { recursive: true });
    await writeFile(outside, "keep this file");
    await symlink(outside, output);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
    })).rejects.toThrow();
    expect(await readFile(outside, "utf8")).toBe("keep this file");
  });

  it("validates the fixed output path before reading input and rejects output collisions", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Local", semesterDeskV2LocalReport());
    const first = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
    });
    const original = await readFile(first.outputPath, "utf8");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
    })).rejects.toThrow();
    expect(await readFile(first.outputPath, "utf8")).toBe(original);
    expect((await readReceipt(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local.writer_error_output_file,
    ))).input_status).toBe("writer_error");
  });

  it("keeps development and production evidence in separate receipts", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Production", semesterDeskV2ProductionReport());

    const local = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Local",
      testedSha: SHA,
      requestedStatus: "pass",
    });
    const production = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Production",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(local.outputPath).not.toBe(production.outputPath);
    expect(local.receipt).toMatchObject({
      target: "semesterDeskV2Local",
      evidence_environment: "development",
      artifact_class: "development_source",
      input_status: "missing",
      status: "fail",
    });
    expect(production.receipt).toMatchObject({
      target: "semesterDeskV2Production",
      evidence_environment: "production",
      artifact_class: "production_build_artifact",
      input_status: "valid",
      status: "pass",
    });
  });

  it("passes exact production spec and project coverage", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "semesterDeskV2Production", semesterDeskV2ProductionReport());

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "semesterDeskV2Production",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(result.receipt.status).toBe("pass");
    expect(result.receipt.observed.specs).toEqual(
      [...PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Production.expected_specs].sort(),
    );
    expect(result.receipt.observed.projects).toEqual(["desktop", "mobile"]);
  });
});
