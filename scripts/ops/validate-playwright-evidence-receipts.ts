import { constants, type Stats } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

type JsonObject = Record<string, unknown>;
type ExpectedStatus = "pass" | "fail";

const RECEIPT_ROOT = "test-results/release-ops";
const MAX_RECEIPT_BYTES = 64 * 1024;
const MAX_OBSERVED_SPECS = 64;
const MAX_OBSERVED_PROJECTS = 16;
const MAX_PLAYWRIGHT_TESTS = 4096;
const MAX_OBSERVED_PATH_LENGTH = 256;
const MAX_OBSERVED_PROJECT_LENGTH = 64;

export type PlaywrightCiReceiptExpectation = Readonly<{
  outputFile: string;
  target: "foundation" | "semesterDesk" | "production";
  evidenceEnvironment: "development" | "production";
  artifactClass: "development_source" | "production_build_artifact";
  expectedSpecs: readonly string[];
  expectedProjects: readonly string[];
  expectedStatus: ExpectedStatus;
}>;

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
  "writer_error",
]);
const COUNT_KEYS = [
  "total",
  "passed",
  "failed",
  "skipped",
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

export async function readTrustedCiReceipt(
  rootDirectory: string,
  outputFile: string,
  hooks: PlaywrightCiReceiptReadHooks = {},
): Promise<unknown> {
  if (typeof constants.O_NOFOLLOW !== "number") throw new Error("receipt no-symlink support is unavailable");
  const trustedRoot = await trustedReceiptRoot(rootDirectory);
  const path = resolve(rootDirectory, outputFile);
  if (dirname(path) !== trustedRoot.path) {
    throw new Error("receipt path is outside the fixed root");
  }
  const pathStat = await lstat(path);
  if (!pathStat.isFile() || pathStat.isSymbolicLink() || pathStat.size > MAX_RECEIPT_BYTES) {
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
      || !sameIdentity(finalDescriptorStat, finalPathStat)
      || finalPathStat.size !== finalDescriptorStat.size
    ) {
      throw new Error("receipt path changed after read");
    }
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
  } finally {
    await handle.close();
  }
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
    typed.total !== typed.passed + typed.failed + typed.skipped + typed.flaky
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
): void {
  if (!/^[0-9a-f]{40}$/i.test(testedSha)) throw new Error("tested SHA is invalid");
  const receipt = asObject(value, "receipt");
  exactKeys(receipt, RECEIPT_KEYS, "receipt");
  if (
    receipt.schema_version !== "2.0"
    || receipt.receipt_kind !== "forge_ci_browser_evidence"
    || receipt.target !== expectation.target
    || receipt.evidence_environment !== expectation.evidenceEnvironment
    || receipt.artifact_class !== expectation.artifactClass
    || receipt.tested_sha !== testedSha.toLowerCase()
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
      || counts.timed_out !== 0
      || counts.interrupted !== 0
    ) {
      throw new Error("receipt does not satisfy the pass policy");
    }
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
    const report = await readTrustedCiReceipt(process.cwd(), baseExpectation.outputFile);
    validatePlaywrightEvidenceReceiptForCi(report, expectation, testedSha);
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
