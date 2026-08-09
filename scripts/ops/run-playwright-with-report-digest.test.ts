import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  MAX_PLAYWRIGHT_REPORT_BYTES,
} from "./playwright-evidence-receipt";
import {
  playwrightCliInvocation,
  readPlaywrightReportDigest,
  runPlaywrightWithReportDigest,
  type PlaywrightReportProducerTestHooks,
} from "./run-playwright-with-report-digest";

const REPORT_FILE = "test-results/fake/playwright-report.json";
const REPORT = JSON.stringify({ errors: [], suites: [] });
const roots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await realpath(await mkdtemp(resolve(tmpdir(), "forge-playwright-producer-")));
  roots.push(root);
  await mkdir(resolve(root, "test-results/fake"), { recursive: true });
  return root;
}

function fakeNodeArgs(source: string): string[] {
  return ["-e", source, "--"];
}

function reportProducerSource(body: string): string {
  return `
${body}
`;
}

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function outputPath(root: string): Promise<string> {
  const path = resolve(root, "github-output");
  await writeFile(path, "");
  return path;
}

async function attackerLocation(root: string): Promise<{
  attackerRoot: string;
  attackerSuite: string;
  attackerReport: string;
}> {
  const attackerRoot = resolve(root, "attacker");
  const attackerSuite = resolve(attackerRoot, "fake");
  const attackerReport = resolve(attackerSuite, "playwright-report.json");
  await mkdir(attackerSuite, { recursive: true });
  return { attackerRoot, attackerSuite, attackerReport };
}

async function expectRaceFailure(
  root: string,
  testHooks: PlaywrightReportProducerTestHooks,
): Promise<void> {
  const githubOutput = await outputPath(root);
  await expect(runPlaywrightWithReportDigest({
    rootDirectory: root,
    reportFile: REPORT_FILE,
    command: process.execPath,
    args: fakeNodeArgs(`process.stdout.write(${JSON.stringify(REPORT)});`),
    githubOutput,
    testHooks,
  })).rejects.toThrow();
  expect(await readFile(githubOutput, "utf8")).toBe("");
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Playwright report producer", () => {
  it("uses a direct child, strips report output variables, and emits the exact digest", async () => {
    const root = await temporaryRoot();
    const githubOutput = await outputPath(root);
    const source = reportProducerSource(`
const forbidden = [
  "GITHUB_OUTPUT",
  "GITHUB_ENV",
  "GITHUB_PATH",
  "GITHUB_STATE",
  "GITHUB_STEP_SUMMARY",
  "PLAYWRIGHT_JSON_OUTPUT_FILE",
  "PLAYWRIGHT_JSON_OUTPUT_NAME",
  "PLAYWRIGHT_JSON_OUTPUT_DIR",
];
if (forbidden.some((key) => process.env[key] !== undefined)) process.exit(11);
if (!process.argv.includes("--reporter=json")) process.exit(12);
process.stdout.write(${JSON.stringify(REPORT)});
`);

    const result = await runPlaywrightWithReportDigest({
      rootDirectory: root,
      reportFile: REPORT_FILE,
      command: process.execPath,
      args: fakeNodeArgs(source),
      environment: {
        ...process.env,
        GITHUB_OUTPUT: "child-must-not-see-this",
        GITHUB_ENV: "child-must-not-see-this",
        GITHUB_PATH: "child-must-not-see-this",
        GITHUB_STATE: "child-must-not-see-this",
        GITHUB_STEP_SUMMARY: "child-must-not-see-this",
        PLAYWRIGHT_JSON_OUTPUT_FILE: "child-must-not-see-this",
        PLAYWRIGHT_JSON_OUTPUT_NAME: "child-must-not-see-this",
        PLAYWRIGHT_JSON_OUTPUT_DIR: "child-must-not-see-this",
      },
      githubOutput,
    });

    const reportBytes = await readFile(resolve(root, REPORT_FILE));
    const expectedDigest = digest(Buffer.from(REPORT));
    expect(result).toBe(0);
    expect(reportBytes.toString("utf8")).toBe(REPORT);
    expect(await readPlaywrightReportDigest(root, REPORT_FILE)).toBe(expectedDigest);
    expect(await readFile(githubOutput, "utf8")).toBe(`report_sha256=${expectedDigest}\n`);
  });

  it("retains a valid report and digest when the direct child exits nonzero", async () => {
    const root = await temporaryRoot();
    const githubOutput = await outputPath(root);
    const result = await runPlaywrightWithReportDigest({
      rootDirectory: root,
      reportFile: REPORT_FILE,
      command: process.execPath,
      args: fakeNodeArgs(`process.stdout.write(${JSON.stringify(REPORT)}); process.exitCode = 7;`),
      githubOutput,
    });
    const expectedDigest = digest(Buffer.from(REPORT));

    expect(result).toBe(7);
    expect(await readFile(resolve(root, REPORT_FILE), "utf8")).toBe(REPORT);
    expect(await readFile(githubOutput, "utf8")).toBe(`report_sha256=${expectedDigest}\n`);
  });

  it("uses the exclusive report output and preserves a collision", async () => {
    const root = await temporaryRoot();
    const githubOutput = await outputPath(root);
    const reportPath = resolve(root, REPORT_FILE);
    await writeFile(reportPath, "existing");

    await expect(runPlaywrightWithReportDigest({
      rootDirectory: root,
      reportFile: REPORT_FILE,
      command: process.execPath,
      args: fakeNodeArgs(`process.stdout.write(${JSON.stringify(REPORT)});`),
      githubOutput,
    })).rejects.toThrow();

    expect(await readFile(reportPath, "utf8")).toBe("existing");
    expect(await readFile(githubOutput, "utf8")).toBe("");
  });

  it("rejects oversized producer output before report creation", async () => {
    const root = await temporaryRoot();
    const githubOutput = await outputPath(root);
    await expect(runPlaywrightWithReportDigest({
      rootDirectory: root,
      reportFile: REPORT_FILE,
      command: process.execPath,
      args: fakeNodeArgs(`process.stdout.write("x".repeat(${MAX_PLAYWRIGHT_REPORT_BYTES + 1}));`),
      githubOutput,
    })).rejects.toThrow();

    await expect(readFile(resolve(root, REPORT_FILE))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(githubOutput, "utf8")).toBe("");
  });

  it("rejects malformed JSON before report creation", async () => {
    const root = await temporaryRoot();
    const githubOutput = await outputPath(root);
    await expect(runPlaywrightWithReportDigest({
      rootDirectory: root,
      reportFile: REPORT_FILE,
      command: process.execPath,
      args: fakeNodeArgs("process.stdout.write('{not-json');"),
      githubOutput,
    })).rejects.toThrow();

    await expect(readFile(resolve(root, REPORT_FILE))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(githubOutput, "utf8")).toBe("");
  });

  it("cleans a timed-out report helper temporary entry", async () => {
    const root = await temporaryRoot();
    const githubOutput = await outputPath(root);
    const helperSource = `
import os
import sys
import time

arguments = sys.argv[1:]
values = {arguments[index]: arguments[index + 1] for index in range(0, len(arguments), 2)}
started = os.open(
    "helper-started",
    os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
    0o600,
    dir_fd=int(values["--dir-fd"]),
)
os.close(started)
temporary = os.open(
    ".forge-browser-receipt.tmp-" + ("a" * 32),
    os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
    0o600,
    dir_fd=int(values["--dir-fd"]),
)
os.close(temporary)
time.sleep(10)
`;

    await expect(runPlaywrightWithReportDigest({
      rootDirectory: root,
      reportFile: REPORT_FILE,
      command: process.execPath,
      args: fakeNodeArgs(`process.stdout.write(${JSON.stringify(REPORT)});`),
      githubOutput,
      testHooks: {
        testHelperSource: helperSource,
        helperTimeoutMs: 250,
      },
    })).rejects.toThrow();

    await expect(readFile(resolve(root, REPORT_FILE))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(githubOutput, "utf8")).toBe("");
    expect(await readFile(resolve(root, "test-results/fake/helper-started"), "utf8")).toBe("");
    const entries = await readdir(resolve(root, "test-results/fake"));
    expect(entries.filter((entry) => entry.startsWith(".forge-browser-receipt.tmp-"))).toEqual([]);
  });

  it("rejects a test-results replacement before the suite descriptor opens", async () => {
    const root = await temporaryRoot();
    const attacker = await attackerLocation(root);
    await expectRaceFailure(root, {
      beforeSuiteOpen: async (location) => {
        await rename(location.testResultsPath, resolve(root, "moved-test-results"));
        await symlink(attacker.attackerRoot, location.testResultsPath);
      },
    });
    await expect(readFile(attacker.attackerReport)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a suite replacement before the suite descriptor opens", async () => {
    const root = await temporaryRoot();
    const attacker = await attackerLocation(root);
    await expectRaceFailure(root, {
      beforeSuiteOpen: async (location) => {
        await rename(location.suitePath, resolve(root, "moved-suite"));
        await symlink(attacker.attackerSuite, location.suitePath);
      },
    });
    await expect(readFile(attacker.attackerReport)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a test-results replacement after the suite descriptor opens", async () => {
    const root = await temporaryRoot();
    const attacker = await attackerLocation(root);
    await expectRaceFailure(root, {
      afterSuiteOpen: async (location) => {
        await rename(location.testResultsPath, resolve(root, "moved-test-results"));
        await symlink(attacker.attackerRoot, location.testResultsPath);
      },
    });
    await expect(readFile(attacker.attackerReport)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a suite replacement after the suite descriptor opens", async () => {
    const root = await temporaryRoot();
    const attacker = await attackerLocation(root);
    await expectRaceFailure(root, {
      afterSuiteOpen: async (location) => {
        await rename(location.suitePath, resolve(root, "moved-suite"));
        await symlink(attacker.attackerSuite, location.suitePath);
      },
    });
    await expect(readFile(attacker.attackerReport)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a test-results replacement during final report validation", async () => {
    const root = await temporaryRoot();
    const attacker = await attackerLocation(root);
    await expectRaceFailure(root, {
      afterOutputWrite: async () => {
        await rename(resolve(root, "test-results"), resolve(root, "moved-test-results"));
        await symlink(attacker.attackerRoot, resolve(root, "test-results"));
      },
    });
    await expect(readFile(attacker.attackerReport)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a suite replacement during final report validation", async () => {
    const root = await temporaryRoot();
    const attacker = await attackerLocation(root);
    await expectRaceFailure(root, {
      afterOutputWrite: async () => {
        await rename(resolve(root, "test-results/fake"), resolve(root, "moved-suite"));
        await symlink(attacker.attackerSuite, resolve(root, "test-results/fake"));
      },
    });
    await expect(readFile(attacker.attackerReport)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("builds a direct Node Playwright CLI invocation", () => {
    const invocation = playwrightCliInvocation(["tests/e2e/example.spec.ts"]);
    expect(invocation.command).toBe(process.execPath);
    expect(invocation.args[0]).toContain("@playwright/test/cli");
    expect(invocation.args.slice(1)).toEqual([
      "test",
      "tests/e2e/example.spec.ts",
    ]);
  });
});
