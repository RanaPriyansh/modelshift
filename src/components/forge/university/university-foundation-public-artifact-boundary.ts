import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

export const UNIVERSITY_FOUNDATION_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze({
    commandCenter: Object.freeze([
      "FORGE_UNIVERSITY_COMMAND_CENTER_FIXTURE",
      "forge-university-command-center.v1",
    ]),
    degreeMap: Object.freeze([
      "FORGE_UNIVERSITY_DEGREE_MAP_FIXTURE",
      "forge-university-degree-map.v1",
      "university-degree-map-presentation.v1",
      "source.synthetic.catalog.v1",
      "program.computing.science",
    ]),
    learningMap: Object.freeze([
      "FORGE_UNIVERSITY_LEARNING_MAP_FIXTURE",
      "forge-university-learning-map.v1",
      "course.synthetic-systems-01",
      "attempt.01-source-boundary",
      "unknown.02-evidence",
    ]),
  } as const);

export const UNIVERSITY_FOUNDATION_SURFACE_LEXICAL_SETS = Object.freeze({
  commandCenter: Object.freeze([
    "Choose a bounded university workspace.",
    "Alphabetical order / not priority",
    "Synthetic development directory",
    "No default workspace",
    "Route selection only",
  ]),
  degreeMap: Object.freeze([
    "Inspect the map. Keep the decision.",
    "Synthetic adult fixture",
    "Declared credit totals",
    "Courses and prerequisites",
    "self-attested learner declaration",
  ]),
  learningMap: Object.freeze([
    "See the map. Keep the limits.",
    "Learner-declared inspection",
    "Concept-reference order; not priority or study sequence",
    "Declared concept references",
    "Keep the unknowns visible.",
  ]),
} as const);

type UniversityFoundationSurface =
  keyof typeof UNIVERSITY_FOUNDATION_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS;

const LEXICAL_SET_MARKERS = Object.freeze({
  commandCenter: "university command center server-only surface lexical set",
  degreeMap: "university degree map server-only surface lexical set",
  learningMap: "university learning map server-only surface lexical set",
} satisfies Readonly<Record<UniversityFoundationSurface, string>>);

export type UniversityFoundationProductionArtifact = Readonly<{
  path: string;
  contents: string;
}>;

export type UniversityFoundationPublicArtifactLeak = Readonly<{
  surface: UniversityFoundationSurface;
  path: string;
  marker: string;
}>;

export function findUniversityFoundationPublicArtifactLeaks(
  artifacts: readonly UniversityFoundationProductionArtifact[],
): readonly UniversityFoundationPublicArtifactLeak[] {
  const leaks: UniversityFoundationPublicArtifactLeak[] = [];
  const allContents = artifacts.map((artifact) => artifact.contents).join("\n");

  for (
    const surface of Object.keys(
      UNIVERSITY_FOUNDATION_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
    ) as UniversityFoundationSurface[]
  ) {
    const markers = UNIVERSITY_FOUNDATION_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS[
      surface
    ];
    for (const artifact of artifacts) {
      for (const marker of markers) {
        if (artifact.contents.includes(marker)) {
          leaks.push(Object.freeze({
            surface,
            path: artifact.path,
            marker,
          }));
        }
      }
    }

    const lexicalSet = UNIVERSITY_FOUNDATION_SURFACE_LEXICAL_SETS[surface];
    if (lexicalSet.every((copy) => allContents.includes(copy))) {
      leaks.push(Object.freeze({
        surface,
        path: "<production-artifacts>",
        marker: LEXICAL_SET_MARKERS[surface],
      }));
    }
  }

  return Object.freeze(leaks);
}

export function assertNoUniversityFoundationPublicArtifactLeaks(
  leaks: readonly UniversityFoundationPublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University foundation fixture data reached production build artifacts:\n${leaks.map(
        (leak) => `${leak.surface} ${leak.path}: ${leak.marker}`,
      ).join("\n")}`,
    );
  }
}

function filesUnder(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `University foundation artifact scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return filesUnder(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityFoundationProductionArtifacts(
  projectRoot: string = process.cwd(),
): readonly UniversityFoundationPublicArtifactLeak[] {
  const directories = [
    resolve(projectRoot, ".next/static"),
    resolve(projectRoot, ".next/server"),
  ];
  for (const directory of directories) {
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(
        "University foundation artifact scan requires a completed production .next build.",
      );
    }
  }

  return findUniversityFoundationPublicArtifactLeaks(
    directories.flatMap((directory) => (
      filesUnder(directory).map((absolutePath) => Object.freeze({
        path: relative(projectRoot, absolutePath),
        contents: readFileSync(absolutePath, "utf8"),
      }))
    )),
  );
}
