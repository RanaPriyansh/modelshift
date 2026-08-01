import { lstat, mkdir, mkdtemp, readdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  MAX_PLAYWRIGHT_REPORT_BYTES,
  MAX_PLAYWRIGHT_TESTS,
  MAX_OBSERVED_SPECS,
  PLAYWRIGHT_EVIDENCE_TARGETS,
  buildPlaywrightEvidenceReceipt,
  parsePlaywrightJsonReport,
  writePlaywrightEvidenceReceipt,
} from "./playwright-evidence-receipt";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const FORGED_SHA = "fedcba9876543210fedcba9876543210fedcba98";
const roots: string[] = [];

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

function foundationReport(
  tests: readonly ReturnType<typeof testRecord>[] = [
    testRecord("desktop", "expected", ["passed"]),
    testRecord("mobile", "expected", ["passed"]),
  ],
) {
  return reportForSpecs({
    "tests/e2e/university-foundation.spec.ts": tests,
  });
}

function productionReport() {
  const specs = Object.fromEntries(
    PLAYWRIGHT_EVIDENCE_TARGETS.production.expected_specs.map((spec, index) => [
      spec,
      [
        testRecord("desktop", "expected", ["passed"]),
        ...(index === 0 ? [testRecord("mobile", "expected", ["passed"])] : []),
      ],
    ]),
  );
  return reportForSpecs(specs);
}

function foundationReceiptBytes(testedSha = SHA): Buffer {
  const receipt = buildPlaywrightEvidenceReceipt({
    target: "foundation",
    testedSha,
    requestedStatus: "pass",
    summary: parsePlaywrightJsonReport(foundationReport()),
  });
  return Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

function forgedFoundationReceiptBytes(): Buffer {
  const receipt = JSON.parse(foundationReceiptBytes().toString("utf8")) as Record<string, unknown>;
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
  await writeFile(path, typeof report === "string" || Buffer.isBuffer(report)
    ? report
    : JSON.stringify(report));
  return path;
}

async function readReceipt(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Playwright browser evidence receipt", () => {
  it("records exact observed coverage and passed coverage without test text", () => {
    const summary = parsePlaywrightJsonReport(foundationReport());

    expect(summary).toEqual({
      observed: {
        specs: ["tests/e2e/university-foundation.spec.ts"],
        projects: ["desktop", "mobile"],
        passed_specs: ["tests/e2e/university-foundation.spec.ts"],
        passed_projects: ["desktop", "mobile"],
      },
      counts: {
        total: 2,
        passed: 2,
        failed: 0,
        skipped: 0,
        flaky: 0,
        timed_out: 0,
        interrupted: 0,
      },
    });
  });

  it("does not inflate one-test coverage to the expected project set", () => {
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
      summary: parsePlaywrightJsonReport(foundationReport([
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
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
      summary: parsePlaywrightJsonReport(foundationReport([
        testRecord("desktop", "skipped", ["skipped"]),
        testRecord("mobile", "skipped", ["skipped"]),
      ])),
    });

    expect(receipt.status).toBe("fail");
    expect(receipt.counts).toMatchObject({ total: 2, passed: 0, skipped: 2 });
    expect(receipt.observed.passed_specs).toEqual([]);
    expect(receipt.observed.passed_projects).toEqual([]);
  });

  it("rejects a timeout followed by a retry pass", () => {
    const receipt = buildPlaywrightEvidenceReceipt({
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
      summary: parsePlaywrightJsonReport(foundationReport([
        testRecord("desktop", "flaky", ["timedOut", "passed"]),
        testRecord("mobile", "expected", ["passed"]),
      ])),
    });

    expect(receipt.status).toBe("fail");
    expect(receipt.counts).toMatchObject({ total: 2, passed: 1, flaky: 1, timed_out: 1 });
  });

  it("fails closed for expected failures and unknown status values", () => {
    const reports = [
      foundationReport([
        testRecord("desktop", "expected", ["failed"], "failed"),
      ]),
      foundationReport([
        testRecord("desktop", "unknown" as TestStatus, ["passed"]),
      ]),
      foundationReport([
        testRecord("desktop", "expected", ["unknown" as ResultStatus]),
      ]),
    ];

    for (const report of reports) {
      expect(() => parsePlaywrightJsonReport(report)).toThrow();
    }
  });

  it("fails closed for an expected two-project retry history", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "foundation", foundationReport([
      testRecord("desktop", "expected", ["failed", "passed"]),
      testRecord("mobile", "expected", ["failed", "passed"]),
    ]));

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
    await writeReport(root, "foundation", {
      errors: [{ message: "worker could not start" }],
      suites: [],
    });
    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(result.receipt.input_status).toBe("root_error");
    expect(result.receipt.status).toBe("fail");
    expect(await readReceipt(result.outputPath)).toMatchObject({
      input_status: "root_error",
      status: "fail",
    });

    const interrupted = parsePlaywrightJsonReport(foundationReport([
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
    ["oversized", Buffer.alloc(MAX_PLAYWRIGHT_REPORT_BYTES + 1, 0x20), "oversized"],
  ] as const)("writes a bounded fail receipt for %s input", async (_name, report, inputStatus) => {
    const root = await temporaryRoot();
    if (report !== undefined) await writeReport(root, "foundation", report);

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
    const reportPath = await writeReport(root, "foundation", foundationReport());
    const outside = resolve(root, "outside-report.json");
    await writeFile(outside, await readFile(reportPath));
    await rm(reportPath);
    await symlink(outside, reportPath);

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(result.receipt.input_status).toBe("unsafe");
    expect(result.receipt.status).toBe("fail");
  });

  it("fails closed when the report inode changes between lstat and open", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "foundation", foundationReport());
    const originalPath = resolve(root, "original-report.json");
    const replacementPath = resolve(root, "replacement-report.json");
    await writeFile(replacementPath, JSON.stringify(foundationReport()));

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
    await writeReport(root, "foundation", foundationReport());
    const helperPath = resolve(root, "receipt-helper.py");
    const originalPath = resolve(root, "original-receipt-helper.py");
    const replacementPath = resolve(root, "replacement-receipt-helper.py");
    await writeFile(helperPath, "raise SystemExit(0)\n");
    await writeFile(replacementPath, "raise SystemExit(0)\n");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
      PLAYWRIGHT_EVIDENCE_TARGETS.foundation.writer_error_output_file,
    ))).input_status).toBe("writer_error");
  });

  it("rejects helper source symlinks and oversized helper source", async () => {
    const cases = ["symlink", "oversized"] as const;
    for (const name of cases) {
      const root = await temporaryRoot();
      await writeReport(root, "foundation", foundationReport());
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
        target: "foundation",
        testedSha: SHA,
        requestedStatus: "pass",
        hooks: { helperPath },
      })).rejects.toThrow();
      expect((await readReceipt(resolve(
        root,
        PLAYWRIGHT_EVIDENCE_TARGETS.foundation.writer_error_output_file,
      ))).input_status).toBe("writer_error");
    }
  });

  it("rejects a trusted parent replacement after report read", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "foundation", foundationReport());
    const releaseOps = resolve(root, "test-results/release-ops");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
    await writeReport(root, "foundation", foundationReport());
    const releaseOps = resolve(root, "test-results/release-ops");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
    await writeReport(root, "foundation", foundationReport());
    const releaseOps = resolve(root, "test-results/release-ops");
    const outside = resolve(root, "outside-release-ops");
    const outsideOutput = resolve(
      outside,
      "forge-browser-foundation-receipt.json",
    );
    await mkdir(outside);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
    await writeReport(root, "foundation", foundationReport());
    const releaseOps = resolve(root, "test-results/release-ops");
    const movedReleaseOps = resolve(root, "moved-release-ops");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: {
        afterOutputDirectoryOpen: async () => {
          await rename(releaseOps, movedReleaseOps);
        },
      },
    })).rejects.toThrow();

    const movedOutput = resolve(movedReleaseOps, "forge-browser-foundation-receipt.json");
    const movedReceipt = JSON.parse(await readFile(movedOutput, "utf8")) as Record<string, unknown>;
    expect(movedReceipt.status).toBe("pass");
    expect((await readFile(movedOutput)).byteLength).toBeGreaterThan(0);
  });

  it("does not leave a partial final receipt when the relative commit collides", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "foundation", foundationReport());
    const output = resolve(root, PLAYWRIGHT_EVIDENCE_TARGETS.foundation.output_file);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
      "forge-browser-foundation-receipt.json",
      "forge-browser-foundation-writer-error-receipt.json",
    ]);
  });

  it("fails closed when the helper fails, times out, or returns malformed output", async () => {
    const cases = [
      ["exit", "import sys\nsys.stdin.buffer.read()\nsys.exit(7)\n", undefined],
      ["malformed", "import sys\nsys.stdin.buffer.read()\nsys.stdout.write('{}\\n')\n", undefined],
      ["timeout", "import sys\nimport time\nsys.stdin.buffer.read()\ntime.sleep(10)\n", 25],
    ] as const;

    for (const [name, helperSource, helperTimeoutMs] of cases) {
      const root = await temporaryRoot();
      await writeReport(root, "foundation", foundationReport());
      const helperPath = resolve(root, `receipt-helper-${name}.py`);
      await writeFile(helperPath, helperSource);

      await expect(writePlaywrightEvidenceReceipt({
        rootDirectory: root,
        target: "foundation",
        testedSha: SHA,
        requestedStatus: "pass",
        hooks: { helperPath, helperTimeoutMs },
      })).rejects.toThrow();
      await expect(lstat(resolve(root, PLAYWRIGHT_EVIDENCE_TARGETS.foundation.output_file)))
        .rejects.toMatchObject({ code: "ENOENT" });
      const fallback = await readReceipt(resolve(
        root,
        PLAYWRIGHT_EVIDENCE_TARGETS.foundation.writer_error_output_file,
      ));
      const expectedFallback = buildPlaywrightEvidenceReceipt({
        target: "foundation",
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
        PLAYWRIGHT_EVIDENCE_TARGETS.foundation.writer_error_output_file,
      );
      expect(await readFile(fallbackPath)).toEqual(Buffer.from(
        `${JSON.stringify(expectedFallback, null, 2)}\n`,
        "utf8",
      ));
      expect((await lstat(fallbackPath)).nlink).toBe(1);
    }
  });

  it("rejects helper stderr and preserves full receipt integrity", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "foundation", foundationReport());
    const helperPath = resolve(root, "receipt-helper-stderr.py");
    await writeFile(helperPath, "import sys\nsys.stdin.buffer.read()\nprint('diagnostic', file=sys.stderr)\n");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: { helperPath },
    })).rejects.toThrow();

    const successRoot = await temporaryRoot();
    await writeReport(successRoot, "foundation", foundationReport());
    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: successRoot,
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
    });
    const receiptBytes = await readFile(result.outputPath);
    expect(JSON.parse(receiptBytes.toString())).toEqual(result.receipt);
    expect(receiptBytes.byteLength).toBeGreaterThan(0);
    expect((await lstat(result.outputPath)).nlink).toBe(1);
    expect(await readdir(dirname(result.outputPath))).toEqual([
      "forge-browser-foundation-receipt.json",
    ]);
  });

  it("rejects a malicious helper that writes a same-size forged pass receipt", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "foundation", foundationReport());
    const helperPath = resolve(root, "malicious-receipt-helper.py");
    await writeFile(helperPath, MALICIOUS_HELPER_SOURCE);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
      hooks: { helperPath },
    })).rejects.toThrow();

    const primary = await readReceipt(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.foundation.output_file,
    ));
    expect(primary).toMatchObject({ status: "pass", tested_sha: FORGED_SHA });
    expect((await readFile(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.foundation.output_file,
    ))).byteLength).toBe(forgedFoundationReceiptBytes().byteLength);
    expect((await readReceipt(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.foundation.writer_error_output_file,
    ))).input_status).toBe("writer_error");
  });

  it("rejects a same-size valid JSON replacement after the helper write", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "foundation", foundationReport());
    const forgedBytes = forgedFoundationReceiptBytes();
    const expectedBytes = foundationReceiptBytes();
    expect(forgedBytes.byteLength).toBe(expectedBytes.byteLength);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
      PLAYWRIGHT_EVIDENCE_TARGETS.foundation.output_file,
    ))).tested_sha).toBe(FORGED_SHA);
  });

  it("rejects an exact final-byte mismatch on the same inode", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "foundation", foundationReport());
    const forgedBytes = forgedFoundationReceiptBytes();
    const output = resolve(root, PLAYWRIGHT_EVIDENCE_TARGETS.foundation.output_file);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
    await writeReport(root, "foundation", foundationReport());

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
    expect(await readFile(resolve(root, PLAYWRIGHT_EVIDENCE_TARGETS.foundation.output_file), "utf8"))
      .toBe("replacement");
  });

  it("writes an empty bounded fail receipt for many paths below the report limit", async () => {
    const root = await temporaryRoot();
    const report = reportForSpecs(Object.fromEntries(
      Array.from({ length: MAX_OBSERVED_SPECS + 1 }, (_, index) => [
        `tests/e2e/overflow-${index}.spec.ts`,
        [testRecord("desktop", "expected", ["passed"])],
      ]),
    ));
    expect(Buffer.byteLength(JSON.stringify(report), "utf8")).toBeLessThan(MAX_PLAYWRIGHT_REPORT_BYTES);
    await writeReport(root, "foundation", report);

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
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
        flaky: 0,
        timed_out: 0,
        interrupted: 0,
      },
    });
    expect((await readFile(result.outputPath)).byteLength).toBeLessThan(64 * 1024);
  });

  it("writes an empty bounded fail receipt when the test count exceeds the limit", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "foundation", foundationReport(
      Array.from({ length: MAX_PLAYWRIGHT_TESTS + 1 }, () => (
        testRecord("desktop", "expected", ["passed"])
      )),
    ));

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(result.receipt.input_status).toBe("overflow");
    expect(result.receipt.counts.total).toBe(0);
  });

  it("rejects an output symlink without changing its target", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "foundation", foundationReport());
    const output = resolve(root, PLAYWRIGHT_EVIDENCE_TARGETS.foundation.output_file);
    const outside = resolve(root, "outside-receipt.json");
    await mkdir(dirname(output), { recursive: true });
    await writeFile(outside, "keep this file");
    await symlink(outside, output);

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
    })).rejects.toThrow();
    expect(await readFile(outside, "utf8")).toBe("keep this file");
  });

  it("validates the fixed output path before reading input and rejects output collisions", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "foundation", foundationReport());
    const first = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
    });
    const original = await readFile(first.outputPath, "utf8");

    await expect(writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
    })).rejects.toThrow();
    expect(await readFile(first.outputPath, "utf8")).toBe(original);
    expect((await readReceipt(resolve(
      root,
      PLAYWRIGHT_EVIDENCE_TARGETS.foundation.writer_error_output_file,
    ))).input_status).toBe("writer_error");
  });

  it("keeps development and production evidence in separate receipts", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "production", productionReport());

    const foundation = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "foundation",
      testedSha: SHA,
      requestedStatus: "pass",
    });
    const production = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "production",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(foundation.outputPath).not.toBe(production.outputPath);
    expect(foundation.receipt).toMatchObject({
      target: "foundation",
      evidence_environment: "development",
      artifact_class: "development_source",
      input_status: "missing",
      status: "fail",
    });
    expect(production.receipt).toMatchObject({
      target: "production",
      evidence_environment: "production",
      artifact_class: "production_build_artifact",
      input_status: "valid",
      status: "pass",
    });
  });

  it("passes exact production spec and project coverage", async () => {
    const root = await temporaryRoot();
    await writeReport(root, "production", productionReport());

    const result = await writePlaywrightEvidenceReceipt({
      rootDirectory: root,
      target: "production",
      testedSha: SHA,
      requestedStatus: "pass",
    });

    expect(result.receipt.status).toBe("pass");
    expect(result.receipt.observed.specs).toEqual(
      [...PLAYWRIGHT_EVIDENCE_TARGETS.production.expected_specs].sort(),
    );
    expect(result.receipt.observed.projects).toEqual(["desktop", "mobile"]);
  });
});
