import "server-only";

const PROTECTED_STUDY_FIXTURE_ENVIRONMENT_KEY =
  "FORGE_UNIVERSITY_PROTECTED_STUDY_FIXTURE";
const PROTECTED_STUDY_FIXTURE_TOKEN = "forge-university-protected-study.v1";

export type UniversityProtectedStudyEnvironment =
  Readonly<Record<string, string | undefined>>;

export type UniversityProtectedStudyGate = Readonly<{
  enabled: boolean;
  status:
    | "protected-study-fixture-enabled"
    | "protected-study-fixture-unavailable";
}>;

/**
 * Admits only the synthetic protected-study brief. It establishes no learner,
 * course, World, session, evidence, provider, or persistence authority.
 */
export function readUniversityProtectedStudyGate(
  environment: UniversityProtectedStudyEnvironment = process.env,
): UniversityProtectedStudyGate {
  const enabled =
    environment[PROTECTED_STUDY_FIXTURE_ENVIRONMENT_KEY]
    === PROTECTED_STUDY_FIXTURE_TOKEN;
  return Object.freeze({
    enabled,
    status: enabled
      ? "protected-study-fixture-enabled"
      : "protected-study-fixture-unavailable",
  });
}
