import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants, type Stats } from "node:fs";
import {
  lstat,
  appendFile,
  mkdir,
  open,
  realpath,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SHA = /^[0-9a-f]{40}$/i;
const SAFE_REPOSITORY_PATH = /^[A-Za-z0-9._/-]+$/;
const SAFE_PROJECT_NAME = /^[A-Za-z0-9._-]+$/;
const PLAYWRIGHT_TEST_DIR_PREFIX = "tests/e2e/";
const SAFE_REPORTER_PATH_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SAFE_REPORTER_SPEC_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.spec\.ts$/;
export const MAX_PLAYWRIGHT_REPORT_BYTES = 8 * 1024 * 1024;
export const MAX_OBSERVED_SPECS = 64;
export const MAX_OBSERVED_PROJECTS = 16;
export const MAX_PLAYWRIGHT_TESTS = 4096;
const MAX_OBSERVED_PATH_LENGTH = 256;
const MAX_OBSERVED_PROJECT_LENGTH = 64;
const MAX_RECEIPT_BYTES = 64 * 1024;
const MAX_HELPER_OUTPUT_BYTES = 16 * 1024;
const MAX_HELPER_DURATION_MS = 10_000;
const MAX_CLEANUP_OUTPUT_BYTES = 4 * 1024;
const MAX_CLEANUP_DURATION_MS = 1_000;
const MAX_TEMP_CLEANUP_ENTRIES = 512;
const MAX_HELPER_SOURCE_BYTES = 128 * 1024;
const RECEIPT_ROOT = "test-results/release-ops";
const RECEIPT_TEMP_PREFIX = ".forge-browser-receipt.tmp-";
const RECEIPT_HELPER = fileURLToPath(new URL("./write-exclusive-receipt.py", import.meta.url));
export const PLAYWRIGHT_RECEIPT_HELPER_SOURCE_SHA256 = "5d38e4ed34dd87888eb3055d81ca8a4dbc21d8d316b81fc9b38804b1e0c5b36c" as const;
const RECEIPT_PYTHON = "/usr/bin/python3";
const RECEIPT_HELPER_ENV: NodeJS.ProcessEnv = {
  PATH: "/usr/bin:/bin",
  LANG: "C",
  LC_ALL: "C",
  NODE_ENV: "production",
  PYTHONNOUSERSITE: "1",
};

export const PLAYWRIGHT_EVIDENCE_RECEIPT_SCHEMA_VERSION = "2.2" as const;
export const PLAYWRIGHT_EVIDENCE_RECEIPT_KIND = "forge_ci_browser_evidence" as const;

const DEVELOPMENT_PROJECTS = Object.freeze(["desktop", "mobile"] as const);
const PRODUCTION_SPECS = Object.freeze([
  "tests/e2e/production.spec.ts",
  "tests/e2e/university-research-readiness-production.spec.ts",
  "tests/e2e/university-semester-loop-production.spec.ts",
  "tests/e2e/university-semester-desk-production.spec.ts",
  "tests/e2e/university-semester-overview-production.spec.ts",
  "tests/e2e/university-recovery-production.spec.ts",
  "tests/e2e/university-post-attempt-repair-production.spec.ts",
  "tests/e2e/university-foundation-production.spec.ts",
  "tests/e2e/university-source-to-study-production.spec.ts",
] as const);

export const PLAYWRIGHT_EVIDENCE_TARGETS = Object.freeze({
  foundation: Object.freeze({
    report_directory: "university-foundation",
    output_file: "test-results/release-ops/forge-browser-foundation-receipt.json",
    writer_error_output_file: "test-results/release-ops/forge-browser-foundation-writer-error-receipt.json",
    evidence_environment: "development",
    artifact_class: "development_source",
    expected_specs: Object.freeze(["tests/e2e/university-foundation.spec.ts"]),
    expected_projects: DEVELOPMENT_PROJECTS,
  }),
  semesterDesk: Object.freeze({
    report_directory: "university-semester-desk",
    output_file: "test-results/release-ops/forge-browser-semester-desk-receipt.json",
    writer_error_output_file: "test-results/release-ops/forge-browser-semester-desk-writer-error-receipt.json",
    evidence_environment: "development",
    artifact_class: "development_source",
    expected_specs: Object.freeze(["tests/e2e/university-semester-desk.spec.ts"]),
    expected_projects: DEVELOPMENT_PROJECTS,
  }),
  production: Object.freeze({
    report_directory: "production-browser",
    output_file: "test-results/release-ops/forge-browser-production-receipt.json",
    writer_error_output_file: "test-results/release-ops/forge-browser-production-writer-error-receipt.json",
    evidence_environment: "production",
    artifact_class: "production_build_artifact",
    expected_specs: PRODUCTION_SPECS,
    expected_projects: DEVELOPMENT_PROJECTS,
  }),
} as const);

export type PlaywrightEvidenceTarget = keyof typeof PLAYWRIGHT_EVIDENCE_TARGETS;
export type PlaywrightEvidenceStatus = "pass" | "fail";
export type PlaywrightEvidenceInputStatus =
  | "valid"
  | "missing"
  | "malformed"
  | "oversized"
  | "unsafe"
  | "overflow"
  | "root_error"
  | "digest_mismatch"
  | "writer_error";

export type PlaywrightEvidenceCounts = Readonly<{
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  did_not_run: number;
  flaky: number;
  timed_out: number;
  interrupted: number;
}>;

export type PlaywrightEvidenceCoverage = Readonly<{
  specs: string[];
  projects: string[];
  passed_specs: string[];
  passed_projects: string[];
}>;

export type PlaywrightEvidenceReceipt = Readonly<{
  schema_version: typeof PLAYWRIGHT_EVIDENCE_RECEIPT_SCHEMA_VERSION;
  receipt_kind: typeof PLAYWRIGHT_EVIDENCE_RECEIPT_KIND;
  target: PlaywrightEvidenceTarget;
  evidence_environment: "development" | "production";
  artifact_class: "development_source" | "production_build_artifact";
  tested_sha: string;
  report_sha256: string | null;
  expected: Readonly<{ specs: string[]; projects: string[] }>;
  observed: PlaywrightEvidenceCoverage;
  input_status: PlaywrightEvidenceInputStatus;
  status: PlaywrightEvidenceStatus;
  counts: PlaywrightEvidenceCounts;
}>;

export type PlaywrightJsonReportSummary = Readonly<{
  observed: PlaywrightEvidenceCoverage;
  counts: PlaywrightEvidenceCounts;
}>;

export type PlaywrightEvidenceTestHooks = Readonly<{
  afterReportLstat?: (path: string) => Promise<void> | void;
  afterReportRead?: (path: string) => Promise<void> | void;
  afterHelperLstat?: (path: string) => Promise<void> | void;
  beforeOutputDirectoryOpen?: (path: string) => Promise<void> | void;
  afterOutputDirectoryOpen?: (path: string) => Promise<void> | void;
  afterOutputWrite?: (path: string) => Promise<void> | void;
  helperPath?: string;
  helperSourceDigest?: string;
  helperTimeoutMs?: number;
}>;

type JsonObject = Record<string, unknown>;
type TestOutcome = "passed" | "failed" | "skipped" | "did_not_run" | "flaky";
type TargetDefinition = (typeof PLAYWRIGHT_EVIDENCE_TARGETS)[PlaywrightEvidenceTarget];

class ReceiptInputError extends Error {
  constructor(
    readonly inputStatus: Exclude<PlaywrightEvidenceInputStatus, "valid">,
    description = "input",
  ) {
    super(`Playwright JSON report ${description} was not accepted.`);
  }
}

class ReceiptOutputError extends Error {}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function isStrictChild(parent: string, child: string): boolean {
  const childPath = relative(parent, child);
  return childPath.length > 0
    && childPath !== ".."
    && !childPath.startsWith(`..${sep}`)
    && !isAbsolute(childPath);
}

async function lstatIfPresent(path: string): Promise<Stats | null> {
  try {
    return await lstat(path);
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

async function trustedRepositoryRoot(rootDirectory: string): Promise<string> {
  const lexicalRoot = resolve(rootDirectory);
  const rootStat = await lstatIfPresent(lexicalRoot);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) {
    throw new ReceiptOutputError("receipt root must be a real directory");
  }
  return realpath(lexicalRoot);
}

/** Walk each component and reject symlinks before creating the receipt path. */
async function ensureTrustedDirectory(
  root: string,
  target: string,
  createMissing = true,
): Promise<string> {
  if (target !== root && !isStrictChild(root, target)) {
    throw new ReceiptOutputError("receipt directory escaped the trusted root");
  }
  const path = relative(root, target);
  let current = root;
  for (const component of path ? path.split(sep) : []) {
    current = resolve(current, component);
    let currentStat = await lstatIfPresent(current);
    if (!currentStat) {
      if (!createMissing) {
        throw new ReceiptOutputError("receipt directory was replaced or removed");
      }
      await mkdir(current);
      currentStat = await lstat(current);
    }
    if (!currentStat.isDirectory() || currentStat.isSymbolicLink()) {
      throw new ReceiptOutputError("receipt directory contains a symlink or non-directory");
    }
    const physical = await realpath(current);
    if (physical !== root && !isStrictChild(root, physical)) {
      throw new ReceiptOutputError("receipt directory resolved outside the trusted root");
    }
    current = physical;
  }
  return current;
}

async function revalidateReceiptParent(
  root: string,
  output: string,
  expected?: Pick<Stats, "dev" | "ino">,
): Promise<Stats> {
  const parent = dirname(output);
  const trustedParent = await ensureTrustedDirectory(root, parent, false);
  const parentStat = await lstatIfPresent(parent);
  if (
    trustedParent !== parent
    || !parentStat
    || !parentStat.isDirectory()
    || parentStat.isSymbolicLink()
    || (expected !== undefined
      && (parentStat.dev !== expected.dev || parentStat.ino !== expected.ino))
  ) {
    throw new ReceiptOutputError("receipt output parent is not trusted");
  }
  return parentStat;
}

async function prepareReceiptOutput(
  rootDirectory: string,
  target: PlaywrightEvidenceTarget,
  writerError = false,
): Promise<{ root: string; output: string; parentStat: Pick<Stats, "dev" | "ino"> }> {
  const root = await trustedRepositoryRoot(rootDirectory);
  const targetDefinition = PLAYWRIGHT_EVIDENCE_TARGETS[target];
  const outputFile = writerError
    ? targetDefinition.writer_error_output_file
    : targetDefinition.output_file;
  const output = resolve(root, outputFile);
  const releaseOps = resolve(root, RECEIPT_ROOT);
  if (!isStrictChild(root, releaseOps) || dirname(output) !== releaseOps) {
    throw new ReceiptOutputError("receipt output is outside test-results/release-ops");
  }
  await ensureTrustedDirectory(root, releaseOps);
  const parentStat = await revalidateReceiptParent(root, output);
  const outputStat = await lstatIfPresent(output);
  if (outputStat?.isSymbolicLink()) {
    throw new ReceiptOutputError("receipt output must not be a symlink");
  }
  if (outputStat) {
    throw new ReceiptOutputError("receipt output already exists");
  }
  return { root, output, parentStat };
}

function asObject(value: unknown, description: string): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ReceiptInputError("malformed", description);
  }
  return value as JsonObject;
}

function asArray(value: unknown, description: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new ReceiptInputError("malformed", description);
  }
  return value;
}

function requiredString(object: JsonObject, key: string, description: string): string {
  const value = object[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ReceiptInputError("malformed", `${description}.${key}`);
  }
  return value;
}

function safeRepositoryPath(value: string): string {
  if (
    value.startsWith("/")
    || value.includes("\\")
    || value.includes("..")
    || !SAFE_REPOSITORY_PATH.test(value)
  ) {
    throw new ReceiptInputError("unsafe");
  }
  if (value.length > MAX_OBSERVED_PATH_LENGTH) {
    throw new ReceiptInputError("overflow");
  }
  return value;
}

function normalizeReporterSpecPath(value: string): string {
  if (
    value.startsWith("/")
    || value.startsWith(PLAYWRIGHT_TEST_DIR_PREFIX)
    || value.includes("\\")
    || value.includes("..")
  ) {
    throw new ReceiptInputError("unsafe");
  }
  const parts = value.split("/");
  const file = parts.at(-1);
  if (
    parts.length === 0
    || parts.some((part) => !SAFE_REPORTER_PATH_SEGMENT.test(part))
    || file === undefined
    || !SAFE_REPORTER_SPEC_FILE.test(file)
  ) {
    throw new ReceiptInputError("unsafe");
  }
  const normalized = `${PLAYWRIGHT_TEST_DIR_PREFIX}${value}`;
  if (normalized.length > MAX_OBSERVED_PATH_LENGTH) {
    throw new ReceiptInputError("overflow");
  }
  return normalized;
}

function safeProjectName(value: string): string {
  if (!SAFE_PROJECT_NAME.test(value)) throw new ReceiptInputError("unsafe");
  if (value.length > MAX_OBSERVED_PROJECT_LENGTH) {
    throw new ReceiptInputError("overflow");
  }
  return value;
}

function addBounded<T>(values: Set<T>, value: T, maximum: number): void {
  if (!values.has(value) && values.size >= maximum) {
    throw new ReceiptInputError("overflow");
  }
  values.add(value);
}

function emptyCounts(): PlaywrightEvidenceCounts {
  return {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    did_not_run: 0,
    flaky: 0,
    timed_out: 0,
    interrupted: 0,
  };
}

function emptyCoverage(): PlaywrightEvidenceCoverage {
  return {
    specs: [],
    projects: [],
    passed_specs: [],
    passed_projects: [],
  };
}

function sorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function addCounts(
  left: PlaywrightEvidenceCounts,
  right: PlaywrightEvidenceCounts,
): PlaywrightEvidenceCounts {
  return {
    total: left.total + right.total,
    passed: left.passed + right.passed,
    failed: left.failed + right.failed,
    skipped: left.skipped + right.skipped,
    did_not_run: left.did_not_run + right.did_not_run,
    flaky: left.flaky + right.flaky,
    timed_out: left.timed_out + right.timed_out,
    interrupted: left.interrupted + right.interrupted,
  };
}

const TEST_STATUSES = new Set(["expected", "unexpected", "flaky", "skipped"]);
const EXPECTED_STATUSES = new Set(["passed", "skipped"]);
const RESULT_STATUSES = new Set([
  "passed",
  "failed",
  "timedOut",
  "skipped",
  "interrupted",
]);

function classifyTest(
  test: JsonObject,
  description: string,
): { outcome: TestOutcome; timedOut: boolean; interrupted: boolean } {
  const status = requiredString(test, "status", description);
  if (!TEST_STATUSES.has(status)) throw new ReceiptInputError("malformed");
  const expectedStatus = requiredString(test, "expectedStatus", description);
  if (!EXPECTED_STATUSES.has(expectedStatus)) throw new ReceiptInputError("malformed");
  const results = asArray(test.results, `${description}.results`);
  const resultStatuses = results.map((value, index) => {
    const result = asObject(value, `${description}.results[${index}]`);
    const resultStatus = requiredString(
      result,
      "status",
      `${description}.results[${index}]`,
    );
    if (!RESULT_STATUSES.has(resultStatus)) {
      throw new ReceiptInputError("malformed");
    }
    return resultStatus;
  });
  if (expectedStatus === "passed" && status === "skipped") {
    if (resultStatuses.some((resultStatus) => resultStatus !== "skipped")) {
      throw new ReceiptInputError("malformed");
    }
    return { outcome: "did_not_run", timedOut: false, interrupted: false };
  }
  if (expectedStatus === "passed" && results.length === 0) {
    throw new ReceiptInputError("malformed");
  }
  if (expectedStatus === "skipped") {
    if (status !== "skipped" || resultStatuses.some((resultStatus) => resultStatus !== "skipped")) {
      throw new ReceiptInputError("malformed");
    }
    return { outcome: "skipped", timedOut: false, interrupted: false };
  }
  const finalStatus = resultStatuses.at(-1);
  if (expectedStatus === "passed" && status === "expected" && finalStatus !== "passed") {
    throw new ReceiptInputError("malformed");
  }
  if (
    expectedStatus === "passed"
    && status === "expected"
    && resultStatuses.slice(0, -1).some((resultStatus) => (
      resultStatus === "failed"
      || resultStatus === "timedOut"
      || resultStatus === "interrupted"
      || resultStatus === "skipped"
    ))
  ) {
    throw new ReceiptInputError("malformed");
  }
  if (expectedStatus === "passed" && status === "unexpected" && finalStatus === "passed") {
    throw new ReceiptInputError("malformed");
  }
  return {
    outcome: status === "expected"
      ? "passed"
      : status === "skipped"
        ? "skipped"
        : status === "flaky"
          ? "flaky"
          : "failed",
    timedOut: resultStatuses.includes("timedOut"),
    interrupted: resultStatuses.includes("interrupted"),
  };
}

export function parsePlaywrightJsonReport(value: unknown): PlaywrightJsonReportSummary {
  const root = asObject(value, "root");
  const rootErrors = asArray(root.errors, "root.errors");
  if (rootErrors.length > 0) throw new ReceiptInputError("root_error");
  const suites = asArray(root.suites, "root.suites");
  const specs = new Set<string>();
  const projects = new Set<string>();
  const passedSpecs = new Set<string>();
  const passedProjects = new Set<string>();
  let counts = emptyCounts();
  let testCount = 0;

  function visitSuite(valueToVisit: unknown, parentFile?: string): void {
    const suite = asObject(valueToVisit, "suite");
    const suiteFile = suite.file === undefined
      ? parentFile
      : normalizeReporterSpecPath(requiredString(suite, "file", "suite"));
    const suiteSpecs = asArray(suite.specs, "suite.specs");
    suiteSpecs.forEach((valueToVisit, index) => {
      const spec = asObject(valueToVisit, `suite.specs[${index}]`);
      const specFile = spec.file === undefined
        ? suiteFile
        : normalizeReporterSpecPath(requiredString(spec, "file", `suite.specs[${index}]`));
      if (!specFile) throw new ReceiptInputError("malformed");
      addBounded(specs, specFile, MAX_OBSERVED_SPECS);
      const tests = asArray(spec.tests, `suite.specs[${index}].tests`);
      tests.forEach((testValue, testIndex) => {
        if (testCount >= MAX_PLAYWRIGHT_TESTS) {
          throw new ReceiptInputError("overflow");
        }
        testCount += 1;
        const test = asObject(
          testValue,
          `suite.specs[${index}].tests[${testIndex}]`,
        );
        const project = safeProjectName(requiredString(
          test,
          "projectName",
          `suite.specs[${index}].tests[${testIndex}]`,
        ));
        addBounded(projects, project, MAX_OBSERVED_PROJECTS);
        const classified = classifyTest(
          test,
          `suite.specs[${index}].tests[${testIndex}]`,
        );
        const next: PlaywrightEvidenceCounts = {
          total: 1,
          passed: classified.outcome === "passed" ? 1 : 0,
          failed: classified.outcome === "failed" ? 1 : 0,
          skipped: classified.outcome === "skipped" ? 1 : 0,
          did_not_run: classified.outcome === "did_not_run" ? 1 : 0,
          flaky: classified.outcome === "flaky" ? 1 : 0,
          timed_out: classified.timedOut ? 1 : 0,
          interrupted: classified.interrupted ? 1 : 0,
        };
        counts = addCounts(counts, next);
        if (classified.outcome === "passed") {
          addBounded(passedSpecs, specFile, MAX_OBSERVED_SPECS);
          addBounded(passedProjects, project, MAX_OBSERVED_PROJECTS);
        }
      });
    });
    const nestedSuites = suite.suites === undefined
      ? []
      : asArray(suite.suites, "suite.suites");
    nestedSuites.forEach((nestedSuite) => visitSuite(nestedSuite, suiteFile));
  }

  suites.forEach((suite) => visitSuite(suite));
  return {
    observed: {
      specs: sorted(specs),
      projects: sorted(projects),
      passed_specs: sorted(passedSpecs),
      passed_projects: sorted(passedProjects),
    },
    counts,
  };
}

function normalizeSha(value: string): string {
  if (!SHA.test(value)) {
    throw new Error("Playwright browser evidence requires a full 40-character Git SHA.");
  }
  return value.toLowerCase();
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function containsAll(values: readonly string[], required: readonly string[]): boolean {
  const available = new Set(values);
  return required.every((value) => available.has(value));
}

const COUNT_KEYS = [
  "total",
  "passed",
  "failed",
  "skipped",
  "did_not_run",
  "flaky",
  "timed_out",
  "interrupted",
] as const satisfies readonly (keyof PlaywrightEvidenceCounts)[];

function validateObservedValues(
  value: unknown,
  maximum: number,
  validate: (value: string) => void,
): void {
  if (!Array.isArray(value)) throw new ReceiptInputError("malformed");
  if (value.length > maximum) throw new ReceiptInputError("overflow");
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") throw new ReceiptInputError("malformed");
    validate(item);
    unique.add(item);
  }
  if (unique.size > maximum) throw new ReceiptInputError("overflow");
}

function validateBoundedSummary(summary: PlaywrightJsonReportSummary): void {
  if (
    summary === null
    || typeof summary !== "object"
    || summary.observed === null
    || typeof summary.observed !== "object"
    || summary.counts === null
    || typeof summary.counts !== "object"
  ) {
    throw new ReceiptInputError("malformed");
  }
  validateObservedValues(summary.observed.specs, MAX_OBSERVED_SPECS, safeRepositoryPath);
  validateObservedValues(summary.observed.passed_specs, MAX_OBSERVED_SPECS, safeRepositoryPath);
  validateObservedValues(summary.observed.projects, MAX_OBSERVED_PROJECTS, safeProjectName);
  validateObservedValues(summary.observed.passed_projects, MAX_OBSERVED_PROJECTS, safeProjectName);
  if (Object.keys(summary.counts).some((key) => !COUNT_KEYS.includes(key as typeof COUNT_KEYS[number]))) {
    throw new ReceiptInputError("malformed");
  }
  for (const key of COUNT_KEYS) {
    const value = summary.counts[key];
    if (!Number.isInteger(value) || value < 0) throw new ReceiptInputError("malformed");
    if (value > MAX_PLAYWRIGHT_TESTS) throw new ReceiptInputError("overflow");
  }
}

function validCounts(counts: PlaywrightEvidenceCounts): boolean {
  const values = Object.values(counts);
  return values.every((value) => Number.isInteger(value) && value >= 0)
    && counts.total === counts.passed + counts.failed + counts.skipped + counts.did_not_run + counts.flaky;
}

function targetDefinition(target: PlaywrightEvidenceTarget): TargetDefinition {
  return PLAYWRIGHT_EVIDENCE_TARGETS[target];
}

export function buildPlaywrightEvidenceReceipt(options: {
  target: PlaywrightEvidenceTarget;
  testedSha: string;
  summary?: PlaywrightJsonReportSummary;
  reportSha256?: string | null;
  inputStatus?: PlaywrightEvidenceInputStatus;
  requestedStatus?: PlaywrightEvidenceStatus;
}): PlaywrightEvidenceReceipt {
  const definition = targetDefinition(options.target);
  const testedSha = normalizeSha(options.testedSha);
  const summary = options.summary ?? { observed: emptyCoverage(), counts: emptyCounts() };
  validateBoundedSummary(summary);
  const expectedSpecs = [...definition.expected_specs].sort();
  const expectedProjects = [...definition.expected_projects].sort();
  const observed = {
    specs: sorted(summary.observed.specs),
    projects: sorted(summary.observed.projects),
    passed_specs: sorted(summary.observed.passed_specs),
    passed_projects: sorted(summary.observed.passed_projects),
  };
  const counts = { ...summary.counts };
  const reportSha256 = options.reportSha256 ?? null;
  if (reportSha256 !== null && !/^[0-9a-f]{64}$/i.test(reportSha256)) {
    throw new ReceiptInputError("digest_mismatch");
  }
  const inputStatus = options.inputStatus ?? "valid";
  const coveragePasses = sameSet(observed.specs, expectedSpecs)
    && sameSet(observed.projects, expectedProjects)
    && containsAll(observed.passed_specs, expectedSpecs)
    && containsAll(observed.passed_projects, expectedProjects);
  const policyPasses = inputStatus === "valid"
    && options.requestedStatus !== "fail"
    && validCounts(counts)
    && counts.passed > 0
    && counts.failed === 0
    && counts.flaky === 0
    && counts.did_not_run === 0
    && counts.timed_out === 0
    && counts.interrupted === 0
    && coveragePasses;
  const receipt: PlaywrightEvidenceReceipt = {
    schema_version: PLAYWRIGHT_EVIDENCE_RECEIPT_SCHEMA_VERSION,
    receipt_kind: PLAYWRIGHT_EVIDENCE_RECEIPT_KIND,
    target: options.target,
    evidence_environment: definition.evidence_environment,
    artifact_class: definition.artifact_class,
    tested_sha: testedSha,
    report_sha256: reportSha256 === null ? null : reportSha256.toLowerCase(),
    expected: { specs: expectedSpecs, projects: expectedProjects },
    observed,
    input_status: inputStatus,
    status: policyPasses ? "pass" : "fail",
    counts,
  };
  if (Buffer.byteLength(`${JSON.stringify(receipt, null, 2)}\n`, "utf8") > MAX_RECEIPT_BYTES) {
    throw new ReceiptInputError("overflow");
  }
  return receipt;
}

async function readExactly(
  handle: FileHandle,
  size: number,
): Promise<Buffer> {
  const buffer = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const { bytesRead } = await handle.read(buffer, offset, size - offset, offset);
    if (bytesRead === 0) throw new ReceiptInputError("unsafe");
    offset += bytesRead;
  }
  return buffer;
}

async function readTrustedReport(
  root: string,
  target: PlaywrightEvidenceTarget,
  expectedDigest: string | undefined,
  hooks: PlaywrightEvidenceTestHooks = {},
): Promise<PlaywrightJsonReportSummary> {
  const definition = targetDefinition(target);
  const testResults = resolve(root, "test-results");
  const testResultsStat = await lstatIfPresent(testResults);
  if (!testResultsStat) throw new ReceiptInputError("missing");
  if (
    !testResultsStat.isDirectory()
    || testResultsStat.isSymbolicLink()
    || await realpath(testResults) !== testResults
  ) {
    throw new ReceiptInputError("unsafe");
  }
  const suiteDirectory = resolve(testResults, definition.report_directory);
  if (dirname(suiteDirectory) !== testResults) throw new ReceiptInputError("unsafe");
  const suiteStat = await lstatIfPresent(suiteDirectory);
  if (!suiteStat) throw new ReceiptInputError("missing");
  if (
    !suiteStat.isDirectory()
    || suiteStat.isSymbolicLink()
    || await realpath(suiteDirectory) !== suiteDirectory
  ) {
    throw new ReceiptInputError("unsafe");
  }
  const reportPath = resolve(suiteDirectory, "playwright-report.json");
  if (dirname(reportPath) !== suiteDirectory) throw new ReceiptInputError("unsafe");
  const reportStat = await lstatIfPresent(reportPath);
  if (!reportStat) throw new ReceiptInputError("missing");
  if (!reportStat.isFile() || reportStat.isSymbolicLink() || reportStat.nlink !== 1) {
    throw new ReceiptInputError("unsafe");
  }
  if (reportStat.size > MAX_PLAYWRIGHT_REPORT_BYTES) {
    throw new ReceiptInputError("oversized");
  }
  await hooks.afterReportLstat?.(reportPath);
  let handle: FileHandle;
  try {
    handle = await open(reportPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error: unknown) {
    if (isNodeError(error) && (error.code === "ELOOP" || error.code === "ENOTDIR")) {
      throw new ReceiptInputError("unsafe");
    }
    throw error;
  }
  try {
    const openedStat = await handle.stat();
    if (
      !openedStat.isFile()
      || openedStat.nlink !== 1
      || openedStat.dev !== reportStat.dev
      || openedStat.ino !== reportStat.ino
      || openedStat.size !== reportStat.size
      || openedStat.size > MAX_PLAYWRIGHT_REPORT_BYTES
    ) {
      throw new ReceiptInputError(
        openedStat.size > MAX_PLAYWRIGHT_REPORT_BYTES ? "oversized" : "unsafe",
      );
    }
    const bytes = await readExactly(handle, openedStat.size);
    const finalStat = await handle.stat();
    if (
      !finalStat.isFile()
      || finalStat.nlink !== 1
      || finalStat.size !== openedStat.size
      || finalStat.dev !== openedStat.dev
      || finalStat.ino !== openedStat.ino
    ) {
      throw new ReceiptInputError("unsafe");
    }
    const revalidateReportState = async (): Promise<void> => {
      const descriptorStat = await handle.stat();
      if (
        !descriptorStat.isFile()
        || descriptorStat.nlink !== 1
        || descriptorStat.dev !== reportStat.dev
        || descriptorStat.ino !== reportStat.ino
        || descriptorStat.size !== reportStat.size
        || descriptorStat.size > MAX_PLAYWRIGHT_REPORT_BYTES
      ) {
        throw new ReceiptInputError("unsafe");
      }
      const latestTestResultsStat = await lstatIfPresent(testResults);
      const latestSuiteStat = await lstatIfPresent(suiteDirectory);
      const latestReportStat = await lstatIfPresent(reportPath);
      if (
        !latestTestResultsStat
        || !latestSuiteStat
        || !latestReportStat
        || !latestTestResultsStat.isDirectory()
        || latestTestResultsStat.isSymbolicLink()
        || await realpath(testResults) !== testResults
        || latestTestResultsStat.dev !== testResultsStat.dev
        || latestTestResultsStat.ino !== testResultsStat.ino
        || !latestSuiteStat.isDirectory()
        || latestSuiteStat.isSymbolicLink()
        || await realpath(suiteDirectory) !== suiteDirectory
        || latestSuiteStat.dev !== suiteStat.dev
        || latestSuiteStat.ino !== suiteStat.ino
        || !latestReportStat.isFile()
        || latestReportStat.isSymbolicLink()
        || latestReportStat.nlink !== 1
        || latestReportStat.dev !== descriptorStat.dev
        || latestReportStat.ino !== descriptorStat.ino
        || latestReportStat.size !== descriptorStat.size
      ) {
        throw new ReceiptInputError("unsafe");
      }
    };
    const actualDigest = createHash("sha256").update(bytes).digest("hex");
    if (!expectedDigest || !/^[0-9a-f]{64}$/i.test(expectedDigest) || actualDigest !== expectedDigest.toLowerCase()) {
      throw new ReceiptInputError("digest_mismatch");
    }
    let parsed: unknown;
    let reportText: string;
    try {
      reportText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!Buffer.from(reportText, "utf8").equals(bytes)) {
        throw new Error("report encoding changed");
      }
    } catch {
      throw new ReceiptInputError("malformed");
    }
    try {
      parsed = JSON.parse(reportText) as unknown;
    } catch {
      throw new ReceiptInputError("malformed");
    }
    const summary = parsePlaywrightJsonReport(parsed);
    await revalidateReportState();
    await hooks.afterReportRead?.(reportPath);
    await revalidateReportState();
    return summary;
  } finally {
    await handle.close();
  }
}

async function readTrustedHelperSource(
  path: string,
  hooks: PlaywrightEvidenceTestHooks,
  expectedDigest?: string,
): Promise<string> {
  const sourceStat = await lstatIfPresent(path);
  if (!sourceStat || !sourceStat.isFile() || sourceStat.isSymbolicLink()) {
    throw new ReceiptOutputError("receipt helper source is not a trusted regular file");
  }
  if (sourceStat.size > MAX_HELPER_SOURCE_BYTES) {
    throw new ReceiptOutputError("receipt helper source exceeded its bound");
  }
  await hooks.afterHelperLstat?.(path);
  let handle: FileHandle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error: unknown) {
    if (isNodeError(error) && (error.code === "ELOOP" || error.code === "ENOTDIR")) {
      throw new ReceiptOutputError("receipt helper source is unsafe");
    }
    throw error;
  }
  try {
    const openedStat = await handle.stat();
    if (
      !openedStat.isFile()
      || openedStat.dev !== sourceStat.dev
      || openedStat.ino !== sourceStat.ino
      || openedStat.size !== sourceStat.size
      || openedStat.size > MAX_HELPER_SOURCE_BYTES
    ) {
      throw new ReceiptOutputError("receipt helper source changed before read");
    }
    const bytes = await readExactly(handle, openedStat.size);
    const finalStat = await handle.stat();
    if (
      !finalStat.isFile()
      || finalStat.dev !== openedStat.dev
      || finalStat.ino !== openedStat.ino
      || finalStat.size !== openedStat.size
    ) {
      throw new ReceiptOutputError("receipt helper source changed after read");
    }
    let source: string;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new ReceiptOutputError("receipt helper source was not valid UTF-8");
    }
    if (!Buffer.from(source, "utf8").equals(bytes)) {
      throw new ReceiptOutputError("receipt helper source encoding changed");
    }
    if (
      expectedDigest !== undefined
      && (!/^[0-9a-f]{64}$/i.test(expectedDigest)
        || createHash("sha256").update(bytes).digest("hex") !== expectedDigest.toLowerCase())
    ) {
      throw new ReceiptOutputError("receipt helper source digest changed");
    }
    return source;
  } finally {
    await handle.close();
  }
}

type ReceiptIdentity = Readonly<{ dev: string; ino: string }>;

type ExclusiveReceiptHelperResult = Readonly<{
  directory: ReceiptIdentity;
  receipt: ReceiptIdentity & { size: number; digest: string };
}>;

function descriptorIdentity(stat: Pick<Stats, "dev" | "ino">): ReceiptIdentity {
  if (
    !Number.isSafeInteger(stat.dev)
    || stat.dev < 0
    || !Number.isSafeInteger(stat.ino)
    || stat.ino < 0
  ) {
    throw new ReceiptOutputError("receipt descriptor identity was not bounded");
  }
  return { dev: String(stat.dev), ino: String(stat.ino) };
}

function assertDirectoryDescriptor(
  stat: Stats,
  expected: Pick<Stats, "dev" | "ino">,
): ReceiptIdentity {
  if (!stat.isDirectory()) {
    throw new ReceiptOutputError("receipt directory descriptor is not a directory");
  }
  const actual = descriptorIdentity(stat);
  const expectedIdentity = descriptorIdentity(expected);
  if (actual.dev !== expectedIdentity.dev || actual.ino !== expectedIdentity.ino) {
    throw new ReceiptOutputError("receipt directory descriptor identity changed");
  }
  return actual;
}

function boundedDecimal(value: unknown, description: string): string {
  if (typeof value !== "string" || !/^\d{1,32}$/.test(value)) {
    throw new ReceiptOutputError(`${description} was not bounded`);
  }
  return value;
}

function boundedDigest(value: unknown, description: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new ReceiptOutputError(`${description} was not bounded`);
  }
  return value;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

function parseExclusiveReceiptHelperOutput(
  output: Buffer,
  expectedDirectory: ReceiptIdentity,
  expectedReceiptSize: number,
): ExclusiveReceiptHelperResult {
  if (output.length === 0 || output.length > MAX_HELPER_OUTPUT_BYTES) {
    throw new ReceiptOutputError("receipt helper output exceeded its bound");
  }
  let value: unknown;
  try {
    value = JSON.parse(output.toString("utf8")) as unknown;
  } catch {
    throw new ReceiptOutputError("receipt helper output was malformed");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ReceiptOutputError("receipt helper output was malformed");
  }
  const object = value as Record<string, unknown>;
  if (!exactKeys(object, ["directory", "receipt"])) {
    throw new ReceiptOutputError("receipt helper output was unexpected");
  }
  const directoryValue = object.directory;
  const receiptValue = object.receipt;
  if (
    directoryValue === null
    || typeof directoryValue !== "object"
    || Array.isArray(directoryValue)
    || receiptValue === null
    || typeof receiptValue !== "object"
    || Array.isArray(receiptValue)
  ) {
    throw new ReceiptOutputError("receipt helper output was malformed");
  }
  const directory = directoryValue as Record<string, unknown>;
  const receipt = receiptValue as Record<string, unknown>;
  if (!exactKeys(directory, ["dev", "ino"]) || !exactKeys(receipt, ["dev", "ino", "digest", "size"])) {
    throw new ReceiptOutputError("receipt helper output was unexpected");
  }
  const directoryIdentity = {
    dev: boundedDecimal(directory.dev, "helper directory device"),
    ino: boundedDecimal(directory.ino, "helper directory inode"),
  };
  const receiptIdentity = {
    dev: boundedDecimal(receipt.dev, "helper receipt device"),
    ino: boundedDecimal(receipt.ino, "helper receipt inode"),
  };
  const receiptDigest = boundedDigest(receipt.digest, "helper receipt digest");
  if (
    directoryIdentity.dev !== expectedDirectory.dev
    || directoryIdentity.ino !== expectedDirectory.ino
    || typeof receipt.size !== "number"
    || !Number.isSafeInteger(receipt.size)
    || receipt.size !== expectedReceiptSize
  ) {
    throw new ReceiptOutputError("receipt helper output did not match the requested write");
  }
  return {
    directory: directoryIdentity,
    receipt: { ...receiptIdentity, size: receipt.size, digest: receiptDigest },
  };
}

function helperDiagnostic(stderr: Buffer): string {
  return stderr.toString("utf8").replace(/\s+/g, " ").slice(0, 512);
}

async function runExclusiveReceiptHelper(
  root: string,
  output: string,
  directory: FileHandle,
  parentStat: Pick<Stats, "dev" | "ino">,
  bytes: Buffer,
  helperSource: string,
  helperTimeoutMs: number | undefined,
): Promise<ExclusiveReceiptHelperResult> {
  const openedDirectoryStat = await directory.stat();
  const expectedDirectory = assertDirectoryDescriptor(openedDirectoryStat, parentStat);
  const receiptBasename = basename(output);
  if (
    !/^[A-Za-z0-9._-]{1,128}$/.test(receiptBasename)
    || receiptBasename === "."
    || receiptBasename === ".."
  ) {
    throw new ReceiptOutputError("receipt basename was not accepted");
  }
  const expectedDevice = expectedDirectory.dev;
  const expectedInode = expectedDirectory.ino;
  const digest = createHash("sha256").update(bytes).digest("hex");
  const timeoutMs = helperTimeoutMs ?? MAX_HELPER_DURATION_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_HELPER_DURATION_MS) {
    throw new ReceiptOutputError("receipt helper timeout was not bounded");
  }
  const argumentsForHelper = [
    "-I",
    "-B",
    "-c",
    helperSource,
    "--dir-fd",
    "3",
    "--basename",
    receiptBasename,
    "--expected-dev",
    expectedDevice,
    "--expected-ino",
    expectedInode,
    "--byte-count",
    String(bytes.length),
    "--sha256",
    digest,
  ];
  let child;
  try {
    child = spawn(RECEIPT_PYTHON, argumentsForHelper, {
      cwd: root,
      env: RECEIPT_HELPER_ENV,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe", directory.fd],
    });
  } catch {
    throw new ReceiptOutputError("receipt helper could not start");
  }

  return new Promise<ExclusiveReceiptHelperResult>((resolvePromise, rejectPromise) => {
    let failure: ReceiptOutputError | undefined;
    let closed = false;
    let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);

    const abort = (error: ReceiptOutputError): void => {
      failure ??= error;
      if (!closed) {
        try {
          child.kill("SIGKILL");
        } catch {
          // The close event still controls promise settlement.
        }
      }
    };

    const append = (
      current: Buffer<ArrayBufferLike>,
      chunk: Buffer<ArrayBufferLike> | string,
      description: string,
    ): Buffer<ArrayBufferLike> => {
      const next = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (current.length + next.length > MAX_HELPER_OUTPUT_BYTES) {
        abort(new ReceiptOutputError(`${description} exceeded its bound`));
        return current;
      }
      return Buffer.concat([current, next]);
    };

    const childStdout = child.stdout;
    const childStderr = child.stderr;
    const childStdin = child.stdin;
    if (!childStdout || !childStderr || !childStdin) {
      abort(new ReceiptOutputError("receipt helper streams were unavailable"));
      return;
    }
    childStdout.on("data", (chunk: Buffer | string) => {
      stdout = append(stdout, chunk, "receipt helper stdout");
    });
    childStderr.on("data", (chunk: Buffer | string) => {
      stderr = append(stderr, chunk, "receipt helper stderr");
    });
    childStdin.on("error", () => {
      abort(new ReceiptOutputError("receipt helper input failed"));
    });
    child.once("error", () => {
      abort(new ReceiptOutputError("receipt helper could not start"));
    });
    const timeout = setTimeout(() => {
      abort(new ReceiptOutputError("receipt helper timed out"));
    }, timeoutMs);
    timeout.unref?.();
    child.once("close", (code, signal) => {
      closed = true;
      clearTimeout(timeout);
      if (failure) {
        rejectPromise(failure);
        return;
      }
      if (code !== 0 || signal !== null || stderr.length > 0) {
        const diagnostic = helperDiagnostic(stderr);
        rejectPromise(new ReceiptOutputError(
          diagnostic.length > 0
            ? `receipt helper failed or wrote stderr: ${diagnostic}`
            : "receipt helper failed or wrote stderr",
        ));
        return;
      }
      try {
        const result = parseExclusiveReceiptHelperOutput(stdout, expectedDirectory, bytes.length);
        if (result.receipt.digest !== digest) {
          throw new ReceiptOutputError("receipt helper digest did not match the input");
        }
        resolvePromise(result);
      } catch (error: unknown) {
        rejectPromise(error instanceof ReceiptOutputError
          ? error
        : new ReceiptOutputError("receipt helper output was not accepted"));
      }
    });
    try {
      childStdin.end(bytes);
    } catch {
      abort(new ReceiptOutputError("receipt helper input failed"));
    }
  });
}

function parseCleanupOutput(output: Buffer): number {
  if (output.length === 0 || output.length > MAX_CLEANUP_OUTPUT_BYTES) {
    throw new ReceiptOutputError("receipt temporary cleanup output exceeded its bound");
  }
  let value: unknown;
  try {
    value = JSON.parse(output.toString("utf8")) as unknown;
  } catch {
    throw new ReceiptOutputError("receipt temporary cleanup output was malformed");
  }
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || !exactKeys(value as Record<string, unknown>, ["removed"])
  ) {
    throw new ReceiptOutputError("receipt temporary cleanup output was not accepted");
  }
  const removed = (value as Record<string, unknown>).removed;
  if (
    typeof removed !== "number"
    || !Number.isSafeInteger(removed)
    || removed < 0
    || removed > MAX_TEMP_CLEANUP_ENTRIES
  ) {
    throw new ReceiptOutputError("receipt temporary cleanup output was not accepted");
  }
  return removed;
}

async function cleanupReceiptTemporaryEntries(
  root: string,
  directory: FileHandle,
  parentStat: Pick<Stats, "dev" | "ino">,
): Promise<void> {
  const helperSource = await readTrustedHelperSource(
    RECEIPT_HELPER,
    {},
    PLAYWRIGHT_RECEIPT_HELPER_SOURCE_SHA256,
  );
  const expectedDirectory = assertDirectoryDescriptor(await directory.stat(), parentStat);
  let child;
  try {
    child = spawn(RECEIPT_PYTHON, [
      "-I",
      "-B",
      "-c",
      helperSource,
      "--cleanup",
      "--dir-fd",
      "3",
      "--expected-dev",
      expectedDirectory.dev,
      "--expected-ino",
      expectedDirectory.ino,
      "--prefix",
      RECEIPT_TEMP_PREFIX,
    ], {
      cwd: root,
      env: RECEIPT_HELPER_ENV,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe", directory.fd],
    });
  } catch {
    throw new ReceiptOutputError("receipt temporary cleanup could not start");
  }
  const childStdout = child.stdout;
  const childStderr = child.stderr;
  if (!childStdout || !childStderr) throw new ReceiptOutputError("receipt temporary cleanup streams were unavailable");
  let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let failure: ReceiptOutputError | undefined;
  const append = (current: Buffer, chunk: Buffer | string, description: string): Buffer => {
    const next = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (current.length + next.length > MAX_CLEANUP_OUTPUT_BYTES) {
      throw new ReceiptOutputError(`${description} exceeded its bound`);
    }
    return Buffer.concat([current, next], current.length + next.length);
  };
  await new Promise<void>((resolvePromise) => {
    childStdout.on("data", (chunk: Buffer | string) => {
      try {
        stdout = append(stdout, chunk, "receipt temporary cleanup stdout");
      } catch (error: unknown) {
        failure ??= error instanceof ReceiptOutputError
          ? error
          : new ReceiptOutputError("receipt temporary cleanup output was not accepted");
        child.kill("SIGKILL");
      }
    });
    childStderr.on("data", (chunk: Buffer | string) => {
      try {
        stderr = append(stderr, chunk, "receipt temporary cleanup stderr");
      } catch (error: unknown) {
        failure ??= error instanceof ReceiptOutputError
          ? error
          : new ReceiptOutputError("receipt temporary cleanup diagnostics were not accepted");
        child.kill("SIGKILL");
      }
    });
    child.once("error", () => {
      failure ??= new ReceiptOutputError("receipt temporary cleanup could not start");
    });
    const timeout = setTimeout(() => {
      failure ??= new ReceiptOutputError("receipt temporary cleanup timed out");
      child.kill("SIGKILL");
    }, MAX_CLEANUP_DURATION_MS);
    timeout.unref?.();
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (!failure && (code !== 0 || signal !== null || stderr.length > 0)) {
        failure = new ReceiptOutputError("receipt temporary cleanup failed or wrote stderr");
      }
      resolvePromise();
    });
  });
  if (failure) throw failure;
  parseCleanupOutput(stdout);
  assertDirectoryDescriptor(await directory.stat(), parentStat);
}

async function assertFinalReceiptPath(
  root: string,
  output: string,
  parentStat: Pick<Stats, "dev" | "ino">,
  helperResult: ExclusiveReceiptHelperResult,
  expectedBytes: Buffer,
): Promise<void> {
  await revalidateReceiptParent(root, output, parentStat);
  const expectedDigest = createHash("sha256").update(expectedBytes).digest("hex");
  if (helperResult.receipt.digest !== expectedDigest) {
    throw new ReceiptOutputError("receipt helper digest did not match the serialized receipt");
  }
  const pathBeforeOpen = await lstatIfPresent(output);
  if (
    !pathBeforeOpen
    || !pathBeforeOpen.isFile()
    || pathBeforeOpen.isSymbolicLink()
    || pathBeforeOpen.nlink !== 1
    || String(pathBeforeOpen.dev) !== helperResult.receipt.dev
    || String(pathBeforeOpen.ino) !== helperResult.receipt.ino
    || pathBeforeOpen.size !== helperResult.receipt.size
    || pathBeforeOpen.size !== expectedBytes.length
  ) {
    throw new ReceiptOutputError("receipt output path changed before the descriptor read");
  }
  let handle: FileHandle;
  try {
    handle = await open(output, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw new ReceiptOutputError("receipt output could not be opened for verification");
  }
  try {
    const openedStat = await handle.stat();
    if (
      !openedStat.isFile()
      || openedStat.nlink !== 1
      || openedStat.dev !== pathBeforeOpen.dev
      || openedStat.ino !== pathBeforeOpen.ino
      || openedStat.size !== pathBeforeOpen.size
      || String(openedStat.dev) !== helperResult.receipt.dev
      || String(openedStat.ino) !== helperResult.receipt.ino
      || openedStat.size !== helperResult.receipt.size
    ) {
      throw new ReceiptOutputError("receipt output descriptor changed before the read");
    }
    const actualBytes = await readExactly(handle, expectedBytes.length);
    const actualDigest = createHash("sha256").update(actualBytes).digest("hex");
    if (
      !actualBytes.equals(expectedBytes)
      || actualDigest !== expectedDigest
    ) {
      throw new ReceiptOutputError("receipt output bytes did not match the serialized receipt");
    }
    const finalDescriptorStat = await handle.stat();
    if (
      !finalDescriptorStat.isFile()
      || finalDescriptorStat.nlink !== 1
      || finalDescriptorStat.dev !== openedStat.dev
      || finalDescriptorStat.ino !== openedStat.ino
      || finalDescriptorStat.size !== openedStat.size
      || String(finalDescriptorStat.dev) !== helperResult.receipt.dev
      || String(finalDescriptorStat.ino) !== helperResult.receipt.ino
      || finalDescriptorStat.size !== helperResult.receipt.size
    ) {
      throw new ReceiptOutputError("receipt output descriptor changed after the read");
    }
    await revalidateReceiptParent(root, output, parentStat);
    const pathAfterRead = await lstatIfPresent(output);
    if (
      !pathAfterRead
      || !pathAfterRead.isFile()
      || pathAfterRead.isSymbolicLink()
      || pathAfterRead.nlink !== 1
      || pathAfterRead.dev !== finalDescriptorStat.dev
      || pathAfterRead.ino !== finalDescriptorStat.ino
      || pathAfterRead.size !== finalDescriptorStat.size
    ) {
      throw new ReceiptOutputError("receipt output path changed after verification");
    }
  } finally {
    await handle.close();
  }
}

export async function writeTrustedExclusiveFileInDirectory(options: {
  rootDirectory: string;
  outputPath: string;
  parentStat: Pick<Stats, "dev" | "ino">;
  directory: FileHandle;
  bytes: Buffer;
  maxBytes: number;
  helperSource?: string;
  helperTimeoutMs?: number;
  afterOutputWrite?: (path: string) => Promise<void> | void;
}): Promise<string> {
  if (
    !Number.isSafeInteger(options.maxBytes)
    || options.maxBytes <= 0
    || options.bytes.length === 0
    || options.bytes.length > options.maxBytes
    || (options.helperSource !== undefined
      && Buffer.byteLength(options.helperSource, "utf8") > MAX_HELPER_SOURCE_BYTES)
  ) {
    throw new ReceiptOutputError("trusted file exceeded its bounded output size");
  }
  if (typeof constants.O_DIRECTORY !== "number" || typeof constants.O_NOFOLLOW !== "number") {
    throw new ReceiptOutputError("required directory descriptor support is unavailable");
  }
  const helperSource = options.helperSource ?? await readTrustedHelperSource(
    RECEIPT_HELPER,
    {},
    PLAYWRIGHT_RECEIPT_HELPER_SOURCE_SHA256,
  );
  const openedDirectoryStat = await options.directory.stat();
  assertDirectoryDescriptor(openedDirectoryStat, options.parentStat);
  let helperResult: ExclusiveReceiptHelperResult;
  try {
    helperResult = await runExclusiveReceiptHelper(
      options.rootDirectory,
      options.outputPath,
      options.directory,
      options.parentStat,
      options.bytes,
      helperSource,
      options.helperTimeoutMs,
    );
  } catch (error: unknown) {
    await cleanupReceiptTemporaryEntries(
      options.rootDirectory,
      options.directory,
      options.parentStat,
    );
    throw error;
  }
  const finalDirectoryIdentity = assertDirectoryDescriptor(
    await options.directory.stat(),
    options.parentStat,
  );
  if (
    finalDirectoryIdentity.dev !== helperResult.directory.dev
    || finalDirectoryIdentity.ino !== helperResult.directory.ino
  ) {
    throw new ReceiptOutputError("trusted file directory changed after the helper write");
  }
  await options.afterOutputWrite?.(options.outputPath);
  await assertFinalReceiptPath(
    options.rootDirectory,
    options.outputPath,
    options.parentStat,
    helperResult,
    options.bytes,
  );
  return createHash("sha256").update(options.bytes).digest("hex");
}

async function writeExclusiveReceipt(
  root: string,
  output: string,
  parentStat: Pick<Stats, "dev" | "ino">,
  receipt: PlaywrightEvidenceReceipt,
  hooks: PlaywrightEvidenceTestHooks = {},
  writerOptions: Readonly<{ helperSource?: string; helperTimeoutMs?: number }> = {},
): Promise<string> {
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  if (bytes.length > MAX_RECEIPT_BYTES) {
    throw new ReceiptOutputError("receipt exceeded its bounded output size");
  }
  if (typeof constants.O_DIRECTORY !== "number" || typeof constants.O_NOFOLLOW !== "number") {
    throw new ReceiptOutputError("required directory descriptor support is unavailable");
  }
  const helperPath = resolve(root, hooks.helperPath ?? RECEIPT_HELPER);
  const helperSource = writerOptions.helperSource ?? await readTrustedHelperSource(
    helperPath,
    hooks,
    hooks.helperPath ? hooks.helperSourceDigest : PLAYWRIGHT_RECEIPT_HELPER_SOURCE_SHA256,
  );
  await hooks.beforeOutputDirectoryOpen?.(output);
  const parent = dirname(output);
  let directory: FileHandle;
  try {
    directory = await open(
      parent,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    );
  } catch {
    throw new ReceiptOutputError("trusted receipt directory could not be opened");
  }
  try {
    const openedDirectoryStat = await directory.stat();
    assertDirectoryDescriptor(openedDirectoryStat, parentStat);
    await hooks.afterOutputDirectoryOpen?.(output);
    let helperResult: ExclusiveReceiptHelperResult;
    try {
      helperResult = await runExclusiveReceiptHelper(
        root,
        output,
        directory,
        parentStat,
        bytes,
        helperSource,
        writerOptions.helperTimeoutMs ?? hooks.helperTimeoutMs,
      );
    } catch (error: unknown) {
      await cleanupReceiptTemporaryEntries(root, directory, parentStat);
      throw error;
    }
    const finalDirectoryStat = await directory.stat();
    const finalDirectoryIdentity = assertDirectoryDescriptor(finalDirectoryStat, parentStat);
    if (
      finalDirectoryIdentity.dev !== helperResult.directory.dev
      || finalDirectoryIdentity.ino !== helperResult.directory.ino
    ) {
      throw new ReceiptOutputError("receipt directory changed after the helper write");
    }
    await hooks.afterOutputWrite?.(output);
    await assertFinalReceiptPath(root, output, parentStat, helperResult, bytes);
    return createHash("sha256").update(bytes).digest("hex");
  } finally {
    await directory.close();
  }
}

function inputStatusFromError(error: unknown): PlaywrightEvidenceInputStatus {
  if (error instanceof ReceiptInputError) return error.inputStatus;
  if (isNodeError(error)) {
    if (error.code === "ENOENT") return "missing";
    if (error.code === "ELOOP" || error.code === "ENOTDIR") return "unsafe";
  }
  return "malformed";
}

async function writeGitHubReceiptDigest(outputPath: string | undefined, digest: string): Promise<void> {
  if (!outputPath) throw new ReceiptOutputError("GITHUB_OUTPUT is required for receipt evidence");
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new ReceiptOutputError("receipt digest was not bounded");
  await appendFile(outputPath, `receipt_sha256=${digest}\n`, "utf8");
}

async function writeWriterErrorReceipt(options: {
  rootDirectory: string;
  target: PlaywrightEvidenceTarget;
  testedSha: string;
}): Promise<void> {
  const prepared = await prepareReceiptOutput(options.rootDirectory, options.target, true);
  const receipt = buildPlaywrightEvidenceReceipt({
    target: options.target,
    testedSha: options.testedSha,
    inputStatus: "writer_error",
    requestedStatus: "fail",
  });
  const helperSource = await readTrustedHelperSource(
    RECEIPT_HELPER,
    {},
    PLAYWRIGHT_RECEIPT_HELPER_SOURCE_SHA256,
  );
  await writeExclusiveReceipt(
    prepared.root,
    prepared.output,
    prepared.parentStat,
    receipt,
    {},
    { helperSource, helperTimeoutMs: MAX_HELPER_DURATION_MS },
  );
}

export async function writePlaywrightEvidenceReceipt(options: {
  rootDirectory: string;
  target: PlaywrightEvidenceTarget;
  testedSha: string;
  reportSha256?: string;
  githubOutput?: string;
  requestedStatus?: PlaywrightEvidenceStatus;
  hooks?: PlaywrightEvidenceTestHooks;
}): Promise<{ receipt: PlaywrightEvidenceReceipt; outputPath: string; receiptSha256: string }> {
  try {
    const prepared = await prepareReceiptOutput(options.rootDirectory, options.target);
    let summary: PlaywrightJsonReportSummary | undefined;
    let inputStatus: PlaywrightEvidenceInputStatus = "valid";
    try {
      summary = await readTrustedReport(
        prepared.root,
        options.target,
        options.reportSha256,
        options.hooks,
      );
    } catch (error: unknown) {
      inputStatus = inputStatusFromError(error);
    }
    await revalidateReceiptParent(prepared.root, prepared.output, prepared.parentStat);
    let receipt: PlaywrightEvidenceReceipt;
    try {
      receipt = buildPlaywrightEvidenceReceipt({
        target: options.target,
        testedSha: options.testedSha,
        summary,
        reportSha256: summary ? options.reportSha256 : null,
        inputStatus,
        requestedStatus: options.requestedStatus,
      });
    } catch (error: unknown) {
      if (!(error instanceof ReceiptInputError)) throw error;
      inputStatus = inputStatusFromError(error);
      receipt = buildPlaywrightEvidenceReceipt({
        target: options.target,
        testedSha: options.testedSha,
        reportSha256: null,
        inputStatus,
        requestedStatus: options.requestedStatus,
      });
    }
    const receiptSha256 = await writeExclusiveReceipt(
      prepared.root,
      prepared.output,
      prepared.parentStat,
      receipt,
      options.hooks,
    );
    if (options.githubOutput !== undefined) {
      await writeGitHubReceiptDigest(options.githubOutput, receiptSha256);
    }
    return { receipt, outputPath: prepared.output, receiptSha256 };
  } catch (error: unknown) {
    try {
      await writeWriterErrorReceipt({
        rootDirectory: options.rootDirectory,
        target: options.target,
        testedSha: options.testedSha,
      });
    } catch (fallbackError: unknown) {
      console.error(
        `browser evidence writer-error fallback failed: ${fallbackError instanceof Error
          ? fallbackError.message
          : "unknown error"}`,
      );
    }
    throw error;
  }
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  if (process.argv.indexOf(name, index + 1) >= 0) {
    throw new Error(`${name} must be provided once.`);
  }
  return value;
}

function optionalArgumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  if (process.argv.indexOf(name, index + 1) >= 0) {
    throw new Error(`${name} must be provided once.`);
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function targetFromValue(value: string | undefined): PlaywrightEvidenceTarget {
  if (value === "foundation" || value === "semesterDesk" || value === "production") {
    return value;
  }
  throw new Error("--target must be foundation, semesterDesk, or production.");
}

function statusFromValue(value: string | undefined): PlaywrightEvidenceStatus | undefined {
  if (value === undefined) return undefined;
  if (value !== "pass" && value !== "fail") {
    throw new Error("--status must be pass or fail.");
  }
  return value;
}

async function main(): Promise<void> {
  const testedSha = argumentValue("--tested-sha") ?? process.env.GITHUB_SHA;
  if (!testedSha) throw new Error("--tested-sha or GITHUB_SHA is required.");
  const result = await writePlaywrightEvidenceReceipt({
    rootDirectory: process.cwd(),
    target: targetFromValue(argumentValue("--target")),
    testedSha,
    reportSha256: optionalArgumentValue("--report-sha256")
      ?? process.env.FORGE_PLAYWRIGHT_REPORT_SHA256,
    githubOutput: process.env.GITHUB_OUTPUT,
    requestedStatus: statusFromValue(argumentValue("--status")),
  });
  console.log(`browser evidence receipt: ${result.receipt.status.toUpperCase()}`);
  console.log(`receipt: ${result.outputPath}`);
}

const entryUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === entryUrl) {
  void main().catch((error: unknown) => {
    console.error(
      `browser evidence receipt failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  });
}
