import { createHash } from "node:crypto";
import { constants, type Stats } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

type JsonObject = Record<string, unknown>;
type ExpectedStatus = "pass" | "fail";
type PlaywrightCiTarget = "foundation" | "semesterDesk" | "production";

const RECEIPT_ROOT = "test-results/release-ops";
const PLAYWRIGHT_REPORT_ROOT = "test-results";
const MAX_PLAYWRIGHT_REPORT_BYTES = 8 * 1024 * 1024;
const MAX_RECEIPT_BYTES = 64 * 1024;
const MAX_OBSERVED_SPECS = 64;
const MAX_OBSERVED_PROJECTS = 16;
const MAX_PLAYWRIGHT_TESTS = 4096;
const MAX_OBSERVED_PATH_LENGTH = 256;
const MAX_OBSERVED_PROJECT_LENGTH = 64;

export type PlaywrightCiReceiptExpectation = Readonly<{
  outputFile: string;
  target: PlaywrightCiTarget;
  evidenceEnvironment: "development" | "production";
  artifactClass: "development_source" | "production_build_artifact";
  expectedSpecs: readonly string[];
  expectedProjects: readonly string[];
  expectedStatus: ExpectedStatus;
}>;

const PLAYWRIGHT_REPORT_FILES: Readonly<Record<PlaywrightCiTarget, string>> = Object.freeze({
  foundation: "test-results/university-foundation/playwright-report.json",
  semesterDesk: "test-results/university-semester-desk/playwright-report.json",
  production: "test-results/production-browser/playwright-report.json",
});

export const PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS = Object.freeze([
  {
    outputFile: "test-results/release-ops/forge-browser-foundation-receipt.json",
    target: "foundation",
    evidenceEnvironment: "development",
    artifactClass: "development_source",
    expectedSpecs: ["tests/e2e/university-foundation.spec.ts"],
    expectedProjects: ["desktop", "mobile"],
  },
  {
    outputFile: "test-results/release-ops/forge-browser-semester-desk-receipt.json",
    target: "semesterDesk",
    evidenceEnvironment: "development",
    artifactClass: "development_source",
    expectedSpecs: ["tests/e2e/university-semester-desk.spec.ts"],
    expectedProjects: ["desktop", "mobile"],
  },
  {
    outputFile: "test-results/release-ops/forge-browser-production-receipt.json",
    target: "production",
    evidenceEnvironment: "production",
    artifactClass: "production_build_artifact",
    expectedSpecs: [
      "tests/e2e/production.spec.ts",
      "tests/e2e/university-foundation-production.spec.ts",
      "tests/e2e/university-post-attempt-repair-production.spec.ts",
      "tests/e2e/university-recovery-production.spec.ts",
      "tests/e2e/university-research-readiness-production.spec.ts",
      "tests/e2e/university-semester-desk-production.spec.ts",
      "tests/e2e/university-semester-loop-production.spec.ts",
      "tests/e2e/university-semester-overview-production.spec.ts",
      "tests/e2e/university-source-to-study-production.spec.ts",
    ],
    expectedProjects: ["desktop", "mobile"],
  },
] as const);

const INPUT_STATUSES = new Set([
  "valid",
  "missing",
  "malformed",
  "oversized",
  "unsafe",
  "overflow",
  "root_error",
  "digest_mismatch",
  "writer_error",
]);
const COUNT_KEYS = [
  "total",
  "passed",
  "failed",
  "skipped",
  "did_not_run",
  "flaky",
  "timed_out",
  "interrupted",
] as const;
const RECEIPT_KEYS = [
  "schema_version",
  "receipt_kind",
  "target",
  "evidence_environment",
  "artifact_class",
  "tested_sha",
  "report_sha256",
  "expected",
  "observed",
  "input_status",
  "status",
  "counts",
] as const;

export type PlaywrightCiReceiptReadHooks = Readonly<{
  afterLstat?: (path: string) => Promise<void> | void;
}>;

function asObject(value: unknown, description: string): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${description} must be an object`);
  }
  return value as JsonObject;
}

function exactKeys(value: JsonObject, keys: readonly string[], description: string): void {
  const actual = Object.keys(value).sort().join("\u0000");
  const expected = [...keys].sort().join("\u0000");
  if (actual !== expected) throw new Error(`${description} has unexpected fields`);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function readExactly(handle: FileHandle, size: number): Promise<Buffer> {
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const result = await handle.read(bytes, offset, size - offset, offset);
    if (result.bytesRead === 0) throw new Error("receipt ended before its declared size");
    offset += result.bytesRead;
  }
  return bytes;
}

function sameIdentity(left: Pick<Stats, "dev" | "ino">, right: Pick<Stats, "dev" | "ino">): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

async function trustedReceiptRoot(rootDirectory: string): Promise<{ path: string; stat: Stats }> {
  const path = resolve(rootDirectory, RECEIPT_ROOT);
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(path) !== path) {
    throw new Error("receipt root is not trusted");
  }
  return { path, stat };
}

export async function readTrustedCiReceiptBytes(
  rootDirectory: string,
  outputFile: string,
  hooks: PlaywrightCiReceiptReadHooks = {},
): Promise<{ bytes: Buffer; digest: string }> {
  if (typeof constants.O_NOFOLLOW !== "number") throw new Error("receipt no-symlink support is unavailable");
  const trustedRoot = await trustedReceiptRoot(rootDirectory);
  const path = resolve(rootDirectory, outputFile);
  if (dirname(path) !== trustedRoot.path) {
    throw new Error("receipt path is outside the fixed root");
  }
  const pathStat = await lstat(path);
  if (
    !pathStat.isFile()
    || pathStat.isSymbolicLink()
    || pathStat.nlink !== 1
    || pathStat.size > MAX_RECEIPT_BYTES
  ) {
    throw new Error("receipt file is not bounded and regular");
  }
  await hooks.afterLstat?.(path);
  let handle: FileHandle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error: unknown) {
    if (isNodeError(error) && (error.code === "ELOOP" || error.code === "ENOTDIR")) {
      throw new Error("receipt file is unsafe");
    }
    throw error;
  }
  try {
    const openedStat = await handle.stat();
    if (
      !openedStat.isFile()
      || openedStat.nlink !== 1
      || !sameIdentity(pathStat, openedStat)
      || openedStat.size !== pathStat.size
      || openedStat.size > MAX_RECEIPT_BYTES
    ) {
      throw new Error("receipt file changed before read");
    }
    const bytes = await readExactly(handle, openedStat.size);
    const finalDescriptorStat = await handle.stat();
    if (
      !finalDescriptorStat.isFile()
      || finalDescriptorStat.nlink !== 1
      || !sameIdentity(openedStat, finalDescriptorStat)
      || finalDescriptorStat.size !== openedStat.size
    ) {
      throw new Error("receipt file changed after read");
    }
    const finalRootStat = await lstat(trustedRoot.path);
    if (
      !finalRootStat.isDirectory()
      || finalRootStat.isSymbolicLink()
      || !sameIdentity(trustedRoot.stat, finalRootStat)
    ) {
      throw new Error("receipt root changed after read");
    }
    const finalPathStat = await lstat(path);
    if (
      !finalPathStat.isFile()
      || finalPathStat.isSymbolicLink()
      || finalPathStat.nlink !== 1
      || !sameIdentity(finalDescriptorStat, finalPathStat)
      || finalPathStat.size !== finalDescriptorStat.size
    ) {
      throw new Error("receipt path changed after read");
    }
    return { bytes, digest: createHash("sha256").update(bytes).digest("hex") };
  } finally {
    await handle.close();
  }
}

async function assertTrustedDirectory(
  path: string,
  expected: Stats | undefined,
  description: string,
): Promise<Stats> {
  const stat = await lstat(path);
  if (
    !stat.isDirectory()
    || stat.isSymbolicLink()
    || await realpath(path) !== path
    || (expected !== undefined && !sameIdentity(stat, expected))
  ) {
    throw new Error(`${description} changed or is not trusted`);
  }
  return stat;
}

async function trustedPlaywrightReportPath(
  rootDirectory: string,
  target: PlaywrightCiTarget,
): Promise<{
  testResultsPath: string;
  testResultsStat: Stats;
  suitePath: string;
  suiteStat: Stats;
  reportPath: string;
  reportStat: Stats;
}> {
  if (typeof constants.O_NOFOLLOW !== "number") throw new Error("report no-symlink support is unavailable");
  const root = resolve(rootDirectory);
  const testResultsPath = resolve(root, PLAYWRIGHT_REPORT_ROOT);
  const testResultsStat = await assertTrustedDirectory(
    testResultsPath,
    undefined,
    "Playwright test-results directory",
  );
  const reportFile = PLAYWRIGHT_REPORT_FILES[target];
  if (!reportFile) throw new Error("Playwright report target is not accepted");
  const reportPath = resolve(root, reportFile);
  const suitePath = dirname(reportPath);
  if (dirname(suitePath) !== testResultsPath) {
    throw new Error("Playwright report path is outside the fixed suite directory");
  }
  const suiteStat = await assertTrustedDirectory(
    suitePath,
    undefined,
    "Playwright report suite directory",
  );
  const reportStat = await lstat(reportPath);
  if (
    !reportStat.isFile()
    || reportStat.isSymbolicLink()
    || reportStat.nlink !== 1
    || reportStat.size > MAX_PLAYWRIGHT_REPORT_BYTES
  ) {
    throw new Error("Playwright report is not bounded and regular");
  }
  return {
    testResultsPath,
    testResultsStat,
    suitePath,
    suiteStat,
    reportPath,
    reportStat,
  };
}

export async function readTrustedPlaywrightReportDigest(
  rootDirectory: string,
  target: PlaywrightCiTarget,
): Promise<string> {
  const trusted = await trustedPlaywrightReportPath(rootDirectory, target);
  let handle: FileHandle;
  try {
    handle = await open(trusted.reportPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error: unknown) {
    if (isNodeError(error) && (error.code === "ELOOP" || error.code === "ENOTDIR")) {
      throw new Error("Playwright report is unsafe");
    }
    throw error;
  }

  const revalidate = async (): Promise<void> => {
    const descriptorStat = await handle.stat();
    if (
      !descriptorStat.isFile()
      || descriptorStat.nlink !== 1
      || !sameIdentity(trusted.reportStat, descriptorStat)
      || descriptorStat.size !== trusted.reportStat.size
      || descriptorStat.size > MAX_PLAYWRIGHT_REPORT_BYTES
    ) {
      throw new Error("Playwright report descriptor changed");
    }
    await assertTrustedDirectory(
      trusted.testResultsPath,
      trusted.testResultsStat,
      "Playwright test-results directory",
    );
    await assertTrustedDirectory(
      trusted.suitePath,
      trusted.suiteStat,
      "Playwright report suite directory",
    );
    const pathStat = await lstat(trusted.reportPath);
    if (
      !pathStat.isFile()
      || pathStat.isSymbolicLink()
      || pathStat.nlink !== 1
      || !sameIdentity(descriptorStat, pathStat)
      || pathStat.size !== descriptorStat.size
    ) {
      throw new Error("Playwright report path changed");
    }
  };

  try {
    const openedStat = await handle.stat();
    if (
      !openedStat.isFile()
      || openedStat.nlink !== 1
      || !sameIdentity(trusted.reportStat, openedStat)
      || openedStat.size !== trusted.reportStat.size
      || openedStat.size > MAX_PLAYWRIGHT_REPORT_BYTES
    ) {
      throw new Error("Playwright report changed before read");
    }
    const bytes = await readExactly(handle, openedStat.size);
    const finalDescriptorStat = await handle.stat();
    if (
      !finalDescriptorStat.isFile()
      || finalDescriptorStat.nlink !== 1
      || !sameIdentity(openedStat, finalDescriptorStat)
      || finalDescriptorStat.size !== openedStat.size
    ) {
      throw new Error("Playwright report changed after read");
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("Playwright report JSON is not valid UTF-8");
    }
    if (!Buffer.from(text, "utf8").equals(bytes)) throw new Error("Playwright report JSON encoding changed");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throw new Error("Playwright report JSON is malformed");
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Playwright report JSON must be an object");
    }
    await revalidate();
    return createHash("sha256").update(bytes).digest("hex");
  } finally {
    await handle.close();
  }
}

export function assertTrustedReceiptDigest(
  bytes: Buffer,
  expectedDigest: string,
  description = "receipt",
): string {
  if (!/^[0-9a-f]{64}$/i.test(expectedDigest)) {
    throw new Error(`${description} digest is invalid`);
  }
  const actualDigest = createHash("sha256").update(bytes).digest("hex");
  if (actualDigest !== expectedDigest.toLowerCase()) {
    throw new Error(`${description} digest does not match the trusted output`);
  }
  return actualDigest;
}

function parseTrustedReceiptBytes(bytes: Buffer): unknown {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("receipt JSON is not valid UTF-8");
  }
  if (!Buffer.from(text, "utf8").equals(bytes)) throw new Error("receipt JSON encoding changed");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("receipt JSON is malformed");
  }
}

export async function readTrustedCiReceipt(
  rootDirectory: string,
  outputFile: string,
  hooks: PlaywrightCiReceiptReadHooks = {},
): Promise<unknown> {
  const { bytes } = await readTrustedCiReceiptBytes(rootDirectory, outputFile, hooks);
  return parseTrustedReceiptBytes(bytes);
}

function stringArray(
  value: unknown,
  description: string,
  maximum: number,
  validate: (value: string) => boolean,
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`${description} must be a string array`);
  }
  if (value.length > maximum) throw new Error(`${description} exceeds its bound`);
  const values = value as string[];
  if (new Set(values).size !== values.length) throw new Error(`${description} has duplicates`);
  if (values.some((valueToValidate) => !validate(valueToValidate))) {
    throw new Error(`${description} contains an unsafe value`);
  }
  return values;
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && right.every((value) => left.includes(value));
}

function isSubset(subset: readonly string[], superset: readonly string[]): boolean {
  return subset.every((value) => superset.includes(value));
}

function safeSpec(value: string): boolean {
  return value.length <= MAX_OBSERVED_PATH_LENGTH
    && !value.startsWith("/") && !value.includes("\\") && !value.includes("..")
    && /^[A-Za-z0-9._/-]+$/.test(value);
}

function safeProject(value: string): boolean {
  return value.length <= MAX_OBSERVED_PROJECT_LENGTH && /^[A-Za-z0-9._-]+$/.test(value);
}

function validateCounts(value: unknown): JsonObject & Record<typeof COUNT_KEYS[number], number> {
  const counts = asObject(value, "counts");
  exactKeys(counts, COUNT_KEYS, "counts");
  for (const key of COUNT_KEYS) {
    const count = counts[key];
    if (
      typeof count !== "number"
      || !Number.isSafeInteger(count)
      || count < 0
      || count > MAX_PLAYWRIGHT_TESTS
    ) {
      throw new Error(`counts.${key} is invalid`);
    }
  }
  const typed = counts as JsonObject & Record<typeof COUNT_KEYS[number], number>;
  if (
    typed.total !== typed.passed + typed.failed + typed.skipped + typed.did_not_run + typed.flaky
    || typed.passed > typed.total
    || typed.failed > typed.total
    || typed.skipped > typed.total
    || typed.flaky > typed.total
    || typed.timed_out > typed.total
    || typed.interrupted > typed.total
  ) {
    throw new Error("counts arithmetic is invalid");
  }
  return typed;
}

export function validatePlaywrightEvidenceReceiptForCi(
  value: unknown,
  expectation: PlaywrightCiReceiptExpectation,
  testedSha: string,
  expectedReportSha256?: string,
): void {
  if (!/^[0-9a-f]{40}$/i.test(testedSha)) throw new Error("tested SHA is invalid");
  const receipt = asObject(value, "receipt");
  exactKeys(receipt, RECEIPT_KEYS, "receipt");
  if (
    receipt.schema_version !== "2.2"
    || receipt.receipt_kind !== "forge_ci_browser_evidence"
    || receipt.target !== expectation.target
    || receipt.evidence_environment !== expectation.evidenceEnvironment
    || receipt.artifact_class !== expectation.artifactClass
    || receipt.tested_sha !== testedSha.toLowerCase()
    || (receipt.report_sha256 !== null
      && (typeof receipt.report_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(receipt.report_sha256)))
    || receipt.status !== expectation.expectedStatus
    || typeof receipt.input_status !== "string"
    || !INPUT_STATUSES.has(receipt.input_status)
  ) {
    throw new Error("receipt identity or status is invalid");
  }

  const expected = asObject(receipt.expected, "expected");
  exactKeys(expected, ["specs", "projects"], "expected");
  const expectedSpecs = stringArray(expected.specs, "expected.specs", MAX_OBSERVED_SPECS, safeSpec);
  const expectedProjects = stringArray(expected.projects, "expected.projects", MAX_OBSERVED_PROJECTS, safeProject);
  if (
    !sameSet(expectedSpecs, expectation.expectedSpecs)
    || !sameSet(expectedProjects, expectation.expectedProjects)
  ) {
    throw new Error("expected coverage is invalid");
  }

  const observed = asObject(receipt.observed, "observed");
  exactKeys(observed, ["specs", "projects", "passed_specs", "passed_projects"], "observed");
  const observedSpecs = stringArray(observed.specs, "observed.specs", MAX_OBSERVED_SPECS, safeSpec);
  const observedProjects = stringArray(observed.projects, "observed.projects", MAX_OBSERVED_PROJECTS, safeProject);
  const passedSpecs = stringArray(observed.passed_specs, "observed.passed_specs", MAX_OBSERVED_SPECS, safeSpec);
  const passedProjects = stringArray(observed.passed_projects, "observed.passed_projects", MAX_OBSERVED_PROJECTS, safeProject);
  if (
    !isSubset(passedSpecs, observedSpecs)
    || !isSubset(passedProjects, observedProjects)
  ) {
    throw new Error("observed coverage is invalid");
  }

  const counts = validateCounts(receipt.counts);
  if (expectedReportSha256 !== undefined && !/^[0-9a-f]{64}$/i.test(expectedReportSha256)) {
    throw new Error("producer report digest is invalid");
  }
  if (expectation.expectedStatus === "pass") {
    if (!expectedReportSha256 || receipt.report_sha256 !== expectedReportSha256.toLowerCase()) {
      throw new Error("receipt report digest does not match the producer output");
    }
  } else if (
    expectedReportSha256 === undefined
      ? receipt.report_sha256 !== null
      : receipt.report_sha256 !== expectedReportSha256.toLowerCase()
  ) {
    throw new Error("receipt report digest does not match the producer output");
  }
  if (expectation.expectedStatus === "pass") {
    if (
      receipt.input_status !== "valid"
      || !sameSet(observedSpecs, expectation.expectedSpecs)
      || !sameSet(observedProjects, expectation.expectedProjects)
      || !sameSet(passedSpecs, expectation.expectedSpecs)
      || !sameSet(passedProjects, expectation.expectedProjects)
      || counts.passed <= 0
      || counts.failed !== 0
      || counts.flaky !== 0
      || counts.did_not_run !== 0
      || counts.timed_out !== 0
      || counts.interrupted !== 0
    ) {
      throw new Error("receipt does not satisfy the pass policy");
    }
  }
}

export async function validatePlaywrightEvidenceReceiptAtRoot(
  value: unknown,
  expectation: PlaywrightCiReceiptExpectation,
  testedSha: string,
  rootDirectory: string,
  expectedReportSha256?: string,
): Promise<void> {
  validatePlaywrightEvidenceReceiptForCi(value, expectation, testedSha, expectedReportSha256);
  if (expectedReportSha256 === undefined) return;
  const reportDigest = await readTrustedPlaywrightReportDigest(rootDirectory, expectation.target);
  if (reportDigest !== expectedReportSha256.toLowerCase()) {
    throw new Error("current Playwright report does not match the producer output");
  }
  const receipt = asObject(value, "receipt");
  if (receipt.report_sha256 !== reportDigest) {
    throw new Error("current Playwright report does not match the receipt");
  }
}

function argumentValue(name: string): string {
  const index = process.argv.indexOf(name);
  const value = process.argv[index + 1];
  if (index < 0 || !value || value.startsWith("--") || process.argv.indexOf(name, index + 1) >= 0) {
    throw new Error(`${name} is required once`);
  }
  return value;
}

function optionalArgumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  if (process.argv.indexOf(name, index + 1) >= 0) throw new Error(`${name} must be provided once`);
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function targetArgument(target: string, kind: "report" | "receipt"): string {
  return `--${target === "semesterDesk" ? "semester-desk" : target}-${kind}-sha256`;
}

async function main(): Promise<void> {
  const testedSha = argumentValue("--tested-sha");
  const statuses: Record<string, ExpectedStatus> = {
    foundation: argumentValue("--foundation-status") as ExpectedStatus,
    semesterDesk: argumentValue("--semester-desk-status") as ExpectedStatus,
    production: argumentValue("--production-status") as ExpectedStatus,
  };
  if (Object.values(statuses).some((status) => status !== "pass" && status !== "fail")) {
    throw new Error("receipt status must be pass or fail");
  }
  for (const baseExpectation of PLAYWRIGHT_CI_RECEIPT_EXPECTATIONS) {
    const expectation = { ...baseExpectation, expectedStatus: statuses[baseExpectation.target] };
    const expectedReportSha256 = optionalArgumentValue(targetArgument(baseExpectation.target, "report"));
    const expectedReceiptSha256 = optionalArgumentValue(targetArgument(baseExpectation.target, "receipt"));
    const { bytes } = await readTrustedCiReceiptBytes(process.cwd(), baseExpectation.outputFile);
    if (!expectedReceiptSha256) {
      throw new Error(`${baseExpectation.target} receipt digest does not match the writer output`);
    }
    assertTrustedReceiptDigest(bytes, expectedReceiptSha256, `${baseExpectation.target} receipt`);
    const report = parseTrustedReceiptBytes(bytes);
    await validatePlaywrightEvidenceReceiptAtRoot(
      report,
      expectation,
      testedSha,
      process.cwd(),
      expectedReportSha256,
    );
  }
}

const entryUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === entryUrl) {
  void main().catch((error: unknown) => {
    console.error(`browser evidence receipt enforcement failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  });
}
