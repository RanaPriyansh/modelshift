import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Server-only Today sample identities and course content forbidden in public assets. */
export const UNIVERSITY_TODAY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS = Object.freeze([
  "forge-university-today.v1",
  "goal.sample-source-corroboration",
  "path.sample-today-source-corroboration",
  "path-revision.sample-today-source-corroboration-accepted",
  "path-node.sample-today-source-corroboration",
  "course-source-revision.sample-today-syllabus",
  "course-source-candidate.sample-today-deadline",
  "course-claim.sample-today-assignment-deadline",
  "course-source-decision.sample-today-deadline-accept",
  "CS102: Evidence and computation",
  "Reviewed syllabus copy",
  "2026-08-25T08:30:00.000Z",
] as const);

export type UniversityTodayPublicAsset = Readonly<{ path: string; contents: string }>;
export type UniversityTodayPublicArtifactLeak = Readonly<{ path: string; marker: string }>;

export function findUniversityTodayPublicArtifactLeaks(
  assets: readonly UniversityTodayPublicAsset[],
): readonly UniversityTodayPublicArtifactLeak[] {
  return Object.freeze(assets.flatMap((asset) => (
    UNIVERSITY_TODAY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS.flatMap((marker) => (
      asset.contents.includes(marker) ? [Object.freeze({ path: asset.path, marker })] : []
    ))
  )));
}

export function assertNoUniversityTodayPublicArtifactLeaks(
  leaks: readonly UniversityTodayPublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(`University Today sample data reached public build assets:\n${leaks.map((leak) => `${leak.path}: ${leak.marker}`).join("\n")}`);
  }
}

function publicStaticFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`University Today public-asset scan rejected symlink: ${absolutePath}`);
    }
    if (stat.isDirectory()) return publicStaticFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityTodayProductionPublicAssets(
  projectRoot: string = process.cwd(),
): readonly UniversityTodayPublicArtifactLeak[] {
  const staticDirectory = resolve(projectRoot, ".next/static");
  if (!existsSync(staticDirectory) || !lstatSync(staticDirectory).isDirectory()) {
    throw new Error("University Today public-asset scan requires a completed production .next/static build.");
  }
  const assets = publicStaticFiles(staticDirectory).map((absolutePath) => Object.freeze({
    path: relative(projectRoot, absolutePath),
    contents: readFileSync(absolutePath, "utf8"),
  }));
  return findUniversityTodayPublicArtifactLeaks(assets);
}
