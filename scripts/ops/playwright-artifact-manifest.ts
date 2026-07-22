import { lstat, mkdir, open, readdir, realpath, writeFile } from "node:fs/promises";
import { constants, type Stats } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_FILES = 40;
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set([".png"]);
const FAILURE_SCREENSHOT = /^test-failed-\d+\.png$/;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

type Artifact = { path: string; bytes: number };
type ArtifactStagingHooks = {
  /** Test-only seam: verifies a pathname replacement after open cannot alter staged bytes. */
  afterCandidateOpened?: (path: string) => Promise<void> | void;
};
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

async function readExactly(handle: Awaited<ReturnType<typeof open>>, size: number): Promise<Buffer> {
  const buffer = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const { bytesRead } = await handle.read(buffer, offset, size - offset, offset);
    if (bytesRead === 0) throw new Error("candidate changed while being read");
    offset += bytesRead;
  }
  return buffer;
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

/** Validate every stage/output boundary before creating any evidence path. */
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

  const trustedStageParent = await ensureTrustedDirectory(root.physical, dirname(stage));
  if (trustedStageParent !== dirname(stage)) throw new Error("--stage-dir parent must not resolve through a symlink");
  const stageStat = await lstatIfPresent(stage);
  if (stageStat?.isSymbolicLink()) throw new Error("--stage-dir must not be a symlink");
  if (stageStat) throw new Error("--stage-dir must not exist; staging is exclusive and never clears prior evidence");
  const trustedOutputParent = await ensureTrustedDirectory(root.physical, dirname(output));
  if (trustedOutputParent !== dirname(output)) throw new Error("--output parent must not resolve through a symlink");
  const outputStat = await lstatIfPresent(output);
  if (outputStat?.isSymbolicLink()) throw new Error("--output must not be a symlink");
  if (outputStat) throw new Error("--output must not exist; manifest creation is exclusive and never overwrites evidence");
  return { root: root.physical, output, stage };
}

export async function writePlaywrightArtifactManifest(rootDirectory: string, testedSha: string, outputPath: string, retainedArtifactId: string, stageDirectory: string, hooks: ArtifactStagingHooks = {}): Promise<PlaywrightArtifactManifest> {
  const { root, output, stage } = await validateArtifactPaths(rootDirectory, outputPath, stageDirectory);
  let candidates: string[] = [];
  try { candidates = await files(root, stage); } catch { /* no failures produced */ }
  const artifacts: Artifact[] = [];
  let total = 0;
  let truncated = false;
  let excludedCount = 0;
  await mkdir(stage);
  await ensureTrustedDirectory(root, stage);
  for (const path of candidates.sort()) {
    // Open once with O_NOFOLLOW. From here onward every fstat/read comes from
    // this descriptor, so replacing the pathname cannot switch staged bytes.
    const source = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const sourceStat = await source.stat();
      if (!sourceStat.isFile() || sourceStat.size < PNG_SIGNATURE.byteLength || sourceStat.size > MAX_BYTES) { excludedCount += 1; continue; }
      const bytes = sourceStat.size;
      if (artifacts.length >= MAX_FILES || total + bytes > MAX_BYTES) { truncated = true; excludedCount += 1; continue; }
      await hooks.afterCandidateOpened?.(path);
      const contents = await readExactly(source, bytes);
      const finalStat = await source.stat();
      if (!finalStat.isFile() || finalStat.size !== bytes || !contents.subarray(0, PNG_SIGNATURE.byteLength).equals(PNG_SIGNATURE)) { excludedCount += 1; continue; }
      const relativePath = relative(root, path);
      const stagedPath = resolve(stage, relativePath);
      await ensureTrustedDirectory(root, dirname(stagedPath));
      const destination = await open(stagedPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
      try {
        await destination.writeFile(contents);
      } finally {
        await destination.close();
      }
      artifacts.push({ path: relativePath, bytes });
      total += bytes;
    } finally {
      await source.close();
    }
  }
  const manifest: PlaywrightArtifactManifest = { schema_version: "1.0", report_kind: "bounded_playwright_failure_artifacts", tested_sha: testedSha, retained_artifact_ids: [retainedArtifactId], artifacts, excluded_count: excludedCount, truncated };
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
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
