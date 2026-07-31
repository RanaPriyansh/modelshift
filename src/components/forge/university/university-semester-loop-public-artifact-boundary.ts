import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Server-only semester-loop identities forbidden in public assets. */
export const UNIVERSITY_SEMESTER_LOOP_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "/internal/university-semester-loop",
    "FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE",
    "forge-university-semester-loop.v1",
    "forge-university-research-candidate.pack-p.v1",
    "forge-university-research-candidate.pack-q.v1",
    "university-semester-loop-projection.v1",
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

export type UniversitySemesterLoopPublicAsset =
  Readonly<{ path: string; contents: string }>;
export type UniversitySemesterLoopPublicArtifactLeak =
  Readonly<{ path: string; marker: string }>;

export function findUniversitySemesterLoopPublicArtifactLeaks(
  assets: readonly UniversitySemesterLoopPublicAsset[],
): readonly UniversitySemesterLoopPublicArtifactLeak[] {
  return Object.freeze(assets.flatMap((asset) => {
    const markerLeaks =
      UNIVERSITY_SEMESTER_LOOP_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          asset.contents.includes(marker)
            ? [Object.freeze({ path: asset.path, marker })]
            : []
        ),
      );
    const labelSetLeak = UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABELS.every(
      (label) => asset.contents.includes(label),
    )
      ? [Object.freeze({
          path: asset.path,
          marker: UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABEL_SET_MARKER,
        })]
      : [];
    const candidateStatusSetLeak =
      UNIVERSITY_RESEARCH_CANDIDATE_STATUS_CODES.every(
        (status) => asset.contents.includes(status),
      )
        ? [Object.freeze({
            path: asset.path,
            marker: UNIVERSITY_RESEARCH_CANDIDATE_STATUS_SET_MARKER,
          })]
        : [];
    const candidateSurfaceLexicalSetLeak =
      UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET.every(
        (copy) => asset.contents.includes(copy),
      )
        ? [Object.freeze({
            path: asset.path,
            marker:
              UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET_MARKER,
          })]
        : [];
    const packPScenarioSetLeak =
      UNIVERSITY_RESEARCH_CANDIDATE_PACK_P_SCENARIO_REFS.every(
        (scenarioRef) => asset.contents.includes(scenarioRef),
      )
        ? [Object.freeze({
            path: asset.path,
            marker:
              UNIVERSITY_RESEARCH_CANDIDATE_PACK_P_SCENARIO_SET_MARKER,
          })]
        : [];
    const packQScenarioSetLeak =
      UNIVERSITY_RESEARCH_CANDIDATE_PACK_Q_SCENARIO_REFS.every(
        (scenarioRef) => asset.contents.includes(scenarioRef),
      )
        ? [Object.freeze({
            path: asset.path,
            marker:
              UNIVERSITY_RESEARCH_CANDIDATE_PACK_Q_SCENARIO_SET_MARKER,
          })]
        : [];
    return [
      ...markerLeaks,
      ...labelSetLeak,
      ...candidateStatusSetLeak,
      ...candidateSurfaceLexicalSetLeak,
      ...packPScenarioSetLeak,
      ...packQScenarioSetLeak,
    ];
  }));
}

export function assertNoUniversitySemesterLoopPublicArtifactLeaks(
  leaks: readonly UniversitySemesterLoopPublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University semester-loop sample data reached public build assets:\n${leaks.map(
        (leak) => `${leak.path}: ${leak.marker}`,
      ).join("\n")}`,
    );
  }
}

function publicStaticFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `University semester-loop public-asset scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return publicStaticFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversitySemesterLoopProductionPublicAssets(
  projectRoot: string = process.cwd(),
): readonly UniversitySemesterLoopPublicArtifactLeak[] {
  const staticDirectory = resolve(projectRoot, ".next/static");
  if (!existsSync(staticDirectory) || !lstatSync(staticDirectory).isDirectory()) {
    throw new Error(
      "University semester-loop public-asset scan requires a completed production .next/static build.",
    );
  }
  const assets = publicStaticFiles(staticDirectory).map((absolutePath) => Object.freeze({
    path: relative(projectRoot, absolutePath),
    contents: readFileSync(absolutePath, "utf8"),
  }));
  return findUniversitySemesterLoopPublicArtifactLeaks(assets);
}
