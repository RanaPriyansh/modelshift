import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Server-only recovery sample identities and course content forbidden in public assets. */
export const UNIVERSITY_RECOVERY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS = Object.freeze([
  "forge-university-recovery.v1",
  "recovery-item.sample-cs102",
  "recovery-item.sample-math110",
  "course-source-revision.sample-recovery-cs102-syllabus",
  "course-source-candidate.sample-recovery-cs102-deadline",
  "course-claim.sample-recovery-cs102-deadline",
  "course-source-decision.sample-recovery-cs102-deadline-accept",
  "CS102: Evidence and computation",
  "MATH110: Discrete structures",
  "Argument analysis",
  "2026-09-14T09:00:00.000Z",
] as const);

export type UniversityRecoveryPublicAsset = Readonly<{ path: string; contents: string }>;
export type UniversityRecoveryPublicArtifactLeak = Readonly<{ path: string; marker: string }>;

export function findUniversityRecoveryPublicArtifactLeaks(
  assets: readonly UniversityRecoveryPublicAsset[],
): readonly UniversityRecoveryPublicArtifactLeak[] {
  return Object.freeze(assets.flatMap((asset) => (
    UNIVERSITY_RECOVERY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS.flatMap((marker) => (
      asset.contents.includes(marker) ? [Object.freeze({ path: asset.path, marker })] : []
    ))
  )));
}

export function assertNoUniversityRecoveryPublicArtifactLeaks(
  leaks: readonly UniversityRecoveryPublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(`University recovery sample data reached public build assets:\n${leaks.map((leak) => `${leak.path}: ${leak.marker}`).join("\n")}`);
  }
}

function publicStaticFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`University recovery public-asset scan rejected symlink: ${absolutePath}`);
    }
    if (stat.isDirectory()) return publicStaticFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityRecoveryProductionPublicAssets(
  projectRoot: string = process.cwd(),
): readonly UniversityRecoveryPublicArtifactLeak[] {
  const staticDirectory = resolve(projectRoot, ".next/static");
  if (!existsSync(staticDirectory) || !lstatSync(staticDirectory).isDirectory()) {
    throw new Error("University recovery public-asset scan requires a completed production .next/static build.");
  }
  const assets = publicStaticFiles(staticDirectory).map((absolutePath) => Object.freeze({
    path: relative(projectRoot, absolutePath),
    contents: readFileSync(absolutePath, "utf8"),
  }));
  return findUniversityRecoveryPublicArtifactLeaks(assets);
}
