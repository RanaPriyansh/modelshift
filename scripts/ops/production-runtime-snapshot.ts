import {
  chmodSync,
  closeSync,
  constants,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  rmSync,
  fsyncSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";

import { readStableRegularFile } from "./file-tree-identity";
import {
  PRODUCTION_BUILD_RECEIPT_FILE,
  PRODUCTION_RUNTIME_CONFIGURATION_FILES,
  assertExactProductionBuild,
  clearProductionRuntimeCache,
  readProductionArtifactIdentity,
  readProductionBuildReceipt,
  readProductionPublicDirectoryIdentity,
  readProductionRuntimeConfigurationIdentity,
  type ProductionBuildReceipt,
} from "./production-build-receipt";
import { readPublicAssetDigest } from "./release-digests";

const EXCLUDED_NEXT_TOP_LEVEL = new Set(["cache", "dev", "diagnostics"]);
const EXCLUDED_NEXT_FILES = new Set(["trace", "trace-build"]);

export type ProductionRuntimeSnapshot = Readonly<{
  root: string;
  expectedSha: string;
  receipt: ProductionBuildReceipt;
}>;

function writeExclusiveRegularFile(path: string, bytes: Buffer): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const fileDescriptor = openSync(
    path,
    constants.O_CREAT
      | constants.O_EXCL
      | constants.O_WRONLY
      | constants.O_NOFOLLOW,
    0o400,
  );
  try {
    writeFileSync(fileDescriptor, bytes);
    fsyncSync(fileDescriptor);
  } finally {
    closeSync(fileDescriptor);
  }
}

function copyVerifiedTree(
  source: string,
  destination: string,
  options: Readonly<{
    excludeTopLevel?: ReadonlySet<string>;
    excludeRootFiles?: ReadonlySet<string>;
  }> = {},
  relativeDirectory = "",
): void {
  const stat = lstatSync(source);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(
      "Production runtime snapshot rejected a non-directory or symlink.",
    );
  }
  mkdirSync(destination, { recursive: true, mode: 0o700 });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const relativePath = relativeDirectory
      ? `${relativeDirectory}/${entry.name}`
      : entry.name;
    const topLevel = relativePath.split("/")[0] ?? "";
    if (
      options.excludeTopLevel?.has(topLevel)
      || (
        relativeDirectory === ""
        && options.excludeRootFiles?.has(entry.name)
      )
    ) {
      continue;
    }
    const sourcePath = resolve(source, entry.name);
    const destinationPath = resolve(destination, entry.name);
    const entryStat = lstatSync(sourcePath);
    if (entryStat.isSymbolicLink()) {
      throw new Error("Production runtime snapshot rejected a symlink.");
    }
    if (entryStat.isDirectory()) {
      copyVerifiedTree(
        sourcePath,
        destinationPath,
        options,
        relativePath,
      );
      continue;
    }
    if (!entryStat.isFile()) {
      throw new Error(
        "Production runtime snapshot requires regular files only.",
      );
    }
    writeExclusiveRegularFile(
      destinationPath,
      readStableRegularFile(sourcePath),
    );
  }
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error
    && "code" in error
    && error.code === "ENOENT";
}

function copyPublicTreeOrCreateEmpty(
  source: string,
  destination: string,
): void {
  try {
    lstatSync(source);
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
    mkdirSync(destination, { recursive: false, mode: 0o700 });
    return;
  }
  copyVerifiedTree(source, destination);
}

function sealDirectories(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = resolve(directory, entry.name);
    sealDirectories(path);
    chmodSync(path, 0o500);
  }
  chmodSync(directory, 0o500);
}

function makeWritable(directory: string): void {
  chmodSync(directory, 0o700);
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) makeWritable(path);
    else if (entry.isSymbolicLink()) unlinkSync(path);
    else chmodSync(path, 0o600);
  }
}

function sameReceiptIdentity(
  left: ProductionBuildReceipt,
  right: ProductionBuildReceipt,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function assertProductionRuntimeSnapshot(
  snapshot: ProductionRuntimeSnapshot,
): void {
  const receipt = readProductionBuildReceipt(snapshot.root);
  const artifact = readProductionArtifactIdentity(snapshot.root);
  const publicDirectory = readProductionPublicDirectoryIdentity(snapshot.root);
  const runtimeConfiguration =
    readProductionRuntimeConfigurationIdentity(snapshot.root);
  const publicAssetDigest = `sha256:${readPublicAssetDigest(snapshot.root)}`;
  if (
    !sameReceiptIdentity(receipt, snapshot.receipt)
    || receipt.sourceCommit !== snapshot.expectedSha
    || receipt.artifactDigest !== artifact.artifactDigest
    || receipt.artifactFileCount !== artifact.artifactFileCount
    || receipt.publicAssetDigest !== publicAssetDigest
    || receipt.publicDirectoryDigest
      !== publicDirectory.publicDirectoryDigest
    || receipt.publicDirectoryFileCount
      !== publicDirectory.publicDirectoryFileCount
    || receipt.runtimeConfigurationDigest
      !== runtimeConfiguration.runtimeConfigurationDigest
    || receipt.runtimeConfigurationFileCount
      !== runtimeConfiguration.runtimeConfigurationFileCount
  ) {
    throw new Error(
      "Production runtime snapshot no longer matches its verified receipt.",
    );
  }
}

export function createProductionRuntimeSnapshot(
  expectedSha: string,
  root: string = process.cwd(),
): ProductionRuntimeSnapshot {
  const receipt = assertExactProductionBuild(expectedSha, root);
  const snapshotRoot = mkdtempSync(resolve(
    tmpdir(),
    "forge-production-runtime-",
  ));
  chmodSync(snapshotRoot, 0o700);
  const snapshot: ProductionRuntimeSnapshot = Object.freeze({
    root: snapshotRoot,
    expectedSha: expectedSha.toLowerCase(),
    receipt,
  });
  try {
    copyVerifiedTree(resolve(root, ".next"), resolve(snapshotRoot, ".next"), {
      excludeTopLevel: EXCLUDED_NEXT_TOP_LEVEL,
      excludeRootFiles: EXCLUDED_NEXT_FILES,
    });
    copyPublicTreeOrCreateEmpty(
      resolve(root, "public"),
      resolve(snapshotRoot, "public"),
    );
    for (const file of PRODUCTION_RUNTIME_CONFIGURATION_FILES) {
      writeExclusiveRegularFile(
        resolve(snapshotRoot, file),
        readStableRegularFile(resolve(root, file)),
      );
    }

    // Recheck the original after copying to close the verify-to-copy window,
    // then verify the copied bytes independently.
    assertExactProductionBuild(expectedSha, root);
    assertProductionRuntimeSnapshot(snapshot);

    // Only the empty, receipt-excluded cache location remains writable.
    mkdirSync(resolve(snapshotRoot, ".next/cache"), {
      recursive: false,
      mode: 0o700,
    });
    sealDirectories(resolve(snapshotRoot, "public"));
    sealDirectories(resolve(snapshotRoot, "scripts"));
    chmodSync(resolve(snapshotRoot, "package.json"), 0o400);
    chmodSync(resolve(snapshotRoot, "next.config.ts"), 0o400);
    chmodSync(resolve(snapshotRoot, "tsconfig.json"), 0o400);
    for (const entry of readdirSync(resolve(snapshotRoot, ".next"), {
      withFileTypes: true,
    })) {
      const path = resolve(snapshotRoot, ".next", entry.name);
      if (entry.name === "cache") continue;
      if (entry.isDirectory()) sealDirectories(path);
      else chmodSync(path, 0o400);
    }
    chmodSync(resolve(snapshotRoot, ".next"), 0o500);
    chmodSync(snapshotRoot, 0o500);
    return snapshot;
  } catch (error) {
    removeProductionRuntimeSnapshot(snapshot);
    throw error;
  }
}

export function verifyCompletedProductionRuntimeSnapshot(
  snapshot: ProductionRuntimeSnapshot,
): void {
  assertProductionRuntimeSnapshot(snapshot);
  makeWritable(snapshot.root);
  clearProductionRuntimeCache(snapshot.root);
  assertProductionRuntimeSnapshot(snapshot);
}

export function removeProductionRuntimeSnapshot(
  snapshot: ProductionRuntimeSnapshot,
): void {
  try {
    makeWritable(snapshot.root);
  } catch {
    // A partially-created snapshot may not yet have a complete tree.
  }
  rmSync(snapshot.root, { force: true, recursive: true });
}

export function relativeSnapshotPath(
  snapshot: ProductionRuntimeSnapshot,
  path: string,
): string {
  return relative(snapshot.root, path).split(sep).join("/");
}

export { PRODUCTION_BUILD_RECEIPT_FILE };
