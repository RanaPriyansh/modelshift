import { copyFile, lstat, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
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
    if (path === excludedDirectory || path.startsWith(`${excludedDirectory}/`)) continue;
    if (entry.isDirectory()) output.push(...await files(root, excludedDirectory, path));
    else if (entry.isFile() && ALLOWED.has(path.slice(path.lastIndexOf(".")).toLowerCase()) && FAILURE_SCREENSHOT.test(entry.name)) output.push(path);
  }
  return output;
}

export async function writePlaywrightArtifactManifest(rootDirectory: string, testedSha: string, outputPath: string, retainedArtifactId: string, stageDirectory: string): Promise<PlaywrightArtifactManifest> {
  const root = resolve(rootDirectory);
  const stage = resolve(stageDirectory);
  let candidates: string[] = [];
  try { candidates = await files(root, stage); } catch { /* no failures produced */ }
  const artifacts: Artifact[] = [];
  let total = 0;
  let truncated = false;
  let excludedCount = 0;
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  for (const path of candidates.sort()) {
    const sourceStat = await lstat(path);
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink() || sourceStat.size < PNG_SIGNATURE.byteLength || sourceStat.size > MAX_BYTES) { excludedCount += 1; continue; }
    const bytes = sourceStat.size;
    if (artifacts.length >= MAX_FILES || total + bytes > MAX_BYTES) { truncated = true; excludedCount += 1; continue; }
    const signature = (await readFile(path)).subarray(0, PNG_SIGNATURE.byteLength);
    if (!signature.equals(PNG_SIGNATURE)) { excludedCount += 1; continue; }
    const relativePath = relative(root, path);
    const stagedPath = resolve(stage, relativePath);
    await mkdir(resolve(stagedPath, ".."), { recursive: true });
    await copyFile(path, stagedPath);
    artifacts.push({ path: relativePath, bytes });
    total += bytes;
  }
  const manifest: PlaywrightArtifactManifest = { schema_version: "1.0", report_kind: "bounded_playwright_failure_artifacts", tested_sha: testedSha, retained_artifact_ids: [retainedArtifactId], artifacts, excluded_count: excludedCount, truncated };
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(resolve(outputPath), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
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
