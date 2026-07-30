import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Server-only protected-study fixture identities forbidden in public assets. */
export const UNIVERSITY_PROTECTED_STUDY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "forge-university-protected-study.v1",
    "Synthetic pause used to test the fail-closed entry state.",
    "university-protected-study-request.v1",
    "university-protected-study-projection.v1",
  ] as const);

export type UniversityProtectedStudyPublicAsset =
  Readonly<{ path: string; contents: string }>;
export type UniversityProtectedStudyPublicArtifactLeak =
  Readonly<{ path: string; marker: string }>;

export function findUniversityProtectedStudyPublicArtifactLeaks(
  assets: readonly UniversityProtectedStudyPublicAsset[],
): readonly UniversityProtectedStudyPublicArtifactLeak[] {
  return Object.freeze(assets.flatMap((asset) => (
    UNIVERSITY_PROTECTED_STUDY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
      (marker) => (
        asset.contents.includes(marker)
          ? [Object.freeze({ path: asset.path, marker })]
          : []
      ),
    )
  )));
}

export function assertNoUniversityProtectedStudyPublicArtifactLeaks(
  leaks: readonly UniversityProtectedStudyPublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University protected-study sample data reached public build assets:\n${leaks.map(
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
        `University protected-study public-asset scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return publicStaticFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityProtectedStudyProductionPublicAssets(
  projectRoot: string = process.cwd(),
): readonly UniversityProtectedStudyPublicArtifactLeak[] {
  const staticDirectory = resolve(projectRoot, ".next/static");
  if (!existsSync(staticDirectory) || !lstatSync(staticDirectory).isDirectory()) {
    throw new Error(
      "University protected-study public-asset scan requires a completed production .next/static build.",
    );
  }
  const assets = publicStaticFiles(staticDirectory).map((absolutePath) => Object.freeze({
    path: relative(projectRoot, absolutePath),
    contents: readFileSync(absolutePath, "utf8"),
  }));
  return findUniversityProtectedStudyPublicArtifactLeaks(assets);
}
