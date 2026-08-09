import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Unique server-only repair fixture identities. */
export const UNIVERSITY_POST_ATTEMPT_REPAIR_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "forge-university-post-attempt-repair.v1",
    "university-post-attempt-repair-request.v1",
    "university-post-attempt-repair-projection.v1",
    "university-post-attempt-repair-fixture.v1",
    "policy.university-post-attempt-repair.source-corroboration.v1",
    "fixture_only_authored_post_attempt_repair_brief",
    "fixed_internal_authored_research_mapping",
    "server_paired_synthetic_not_receipt_bound",
    "attempt.university-repair-",
    "choice:bounded-measures",
    "open-question:color-choice",
    "choice:always-harms",
    "open-question:reader-preference",
    "open-question:held-constant",
    "The access design and later measurement probably change the result.",
    "In your own notes, write one sentence that names a condition the two source briefs do not keep comparable, then end with what they still cannot establish.",
    "One named non-comparable condition plus one bounded “we still cannot tell” clause.",
    "This is a fixed mapping for that result, not an inference about the learner.",
    "A future independent proof must begin as a fresh attempt with instructional help removed. This repair cannot upgrade the prior receipt.",
  ] as const);

export const UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET =
  Object.freeze([
    "After the attempt",
    "Repair the boundary, not the answer.",
    "Name the missing comparison.",
    "Stop before inventing advice.",
  ] as const);

const UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET_MARKER =
  "university post-attempt repair server-only surface lexical set";

export type UniversityPostAttemptRepairProductionArtifact = Readonly<{
  path: string;
  contents: string;
}>;
export type UniversityPostAttemptRepairProductionArtifactLeak = Readonly<{
  path: string;
  marker: string;
}>;

export function findUniversityPostAttemptRepairProductionArtifactLeaks(
  artifacts: readonly UniversityPostAttemptRepairProductionArtifact[],
): readonly UniversityPostAttemptRepairProductionArtifactLeak[] {
  const leaks = artifacts.flatMap((artifact) => {
    const markerLeaks =
      UNIVERSITY_POST_ATTEMPT_REPAIR_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          artifact.contents.includes(marker)
            ? [Object.freeze({ path: artifact.path, marker })]
            : []
        ),
      );
    const surfaceLeak =
      UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET.every(
        (copy) => artifact.contents.includes(copy),
      )
        ? [Object.freeze({
            path: artifact.path,
            marker:
              UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET_MARKER,
          })]
        : [];
    return [...markerLeaks, ...surfaceLeak];
  });
  const oneArtifactAlreadyContainsSurface = leaks.some(
    (leak) => leak.marker
      === UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET_MARKER,
  );
  const allContents = artifacts
    .map((artifact) => artifact.contents)
    .join("\n");
  if (
    !oneArtifactAlreadyContainsSurface
    && UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET.every(
      (copy) => allContents.includes(copy),
    )
  ) {
    leaks.push(Object.freeze({
      path: "<production-artifacts>",
      marker: UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET_MARKER,
    }));
  }
  return Object.freeze(leaks);
}

export function assertNoUniversityPostAttemptRepairProductionArtifactLeaks(
  leaks: readonly UniversityPostAttemptRepairProductionArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University post-attempt repair fixture data reached production build artifacts:\n${leaks.map((leak) => `${leak.path}: ${leak.marker}`).join("\n")}`,
    );
  }
}

function productionArtifactFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `University post-attempt repair artifact scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return productionArtifactFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityPostAttemptRepairProductionArtifacts(
  projectRoot: string = process.cwd(),
): readonly UniversityPostAttemptRepairProductionArtifactLeak[] {
  const directories = [
    resolve(projectRoot, ".next/static"),
    resolve(projectRoot, ".next/server"),
  ];
  for (const directory of directories) {
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(
        "University post-attempt repair artifact scan requires a completed production .next build.",
      );
    }
  }
  return findUniversityPostAttemptRepairProductionArtifactLeaks(
    directories.flatMap((directory) => (
      productionArtifactFiles(directory).map((absolutePath) => Object.freeze({
        path: relative(projectRoot, absolutePath),
        contents: readFileSync(absolutePath, "utf8"),
      }))
    )),
  );
}
