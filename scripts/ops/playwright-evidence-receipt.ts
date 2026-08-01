import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SHA = /^[0-9a-f]{40}$/i;
const SAFE_REPOSITORY_PATH = /^[A-Za-z0-9._/-]+$/;
const SAFE_PROJECT_NAME = /^[A-Za-z0-9._-]+$/;
const MAX_REPORT_BYTES = 8 * 1024 * 1024;

export const PLAYWRIGHT_EVIDENCE_RECEIPT_SCHEMA_VERSION = "1.0" as const;
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

export type PlaywrightEvidenceReceipt = Readonly<{
  schema_version: typeof PLAYWRIGHT_EVIDENCE_RECEIPT_SCHEMA_VERSION;
  receipt_kind: typeof PLAYWRIGHT_EVIDENCE_RECEIPT_KIND;
  tested_sha: string;
  specs: string[];
  projects: string[];
  status: PlaywrightEvidenceStatus;
  counts: PlaywrightEvidenceCounts;
}>;

export type PlaywrightJsonReportSummary = Readonly<{
  specs: string[];
  projects: string[];
  counts: PlaywrightEvidenceCounts;
}>;

type JsonObject = Record<string, unknown>;
type TestOutcome = "passed" | "failed" | "skipped" | "flaky";

function asObject(value: unknown, description: string): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Playwright JSON report ${description} must be an object.`);
  }
  return value as JsonObject;
}

function asArray(value: unknown, description: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Playwright JSON report ${description} must be an array.`);
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
    throw new Error(`Playwright JSON report ${description}.${key} must be a nonempty string.`);
  }
  return value;
}

function repositoryPath(value: string, description: string): string {
  if (
    value.startsWith("/")
    || value.includes("\\")
    || value.includes("..")
    || !SAFE_REPOSITORY_PATH.test(value)
  ) {
    throw new Error(`Playwright JSON report ${description} must be a repository-relative path.`);
  }
  return value;
}

function projectName(value: string, description: string): string {
  if (!SAFE_PROJECT_NAME.test(value)) {
    throw new Error(`Playwright JSON report ${description} must be a bounded project name.`);
  }
  return value;
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

function classifyTest(test: JsonObject, description: string): {
  outcome: TestOutcome;
  timedOut: boolean;
} {
  const status = optionalString(test, "status", description);
  const resultsValue = test.results;
  const results = resultsValue === undefined
    ? []
    : asArray(resultsValue, `${description}.results`);
  const resultStatuses = results.map((value, index) => {
    const result = asObject(value, `${description}.results[${index}]`);
    return optionalString(result, "status", `${description}.results[${index}]`);
  });
  const lastResult = resultStatuses.at(-1);
  const timedOut = resultStatuses.includes("timedOut");

  if (status === "expected") return { outcome: "passed", timedOut };
  if (status === "skipped") return { outcome: "skipped", timedOut };
  if (status === "flaky") return { outcome: "flaky", timedOut };
  if (status === "unexpected" || status === "unknown") {
    return { outcome: "failed", timedOut };
  }
  if (lastResult === "passed") return { outcome: "passed", timedOut };
  if (lastResult === "skipped") return { outcome: "skipped", timedOut };
  return { outcome: "failed", timedOut };
}

export function parsePlaywrightJsonReport(value: unknown): PlaywrightJsonReportSummary {
  const root = asObject(value, "root");
  const suites = asArray(root.suites, "suites");
  const specs = new Set<string>();
  const projects = new Set<string>();
  let counts = emptyCounts();

  function visitSuite(valueToVisit: unknown, parentFile?: string): void {
    const suite = asObject(valueToVisit, "suite");
    const suiteFile = optionalString(suite, "file", "suite");
    const file = suiteFile === undefined
      ? parentFile
      : repositoryPath(suiteFile, "suite.file");
    const suiteSpecsValue = suite.specs;
    const suiteSpecs = suiteSpecsValue === undefined
      ? []
      : asArray(suiteSpecsValue, "suite.specs");
    suiteSpecs.forEach((valueToVisit, index) => {
      const spec = asObject(valueToVisit, `suite.specs[${index}]`);
      const specFileValue = optionalString(spec, "file", `suite.specs[${index}]`);
      const specFile = specFileValue === undefined
        ? file
        : repositoryPath(specFileValue, `suite.specs[${index}].file`);
      if (specFile) specs.add(specFile);

      const testsValue = spec.tests;
      const tests = testsValue === undefined
        ? []
        : asArray(testsValue, `suite.specs[${index}].tests`);
      tests.forEach((testValue, testIndex) => {
        const test = asObject(
          testValue,
          `suite.specs[${index}].tests[${testIndex}]`,
        );
        const project = optionalString(
          test,
          "projectName",
          `suite.specs[${index}].tests[${testIndex}]`,
        );
        if (project) {
          projects.add(projectName(
            project,
            `suite.specs[${index}].tests[${testIndex}].projectName`,
          ));
        }
        const classified = classifyTest(
          test,
          `suite.specs[${index}].tests[${testIndex}]`,
        );
        const next: PlaywrightEvidenceCounts = {
          total: 1,
          passed: classified.outcome === "passed" ? 1 : 0,
          failed: classified.outcome === "failed" ? 1 : 0,
          skipped: classified.outcome === "skipped" ? 1 : 0,
          flaky: classified.outcome === "flaky" ? 1 : 0,
          timed_out: classified.timedOut ? 1 : 0,
        };
        counts = addCounts(counts, next);
      });
    });

    const nestedSuitesValue = suite.suites;
    const nestedSuites = nestedSuitesValue === undefined
      ? []
      : asArray(nestedSuitesValue, "suite.suites");
    nestedSuites.forEach((nestedSuite) => visitSuite(nestedSuite, file));
  }

  suites.forEach((suite) => visitSuite(suite));
  return {
    specs: [...specs].sort(),
    projects: [...projects].sort(),
    counts,
  };
}

function normalizeSha(value: string): string {
  if (!SHA.test(value)) {
    throw new Error("Playwright browser evidence requires a full 40-character Git SHA.");
  }
  return value.toLowerCase();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export function buildPlaywrightEvidenceReceipt(options: {
  testedSha: string;
  reports?: readonly PlaywrightJsonReportSummary[];
  missingReports?: number;
  requestedStatus?: PlaywrightEvidenceStatus;
  specs?: readonly string[];
  projects?: readonly string[];
}): PlaywrightEvidenceReceipt {
  const reports = options.reports ?? [];
  const counts = reports.reduce(
    (total, report) => addCounts(total, report.counts),
    emptyCounts(),
  );
  const missingReports = options.missingReports ?? 0;
  if (!Number.isInteger(missingReports) || missingReports < 0) {
    throw new Error("Playwright browser evidence missing report count must be a nonnegative integer.");
  }
  const observedFailure =
    counts.total === 0
    || counts.failed > 0
    || missingReports > 0;
  const status: PlaywrightEvidenceStatus =
    options.requestedStatus === "fail" || observedFailure ? "fail" : "pass";
  return {
    schema_version: PLAYWRIGHT_EVIDENCE_RECEIPT_SCHEMA_VERSION,
    receipt_kind: PLAYWRIGHT_EVIDENCE_RECEIPT_KIND,
    tested_sha: normalizeSha(options.testedSha),
    specs: uniqueSorted([
      ...(options.specs ?? []).map((spec) => repositoryPath(spec, "spec")),
      ...reports.flatMap((report) => report.specs),
    ]),
    projects: uniqueSorted([
      ...(options.projects ?? []).map((project) => projectName(project, "project")),
      ...reports.flatMap((report) => report.projects),
    ]),
    status,
    counts,
  };
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function readPlaywrightJsonReports(
  paths: readonly string[],
): Promise<{ reports: PlaywrightJsonReportSummary[]; missingReports: number }> {
  const reports: PlaywrightJsonReportSummary[] = [];
  let missingReports = 0;
  for (const path of paths) {
    try {
      const reportStat = await stat(path);
      if (!reportStat.isFile()) {
        throw new Error(`Playwright JSON report path is not a regular file: ${path}`);
      }
      if (reportStat.size > MAX_REPORT_BYTES) {
        throw new Error(`Playwright JSON report exceeds the ${MAX_REPORT_BYTES}-byte limit: ${path}`);
      }
      const contents = await readFile(path, "utf8");
      reports.push(parsePlaywrightJsonReport(JSON.parse(contents) as unknown));
    } catch (error: unknown) {
      if (isMissingFile(error)) {
        missingReports += 1;
        continue;
      }
      throw error;
    }
  }
  return { reports, missingReports };
}

async function writePlaywrightEvidenceReceipt(
  outputPath: string,
  receipt: PlaywrightEvidenceReceipt,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(receipt, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
}

function argumentValues(name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${name} requires a value.`);
    }
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

function requestedStatus(value: string | undefined): PlaywrightEvidenceStatus | undefined {
  if (value === undefined) return undefined;
  if (value !== "pass" && value !== "fail") {
    throw new Error("--status must be pass or fail.");
  }
  return value;
}

async function main(): Promise<void> {
  const testedSha = argumentValue("--tested-sha") ?? process.env.GITHUB_SHA;
  if (!testedSha) throw new Error("--tested-sha or GITHUB_SHA is required.");
  const reports = await readPlaywrightJsonReports(argumentValues("--report"));
  const receipt = buildPlaywrightEvidenceReceipt({
    testedSha,
    reports: reports.reports,
    missingReports: reports.missingReports,
    requestedStatus: requestedStatus(argumentValue("--status")),
    specs: argumentValues("--spec"),
    projects: argumentValues("--project"),
  });
  const outputPath = resolve(
    argumentValue("--output") ?? "test-results/release-ops/forge-browser-evidence-receipt.json",
  );
  await writePlaywrightEvidenceReceipt(outputPath, receipt);
  console.log(`browser evidence receipt: ${receipt.status.toUpperCase()}`);
  console.log(`receipt: ${outputPath}`);
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
