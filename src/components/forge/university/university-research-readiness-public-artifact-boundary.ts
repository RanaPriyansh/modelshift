import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Route and gate names forbidden only in public client assets. */
export const UNIVERSITY_RESEARCH_READINESS_PUBLIC_ONLY_FORBIDDEN_MARKERS =
  Object.freeze([
    "/internal/university-research-readiness",
    "FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE",
  ] as const);

/** Server-only research-rehearsal identities and fixture content. */
export const UNIVERSITY_RESEARCH_READINESS_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "forge-university-research-readiness.v1",
    "university-research-readiness-projection.v1",
    "university-research-artifact-preflight-projection.v1",
    "synthetic_plan_coherent",
    "mechanical_parity_passed_review_required",
    "draft_invalid",
    "Rehearsal is not permission.",
    "Review the plan. Do not involve a person.",
    "Artifact evidence stops before review.",
    "research-scenario-pack.northstar.v1",
    "research-scenario-pack.riverglass.v1",
    "matched-substitute.phase-minus-one.v1",
    "moderator-packet.phase-minus-one.v1",
    "Systems Sketching",
    "Evidence Mapping",
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

export type UniversityResearchReadinessProductionArtifact =
  Readonly<{ path: string; contents: string }>;
export type UniversityResearchReadinessProductionArtifactLeak =
  Readonly<{ path: string; marker: string }>;

function isPublicStaticArtifact(path: string): boolean {
  return path.startsWith("static/") || path.includes("/static/");
}

export function findUniversityResearchReadinessProductionArtifactLeaks(
  artifacts: readonly UniversityResearchReadinessProductionArtifact[],
): readonly UniversityResearchReadinessProductionArtifactLeak[] {
  return Object.freeze(artifacts.flatMap((artifact) => {
    const markerLeaks =
      UNIVERSITY_RESEARCH_READINESS_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          artifact.contents.includes(marker)
            ? [Object.freeze({ path: artifact.path, marker })]
            : []
        ),
      );
    const publicOnlyMarkerLeaks = isPublicStaticArtifact(artifact.path)
      ? UNIVERSITY_RESEARCH_READINESS_PUBLIC_ONLY_FORBIDDEN_MARKERS.flatMap(
          (marker) => (
            artifact.contents.includes(marker)
              ? [Object.freeze({ path: artifact.path, marker })]
              : []
          ),
        )
      : [];
    const labelSetLeak = UNIVERSITY_RESEARCH_READINESS_FIXTURE_LABELS.every(
      (label) => artifact.contents.includes(label),
    )
      ? [Object.freeze({
          path: artifact.path,
          marker: UNIVERSITY_RESEARCH_READINESS_FIXTURE_LABEL_SET_MARKER,
        })]
      : [];
    return [...markerLeaks, ...publicOnlyMarkerLeaks, ...labelSetLeak];
  }));
}

export function assertNoUniversityResearchReadinessProductionArtifactLeaks(
  leaks: readonly UniversityResearchReadinessProductionArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University research-readiness sample data reached production build artifacts:\n${leaks.map(
        (leak) => `${leak.path}: ${leak.marker}`,
      ).join("\n")}`,
    );
  }
}

function productionArtifactFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `University research-readiness artifact scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return productionArtifactFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityResearchReadinessProductionArtifacts(
  projectRoot: string = process.cwd(),
): readonly UniversityResearchReadinessProductionArtifactLeak[] {
  const directories = [
    resolve(projectRoot, ".next/static"),
    resolve(projectRoot, ".next/server"),
  ];
  for (const directory of directories) {
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(
        "University research-readiness artifact scan requires a completed production .next build.",
      );
    }
  }
  return findUniversityResearchReadinessProductionArtifactLeaks(
    directories.flatMap((directory) => (
      productionArtifactFiles(directory).map((absolutePath) => Object.freeze({
        path: relative(projectRoot, absolutePath),
        contents: readFileSync(absolutePath, "utf8"),
      }))
    )),
  );
}
