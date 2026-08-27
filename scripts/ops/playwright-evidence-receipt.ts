import { open, lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { PRODUCTION_BROWSER_SPECS } from "./run-production-browser-verification";

export const MAX_REPORT_BYTES = 8 * 1024 * 1024;
export const MAX_RECEIPT_BYTES = 64 * 1024;
const MAX_REPORT_DEPTH = 64;
const MAX_REPORT_NODES = 100_000;
const SHA = /^[0-9a-f]{40}$/i;
const SAFE_PROJECT_NAME = /^[A-Za-z0-9._-]{1,128}$/;
const SAFE_SPEC_PATH = /^tests\/e2e\/[A-Za-z0-9._/-]+\.spec\.ts$/;

export const PLAYWRIGHT_EVIDENCE_RECEIPT_SCHEMA_VERSION = "2.0" as const;
export const PLAYWRIGHT_EVIDENCE_RECEIPT_KIND = "forge_ci_browser_evidence" as const;

export type PlaywrightEvidenceStatus = "pass" | "fail";

export type PlaywrightEvidenceCounts = Readonly<{
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  timed_out: number;
}>;

export type PlaywrightEvidenceCoverage = Readonly<{
  specs: string[];
  projects: string[];
}>;

export type PlaywrightEvidenceFailureReason =
  | "coverage_mismatch"
  | "duplicate_expected_scope"
  | "failed_test"
  | "flaky_test"
  | "inconsistent_test_status"
  | "malformed_report"
  | "missing_passed_project"
  | "missing_passed_spec"
  | "missing_report"
  | "no_passed_tests"
  | "oversized_report"
  | "output_collision"
  | "requested_fail"
  | "root_error"
  | "timed_out_test"
  | "unknown_expected_status"
  | "unknown_result_status"
  | "unknown_test_status"
  | "unsafe_report";

export type PlaywrightEvidenceReceiptScope =
  | "development_foundation"
  | "development_semester_desk"
  | "production_artifact";

export type PlaywrightEvidenceReceipt = Readonly<{
  schema_version: typeof PLAYWRIGHT_EVIDENCE_RECEIPT_SCHEMA_VERSION;
  receipt_kind: typeof PLAYWRIGHT_EVIDENCE_RECEIPT_KIND;
  receipt_scope: PlaywrightEvidenceReceiptScope;
  tested_sha: string;
  expected: PlaywrightEvidenceCoverage;
  observed: PlaywrightEvidenceCoverage;
  status: PlaywrightEvidenceStatus;
  counts: PlaywrightEvidenceCounts;
  root_errors: number;
  failure_reasons: PlaywrightEvidenceFailureReason[];
}>;

type JsonObject = Record<string, unknown>;
type TestOutcome = "passed" | "failed" | "skipped" | "flaky";
type TestStatus = "expected" | "unexpected" | "flaky" | "skipped";
type ExpectedStatus = "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
type ResultStatus = ExpectedStatus;

const TEST_STATUSES = new Set<TestStatus>([
  "expected",
  "unexpected",
  "flaky",
  "skipped",
]);
const EXPECTED_STATUSES = new Set<ExpectedStatus>([
  "passed",
  "failed",
  "timedOut",
  "skipped",
  "interrupted",
]);
const RESULT_STATUSES = EXPECTED_STATUSES;

type ReceiptScopeDefinition = Readonly<{
  report_path: string;
  output_path: string;
  expected: PlaywrightEvidenceCoverage;
}>;

export const PLAYWRIGHT_EVIDENCE_SCOPES: Readonly<
  Record<PlaywrightEvidenceReceiptScope, ReceiptScopeDefinition>
> = Object.freeze({
  development_foundation: {
    report_path: "university-foundation/playwright-report.json",
    output_path: "release-ops/forge-browser-evidence-development-foundation.json",
    expected: {
      specs: ["tests/e2e/university-foundation.spec.ts"],
      projects: ["desktop", "mobile"],
    },
  },
  development_semester_desk: {
    report_path: "university-semester-desk/playwright-report.json",
    output_path: "release-ops/forge-browser-evidence-development-semester-desk.json",
    expected: {
      specs: ["tests/e2e/university-semester-desk.spec.ts"],
      projects: ["desktop", "mobile"],
    },
  },
  production_artifact: {
    report_path: "production-browser/playwright-report.json",
    output_path: "release-ops/forge-browser-evidence-production-artifact.json",
    expected: {
      specs: [...PRODUCTION_BROWSER_SPECS],
      projects: ["desktop", "mobile"],
    },
  },
});

export type PlaywrightJsonReportSummary = Readonly<{
  specs: string[];
  projects: string[];
  passedSpecs: string[];
  passedProjects: string[];
  counts: PlaywrightEvidenceCounts;
  rootErrors: number;
  failureReasons: PlaywrightEvidenceFailureReason[];
}>;

export class PlaywrightEvidenceInputError extends Error {
  readonly reason: PlaywrightEvidenceFailureReason;

  constructor(reason: PlaywrightEvidenceFailureReason, message: string) {
    super(message);
    this.name = "PlaywrightEvidenceInputError";
    this.reason = reason;
  }
}

function inputError(reason: PlaywrightEvidenceFailureReason, message: string): never {
  throw new PlaywrightEvidenceInputError(reason, message);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function asObject(value: unknown, description: string): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    inputError("malformed_report", `Playwright JSON report ${description} must be an object.`);
  }
  return value as JsonObject;
}

function asArray(value: unknown, description: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    inputError("malformed_report", `Playwright JSON report ${description} must be an array.`);
  }
  return value;
}

function optionalString(
  object: JsonObject,
  key: string,
  description: string,
): string | undefined {
  const value = object[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    inputError("malformed_report", `Playwright JSON report ${description}.${key} must be a nonempty string.`);
  }
  return value;
}

function requiredString(object: JsonObject, key: string, description: string): string {
  const value = optionalString(object, key, description);
  if (value === undefined) {
    inputError("malformed_report", `Playwright JSON report ${description}.${key} is required.`);
  }
  return value;
}

function boundedSpecPath(value: string, description: string): string {
  if (
    value.includes("..")
    || value.includes("\\")
    || isAbsolute(value)
    || !SAFE_SPEC_PATH.test(value)
  ) {
    inputError("unsafe_report", `Playwright JSON report ${description} must be an e2e spec path.`);
  }
  return value;
}

function boundedProjectName(value: string, description: string): string {
  if (!SAFE_PROJECT_NAME.test(value)) {
    inputError("unsafe_report", `Playwright JSON report ${description} must be a bounded project name.`);
  }
  return value;
}

function enumValue<T extends string>(
  value: string,
  allowed: ReadonlySet<T>,
  description: string,
  reason: PlaywrightEvidenceFailureReason,
): T {
  if (!allowed.has(value as T)) inputError(reason, `Playwright JSON report ${description} has an unknown enum value.`);
  return value as T;
}

function emptyCounts(): PlaywrightEvidenceCounts {
  return {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    timed_out: 0,
  };
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
    flaky: left.flaky + right.flaky,
    timed_out: left.timed_out + right.timed_out,
  };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function hasDuplicate(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function addReason(
  reasons: Set<PlaywrightEvidenceFailureReason>,
  reason: PlaywrightEvidenceFailureReason,
): void {
  reasons.add(reason);
}

function classifyTest(
  test: JsonObject,
  description: string,
): { outcome: TestOutcome; timedOut: boolean; reasons: PlaywrightEvidenceFailureReason[] } {
  const status = enumValue(
    requiredString(test, "status", description),
    TEST_STATUSES,
    `${description}.status`,
    "unknown_test_status",
  );
  const expectedStatus = enumValue(
    requiredString(test, "expectedStatus", description),
    EXPECTED_STATUSES,
    `${description}.expectedStatus`,
    "unknown_expected_status",
  );
  const results = asArray(test.results, `${description}.results`);
  const resultStatuses = results.map((value, index) => {
    const result = asObject(value, `${description}.results[${index}]`);
    return enumValue(
      requiredString(result, "status", `${description}.results[${index}]`),
      RESULT_STATUSES,
      `${description}.results[${index}].status`,
      "unknown_result_status",
    );
  });
  if (resultStatuses.length === 0 && status !== "skipped") {
    inputError("malformed_report", `${description}.results must contain a result.`);
  }

  const timedOut = resultStatuses.includes("timedOut");
  const hasNonPassingRetry = resultStatuses.some((result) => result !== "passed");
  const reasons = new Set<PlaywrightEvidenceFailureReason>();
  if (timedOut) addReason(reasons, "timed_out_test");

  let outcome: TestOutcome;
  if (status === "skipped") {
    outcome = "skipped";
    if (resultStatuses.some((result) => result !== "skipped")) {
      addReason(reasons, "inconsistent_test_status");
    }
  } else if (status === "flaky") {
    outcome = "flaky";
    addReason(reasons, "flaky_test");
  } else if (status === "unexpected") {
    outcome = "failed";
    addReason(reasons, "failed_test");
  } else if (expectedStatus !== "passed") {
    outcome = "failed";
    addReason(reasons, "failed_test");
  } else if (resultStatuses.at(-1) !== "passed") {
    outcome = "failed";
    addReason(reasons, "failed_test");
  } else if (hasNonPassingRetry) {
    outcome = "flaky";
    addReason(reasons, "flaky_test");
  } else {
    outcome = "passed";
  }

  return { outcome, timedOut, reasons: [...reasons] };
}

function validateReportNodeBudget(nodes: number, depth: number): void {
  if (nodes > MAX_REPORT_NODES) {
    inputError("oversized_report", "Playwright JSON report contains too many nodes.");
  }
  if (depth > MAX_REPORT_DEPTH) {
    inputError("malformed_report", "Playwright JSON report suite nesting is too deep.");
  }
}

export function parsePlaywrightJsonReport(value: unknown): PlaywrightJsonReportSummary {
  const root = asObject(value, "root");
  const suites = asArray(root.suites, "suites");
  const rootErrorsValue = root.errors;
  const rootErrors = rootErrorsValue === undefined
    ? []
    : asArray(rootErrorsValue, "errors");
  const specs = new Set<string>();
  const projects = new Set<string>();
  const passedSpecs = new Set<string>();
  const passedProjects = new Set<string>();
  const failureReasons = new Set<PlaywrightEvidenceFailureReason>();
  let counts = emptyCounts();
  let nodes = 0;

  if (rootErrors.length > 0) addReason(failureReasons, "root_error");

  function visitSuite(valueToVisit: unknown, parentFile: string | undefined, depth: number): void {
    nodes += 1;
    validateReportNodeBudget(nodes, depth);
    const suite = asObject(valueToVisit, "suite");
    const suiteFileValue = optionalString(suite, "file", "suite");
    const file = suiteFileValue === undefined
      ? parentFile
      : boundedSpecPath(suiteFileValue, "suite.file");
    const suiteSpecsValue = suite.specs;
    const suiteSpecs = suiteSpecsValue === undefined
      ? []
      : asArray(suiteSpecsValue, "suite.specs");
    suiteSpecs.forEach((valueToVisit, index) => {
      nodes += 1;
      validateReportNodeBudget(nodes, depth + 1);
      const spec = asObject(valueToVisit, `suite.specs[${index}]`);
      const specFileValue = optionalString(spec, "file", `suite.specs[${index}]`);
      const specFile = specFileValue === undefined
        ? file
        : boundedSpecPath(specFileValue, `suite.specs[${index}].file`);
      if (specFile === undefined) {
        inputError("malformed_report", `suite.specs[${index}] has no file identity.`);
      }
      specs.add(specFile);
      const tests = asArray(spec.tests, `suite.specs[${index}].tests`);
      tests.forEach((testValue, testIndex) => {
        nodes += 1;
        validateReportNodeBudget(nodes, depth + 2);
        const test = asObject(
          testValue,
          `suite.specs[${index}].tests[${testIndex}]`,
        );
        const project = boundedProjectName(
          requiredString(
            test,
            "projectName",
            `suite.specs[${index}].tests[${testIndex}]`,
          ),
          `suite.specs[${index}].tests[${testIndex}].projectName`,
        );
        projects.add(project);
        const classified = classifyTest(
          test,
          `suite.specs[${index}].tests[${testIndex}]`,
        );
        for (const reason of classified.reasons) addReason(failureReasons, reason);
        const next: PlaywrightEvidenceCounts = {
          total: 1,
          passed: classified.outcome === "passed" ? 1 : 0,
          failed: classified.outcome === "failed" ? 1 : 0,
          skipped: classified.outcome === "skipped" ? 1 : 0,
          flaky: classified.outcome === "flaky" ? 1 : 0,
          timed_out: classified.timedOut ? 1 : 0,
        };
        if (classified.outcome === "passed") {
          passedSpecs.add(specFile);
          passedProjects.add(project);
        }
        counts = addCounts(counts, next);
      });
    });

    const nestedSuitesValue = suite.suites;
    const nestedSuites = nestedSuitesValue === undefined
      ? []
      : asArray(nestedSuitesValue, "suite.suites");
    nestedSuites.forEach((nestedSuite) => visitSuite(nestedSuite, file, depth + 1));
  }

  suites.forEach((suite) => visitSuite(suite, undefined, 0));
  return {
    specs: [...specs].sort(),
    projects: [...projects].sort(),
    passedSpecs: [...passedSpecs].sort(),
    passedProjects: [...passedProjects].sort(),
    counts,
    rootErrors: rootErrors.length,
    failureReasons: [...failureReasons].sort(),
  };
}

function normalizeSha(value: string): string {
  if (!SHA.test(value)) {
    throw new Error("Playwright browser evidence requires a full 40-character Git SHA.");
  }
  return value.toLowerCase();
}

function normalizeExpectedCoverage(
  specs: readonly string[],
  projects: readonly string[],
): { coverage: PlaywrightEvidenceCoverage; duplicate: boolean } {
  const normalizedSpecs = specs.map((spec) => boundedSpecPath(spec, "expected.specs"));
  const normalizedProjects = projects.map((project) => boundedProjectName(project, "expected.projects"));
  return {
    coverage: {
      specs: uniqueSorted(normalizedSpecs),
      projects: uniqueSorted(normalizedProjects),
    },
    duplicate: hasDuplicate(normalizedSpecs) || hasDuplicate(normalizedProjects),
  };
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function validateCounts(counts: PlaywrightEvidenceCounts): boolean {
  if (!Object.values(counts).every((value) => validCount(value))) return false;
  if (counts.total !== counts.passed + counts.failed + counts.skipped + counts.flaky) return false;
  if (counts.passed > counts.total || counts.timed_out > counts.total) return false;
  return true;
}

function boundedReasons(
  reasons: readonly PlaywrightEvidenceFailureReason[],
): PlaywrightEvidenceFailureReason[] {
  return uniqueSorted(reasons) as PlaywrightEvidenceFailureReason[];
}

export function buildPlaywrightEvidenceReceipt(options: {
  receiptScope: PlaywrightEvidenceReceiptScope;
  testedSha: string;
  expectedSpecs: readonly string[];
  expectedProjects: readonly string[];
  report?: PlaywrightJsonReportSummary;
  requestedStatus?: PlaywrightEvidenceStatus;
  failureReasons?: readonly PlaywrightEvidenceFailureReason[];
}): PlaywrightEvidenceReceipt {
  const expectedResult = normalizeExpectedCoverage(
    options.expectedSpecs,
    options.expectedProjects,
  );
  const expected = expectedResult.coverage;
  const report = options.report;
  const observed: PlaywrightEvidenceCoverage = {
    specs: report?.specs ?? [],
    projects: report?.projects ?? [],
  };
  const counts = report?.counts ?? emptyCounts();
  const reasons = new Set<PlaywrightEvidenceFailureReason>(options.failureReasons ?? []);
  for (const reason of report?.failureReasons ?? []) addReason(reasons, reason);
  if (expectedResult.duplicate) addReason(reasons, "duplicate_expected_scope");
  if (!report) addReason(reasons, "missing_report");
  if (!validateCounts(counts)) addReason(reasons, "malformed_report");
  if (!sameSet(expected.specs, observed.specs) || !sameSet(expected.projects, observed.projects)) {
    addReason(reasons, "coverage_mismatch");
  }
  if (expected.specs.length === 0 || expected.projects.length === 0 || counts.total <= 0) {
    addReason(reasons, "coverage_mismatch");
  }
  if (counts.passed <= 0) addReason(reasons, "no_passed_tests");
  if (counts.failed > 0) addReason(reasons, "failed_test");
  if (counts.flaky > 0) addReason(reasons, "flaky_test");
  if (counts.timed_out > 0) addReason(reasons, "timed_out_test");
  if (report && expected.specs.some((spec) => !report.passedSpecs.includes(spec))) {
    addReason(reasons, "missing_passed_spec");
  }
  if (report && expected.projects.some((project) => !report.passedProjects.includes(project))) {
    addReason(reasons, "missing_passed_project");
  }
  if (options.requestedStatus === "fail") addReason(reasons, "requested_fail");
  const failureReasons = boundedReasons([...reasons]);
  return {
    schema_version: PLAYWRIGHT_EVIDENCE_RECEIPT_SCHEMA_VERSION,
    receipt_kind: PLAYWRIGHT_EVIDENCE_RECEIPT_KIND,
    receipt_scope: options.receiptScope,
    tested_sha: normalizeSha(options.testedSha),
    expected,
    observed,
    status: failureReasons.length === 0 ? "pass" : "fail",
    counts,
    root_errors: report?.rootErrors ?? 0,
    failure_reasons: failureReasons,
  };
}

export function buildBoundedFailureReceipt(options: {
  receiptScope: PlaywrightEvidenceReceiptScope;
  testedSha: string;
  expectedSpecs: readonly string[];
  expectedProjects: readonly string[];
  reason: PlaywrightEvidenceFailureReason;
}): PlaywrightEvidenceReceipt {
  return buildPlaywrightEvidenceReceipt({
    receiptScope: options.receiptScope,
    testedSha: options.testedSha,
    expectedSpecs: options.expectedSpecs,
    expectedProjects: options.expectedProjects,
    failureReasons: [options.reason],
    requestedStatus: "fail",
  });
}

async function statIfPresent(path: string) {
  try {
    return await lstat(path);
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

function isStrictChild(parent: string, child: string): boolean {
  const childRelative = relative(parent, child);
  return childRelative.length > 0
    && childRelative !== ".."
    && !childRelative.startsWith(`..${sep}`)
    && !isAbsolute(childRelative);
}

async function createTrustedRoot(rootDirectory: string): Promise<{ lexical: string; physical: string }> {
  const lexical = resolve(rootDirectory);
  let rootStat = await statIfPresent(lexical);
  if (!rootStat) {
    const parent = dirname(lexical);
    const parentStat = await statIfPresent(parent);
    if (!parentStat?.isDirectory() || parentStat.isSymbolicLink()) {
      inputError("unsafe_report", "test-results parent is not a trusted directory.");
    }
    try {
      await mkdir(lexical);
    } catch (error: unknown) {
      if (!isNodeError(error) || error.code !== "EEXIST") throw error;
    }
    rootStat = await statIfPresent(lexical);
  }
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) {
    inputError("unsafe_report", "test-results must be an existing non-symlink directory.");
  }
  return { lexical, physical: await realpath(lexical) };
}

async function ensureTrustedDirectory(root: string, target: string): Promise<void> {
  if (target !== root && !isStrictChild(root, target)) {
    inputError("unsafe_report", "receipt output must remain under test-results.");
  }
  const path = relative(root, target);
  let current = root;
  for (const component of path ? path.split(sep) : []) {
    current = resolve(current, component);
    let currentStat = await statIfPresent(current);
    if (!currentStat) {
      try {
        await mkdir(current);
      } catch (error: unknown) {
        if (!isNodeError(error) || error.code !== "EEXIST") throw error;
      }
      currentStat = await statIfPresent(current);
    }
    if (!currentStat?.isDirectory() || currentStat.isSymbolicLink()) {
      inputError("unsafe_report", "receipt output contains a symlink or non-directory component.");
    }
    const physical = await realpath(current);
    if (physical !== current && physical !== root && !isStrictChild(root, physical)) {
      inputError("unsafe_report", "receipt output resolved outside test-results.");
    }
  }
}

async function validateExistingInputDirectory(root: string, target: string): Promise<boolean> {
  if (target !== root && !isStrictChild(root, target)) {
    inputError("unsafe_report", "Playwright report is outside test-results.");
  }
  const path = relative(root, target);
  let current = root;
  for (const component of path ? path.split(sep) : []) {
    current = resolve(current, component);
    const currentStat = await statIfPresent(current);
    if (!currentStat) return false;
    if (!currentStat.isDirectory() || currentStat.isSymbolicLink()) {
      inputError("unsafe_report", "Playwright report path contains a symlink or non-directory component.");
    }
    const physical = await realpath(current);
    if (physical !== current && physical !== root && !isStrictChild(root, physical)) {
      inputError("unsafe_report", "Playwright report resolved outside test-results.");
    }
  }
  return true;
}

type ReceiptPaths = Readonly<{
  lexicalRoot: string;
  root: string;
  report: string;
  output: string;
}>;

export async function resolvePlaywrightEvidencePaths(
  scope: PlaywrightEvidenceReceiptScope,
  options: { rootDirectory?: string; outputPath?: string } = {},
): Promise<ReceiptPaths> {
  const definition = PLAYWRIGHT_EVIDENCE_SCOPES[scope];
  const trusted = await createTrustedRoot(
    options.rootDirectory ?? resolve(process.cwd(), "test-results"),
  );
  const expectedOutputLexical = resolve(trusted.lexical, definition.output_path);
  const outputLexical = options.outputPath === undefined
    ? expectedOutputLexical
    : resolve(options.outputPath);
  if (outputLexical !== expectedOutputLexical) {
    inputError("unsafe_report", "receipt output must use its exact release-ops path.");
  }
  const output = resolve(trusted.physical, definition.output_path);
  await ensureTrustedDirectory(trusted.physical, dirname(output));
  const outputStat = await statIfPresent(output);
  if (outputStat?.isSymbolicLink()) {
    inputError("unsafe_report", "receipt output must not be a symlink.");
  }
  if (outputStat) {
    inputError("output_collision", "receipt output already exists.");
  }
  return {
    lexicalRoot: trusted.lexical,
    root: trusted.physical,
    report: resolve(trusted.physical, definition.report_path),
    output,
  };
}

async function readExactly(
  handle: Awaited<ReturnType<typeof open>>,
  size: number,
): Promise<Buffer> {
  const buffer = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const { bytesRead } = await handle.read(buffer, offset, size - offset, offset);
    if (bytesRead === 0) inputError("unsafe_report", "Playwright report changed while being read.");
    offset += bytesRead;
  }
  return buffer;
}

export async function readPlaywrightJsonReport(
  path: string,
): Promise<PlaywrightJsonReportSummary> {
  let source;
  try {
    source = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") inputError("missing_report", "Playwright report is missing.");
    if (isNodeError(error) && (error.code === "ELOOP" || error.code === "ENOTDIR")) {
      inputError("unsafe_report", "Playwright report must not be a symlink or directory.");
    }
    throw error;
  }
  try {
    const reportStat = await source.stat();
    if (!reportStat.isFile()) inputError("unsafe_report", "Playwright report is not a regular file.");
    if (reportStat.size > MAX_REPORT_BYTES) {
      inputError("oversized_report", "Playwright report exceeds its byte limit.");
    }
    const contents = await readExactly(source, reportStat.size);
    const finalStat = await source.stat();
    if (!finalStat.isFile() || finalStat.size !== reportStat.size) {
      inputError("unsafe_report", "Playwright report changed while being read.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(contents.toString("utf8")) as unknown;
    } catch {
      inputError("malformed_report", "Playwright report is not valid JSON.");
    }
    return parsePlaywrightJsonReport(parsed);
  } finally {
    await source.close();
  }
}

export async function readScopedPlaywrightJsonReport(
  scope: PlaywrightEvidenceReceiptScope,
  paths: ReceiptPaths,
  reportPath?: string,
): Promise<PlaywrightJsonReportSummary> {
  const definition = PLAYWRIGHT_EVIDENCE_SCOPES[scope];
  const expectedLexical = resolve(paths.lexicalRoot, definition.report_path);
  if (reportPath !== undefined && resolve(reportPath) !== expectedLexical) {
    inputError("unsafe_report", "Playwright report must use its exact suite result path.");
  }
  const reportDirectory = dirname(paths.report);
  if (!await validateExistingInputDirectory(paths.root, reportDirectory)) {
    inputError("missing_report", "Playwright report directory is missing.");
  }
  return readPlaywrightJsonReport(paths.report);
}

export async function writePlaywrightEvidenceReceipt(
  scope: PlaywrightEvidenceReceiptScope,
  receipt: PlaywrightEvidenceReceipt,
  paths: ReceiptPaths,
): Promise<void> {
  const definition = PLAYWRIGHT_EVIDENCE_SCOPES[scope];
  const expectedOutput = resolve(paths.root, definition.output_path);
  if (paths.output !== expectedOutput || receipt.receipt_scope !== scope) {
    inputError("unsafe_report", "receipt output identity does not match its scope.");
  }
  const serialized = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  if (serialized.byteLength > MAX_RECEIPT_BYTES) {
    inputError("malformed_report", "receipt exceeds its byte limit.");
  }
  const outputStat = await statIfPresent(paths.output);
  if (outputStat?.isSymbolicLink()) inputError("unsafe_report", "receipt output must not be a symlink.");
  if (outputStat) inputError("output_collision", "receipt output already exists.");
  await writeFile(paths.output, serialized, { encoding: "utf8", flag: "wx", mode: 0o600 });
}

function requestedStatus(value: string | undefined): PlaywrightEvidenceStatus | undefined {
  if (value === undefined) return undefined;
  if (value !== "pass" && value !== "fail") {
    throw new Error("--status must be pass or fail.");
  }
  return value;
}

function scopeValue(value: string | undefined): PlaywrightEvidenceReceiptScope {
  if (value === "development_foundation" || value === "development_semester_desk" || value === "production_artifact") {
    return value;
  }
  throw new Error("--scope must be development_foundation, development_semester_desk, or production_artifact.");
}

function failureReason(error: unknown): PlaywrightEvidenceFailureReason {
  if (error instanceof PlaywrightEvidenceInputError) return error.reason;
  if (isNodeError(error)) {
    if (error.code === "ENOENT") return "missing_report";
    if (error.code === "ELOOP" || error.code === "ENOTDIR" || error.code === "EACCES") return "unsafe_report";
  }
  return "malformed_report";
}

async function main(): Promise<void> {
  const scope = scopeValue(argumentValue("--scope"));
  const definition = PLAYWRIGHT_EVIDENCE_SCOPES[scope];
  const testedSha = argumentValue("--tested-sha") ?? process.env.GITHUB_SHA;
  if (!testedSha) throw new Error("--tested-sha or GITHUB_SHA is required.");
  const status = requestedStatus(argumentValue("--status"));
  const outputPath = argumentValue("--output");
  const reportPath = argumentValue("--report");
  const paths = await resolvePlaywrightEvidencePaths(scope, { outputPath });
  let receipt: PlaywrightEvidenceReceipt;
  let failedInput = false;
  try {
    const report = await readScopedPlaywrightJsonReport(scope, paths, reportPath);
    receipt = buildPlaywrightEvidenceReceipt({
      receiptScope: scope,
      testedSha,
      expectedSpecs: definition.expected.specs,
      expectedProjects: definition.expected.projects,
      report,
      requestedStatus: status,
    });
  } catch (error: unknown) {
    failedInput = true;
    receipt = buildBoundedFailureReceipt({
      receiptScope: scope,
      testedSha,
      expectedSpecs: definition.expected.specs,
      expectedProjects: definition.expected.projects,
      reason: failureReason(error),
    });
  }
  await writePlaywrightEvidenceReceipt(scope, receipt, paths);
  console.log(`browser evidence receipt ${scope}: ${receipt.status.toUpperCase()}`);
  console.log(`receipt: ${paths.output}`);
  if (failedInput || receipt.status === "fail") process.exitCode = 1;
}

function argumentValues(name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
    values.push(value);
    index += 1;
  }
  return values;
}

function argumentValue(name: string): string | undefined {
  const values = argumentValues(name);
  if (values.length > 1) throw new Error(`${name} must be provided once.`);
  return values[0];
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
