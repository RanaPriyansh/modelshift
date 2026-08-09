import { execFileSync } from "node:child_process";
import {
  closeSync,
  constants,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve, sep } from "node:path";

import {
  hiddenBuildInputExceptions,
  productionBuildId,
  sourceCommitFromProductionBuildId,
} from "./build-source-identity";
import {
  framedFileTreeDigest,
  readStableRegularFile,
} from "./file-tree-identity";
import { readPublicAssetDigest } from "./release-digests";

export const PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION =
  "forge-production-build-receipt.v3" as const;
export const PRODUCTION_BUILD_RECEIPT_FILE =
  "forge-production-build-receipt.json" as const;

const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const EXCLUDED_TOP_LEVEL = new Set(["cache", "dev", "diagnostics"]);
const EXCLUDED_FILES = new Set([
  PRODUCTION_BUILD_RECEIPT_FILE,
  "trace",
  "trace-build",
]);
const PRODUCTION_PUBLIC_DIRECTORY_DIGEST_DOMAIN =
  "forge-production-public-directory.v1";

export type ProductionBuildSource = Readonly<{
  sourceCommit: string | "unknown";
  sourceTree: string | "unknown";
  sourceState: "clean" | "dirty" | "unverified";
}>;

export type ProductionBuildReceipt = Readonly<{
  schemaVersion: typeof PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION;
  sourceCommit: string | "unknown";
  sourceTree: string | "unknown";
  sourceState: ProductionBuildSource["sourceState"];
  buildId: string;
  artifactDigest: string;
  publicAssetDigest: string;
  artifactFileCount: number;
  publicDirectoryDigest: string;
  publicDirectoryFileCount: number;
  runtimeCachePolicy: "fresh_ephemeral_next_cache_v1";
  runtimeConfigurationDigest: string;
  runtimeConfigurationFileCount: number;
}>;

export const PRODUCTION_RUNTIME_CONFIGURATION_FILES = Object.freeze([
  "next.config.ts",
  "package.json",
  "scripts/ops/build-source-identity.ts",
  "tsconfig.json",
] as const);

function git(root: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

export function readProductionBuildSource(
  root: string = process.cwd(),
): ProductionBuildSource {
  try {
    const sourceCommit = git(root, ["rev-parse", "HEAD"]).toLowerCase();
    const sourceTree = git(root, ["rev-parse", "HEAD^{tree}"]).toLowerCase();
    if (!SHA.test(sourceCommit) || !SHA.test(sourceTree)) {
      throw new Error("invalid Git identity");
    }
    const status = git(root, [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]);
    return Object.freeze({
      sourceCommit,
      sourceTree,
      sourceState: status === "" ? "clean" : "dirty",
    });
  } catch {
    return Object.freeze({
      sourceCommit: "unknown",
      sourceTree: "unknown",
      sourceState: "unverified",
    });
  }
}

function exactBuildInputExceptions(root: string): readonly string[] {
  return hiddenBuildInputExceptions(root);
}

export function assertExactBuildInputBoundary(
  root: string = process.cwd(),
): void {
  let exceptions: readonly string[];
  try {
    exceptions = exactBuildInputExceptions(root);
  } catch {
    throw new Error(
      "Exact production build verification could not inspect Git build inputs.",
    );
  }
  if (exceptions.length > 0) {
    throw new Error(
      "Exact production build verification rejected hidden or ignored build inputs.",
    );
  }
}

function containedRealPath(
  realRoot: string,
  candidate: string,
  allowRoot = false,
): string {
  const realCandidate = realpathSync(candidate);
  const relativePath = relative(realRoot, realCandidate);
  if (
    (!allowRoot && relativePath === "")
    || relativePath === ".."
    || relativePath.startsWith(`..${sep}`)
  ) {
    throw new Error(
      "Production build receipt rejected a path outside the real .next root.",
    );
  }
  return realCandidate;
}

function artifactFiles(
  directory: string,
  realRoot: string,
  relativeDirectory = "",
): string[] {
  const directoryStat = lstatSync(directory);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new Error(
      "Production build receipt requires real directories and regular files.",
    );
  }
  containedRealPath(realRoot, directory, true);

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = relativeDirectory
      ? `${relativeDirectory}/${entry.name}`
      : entry.name;
    const topLevel = relativePath.split("/")[0] ?? "";
    if (
      EXCLUDED_TOP_LEVEL.has(topLevel)
      || (relativeDirectory === "" && EXCLUDED_FILES.has(entry.name))
    ) return [];

    const path = resolve(directory, entry.name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
      throw new Error("Production build receipt rejected a symlink in .next.");
    }
    if (stat.isDirectory()) {
      return artifactFiles(path, realRoot, relativePath);
    }
    if (!stat.isFile()) {
      throw new Error(
        "Production build receipt requires real directories and regular files.",
      );
    }
    return [containedRealPath(realRoot, path)];
  });
}

function regularFiles(
  directory: string,
  realRoot: string,
  relativeDirectory = "",
): string[] {
  const directoryStat = lstatSync(directory);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new Error(
      "Production public-directory identity requires real directories.",
    );
  }
  containedRealPath(realRoot, directory, true);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = relativeDirectory
      ? `${relativeDirectory}/${entry.name}`
      : entry.name;
    const path = resolve(directory, entry.name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
      throw new Error(
        "Production public-directory identity rejected a symlink.",
      );
    }
    if (stat.isDirectory()) {
      return regularFiles(path, realRoot, relativePath);
    }
    if (!stat.isFile()) {
      throw new Error(
        "Production public-directory identity requires regular files.",
      );
    }
    return [containedRealPath(realRoot, path)];
  });
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error
    && "code" in error
    && error.code === "ENOENT";
}

function productionPublicDirectoryIdentity(
  entries: readonly Readonly<{ path: string; bytes: Buffer }>[],
): Readonly<{
  publicDirectoryDigest: string;
  publicDirectoryFileCount: number;
}> {
  return Object.freeze({
    publicDirectoryDigest: `sha256:${framedFileTreeDigest(
      PRODUCTION_PUBLIC_DIRECTORY_DIGEST_DOMAIN,
      entries,
    )}`,
    publicDirectoryFileCount: entries.length,
  });
}

export function readProductionArtifactIdentity(
  root: string = process.cwd(),
): Readonly<{ artifactDigest: string; artifactFileCount: number }> {
  const nextDirectory = resolve(root, ".next");
  const nextStat = lstatSync(nextDirectory);
  if (nextStat.isSymbolicLink() || !nextStat.isDirectory()) {
    throw new Error(
      "Production build receipt requires a real .next build directory.",
    );
  }
  const realNextDirectory = realpathSync(nextDirectory);
  const files = artifactFiles(nextDirectory, realNextDirectory).sort();
  if (files.length === 0) {
    throw new Error("Production build receipt requires non-empty build output.");
  }

  return Object.freeze({
    artifactDigest: `sha256:${framedFileTreeDigest(
      "forge-production-next-file-tree.v1",
      files.map((file) => ({
        path: relative(realNextDirectory, file).split(sep).join("/"),
        bytes: readStableRegularFile(file),
      })),
    )}`,
    artifactFileCount: files.length,
  });
}

export function readProductionPublicDirectoryIdentity(
  root: string = process.cwd(),
): Readonly<{ publicDirectoryDigest: string; publicDirectoryFileCount: number }> {
  const publicDirectory = resolve(root, "public");
  let publicStat: ReturnType<typeof lstatSync>;
  try {
    publicStat = lstatSync(publicDirectory);
  } catch (error) {
    if (isMissingPathError(error)) {
      return productionPublicDirectoryIdentity([]);
    }
    throw error;
  }
  if (publicStat.isSymbolicLink() || !publicStat.isDirectory()) {
    throw new Error(
      "Production public-directory identity requires a real public directory.",
    );
  }
  const realPublicDirectory = realpathSync(publicDirectory);
  const files = regularFiles(publicDirectory, realPublicDirectory).sort();
  return productionPublicDirectoryIdentity(files.map((file) => ({
    path: relative(realPublicDirectory, file).split(sep).join("/"),
    bytes: readStableRegularFile(file),
  })));
}

export function readProductionRuntimeConfigurationIdentity(
  root: string = process.cwd(),
): Readonly<{
  runtimeConfigurationDigest: string;
  runtimeConfigurationFileCount: number;
}> {
  const entries = PRODUCTION_RUNTIME_CONFIGURATION_FILES.map((path) => ({
    path,
    bytes: readStableRegularFile(resolve(root, path), 2_000_000),
  }));
  return Object.freeze({
    runtimeConfigurationDigest: `sha256:${framedFileTreeDigest(
      "forge-production-runtime-configuration.v1",
      entries,
    )}`,
    runtimeConfigurationFileCount: entries.length,
  });
}

function readBuildId(root: string): string {
  const buildId = readStableRegularFile(
    resolve(root, ".next/BUILD_ID"),
  ).toString("utf8").trim();
  if (buildId.length < 1 || buildId.length > 180 || /[\r\n]/.test(buildId)) {
    throw new Error("Production build receipt rejected an invalid BUILD_ID.");
  }
  return buildId;
}

export function createProductionBuildReceipt(
  root: string = process.cwd(),
): ProductionBuildReceipt {
  const source = readProductionBuildSource(root);
  const artifact = readProductionArtifactIdentity(root);
  const publicDirectory = readProductionPublicDirectoryIdentity(root);
  const runtimeConfiguration =
    readProductionRuntimeConfigurationIdentity(root);
  const buildId = readBuildId(root);
  const buildBoundCommit = sourceCommitFromProductionBuildId(buildId);
  if (
    source.sourceCommit !== "unknown"
    && buildBoundCommit !== source.sourceCommit
  ) {
    throw new Error(
      "Production build receipt rejected an artifact built from a different source commit.",
    );
  }
  return Object.freeze({
    schemaVersion: PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION,
    ...source,
    sourceCommit: buildBoundCommit ?? source.sourceCommit,
    buildId,
    artifactDigest: artifact.artifactDigest,
    publicAssetDigest: `sha256:${readPublicAssetDigest(root)}`,
    artifactFileCount: artifact.artifactFileCount,
    ...publicDirectory,
    runtimeCachePolicy: "fresh_ephemeral_next_cache_v1",
    ...runtimeConfiguration,
  });
}

export function writeProductionBuildReceipt(
  root: string = process.cwd(),
): ProductionBuildReceipt {
  const receipt = createProductionBuildReceipt(root);
  const nextDirectory = resolve(root, ".next");
  const realNextDirectory = realpathSync(nextDirectory);
  const receiptPath = resolve(nextDirectory, PRODUCTION_BUILD_RECEIPT_FILE);
  containedRealPath(realNextDirectory, nextDirectory, true);
  let fileDescriptor: number | null = null;
  try {
    fileDescriptor = openSync(
      receiptPath,
      constants.O_CREAT
        | constants.O_EXCL
        | constants.O_WRONLY
        | constants.O_NOFOLLOW,
      0o600,
    );
    writeFileSync(
      fileDescriptor,
      `${JSON.stringify(receipt, null, 2)}\n`,
      "utf8",
    );
    fsyncSync(fileDescriptor);
    closeSync(fileDescriptor);
    fileDescriptor = null;
  } catch (error) {
    if (fileDescriptor !== null) closeSync(fileDescriptor);
    throw error;
  }
  return receipt;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseProductionBuildReceipt(
  value: unknown,
): ProductionBuildReceipt {
  if (
    typeof value !== "string"
    || Buffer.byteLength(value, "utf8") > 8_192
  ) {
    throw new Error("Production build receipt must be bounded JSON text.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Production build receipt must be valid JSON text.");
  }
  if (!isRecord(parsed)) {
    throw new Error("Production build receipt JSON must contain an object.");
  }
  const expectedKeys = [
    "artifactDigest",
    "artifactFileCount",
    "buildId",
    "publicAssetDigest",
    "publicDirectoryDigest",
    "publicDirectoryFileCount",
    "runtimeCachePolicy",
    "runtimeConfigurationDigest",
    "runtimeConfigurationFileCount",
    "schemaVersion",
    "sourceCommit",
    "sourceState",
    "sourceTree",
  ];
  const keys = Object.keys(parsed).sort();
  if (
    keys.length !== expectedKeys.length
    || keys.some((key, index) => key !== expectedKeys[index])
    || parsed.schemaVersion !== PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION
    || typeof parsed.sourceCommit !== "string"
    || (parsed.sourceCommit !== "unknown" && !SHA.test(parsed.sourceCommit))
    || typeof parsed.sourceTree !== "string"
    || (parsed.sourceTree !== "unknown" && !SHA.test(parsed.sourceTree))
    || (
      parsed.sourceState !== "clean"
      && parsed.sourceState !== "dirty"
      && parsed.sourceState !== "unverified"
    )
    || typeof parsed.buildId !== "string"
    || parsed.buildId.length < 1
    || parsed.buildId.length > 180
    || typeof parsed.artifactDigest !== "string"
    || !DIGEST.test(parsed.artifactDigest)
    || typeof parsed.publicAssetDigest !== "string"
    || !DIGEST.test(parsed.publicAssetDigest)
    || typeof parsed.publicDirectoryDigest !== "string"
    || !DIGEST.test(parsed.publicDirectoryDigest)
    || !Number.isInteger(parsed.publicDirectoryFileCount)
    || Number(parsed.publicDirectoryFileCount) < 0
    || parsed.runtimeCachePolicy !== "fresh_ephemeral_next_cache_v1"
    || typeof parsed.runtimeConfigurationDigest !== "string"
    || !DIGEST.test(parsed.runtimeConfigurationDigest)
    || !Number.isInteger(parsed.runtimeConfigurationFileCount)
    || Number(parsed.runtimeConfigurationFileCount)
      !== PRODUCTION_RUNTIME_CONFIGURATION_FILES.length
    || !Number.isInteger(parsed.artifactFileCount)
    || Number(parsed.artifactFileCount) < 1
  ) {
    throw new Error(
      "Production build receipt did not match its strict versioned schema.",
    );
  }
  return Object.freeze({
    schemaVersion: parsed.schemaVersion,
    sourceCommit: parsed.sourceCommit,
    sourceTree: parsed.sourceTree,
    sourceState: parsed.sourceState,
    buildId: parsed.buildId,
    artifactDigest: parsed.artifactDigest,
    publicAssetDigest: parsed.publicAssetDigest,
    artifactFileCount: parsed.artifactFileCount,
    publicDirectoryDigest: parsed.publicDirectoryDigest,
    publicDirectoryFileCount: parsed.publicDirectoryFileCount,
    runtimeCachePolicy: parsed.runtimeCachePolicy,
    runtimeConfigurationDigest: parsed.runtimeConfigurationDigest,
    runtimeConfigurationFileCount: parsed.runtimeConfigurationFileCount,
  } as ProductionBuildReceipt);
}

export function readProductionBuildReceipt(
  root: string = process.cwd(),
): ProductionBuildReceipt {
  return parseProductionBuildReceipt(readStableRegularFile(
    resolve(root, ".next", PRODUCTION_BUILD_RECEIPT_FILE),
    8_192,
  ).toString("utf8"));
}

export function clearProductionRuntimeCache(
  root: string = process.cwd(),
): void {
  const nextDirectory = resolve(root, ".next");
  const requiredServerFilesPath = resolve(
    nextDirectory,
    "required-server-files.json",
  );
  if (!existsSync(requiredServerFilesPath)) {
    throw new Error(
      "Production runtime cache reset requires required-server-files.json.",
    );
  }
  let requiredServerFiles: unknown;
  try {
    requiredServerFiles = JSON.parse(readStableRegularFile(
      requiredServerFilesPath,
      2_000_000,
    ).toString("utf8"));
  } catch {
    throw new Error(
      "Production runtime cache reset could not validate required server files.",
    );
  }
  if (
    !isRecord(requiredServerFiles)
    || !Array.isArray(requiredServerFiles.files)
    || requiredServerFiles.files.some((file) => typeof file !== "string")
    || requiredServerFiles.files.some((file) =>
      /(?:^|\/)\.next\/cache(?:\/|$)/.test(String(file).replaceAll("\\", "/"))
    )
  ) {
    throw new Error(
      "Production runtime cache reset rejected a required or malformed cache input.",
    );
  }
  for (const directoryName of ["cache", "dev"]) {
    const transientDirectory = resolve(nextDirectory, directoryName);
    if (!existsSync(transientDirectory)) continue;
    const transientStat = lstatSync(transientDirectory);
    if (transientStat.isSymbolicLink() || !transientStat.isDirectory()) {
      throw new Error(
        "Production runtime reset rejected a non-directory or symlink.",
      );
    }
    containedRealPath(realpathSync(nextDirectory), transientDirectory);
    rmSync(transientDirectory, { recursive: true, force: false });
  }
}

export function assertProductionRuntimeCacheAbsent(
  root: string = process.cwd(),
): void {
  if (existsSync(resolve(root, ".next/cache"))) {
    throw new Error(
      "Exact production build verification requires an absent runtime cache.",
    );
  }
}

export function assertExactProductionBuild(
  expectedSha: string,
  root: string = process.cwd(),
): ProductionBuildReceipt {
  const normalizedExpected = expectedSha.toLowerCase();
  if (!SHA.test(normalizedExpected)) {
    throw new Error("Exact production build verification requires a full Git SHA.");
  }
  const receipt = readProductionBuildReceipt(root);
  const source = readProductionBuildSource(root);
  assertExactBuildInputBoundary(root);
  assertProductionRuntimeCacheAbsent(root);
  const artifact = readProductionArtifactIdentity(root);
  const publicDirectory = readProductionPublicDirectoryIdentity(root);
  const runtimeConfiguration =
    readProductionRuntimeConfigurationIdentity(root);
  const publicAssetDigest = `sha256:${readPublicAssetDigest(root)}`;
  const buildId = readBuildId(root);
  if (
    source.sourceState !== "clean"
    || receipt.sourceState !== "clean"
    || source.sourceCommit !== normalizedExpected
    || receipt.sourceCommit !== normalizedExpected
    || receipt.buildId !== productionBuildId(normalizedExpected)
    || source.sourceTree === "unknown"
    || receipt.sourceTree !== source.sourceTree
    || receipt.buildId !== buildId
    || receipt.artifactDigest !== artifact.artifactDigest
    || receipt.artifactFileCount !== artifact.artifactFileCount
    || receipt.publicAssetDigest !== publicAssetDigest
    || receipt.publicDirectoryDigest !== publicDirectory.publicDirectoryDigest
    || receipt.publicDirectoryFileCount
      !== publicDirectory.publicDirectoryFileCount
    || receipt.runtimeConfigurationDigest
      !== runtimeConfiguration.runtimeConfigurationDigest
    || receipt.runtimeConfigurationFileCount
      !== runtimeConfiguration.runtimeConfigurationFileCount
  ) {
    throw new Error(
      "Production build receipt does not bind this clean checkout, Git tree, and complete .next artifact to the expected SHA.",
    );
  }
  return receipt;
}
