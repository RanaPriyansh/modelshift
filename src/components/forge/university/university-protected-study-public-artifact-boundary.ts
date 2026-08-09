import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Server-only protected-study fixture identities and content. */
export const UNIVERSITY_PROTECTED_STUDY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "forge-university-protected-study.v1",
    "Synthetic pause used to test the fail-closed entry state.",
    "university-protected-study-request.v1",
    "university-protected-study-projection.v1",
  ] as const);

export const UNIVERSITY_PROTECTED_STUDY_SURFACE_LEXICAL_SET = Object.freeze([
  "Test an entry boundary",
  "A learning arc, not an answer box.",
  "A receipt with its limits attached.",
  "Preview exact reviewed World",
  "Authority ceiling",
] as const);

export type UniversityProtectedStudyProductionArtifact =
  Readonly<{ path: string; contents: string }>;
export type UniversityProtectedStudyProductionArtifactLeak =
  Readonly<{ path: string; marker: string }>;

export function findUniversityProtectedStudyProductionArtifactLeaks(
  artifacts: readonly UniversityProtectedStudyProductionArtifact[],
): readonly UniversityProtectedStudyProductionArtifactLeak[] {
  const leaks: UniversityProtectedStudyProductionArtifactLeak[] =
    artifacts.flatMap((artifact) => (
    UNIVERSITY_PROTECTED_STUDY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
      (marker) => (
        artifact.contents.includes(marker)
          ? [Object.freeze({ path: artifact.path, marker })]
          : []
      ),
    )
    ));
  const allContents = artifacts.map((artifact) => artifact.contents).join("\n");
  if (
    UNIVERSITY_PROTECTED_STUDY_SURFACE_LEXICAL_SET.every(
      (copy) => allContents.includes(copy),
    )
  ) {
    leaks.push(Object.freeze({
      path: "<production-artifacts>",
      marker: "University protected-study server-only surface lexical set",
    }));
  }
  return Object.freeze(leaks);
}

export function assertNoUniversityProtectedStudyProductionArtifactLeaks(
  leaks: readonly UniversityProtectedStudyProductionArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University protected-study sample data reached production build artifacts:\n${leaks.map(
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
        `University protected-study artifact scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return productionArtifactFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityProtectedStudyProductionArtifacts(
  projectRoot: string = process.cwd(),
): readonly UniversityProtectedStudyProductionArtifactLeak[] {
  const directories = [
    resolve(projectRoot, ".next/static"),
    resolve(projectRoot, ".next/server"),
  ];
  for (const directory of directories) {
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(
        "University protected-study artifact scan requires a completed production .next build.",
      );
    }
  }
  return findUniversityProtectedStudyProductionArtifactLeaks(
    directories.flatMap((directory) => (
      productionArtifactFiles(directory).map((absolutePath) => Object.freeze({
        path: relative(projectRoot, absolutePath),
        contents: readFileSync(absolutePath, "utf8"),
      }))
    )),
  );
}
