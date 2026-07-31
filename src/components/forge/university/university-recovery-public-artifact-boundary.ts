import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Server-only recovery sample identities and course content. */
export const UNIVERSITY_RECOVERY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS = Object.freeze([
  "forge-university-recovery.v1",
  "forge-university-recovery-what-if.v1",
  "university-recovery-what-if-request.v1",
  "university-recovery-what-if-projection.v1",
  "university-recovery-what-if-fixture.v1",
  "development_only_transient_recovery_capacity_what_if",
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

export const UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET = Object.freeze([
  "Recovery capacity what-if",
  "What changes if the time you can use changes?",
  "Held fixed in every what-if",
  "No option is selected for you.",
] as const);

const UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET_MARKER =
  "university recovery what-if server-only surface lexical set";

export type UniversityRecoveryProductionArtifact =
  Readonly<{ path: string; contents: string }>;
export type UniversityRecoveryProductionArtifactLeak =
  Readonly<{ path: string; marker: string }>;

export function findUniversityRecoveryProductionArtifactLeaks(
  artifacts: readonly UniversityRecoveryProductionArtifact[],
): readonly UniversityRecoveryProductionArtifactLeak[] {
  const leaks = artifacts.flatMap((artifact) => {
    const markerLeaks =
      UNIVERSITY_RECOVERY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS.flatMap((marker) => (
      artifact.contents.includes(marker)
        ? [Object.freeze({ path: artifact.path, marker })]
        : []
      ));
    const surfaceLeak = UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET.every(
      (copy) => artifact.contents.includes(copy),
    )
      ? [Object.freeze({
          path: artifact.path,
          marker:
            UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET_MARKER,
        })]
      : [];
    return [...markerLeaks, ...surfaceLeak];
  });
  const oneArtifactAlreadyContainsSurface = leaks.some(
    (leak) => leak.marker
      === UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET_MARKER,
  );
  const allContents = artifacts.map((artifact) => artifact.contents).join("\n");
  if (
    !oneArtifactAlreadyContainsSurface
    && UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET.every(
      (copy) => allContents.includes(copy),
    )
  ) {
    leaks.push(Object.freeze({
      path: "<production-artifacts>",
      marker: UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET_MARKER,
    }));
  }
  return Object.freeze(leaks);
}

export function assertNoUniversityRecoveryProductionArtifactLeaks(
  leaks: readonly UniversityRecoveryProductionArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(`University recovery sample data reached production build artifacts:\n${leaks.map((leak) => `${leak.path}: ${leak.marker}`).join("\n")}`);
  }
}

function productionArtifactFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`University recovery artifact scan rejected symlink: ${absolutePath}`);
    }
    if (stat.isDirectory()) return productionArtifactFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityRecoveryProductionArtifacts(
  projectRoot: string = process.cwd(),
): readonly UniversityRecoveryProductionArtifactLeak[] {
  const directories = [
    resolve(projectRoot, ".next/static"),
    resolve(projectRoot, ".next/server"),
  ];
  for (const directory of directories) {
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(
        "University recovery artifact scan requires a completed production .next build.",
      );
    }
  }
  return findUniversityRecoveryProductionArtifactLeaks(
    directories.flatMap((directory) => (
      productionArtifactFiles(directory).map((absolutePath) => Object.freeze({
        path: relative(projectRoot, absolutePath),
        contents: readFileSync(absolutePath, "utf8"),
      }))
    )),
  );
}
