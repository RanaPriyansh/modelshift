import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

/** Unique server-only semester-overview identities. */
export const UNIVERSITY_SEMESTER_OVERVIEW_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS =
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

export type UniversitySemesterOverviewProductionArtifact = Readonly<{
  path: string;
  contents: string;
}>;

export type UniversitySemesterOverviewProductionArtifactLeak = Readonly<{
  path: string;
  marker: string;
}>;

export function findUniversitySemesterOverviewProductionArtifactLeaks(
  artifacts: readonly UniversitySemesterOverviewProductionArtifact[],
): readonly UniversitySemesterOverviewProductionArtifactLeak[] {
  const leaks = artifacts.flatMap((artifact) => {
    const markerLeaks =
      UNIVERSITY_SEMESTER_OVERVIEW_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          artifact.contents.includes(marker)
            ? [Object.freeze({ path: artifact.path, marker })]
            : []
        ),
      );
    const surfaceLeak =
      UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET.every(
        (copy) => artifact.contents.includes(copy),
      )
        ? [Object.freeze({
            path: artifact.path,
            marker: UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET_MARKER,
          })]
        : [];
    return [...markerLeaks, ...surfaceLeak];
  });
  const oneArtifactAlreadyContainsSurface = leaks.some(
    (leak) => leak.marker
      === UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET_MARKER,
  );
  const allContents = artifacts
    .map((artifact) => artifact.contents)
    .join("\n");
  if (
    !oneArtifactAlreadyContainsSurface
    && UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET.every(
      (copy) => allContents.includes(copy),
    )
  ) {
    leaks.push(Object.freeze({
      path: "<production-artifacts>",
      marker: UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET_MARKER,
    }));
  }
  return Object.freeze(leaks);
}

export function assertNoUniversitySemesterOverviewProductionArtifactLeaks(
  leaks: readonly UniversitySemesterOverviewProductionArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University semester overview fixture data reached production build artifacts:\n${leaks.map((leak) => `${leak.path}: ${leak.marker}`).join("\n")}`,
    );
  }
}

function productionArtifactFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `University semester overview artifact scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return productionArtifactFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversitySemesterOverviewProductionArtifacts(
  projectRoot: string = process.cwd(),
): readonly UniversitySemesterOverviewProductionArtifactLeak[] {
  const directories = [
    resolve(projectRoot, ".next/static"),
    resolve(projectRoot, ".next/server"),
  ];
  for (const directory of directories) {
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(
        "University semester overview artifact scan requires a completed production .next build.",
      );
    }
  }
  return findUniversitySemesterOverviewProductionArtifactLeaks(
    directories.flatMap((directory) => (
      productionArtifactFiles(directory).map((absolutePath) => Object.freeze({
        path: relative(projectRoot, absolutePath),
        contents: readFileSync(absolutePath, "utf8"),
      }))
    )),
  );
}
