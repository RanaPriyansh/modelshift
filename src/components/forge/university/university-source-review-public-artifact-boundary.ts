import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Server-only sample identities and copied course content. */
export const UNIVERSITY_SOURCE_REVIEW_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "forge-university-source-review.v1",
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "term.sample-autumn-2026",
    "course.sample-cs102",
    "course-source-revision.sample-syllabus",
    "course-source-revision.sample-calendar",
    "course-source-candidate.sample-syllabus-deadline",
    "course-source-candidate.sample-calendar-deadline",
    "course-source-candidate.sample-assistance-policy",
    "course-claim.sample-assignment-one-deadline",
    "course-claim.sample-assignment-one-assistance",
    "sample-assignment-one@calendar.invalid",
    "assessment.sample-assignment-one",
    "Copied syllabus",
    "Exported course calendar",
    "Generative tools may be used for brainstorming.",
    "2026-09-12T12:30:00+05:30",
    "2026-09-13T12:30:00+05:30",
  ] as const);

export const UNIVERSITY_SOURCE_REVIEW_SURFACE_LEXICAL_SET = Object.freeze([
  "Review what your course sources say.",
  "Connected copies remain outside planning",
  "No automatic network request",
  "Institutional completeness",
  "Reset this sample",
] as const);

export type UniversitySourceReviewProductionArtifact =
  Readonly<{ path: string; contents: string }>;
export type UniversitySourceReviewProductionArtifactLeak =
  Readonly<{ path: string; marker: string }>;

export function findUniversitySourceReviewProductionArtifactLeaks(
  artifacts: readonly UniversitySourceReviewProductionArtifact[],
): readonly UniversitySourceReviewProductionArtifactLeak[] {
  const leaks: UniversitySourceReviewProductionArtifactLeak[] =
    artifacts.flatMap((artifact) => (
    UNIVERSITY_SOURCE_REVIEW_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
      (marker) => (
        artifact.contents.includes(marker)
          ? [Object.freeze({ path: artifact.path, marker })]
          : []
      ),
    )
    ));
  const allContents = artifacts.map((artifact) => artifact.contents).join("\n");
  if (
    UNIVERSITY_SOURCE_REVIEW_SURFACE_LEXICAL_SET.every(
      (copy) => allContents.includes(copy),
    )
  ) {
    leaks.push(Object.freeze({
      path: "<production-artifacts>",
      marker: "University source-review server-only surface lexical set",
    }));
  }
  return Object.freeze(leaks);
}

export function assertNoUniversitySourceReviewProductionArtifactLeaks(
  leaks: readonly UniversitySourceReviewProductionArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `Reviewed university source data reached production build artifacts:\n${leaks.map(
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
        `University source-review artifact scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return productionArtifactFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversitySourceReviewProductionArtifacts(
  projectRoot: string = process.cwd(),
): readonly UniversitySourceReviewProductionArtifactLeak[] {
  const directories = [
    resolve(projectRoot, ".next/static"),
    resolve(projectRoot, ".next/server"),
  ];
  for (const directory of directories) {
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(
        "University source-review artifact scan requires a completed production .next build.",
      );
    }
  }
  return findUniversitySourceReviewProductionArtifactLeaks(
    directories.flatMap((directory) => (
      productionArtifactFiles(directory).map((absolutePath) => Object.freeze({
        path: relative(projectRoot, absolutePath),
        contents: readFileSync(absolutePath, "utf8"),
      }))
    )),
  );
}
