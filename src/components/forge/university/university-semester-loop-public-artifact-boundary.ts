import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Route and gate names forbidden only in public client assets. */
export const UNIVERSITY_SEMESTER_LOOP_PUBLIC_ONLY_FORBIDDEN_MARKERS =
  Object.freeze([
    "/internal/university-semester-loop",
    "FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE",
  ] as const);

/** Server-only semester-loop identities and fixture content. */
export const UNIVERSITY_SEMESTER_LOOP_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "forge-university-semester-loop.v1",
    "forge-university-semester-sandbox.v1",
    "forge-university-research-candidate.pack-p.v1",
    "forge-university-research-candidate.pack-q.v1",
    "university-semester-loop-projection.v1",
    "university-semester-sandbox-request.v1",
    "university-semester-sandbox-projection.v1",
    "university-semester-sandbox-fixture.v1",
    "university-research-candidate-compilation.v1",
    "university-research-candidate-compiler.v1",
    "university-research-surface-packet.v1",
    "forge.university-research.surface-packet.v1",
    "university-research-semester-loop-adapter.v1",
    "forge.university-research.candidate-fixture.v1",
    "forge.university-research.candidate-adapter.v1",
    "university-research-scenario-pack.v1",
    "research-scenario-pack.northstar.v1",
    "research-scenario-pack.riverglass.v1",
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444",
    "Autumn Studio Term",
    "Spring Lab Term",
    "Systems Sketching",
    "Evidence Mapping",
  ] as const);

/**
 * Scenario labels are individually ordinary product language. Treat the
 * complete server-owned set in one asset as the leak signal to avoid broad
 * false positives such as matching every public use of "Ready".
 */
export const UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABELS = Object.freeze([
  "Ready",
  "Source review",
  "Capacity break",
  "Tight window",
  "World changed",
  "Path complete",
  "Path blocked",
] as const);

const UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABEL_SET_MARKER =
  "university semester-loop server-only scenario label set";

/**
 * These values are individually valid domain vocabulary. Their complete set
 * is embedded by the research-candidate client surface, so finding all seven
 * together is a precise signal that the development-only surface was bundled.
 */
export const UNIVERSITY_RESEARCH_CANDIDATE_STATUS_CODES = Object.freeze([
  "protected_study_ready",
  "source_review_required",
  "recovery_required",
  "learner_choice_required",
  "world_review_required",
  "path_complete",
  "path_blocked",
] as const);

const UNIVERSITY_RESEARCH_CANDIDATE_STATUS_SET_MARKER =
  "university research-candidate server-only status set";

/**
 * Distinctive copy is checked as a complete set rather than as broad
 * individual phrases. This catches a leaked candidate UI chunk while allowing
 * ordinary public product language such as "Current bounded job".
 */
export const UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET = Object.freeze([
  "Internal university workflow research",
  "Synthetic adult fixture",
  "Stress-test the same semester",
  "One semester. One honest next move.",
  "Same canonical scenario record",
  "The facts stay inspectable.",
  "Fixed inspection script",
  "This local synthetic compilation does not establish live data",
] as const);

const UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET_MARKER =
  "university research-candidate server-only surface lexical set";

export const UNIVERSITY_SEMESTER_SANDBOX_SURFACE_LEXICAL_SET = Object.freeze([
  "From copied context to one bounded job",
  "Does this copied deadline match the checked source?",
  "Four closed server-authored outcomes",
  "The learner chooses. The fixture only shows the consequence.",
] as const);

const UNIVERSITY_SEMESTER_SANDBOX_SURFACE_LEXICAL_SET_MARKER =
  "university semester-sandbox server-only surface lexical set";

export const UNIVERSITY_RESEARCH_CANDIDATE_PACK_P_SCENARIO_REFS =
  Object.freeze([
    "scenario.northstar.ready",
    "scenario.northstar.source-review",
    "scenario.northstar.capacity-break",
    "scenario.northstar.tight-window",
    "scenario.northstar.world-changed",
    "scenario.northstar.path-complete",
    "scenario.northstar.path-blocked",
  ] as const);

export const UNIVERSITY_RESEARCH_CANDIDATE_PACK_Q_SCENARIO_REFS =
  Object.freeze([
    "scenario.riverglass.ready",
    "scenario.riverglass.source-review",
    "scenario.riverglass.capacity-break",
    "scenario.riverglass.tight-window",
    "scenario.riverglass.world-changed",
    "scenario.riverglass.path-complete",
    "scenario.riverglass.path-blocked",
  ] as const);

const UNIVERSITY_RESEARCH_CANDIDATE_PACK_P_SCENARIO_SET_MARKER =
  "university research-candidate server-only Pack P scenario set";
const UNIVERSITY_RESEARCH_CANDIDATE_PACK_Q_SCENARIO_SET_MARKER =
  "university research-candidate server-only Pack Q scenario set";

export type UniversitySemesterLoopProductionArtifact =
  Readonly<{ path: string; contents: string }>;
export type UniversitySemesterLoopProductionArtifactLeak =
  Readonly<{ path: string; marker: string }>;

function isPublicStaticArtifact(path: string): boolean {
  return path.startsWith("static/") || path.includes("/static/");
}

function findLeaksInSemesterLoopArtifact(
  artifact: UniversitySemesterLoopProductionArtifact,
): readonly UniversitySemesterLoopProductionArtifactLeak[] {
  const markerLeaks =
    UNIVERSITY_SEMESTER_LOOP_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
      (marker) => (
        artifact.contents.includes(marker)
          ? [Object.freeze({ path: artifact.path, marker })]
          : []
      ),
    );
  const publicOnlyMarkerLeaks = isPublicStaticArtifact(artifact.path)
    ? UNIVERSITY_SEMESTER_LOOP_PUBLIC_ONLY_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          artifact.contents.includes(marker)
            ? [Object.freeze({ path: artifact.path, marker })]
            : []
        ),
      )
    : [];
  const labelSetLeak = UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABELS.every(
    (label) => artifact.contents.includes(label),
  )
    ? [Object.freeze({
        path: artifact.path,
        marker: UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABEL_SET_MARKER,
      })]
    : [];
  const candidateStatusSetLeak =
    UNIVERSITY_RESEARCH_CANDIDATE_STATUS_CODES.every(
      (status) => artifact.contents.includes(status),
    )
      ? [Object.freeze({
          path: artifact.path,
          marker: UNIVERSITY_RESEARCH_CANDIDATE_STATUS_SET_MARKER,
        })]
      : [];
  const candidateSurfaceLexicalSetLeak =
    UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET.every(
      (copy) => artifact.contents.includes(copy),
    )
      ? [Object.freeze({
          path: artifact.path,
          marker:
            UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET_MARKER,
        })]
      : [];
  const sandboxSurfaceLexicalSetLeak =
    UNIVERSITY_SEMESTER_SANDBOX_SURFACE_LEXICAL_SET.every(
      (copy) => artifact.contents.includes(copy),
    )
      ? [Object.freeze({
          path: artifact.path,
          marker: UNIVERSITY_SEMESTER_SANDBOX_SURFACE_LEXICAL_SET_MARKER,
        })]
      : [];
  const packPScenarioSetLeak =
    UNIVERSITY_RESEARCH_CANDIDATE_PACK_P_SCENARIO_REFS.every(
      (scenarioRef) => artifact.contents.includes(scenarioRef),
    )
      ? [Object.freeze({
          path: artifact.path,
          marker:
            UNIVERSITY_RESEARCH_CANDIDATE_PACK_P_SCENARIO_SET_MARKER,
        })]
      : [];
  const packQScenarioSetLeak =
    UNIVERSITY_RESEARCH_CANDIDATE_PACK_Q_SCENARIO_REFS.every(
      (scenarioRef) => artifact.contents.includes(scenarioRef),
    )
      ? [Object.freeze({
          path: artifact.path,
          marker:
            UNIVERSITY_RESEARCH_CANDIDATE_PACK_Q_SCENARIO_SET_MARKER,
        })]
      : [];
  return [
    ...markerLeaks,
    ...publicOnlyMarkerLeaks,
    ...labelSetLeak,
    ...candidateStatusSetLeak,
    ...candidateSurfaceLexicalSetLeak,
    ...sandboxSurfaceLexicalSetLeak,
    ...packPScenarioSetLeak,
    ...packQScenarioSetLeak,
  ];
}

export function findUniversitySemesterLoopProductionArtifactLeaks(
  artifacts: readonly UniversitySemesterLoopProductionArtifact[],
): readonly UniversitySemesterLoopProductionArtifactLeak[] {
  const leaks: UniversitySemesterLoopProductionArtifactLeak[] =
    artifacts.flatMap(findLeaksInSemesterLoopArtifact);
  const allContents = artifacts
    .map((artifact) => artifact.contents)
    .join("\n");
  const completeSets: readonly Readonly<{
    values: readonly string[];
    marker: string;
  }>[] = [
    {
      values: UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET,
      marker: UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET_MARKER,
    },
    {
      values: UNIVERSITY_SEMESTER_SANDBOX_SURFACE_LEXICAL_SET,
      marker: UNIVERSITY_SEMESTER_SANDBOX_SURFACE_LEXICAL_SET_MARKER,
    },
    {
      values: UNIVERSITY_RESEARCH_CANDIDATE_PACK_P_SCENARIO_REFS,
      marker: UNIVERSITY_RESEARCH_CANDIDATE_PACK_P_SCENARIO_SET_MARKER,
    },
    {
      values: UNIVERSITY_RESEARCH_CANDIDATE_PACK_Q_SCENARIO_REFS,
      marker: UNIVERSITY_RESEARCH_CANDIDATE_PACK_Q_SCENARIO_SET_MARKER,
    },
  ];
  for (const completeSet of completeSets) {
    if (
      !leaks.some((leak) => leak.marker === completeSet.marker)
      && completeSet.values.every((value) => allContents.includes(value))
    ) {
      leaks.push(Object.freeze({
        path: "<production-artifacts>",
        marker: completeSet.marker,
      }));
    }
  }
  return Object.freeze(leaks);
}

export function assertNoUniversitySemesterLoopProductionArtifactLeaks(
  leaks: readonly UniversitySemesterLoopProductionArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University semester-loop sample data reached production build artifacts:\n${leaks.map(
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
        `University semester-loop artifact scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return productionArtifactFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversitySemesterLoopProductionArtifacts(
  projectRoot: string = process.cwd(),
): readonly UniversitySemesterLoopProductionArtifactLeak[] {
  const directories = [
    resolve(projectRoot, ".next/static"),
    resolve(projectRoot, ".next/server"),
  ];
  for (const directory of directories) {
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(
        "University semester-loop artifact scan requires a completed production .next build.",
      );
    }
  }
  return findUniversitySemesterLoopProductionArtifactLeaks(
    directories.flatMap((directory) => (
      productionArtifactFiles(directory).map((absolutePath) => Object.freeze({
        path: relative(projectRoot, absolutePath),
        contents: readFileSync(absolutePath, "utf8"),
      }))
    )),
  );
}
