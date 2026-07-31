import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Server-only research-rehearsal identities forbidden in public assets. */
export const UNIVERSITY_RESEARCH_READINESS_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "/internal/university-research-readiness",
    "FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE",
    "forge-university-research-readiness.v1",
    "university-research-readiness-projection.v1",
    "synthetic_plan_coherent",
    "draft_invalid",
    "Rehearsal is not permission.",
    "Review the plan. Do not involve a person.",
  ] as const);

/**
 * Individual labels are ordinary research language. The full server-owned
 * scenario set appearing together is the leak signal.
 */
export const UNIVERSITY_RESEARCH_READINESS_FIXTURE_LABELS = Object.freeze([
  "Invalid protocol",
  "Missing approval",
  "Operator gap",
  "Comparator mismatch",
  "Synthetic plan coherent",
] as const);

const UNIVERSITY_RESEARCH_READINESS_FIXTURE_LABEL_SET_MARKER =
  "university research-readiness server-only scenario label set";

export type UniversityResearchReadinessPublicAsset =
  Readonly<{ path: string; contents: string }>;
export type UniversityResearchReadinessPublicArtifactLeak =
  Readonly<{ path: string; marker: string }>;

export function findUniversityResearchReadinessPublicArtifactLeaks(
  assets: readonly UniversityResearchReadinessPublicAsset[],
): readonly UniversityResearchReadinessPublicArtifactLeak[] {
  return Object.freeze(assets.flatMap((asset) => {
    const markerLeaks =
      UNIVERSITY_RESEARCH_READINESS_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          asset.contents.includes(marker)
            ? [Object.freeze({ path: asset.path, marker })]
            : []
        ),
      );
    const labelSetLeak = UNIVERSITY_RESEARCH_READINESS_FIXTURE_LABELS.every(
      (label) => asset.contents.includes(label),
    )
      ? [Object.freeze({
          path: asset.path,
          marker: UNIVERSITY_RESEARCH_READINESS_FIXTURE_LABEL_SET_MARKER,
        })]
      : [];
    return [...markerLeaks, ...labelSetLeak];
  }));
}

export function assertNoUniversityResearchReadinessPublicArtifactLeaks(
  leaks: readonly UniversityResearchReadinessPublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University research-readiness sample data reached public build assets:\n${leaks.map(
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
        `University research-readiness public-asset scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return publicStaticFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityResearchReadinessProductionPublicAssets(
  projectRoot: string = process.cwd(),
): readonly UniversityResearchReadinessPublicArtifactLeak[] {
  const staticDirectory = resolve(projectRoot, ".next/static");
  if (!existsSync(staticDirectory) || !lstatSync(staticDirectory).isDirectory()) {
    throw new Error(
      "University research-readiness public-asset scan requires a completed production .next/static build.",
    );
  }
  const assets = publicStaticFiles(staticDirectory).map((absolutePath) => Object.freeze({
    path: relative(projectRoot, absolutePath),
    contents: readFileSync(absolutePath, "utf8"),
  }));
  return findUniversityResearchReadinessPublicArtifactLeaks(assets);
}
