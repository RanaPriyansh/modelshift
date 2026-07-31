import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Route and gate names forbidden only in public client assets. */
export const UNIVERSITY_RESEARCH_SUBSTITUTE_PUBLIC_ONLY_FORBIDDEN_MARKERS =
  Object.freeze([
    "/internal/university-research-substitute",
    "FORGE_UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE",
  ] as const);

/** Server-only substitute identities and fixture content. */
export const UNIVERSITY_RESEARCH_SUBSTITUTE_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "forge-university-research-substitute.pack-p.v1",
    "forge-university-research-substitute.pack-q.v1",
    "university-research-surface-packet.v1",
    "university-research-neutral-worksheet-renderer.v1",
    "matched-substitute.phase-minus-one.v1",
    "research-scenario-pack.northstar.v1",
    "research-scenario-pack.riverglass.v1",
    "Autumn Studio Term",
    "Spring Lab Term",
    "Systems Sketching",
    "Evidence Mapping",
    "Compare the seven examples",
  ] as const);

export const UNIVERSITY_RESEARCH_SUBSTITUTE_ORDINAL_LABELS = Object.freeze([
  "Example 1",
  "Example 2",
  "Example 3",
  "Example 4",
  "Example 5",
  "Example 6",
  "Example 7",
] as const);

const ORDINAL_LABEL_SET_MARKER =
  "university research substitute server-only ordinal label set";

export type UniversityResearchSubstituteProductionArtifact =
  Readonly<{ path: string; contents: string }>;
export type UniversityResearchSubstituteProductionArtifactLeak =
  Readonly<{ path: string; marker: string }>;

function isPublicStaticArtifact(path: string): boolean {
  return path.startsWith("static/") || path.includes("/static/");
}

export function findUniversityResearchSubstituteProductionArtifactLeaks(
  artifacts: readonly UniversityResearchSubstituteProductionArtifact[],
): readonly UniversityResearchSubstituteProductionArtifactLeak[] {
  return Object.freeze(artifacts.flatMap((artifact) => {
    const markerLeaks =
      UNIVERSITY_RESEARCH_SUBSTITUTE_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          artifact.contents.includes(marker)
            ? [Object.freeze({ path: artifact.path, marker })]
            : []
        ),
      );
    const publicOnlyMarkerLeaks = isPublicStaticArtifact(artifact.path)
      ? UNIVERSITY_RESEARCH_SUBSTITUTE_PUBLIC_ONLY_FORBIDDEN_MARKERS.flatMap(
          (marker) => (
            artifact.contents.includes(marker)
              ? [Object.freeze({ path: artifact.path, marker })]
              : []
          ),
        )
      : [];
    const labelSetLeak = UNIVERSITY_RESEARCH_SUBSTITUTE_ORDINAL_LABELS.every(
      (label) => artifact.contents.includes(label),
    )
      ? [Object.freeze({
          path: artifact.path,
          marker: ORDINAL_LABEL_SET_MARKER,
        })]
      : [];
    return [...markerLeaks, ...publicOnlyMarkerLeaks, ...labelSetLeak];
  }));
}

export function assertNoUniversityResearchSubstituteProductionArtifactLeaks(
  leaks: readonly UniversityResearchSubstituteProductionArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University research-substitute data reached production build artifacts:\n${leaks.map(
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
        `University research-substitute artifact scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return productionArtifactFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityResearchSubstituteProductionArtifacts(
  projectRoot: string = process.cwd(),
): readonly UniversityResearchSubstituteProductionArtifactLeak[] {
  const directories = [
    resolve(projectRoot, ".next/static"),
    resolve(projectRoot, ".next/server"),
  ];
  for (const directory of directories) {
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(
        "University research-substitute artifact scan requires a completed production .next build.",
      );
    }
  }
  return findUniversityResearchSubstituteProductionArtifactLeaks(
    directories.flatMap((directory) => (
      productionArtifactFiles(directory).map((absolutePath) => Object.freeze({
        path: relative(projectRoot, absolutePath),
        contents: readFileSync(absolutePath, "utf8"),
      }))
    )),
  );
}
