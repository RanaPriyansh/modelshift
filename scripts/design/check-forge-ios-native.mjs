import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const iosRoot = path.join(root, "ios", "FORGETerrain");
const sourceRoot = path.join(iosRoot, "FORGETerrain");

async function collectSwiftFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSwiftFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".swift") ? [entryPath] : [];
  }));
  return files.flat().sort();
}

const swiftFiles = await collectSwiftFiles(sourceRoot);
assert(swiftFiles.length >= 8, "The native reference must contain focused Swift source files.");

const source = (
  await Promise.all(swiftFiles.map((file) => readFile(file, "utf8")))
).join("\n");
const screenIdentifiers = [
  ...new Set(source.match(/IOS-\d+/g) ?? []),
].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

assert.equal(
  screenIdentifiers.length,
  18,
  "The native reference must contain all 18 canonical iOS screen identifiers.",
);
assert.equal(screenIdentifiers.at(0), "IOS-01");
assert.equal(screenIdentifiers.at(-1), "IOS-18");

const projectSpec = await readFile(path.join(iosRoot, "project.yml"), "utf8");
assert.match(projectSpec, /type: application/);
assert.match(projectSpec, /platform: iOS/);
assert.match(projectSpec, /iOS: "17\.0"/);

const sdkResult = spawnSync(
  "xcrun",
  ["--sdk", "iphonesimulator", "--show-sdk-path"],
  { cwd: root, encoding: "utf8" },
);
assert.equal(
  sdkResult.status,
  0,
  `Unable to resolve the iOS Simulator SDK:\n${sdkResult.stderr}`,
);
const sdkPath = sdkResult.stdout.trim();

const typecheckResult = spawnSync(
  "xcrun",
  [
    "--sdk",
    "iphonesimulator",
    "swiftc",
    "-typecheck",
    "-target",
    "arm64-apple-ios17.0-simulator",
    "-sdk",
    sdkPath,
    ...swiftFiles,
  ],
  { cwd: root, encoding: "utf8" },
);
assert.equal(
  typecheckResult.status,
  0,
  `Swift type check failed:\n${typecheckResult.stdout}\n${typecheckResult.stderr}`,
);

console.log(JSON.stringify({
  status: "pass",
  platform: "iOS 17+",
  projectSpec: path.relative(root, path.join(iosRoot, "project.yml")),
  xcodeProject: path.relative(root, path.join(iosRoot, "FORGETerrain.xcodeproj")),
  swiftFiles: swiftFiles.length,
  canonicalScreenIdentifiers: screenIdentifiers,
  simulatorSDK: path.basename(sdkPath),
  verification: "swiftc typecheck",
  runtimeGate: "A compatible installed iOS Simulator runtime is still required.",
}, null, 2));
