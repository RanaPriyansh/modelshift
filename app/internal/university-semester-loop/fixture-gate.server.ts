import "server-only";

const SEMESTER_LOOP_FIXTURE_ENVIRONMENT_KEY =
  "FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE";
const SEMESTER_LOOP_FIXTURE_TOKEN = "forge-university-semester-loop.v1";

export type UniversitySemesterLoopEnvironment = Readonly<
  Record<string, string | undefined>
>;

export type UniversitySemesterLoopGate = Readonly<{
  enabled: boolean;
  status:
    | "semester-loop-fixture-enabled"
    | "semester-loop-fixture-unavailable";
}>;

/**
 * This exact server-owned switch admits one transient synthetic composition
 * only. It establishes no learner, course, institutional, persistence,
 * session, evidence, or production authority.
 */
export function readUniversitySemesterLoopGate(
  environment: UniversitySemesterLoopEnvironment = process.env,
): UniversitySemesterLoopGate {
  const enabled =
    environment[SEMESTER_LOOP_FIXTURE_ENVIRONMENT_KEY] ===
    SEMESTER_LOOP_FIXTURE_TOKEN;

  return Object.freeze({
    enabled,
    status: enabled
      ? "semester-loop-fixture-enabled"
      : "semester-loop-fixture-unavailable",
  });
}
