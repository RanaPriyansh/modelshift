import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import type { Stats } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_FILES = 40;
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set([".png"]);
const FAILURE_SCREENSHOT = /^test-failed-\d+\.png$/;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

type Artifact = { path: string; bytes: number };
export type PlaywrightArtifactManifest = {
  schema_version: "1.0";
  report_kind: "bounded_playwright_failure_artifacts";
  tested_sha: string;
  retained_artifact_ids: string[];
  artifacts: Artifact[];
  excluded_count: number;
  truncated: boolean;
};

async function files(root: string, excludedDirectory: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const output: string[] = [];
  for (const entry of entries) {
    const path = resolve(current, entry.name);
    if (path === excludedDirectory || path.startsWith(`${excludedDirectory}${sep}`)) continue;
    if (entry.isDirectory()) output.push(...await files(root, excludedDirectory, path));
    else if (entry.isFile() && ALLOWED.has(path.slice(path.lastIndexOf(".")).toLowerCase()) && FAILURE_SCREENSHOT.test(entry.name)) output.push(path);
  }
  return output;
}

function isStrictChild(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path.length > 0 && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

function overlaps(left: string, right: string): boolean {
  return left === right || isStrictChild(left, right) || isStrictChild(right, left);
}

async function lstatIfPresent(path: string): Promise<Stats | null> {
  try {
    return await lstat(path);
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function trustedRoot(rootDirectory: string): Promise<{ lexical: string; physical: string }> {
  const lexical = resolve(rootDirectory);
  const rootStat = await lstatIfPresent(lexical);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) throw new Error("--root must be an existing non-symlink directory");
  return { lexical, physical: await realpath(lexical) };
}

/** Walk/create one component at a time; recursive mkdir would follow a raced/symlinked chain. */
async function ensureTrustedDirectory(root: string, target: string): Promise<string> {
  if (target !== root && !isStrictChild(root, target)) throw new Error("path must remain strictly contained by the trusted root");
  const path = relative(root, target);
  let current = root;
  for (const component of path ? path.split(sep) : []) {
    current = resolve(current, component);
    let currentStat = await lstatIfPresent(current);
    if (!currentStat) {
      await mkdir(current);
      currentStat = await lstat(current);
    }
    if (!currentStat.isDirectory() || currentStat.isSymbolicLink()) throw new Error("path contains a symlink or non-directory component");
    const physical = await realpath(current);
    if (physical !== root && !isStrictChild(root, physical)) throw new Error("path resolved outside the trusted root");
    current = physical;
  }
  return current;
}

/** Validate every destructive/output boundary before touching the stage path. */
export async function validateArtifactPaths(rootDirectory: string, outputPath: string, stageDirectory: string): Promise<{ root: string; output: string; stage: string }> {
  const root = await trustedRoot(rootDirectory);
  const lexicalOutput = resolve(outputPath);
  const lexicalStage = resolve(stageDirectory);
  if (!isStrictChild(root.lexical, lexicalStage)) throw new Error("--stage-dir must be strictly contained by --root and cannot equal, contain, or sit outside it");
  if (!isStrictChild(root.lexical, lexicalOutput)) throw new Error("--output must be strictly contained by --root");
  if (overlaps(lexicalStage, lexicalOutput)) throw new Error("--stage-dir and --output must not overlap");
  // Keep caller-controlled containment lexical, then perform all filesystem
  // operations under the trusted physical root. This handles macOS /var ->
  // /private/var canonicalization without accepting a symlinked component.
  const stage = resolve(root.physical, relative(root.lexical, lexicalStage));
  const output = resolve(root.physical, relative(root.lexical, lexicalOutput));

  const trustedStage = await ensureTrustedDirectory(root.physical, stage);
  if (trustedStage !== stage) throw new Error("--stage-dir must not resolve through a symlink");
  const trustedOutputParent = await ensureTrustedDirectory(root.physical, dirname(output));
  if (trustedOutputParent !== dirname(output)) throw new Error("--output parent must not resolve through a symlink");
  const outputStat = await lstatIfPresent(output);
  if (outputStat && (outputStat.isSymbolicLink() || !outputStat.isFile())) throw new Error("--output must not be a symlink or non-regular file");
  return { root: root.physical, output, stage };
}

export async function writePlaywrightArtifactManifest(rootDirectory: string, testedSha: string, outputPath: string, retainedArtifactId: string, stageDirectory: string): Promise<PlaywrightArtifactManifest> {
  const { root, output, stage } = await validateArtifactPaths(rootDirectory, outputPath, stageDirectory);
  let candidates: string[] = [];
  try { candidates = await files(root, stage); } catch { /* no failures produced */ }
  const artifacts: Artifact[] = [];
  let total = 0;
  let truncated = false;
  let excludedCount = 0;
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage);
  await ensureTrustedDirectory(root, stage);
  for (const path of candidates.sort()) {
    const sourceStat = await lstat(path);
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink() || sourceStat.size < PNG_SIGNATURE.byteLength || sourceStat.size > MAX_BYTES) { excludedCount += 1; continue; }
    const bytes = sourceStat.size;
    if (artifacts.length >= MAX_FILES || total + bytes > MAX_BYTES) { truncated = true; excludedCount += 1; continue; }
    const signature = (await readFile(path)).subarray(0, PNG_SIGNATURE.byteLength);
    if (!signature.equals(PNG_SIGNATURE)) { excludedCount += 1; continue; }
    const relativePath = relative(root, path);
    const stagedPath = resolve(stage, relativePath);
    await ensureTrustedDirectory(root, dirname(stagedPath));
    await copyFile(path, stagedPath);
    artifacts.push({ path: relativePath, bytes });
    total += bytes;
  }
  const manifest: PlaywrightArtifactManifest = { schema_version: "1.0", report_kind: "bounded_playwright_failure_artifacts", tested_sha: testedSha, retained_artifact_ids: [retainedArtifactId], artifacts, excluded_count: excludedCount, truncated };
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

const arg = (name: string): string | undefined => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
async function main() {
  const root = arg("--root") ?? "test-results";
  const output = arg("--output") ?? "test-results/release-ops/playwright-artifact-manifest.json";
  const stageDirectory = arg("--stage-dir") ?? "test-results/release-ops/playwright-failure-artifacts";
  const sha = arg("--tested-sha") ?? process.env.GITHUB_SHA;
  const artifactId = arg("--artifact-id") ?? `forge-playwright-failure-${process.env.GITHUB_RUN_ID ?? "local"}`;
  if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) throw new Error("--tested-sha must be a full 40-character Git SHA");
  await writePlaywrightArtifactManifest(root, sha.toLowerCase(), output, artifactId, stageDirectory);
}
const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) void main().catch((error: unknown) => { console.error(`artifact manifest failed: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; });
