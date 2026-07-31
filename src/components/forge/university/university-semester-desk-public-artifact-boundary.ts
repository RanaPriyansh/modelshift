import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

/** Unique server-only semester-desk identities forbidden in public assets. */
export const UNIVERSITY_SEMESTER_DESK_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS =
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

export type UniversitySemesterDeskPublicAsset = Readonly<{
  path: string;
  contents: string;
}>;

export type UniversitySemesterDeskPublicArtifactLeak = Readonly<{
  path: string;
  marker: string;
}>;

export function findUniversitySemesterDeskPublicArtifactLeaks(
  assets: readonly UniversitySemesterDeskPublicAsset[],
): readonly UniversitySemesterDeskPublicArtifactLeak[] {
  const leaks = assets.flatMap((asset) => {
    const markerLeaks =
      UNIVERSITY_SEMESTER_DESK_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          asset.contents.includes(marker)
            ? [Object.freeze({ path: asset.path, marker })]
            : []
        ),
      );
    const surfaceLeak =
      UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET.every(
        (copy) => asset.contents.includes(copy),
      )
        ? [Object.freeze({
            path: asset.path,
            marker: UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET_MARKER,
          })]
        : [];
    return [...markerLeaks, ...surfaceLeak];
  });
  const oneAssetAlreadyContainsSurface = leaks.some(
    (leak) => leak.marker
      === UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET_MARKER,
  );
  const allPublicContents = assets.map((asset) => asset.contents).join("\n");
  if (
    !oneAssetAlreadyContainsSurface
    && UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET.every(
      (copy) => allPublicContents.includes(copy),
    )
  ) {
    leaks.push(Object.freeze({
      path: "<public-static-assets>",
      marker: UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET_MARKER,
    }));
  }
  return Object.freeze(leaks);
}

export function assertNoUniversitySemesterDeskPublicArtifactLeaks(
  leaks: readonly UniversitySemesterDeskPublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University semester desk fixture data reached public build assets:\n${leaks.map((leak) => `${leak.path}: ${leak.marker}`).join("\n")}`,
    );
  }
}

function publicStaticFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `University semester desk public-asset scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return publicStaticFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversitySemesterDeskProductionPublicAssets(
  projectRoot: string = process.cwd(),
): readonly UniversitySemesterDeskPublicArtifactLeak[] {
  const staticDirectory = resolve(projectRoot, ".next/static");
  if (
    !existsSync(staticDirectory)
    || !lstatSync(staticDirectory).isDirectory()
  ) {
    throw new Error(
      "University semester desk public-asset scan requires a completed production .next/static build.",
    );
  }
  return findUniversitySemesterDeskPublicArtifactLeaks(
    publicStaticFiles(staticDirectory).map((absolutePath) => Object.freeze({
      path: relative(projectRoot, absolutePath),
      contents: readFileSync(absolutePath, "utf8"),
    })),
  );
}
