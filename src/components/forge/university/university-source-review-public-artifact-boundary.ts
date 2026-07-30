import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Server-only sample identities and copied content forbidden in public assets. */
export const UNIVERSITY_SOURCE_REVIEW_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS = Object.freeze([
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

export type UniversitySourceReviewPublicAsset = Readonly<{ path: string; contents: string }>;
export type UniversitySourceReviewPublicArtifactLeak = Readonly<{ path: string; marker: string }>;

export function findUniversitySourceReviewPublicArtifactLeaks(
  assets: readonly UniversitySourceReviewPublicAsset[],
): readonly UniversitySourceReviewPublicArtifactLeak[] {
  return Object.freeze(assets.flatMap((asset) => (
    UNIVERSITY_SOURCE_REVIEW_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS.flatMap((marker) => (
      asset.contents.includes(marker) ? [Object.freeze({ path: asset.path, marker })] : []
    ))
  )));
}

export function assertNoUniversitySourceReviewPublicArtifactLeaks(
  leaks: readonly UniversitySourceReviewPublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(`Reviewed university source data reached public build assets:\n${leaks.map((leak) => `${leak.path}: ${leak.marker}`).join("\n")}`);
  }
}

function publicStaticFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`University source-review public-asset scan rejected symlink: ${absolutePath}`);
    }
    if (stat.isDirectory()) return publicStaticFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversitySourceReviewProductionPublicAssets(
  projectRoot: string = process.cwd(),
): readonly UniversitySourceReviewPublicArtifactLeak[] {
  const staticDirectory = resolve(projectRoot, ".next/static");
  if (!existsSync(staticDirectory) || !lstatSync(staticDirectory).isDirectory()) {
    throw new Error("University source-review public-asset scan requires a completed production .next/static build.");
  }
  const assets = publicStaticFiles(staticDirectory).map((absolutePath) => Object.freeze({
    path: relative(projectRoot, absolutePath),
    contents: readFileSync(absolutePath, "utf8"),
  }));
  return findUniversitySourceReviewPublicArtifactLeaks(assets);
}
