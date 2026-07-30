import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Server-only semester-loop identities forbidden in public assets. */
export const UNIVERSITY_SEMESTER_LOOP_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "/internal/university-semester-loop",
    "FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE",
    "forge-university-semester-loop.v1",
    "university-semester-loop-projection.v1",
  ] as const);

/**
 * Scenario labels are individually ordinary product language. Treat the
 * complete server-owned set in one asset as the leak signal to avoid broad
 * false positives such as matching every public use of "Ready".
 */
export const UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABELS = Object.freeze([
  "Ready",
  "Source review",
  "Capacity break",
  "Tight window",
  "World changed",
  "Path complete",
  "Path blocked",
] as const);

const UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABEL_SET_MARKER =
  "university semester-loop server-only scenario label set";

export type UniversitySemesterLoopPublicAsset =
  Readonly<{ path: string; contents: string }>;
export type UniversitySemesterLoopPublicArtifactLeak =
  Readonly<{ path: string; marker: string }>;

export function findUniversitySemesterLoopPublicArtifactLeaks(
  assets: readonly UniversitySemesterLoopPublicAsset[],
): readonly UniversitySemesterLoopPublicArtifactLeak[] {
  return Object.freeze(assets.flatMap((asset) => {
    const markerLeaks =
      UNIVERSITY_SEMESTER_LOOP_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          asset.contents.includes(marker)
            ? [Object.freeze({ path: asset.path, marker })]
            : []
        ),
      );
    const labelSetLeak = UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABELS.every(
      (label) => asset.contents.includes(label),
    )
      ? [Object.freeze({
          path: asset.path,
          marker: UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABEL_SET_MARKER,
        })]
      : [];
    return [...markerLeaks, ...labelSetLeak];
  }));
}

export function assertNoUniversitySemesterLoopPublicArtifactLeaks(
  leaks: readonly UniversitySemesterLoopPublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University semester-loop sample data reached public build assets:\n${leaks.map(
        (leak) => `${leak.path}: ${leak.marker}`,
      ).join("\n")}`,
    );
  }
}

function publicStaticFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `University semester-loop public-asset scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return publicStaticFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversitySemesterLoopProductionPublicAssets(
  projectRoot: string = process.cwd(),
): readonly UniversitySemesterLoopPublicArtifactLeak[] {
  const staticDirectory = resolve(projectRoot, ".next/static");
  if (!existsSync(staticDirectory) || !lstatSync(staticDirectory).isDirectory()) {
    throw new Error(
      "University semester-loop public-asset scan requires a completed production .next/static build.",
    );
  }
  const assets = publicStaticFiles(staticDirectory).map((absolutePath) => Object.freeze({
    path: relative(projectRoot, absolutePath),
    contents: readFileSync(absolutePath, "utf8"),
  }));
  return findUniversitySemesterLoopPublicArtifactLeaks(assets);
}
