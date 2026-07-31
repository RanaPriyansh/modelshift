import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

/** Unique server-only semester-desk identities. */
export const UNIVERSITY_SEMESTER_DESK_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "forge-university-semester-desk.v1",
    "university-semester-desk-fixture.v1",
    "Fixture-only semester inspection desk",
    "Allowed only for explicit refresh-clear synthetic inspection",
    "semester-desk-option-6f2d",
    "semester-desk-option-91ac",
    "semester-desk-option-b8e4",
    "semester-desk-option-3c75",
  ] as const);

export const UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET =
  Object.freeze([
    "Semester desk",
    "See the whole term. Choose where to look closer.",
    "Chosen by you for inspection",
    "Inspect how help turns off before proof.",
    "Course ID, not priority",
    "Caller-asserted synthetic input; not verified",
    "Tenant isolation",
    "Rights enforcement",
    "Institutional completeness",
  ] as const);

const UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET_MARKER =
  "university semester desk server-only surface lexical set";

export type UniversitySemesterDeskProductionArtifact = Readonly<{
  path: string;
  contents: string;
}>;

export type UniversitySemesterDeskProductionArtifactLeak = Readonly<{
  path: string;
  marker: string;
}>;

export function findUniversitySemesterDeskProductionArtifactLeaks(
  artifacts: readonly UniversitySemesterDeskProductionArtifact[],
): readonly UniversitySemesterDeskProductionArtifactLeak[] {
  const leaks = artifacts.flatMap((artifact) => {
    const markerLeaks =
      UNIVERSITY_SEMESTER_DESK_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          artifact.contents.includes(marker)
            ? [Object.freeze({ path: artifact.path, marker })]
            : []
        ),
      );
    const surfaceLeak =
      UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET.every(
        (copy) => artifact.contents.includes(copy),
      )
        ? [Object.freeze({
            path: artifact.path,
            marker: UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET_MARKER,
          })]
        : [];
    return [...markerLeaks, ...surfaceLeak];
  });
  const oneArtifactAlreadyContainsSurface = leaks.some(
    (leak) => leak.marker
      === UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET_MARKER,
  );
  const allContents = artifacts
    .map((artifact) => artifact.contents)
    .join("\n");
  if (
    !oneArtifactAlreadyContainsSurface
    && UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET.every(
      (copy) => allContents.includes(copy),
    )
  ) {
    leaks.push(Object.freeze({
      path: "<production-artifacts>",
      marker: UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET_MARKER,
    }));
  }
  return Object.freeze(leaks);
}

export function assertNoUniversitySemesterDeskProductionArtifactLeaks(
  leaks: readonly UniversitySemesterDeskProductionArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University semester desk fixture data reached production build artifacts:\n${leaks.map((leak) => `${leak.path}: ${leak.marker}`).join("\n")}`,
    );
  }
}

function productionArtifactFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `University semester desk artifact scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return productionArtifactFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversitySemesterDeskProductionArtifacts(
  projectRoot: string = process.cwd(),
): readonly UniversitySemesterDeskProductionArtifactLeak[] {
  const directories = [
    resolve(projectRoot, ".next/static"),
    resolve(projectRoot, ".next/server"),
  ];
  for (const directory of directories) {
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(
        "University semester desk artifact scan requires a completed production .next build.",
      );
    }
  }
  return findUniversitySemesterDeskProductionArtifactLeaks(
    directories.flatMap((directory) => (
      productionArtifactFiles(directory).map((absolutePath) => Object.freeze({
        path: relative(projectRoot, absolutePath),
        contents: readFileSync(absolutePath, "utf8"),
      }))
    )),
  );
}
