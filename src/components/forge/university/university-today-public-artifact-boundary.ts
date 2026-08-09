import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Server-only Today sample identities and course content. */
export const UNIVERSITY_TODAY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
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

export const UNIVERSITY_TODAY_SURFACE_LEXICAL_SET = Object.freeze([
  "Test an uncertain state",
  "What shaped this view",
  "Why this action",
  "No automatic fetch",
  "Projection digest",
] as const);

export type UniversityTodayProductionArtifact =
  Readonly<{ path: string; contents: string }>;
export type UniversityTodayProductionArtifactLeak =
  Readonly<{ path: string; marker: string }>;

export function findUniversityTodayProductionArtifactLeaks(
  artifacts: readonly UniversityTodayProductionArtifact[],
): readonly UniversityTodayProductionArtifactLeak[] {
  const leaks: UniversityTodayProductionArtifactLeak[] = artifacts.flatMap(
    (artifact) => (
    UNIVERSITY_TODAY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
      (marker) => (
        artifact.contents.includes(marker)
          ? [Object.freeze({ path: artifact.path, marker })]
          : []
      ),
    )
    ),
  );
  const allContents = artifacts.map((artifact) => artifact.contents).join("\n");
  if (
    UNIVERSITY_TODAY_SURFACE_LEXICAL_SET.every(
      (copy) => allContents.includes(copy),
    )
  ) {
    leaks.push(Object.freeze({
      path: "<production-artifacts>",
      marker: "University Today server-only surface lexical set",
    }));
  }
  return Object.freeze(leaks);
}

export function assertNoUniversityTodayProductionArtifactLeaks(
  leaks: readonly UniversityTodayProductionArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University Today sample data reached production build artifacts:\n${leaks.map(
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
        `University Today artifact scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return productionArtifactFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityTodayProductionArtifacts(
  projectRoot: string = process.cwd(),
): readonly UniversityTodayProductionArtifactLeak[] {
  const directories = [
    resolve(projectRoot, ".next/static"),
    resolve(projectRoot, ".next/server"),
  ];
  for (const directory of directories) {
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(
        "University Today artifact scan requires a completed production .next build.",
      );
    }
  }
  return findUniversityTodayProductionArtifactLeaks(
    directories.flatMap((directory) => (
      productionArtifactFiles(directory).map((absolutePath) => Object.freeze({
        path: relative(projectRoot, absolutePath),
        contents: readFileSync(absolutePath, "utf8"),
      }))
    )),
  );
}
