import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants, type Stats } from "node:fs";
import { appendFile, lstat, open, realpath } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  MAX_PLAYWRIGHT_REPORT_BYTES,
  writeTrustedExclusiveFileInDirectory,
} from "./playwright-evidence-receipt";

const MAX_PLAYWRIGHT_STDERR_BYTES = 64 * 1024;
const REPORT_FILE_PATTERN = /^test-results\/[A-Za-z0-9][A-Za-z0-9._-]*\/playwright-report\.json$/;
const REPORT_DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const require = createRequire(import.meta.url);
const PLAYWRIGHT_CLI = require.resolve("@playwright/test/cli");

type ChildResult = Readonly<{ code: number | null; signal: NodeJS.Signals | null }>;

type TrustedReportLocation = Readonly<{
  root: string;
  testResultsPath: string;
  suitePath: string;
  reportPath: string;
  testResultsStat: Stats;
  suiteStat: Stats;
}>;

export type PlaywrightReportProducerTestHooks = Readonly<{
  beforeSuiteOpen?: (location: TrustedReportLocation) => Promise<void> | void;
  afterSuiteOpen?: (location: TrustedReportLocation) => Promise<void> | void;
  afterOutputWrite?: (path: string) => Promise<void> | void;
  testHelperSource?: string;
  helperTimeoutMs?: number;
}>;

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function trustedReportPath(rootDirectory: string, reportFile: string): string {
  if (!REPORT_FILE_PATTERN.test(reportFile)) {
    throw new Error("Playwright report output must be one direct test-results suite file");
  }
  const root = resolve(rootDirectory);
  const path = resolve(root, reportFile);
  if (relative(root, path) !== reportFile) {
    throw new Error("Playwright report output escaped the checkout");
  }
  return path;
}

async function trustedReportLocation(
  rootDirectory: string,
  reportFile: string,
): Promise<TrustedReportLocation> {
  const path = trustedReportPath(rootDirectory, reportFile);
  const root = resolve(rootDirectory);
  const testResults = resolve(root, "test-results");
  const suiteDirectory = dirname(path);
  if (dirname(suiteDirectory) !== testResults) {
    throw new Error("Playwright report suite directory is not direct");
  }
  const testResultsStat = await lstat(testResults);
  const suiteStat = await lstat(suiteDirectory);
  if (
    !testResultsStat.isDirectory()
    || testResultsStat.isSymbolicLink()
    || await realpath(testResults) !== testResults
    || !suiteStat.isDirectory()
    || suiteStat.isSymbolicLink()
    || await realpath(suiteDirectory) !== suiteDirectory
  ) {
    throw new Error("Playwright report ancestors are not trusted");
  }
  return {
    root,
    testResultsPath: testResults,
    suitePath: suiteDirectory,
    reportPath: path,
    testResultsStat,
    suiteStat,
  };
}

async function revalidateTrustedReportLocation(location: TrustedReportLocation): Promise<void> {
  const testResultsStat = await lstat(location.testResultsPath);
  const suiteStat = await lstat(location.suitePath);
  if (
    !testResultsStat.isDirectory()
    || testResultsStat.isSymbolicLink()
    || await realpath(location.testResultsPath) !== location.testResultsPath
    || !sameIdentity(testResultsStat, location.testResultsStat)
    || !suiteStat.isDirectory()
    || suiteStat.isSymbolicLink()
    || await realpath(location.suitePath) !== location.suitePath
    || !sameIdentity(suiteStat, location.suiteStat)
  ) {
    throw new Error("Playwright report ancestors changed");
  }
}

async function assertTrustedSuiteDescriptor(
  directory: FileHandle,
  location: TrustedReportLocation,
): Promise<void> {
  const descriptorStat = await directory.stat();
  if (!descriptorStat.isDirectory() || !sameIdentity(descriptorStat, location.suiteStat)) {
    throw new Error("Playwright report suite descriptor changed");
  }
  await revalidateTrustedReportLocation(location);
}

async function readExactly(handle: FileHandle, size: number): Promise<Buffer> {
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const result = await handle.read(bytes, offset, size - offset, offset);
    if (result.bytesRead === 0) throw new Error("Playwright report ended before its declared size");
    offset += result.bytesRead;
  }
  return bytes;
}

function sameIdentity(left: Pick<Stats, "dev" | "ino">, right: Pick<Stats, "dev" | "ino">): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

export async function readPlaywrightReportDigest(
  rootDirectory: string,
  reportFile: string,
): Promise<string> {
  if (typeof constants.O_NOFOLLOW !== "number") throw new Error("Playwright report no-symlink support is unavailable");
  const path = trustedReportPath(rootDirectory, reportFile);
  const parent = dirname(path);
  const parentStat = await lstat(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink() || await realpath(parent) !== parent) {
    throw new Error("Playwright report parent is not trusted");
  }
  const pathStat = await lstat(path);
  if (!pathStat.isFile() || pathStat.isSymbolicLink() || pathStat.size > MAX_PLAYWRIGHT_REPORT_BYTES) {
    throw new Error("Playwright report is not bounded and regular");
  }
  let handle: FileHandle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error: unknown) {
    if (isNodeError(error) && (error.code === "ELOOP" || error.code === "ENOTDIR")) {
      throw new Error("Playwright report is unsafe");
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
      || openedStat.size > MAX_PLAYWRIGHT_REPORT_BYTES
    ) {
      throw new Error("Playwright report changed before digest read");
    }
    const bytes = await readExactly(handle, openedStat.size);
    const finalDescriptorStat = await handle.stat();
    if (
      !finalDescriptorStat.isFile()
      || finalDescriptorStat.nlink !== 1
      || !sameIdentity(openedStat, finalDescriptorStat)
      || finalDescriptorStat.size !== openedStat.size
    ) {
      throw new Error("Playwright report changed after digest read");
    }
    const finalPathStat = await lstat(path);
    if (
      !finalPathStat.isFile()
      || finalPathStat.isSymbolicLink()
      || finalPathStat.nlink !== 1
      || !sameIdentity(finalDescriptorStat, finalPathStat)
      || finalPathStat.size !== finalDescriptorStat.size
    ) {
      throw new Error("Playwright report path changed after digest read");
    }
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!Buffer.from(text, "utf8").equals(bytes)) throw new Error("Playwright report encoding changed");
      const parsed = JSON.parse(text) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Playwright report JSON must be an object");
      }
    } catch (error: unknown) {
      throw new Error(`Playwright report JSON was not accepted: ${error instanceof Error ? error.message : "unknown error"}`);
    }
    return createHash("sha256").update(bytes).digest("hex");
  } finally {
    await handle.close();
  }
}

async function writeCapturedReport(
  rootDirectory: string,
  reportFile: string,
  bytes: Buffer,
  hooks: PlaywrightReportProducerTestHooks = {},
): Promise<void> {
  const location = await trustedReportLocation(rootDirectory, reportFile);
  await hooks.beforeSuiteOpen?.(location);
  if (typeof constants.O_DIRECTORY !== "number" || typeof constants.O_NOFOLLOW !== "number") {
    throw new Error("Playwright report directory descriptor support is unavailable");
  }
  let handle: FileHandle;
  try {
    handle = await open(
      location.suitePath,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    );
  } catch (error: unknown) {
    if (isNodeError(error) && (error.code === "ELOOP" || error.code === "ENOTDIR")) {
      throw new Error("Playwright report suite directory is unsafe");
    }
    throw error;
  }
  try {
    await assertTrustedSuiteDescriptor(handle, location);
    await hooks.afterSuiteOpen?.(location);
    await assertTrustedSuiteDescriptor(handle, location);
    await writeTrustedExclusiveFileInDirectory({
      rootDirectory: location.root,
      outputPath: location.reportPath,
      parentStat: location.suiteStat,
      directory: handle,
      bytes,
      maxBytes: MAX_PLAYWRIGHT_REPORT_BYTES,
      helperSource: hooks.testHelperSource,
      helperTimeoutMs: hooks.helperTimeoutMs,
      afterOutputWrite: hooks.afterOutputWrite,
    });
    await revalidateTrustedReportLocation(location);
  } finally {
    await handle.close();
  }
}

async function writeGitHubDigest(outputPath: string | undefined, digest: string): Promise<void> {
  if (!outputPath) throw new Error("GITHUB_OUTPUT is required for Playwright report evidence");
  if (!REPORT_DIGEST_PATTERN.test(digest)) throw new Error("Playwright report digest is invalid");
  await appendFile(outputPath, `report_sha256=${digest}\n`, "utf8");
}

function appendBounded(
  current: Buffer,
  chunk: Buffer | string,
  maximum: number,
): Buffer {
  const next = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  if (current.length + next.length > maximum) throw new Error("Playwright producer output exceeded its bound");
  return Buffer.concat([current, next], current.length + next.length);
}

async function runChild(
  command: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
  cwd: string,
): Promise<{ result: ChildResult; stdout: Buffer }> {
  if (args.some((argument) => argument === "--reporter" || argument.startsWith("--reporter="))) {
    throw new Error("Playwright producer controls the JSON reporter");
  }
  const childEnvironment = { ...environment };
  for (const key of [
    "GITHUB_OUTPUT",
    "GITHUB_ENV",
    "GITHUB_PATH",
    "GITHUB_STATE",
    "GITHUB_STEP_SUMMARY",
    "PLAYWRIGHT_JSON_OUTPUT_FILE",
    "PLAYWRIGHT_JSON_OUTPUT_NAME",
    "PLAYWRIGHT_JSON_OUTPUT_DIR",
  ]) {
    delete childEnvironment[key];
  }
  let child;
  try {
    child = spawn(command, [...args, "--reporter=json"], {
      cwd,
      env: childEnvironment,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error("Playwright producer could not start");
  }
  const childStdout = child.stdout;
  const childStderr = child.stderr;
  if (!childStdout || !childStderr) throw new Error("Playwright producer streams were unavailable");
  let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let failure: Error | undefined;
  const result = await new Promise<ChildResult>((resolveResult) => {
    childStdout.on("data", (chunk: Buffer | string) => {
      try {
        stdout = appendBounded(stdout, chunk, MAX_PLAYWRIGHT_REPORT_BYTES);
      } catch (error: unknown) {
        failure ??= error instanceof Error ? error : new Error("Playwright producer output was not accepted");
        child.kill("SIGKILL");
      }
    });
    childStderr.on("data", (chunk: Buffer | string) => {
      try {
        stderr = appendBounded(stderr, chunk, MAX_PLAYWRIGHT_STDERR_BYTES);
      } catch (error: unknown) {
        failure ??= error instanceof Error ? error : new Error("Playwright producer diagnostics were not accepted");
        child.kill("SIGKILL");
      }
    });
    child.once("error", () => {
      failure ??= new Error("Playwright producer could not start");
    });
    child.once("close", (code, signal) => resolveResult({ code, signal }));
  });
  if (failure) throw failure;
  return { result, stdout };
}

export async function runPlaywrightWithReportDigest(options: {
  rootDirectory?: string;
  reportFile: string;
  command: string;
  args: readonly string[];
  environment?: NodeJS.ProcessEnv;
  githubOutput?: string;
  testHooks?: PlaywrightReportProducerTestHooks;
}): Promise<number> {
  const root = resolve(options.rootDirectory ?? process.cwd());
  const environment = options.environment ?? process.env;
  const { result, stdout } = await runChild(options.command, options.args, environment, root);
  if (stdout.length === 0) throw new Error("Playwright producer did not emit JSON report bytes");
  const reportText = new TextDecoder("utf-8", { fatal: true }).decode(stdout);
  if (!Buffer.from(reportText, "utf8").equals(stdout)) throw new Error("Playwright producer emitted invalid UTF-8");
  const parsed = JSON.parse(reportText) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Playwright producer emitted non-object JSON");
  }
  await writeCapturedReport(root, options.reportFile, stdout, options.testHooks);
  const digest = createHash("sha256").update(stdout).digest("hex");
  await writeGitHubDigest(options.githubOutput ?? environment.GITHUB_OUTPUT, digest);
  return result.code === 0 && result.signal === null ? 0 : result.code ?? 1;
}

export function playwrightCliInvocation(testArguments: readonly string[]): {
  command: string;
  args: string[];
} {
  return {
    command: process.execPath,
    args: [PLAYWRIGHT_CLI, "test", ...testArguments],
  };
}

function argumentValue(args: readonly string[], name: string): string {
  const index = args.indexOf(name);
  const value = args[index + 1];
  if (index < 0 || !value || value.startsWith("--") || args.indexOf(name, index + 1) >= 0) {
    throw new Error(`${name} is required once`);
  }
  return value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const delimiter = args.indexOf("--");
  if (delimiter < 0 || args.indexOf("--", delimiter + 1) >= 0) throw new Error("producer command is required after --");
  const commandArgs = args.slice(delimiter + 1);
  if (commandArgs.length === 0) throw new Error("producer command is empty");
  const reportFile = argumentValue(args.slice(0, delimiter), "--report-file");
  const invocation = playwrightCliInvocation(commandArgs);
  const result = await runPlaywrightWithReportDigest({
    reportFile,
    command: invocation.command,
    args: invocation.args,
  });
  process.exitCode = result;
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) {
  void main().catch((error: unknown) => {
    console.error(`Playwright report producer failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  });
}
