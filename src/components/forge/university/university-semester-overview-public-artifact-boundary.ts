import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

/** Unique server-only semester-overview identities forbidden in public assets. */
export const UNIVERSITY_SEMESTER_OVERVIEW_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "forge-university-semester-overview.v1",
    "university-semester-overview-request.v1",
    "university-semester-overview-projection.v1",
    "university-semester-overview-fixture.v1",
    "fixture_only_semester_inspection",
    "course_id_not_priority",
    "mixed-term",
    "term-source-review",
    "capacity-choice",
    "world-changed",
    "course.sample-01-cs102",
    "course.sample-02-math110",
    "course.sample-03-hist204",
    "course.sample-04-bio120",
    "recovery-item.sample-overview-01",
    "recovery-item.sample-overview-02",
    "recovery-item.sample-overview-03",
    "recovery-item.sample-overview-04",
  ] as const);

export const UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET =
  Object.freeze([
    "Semester overview",
    "Every course. No false priority.",
    "Four distinct course boundaries",
    "Ready for inspection does not mean the semester is ready.",
  ] as const);

const UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET_MARKER =
  "university semester overview server-only surface lexical set";

export type UniversitySemesterOverviewPublicAsset = Readonly<{
  path: string;
  contents: string;
}>;

export type UniversitySemesterOverviewPublicArtifactLeak = Readonly<{
  path: string;
  marker: string;
}>;

export function findUniversitySemesterOverviewPublicArtifactLeaks(
  assets: readonly UniversitySemesterOverviewPublicAsset[],
): readonly UniversitySemesterOverviewPublicArtifactLeak[] {
  const leaks = assets.flatMap((asset) => {
    const markerLeaks =
      UNIVERSITY_SEMESTER_OVERVIEW_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          asset.contents.includes(marker)
            ? [Object.freeze({ path: asset.path, marker })]
            : []
        ),
      );
    const surfaceLeak =
      UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET.every(
        (copy) => asset.contents.includes(copy),
      )
        ? [Object.freeze({
            path: asset.path,
            marker: UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET_MARKER,
          })]
        : [];
    return [...markerLeaks, ...surfaceLeak];
  });
  const oneAssetAlreadyContainsSurface = leaks.some(
    (leak) => leak.marker
      === UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET_MARKER,
  );
  const allPublicContents = assets.map((asset) => asset.contents).join("\n");
  if (
    !oneAssetAlreadyContainsSurface
    && UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET.every(
      (copy) => allPublicContents.includes(copy),
    )
  ) {
    leaks.push(Object.freeze({
      path: "<public-static-assets>",
      marker: UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET_MARKER,
    }));
  }
  return Object.freeze(leaks);
}

export function assertNoUniversitySemesterOverviewPublicArtifactLeaks(
  leaks: readonly UniversitySemesterOverviewPublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University semester overview fixture data reached public build assets:\n${leaks.map((leak) => `${leak.path}: ${leak.marker}`).join("\n")}`,
    );
  }
}

function publicStaticFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `University semester overview public-asset scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return publicStaticFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversitySemesterOverviewProductionPublicAssets(
  projectRoot: string = process.cwd(),
): readonly UniversitySemesterOverviewPublicArtifactLeak[] {
  const staticDirectory = resolve(projectRoot, ".next/static");
  if (
    !existsSync(staticDirectory)
    || !lstatSync(staticDirectory).isDirectory()
  ) {
    throw new Error(
      "University semester overview public-asset scan requires a completed production .next/static build.",
    );
  }
  return findUniversitySemesterOverviewPublicArtifactLeaks(
    publicStaticFiles(staticDirectory).map((absolutePath) => Object.freeze({
      path: relative(projectRoot, absolutePath),
      contents: readFileSync(absolutePath, "utf8"),
    })),
  );
}
