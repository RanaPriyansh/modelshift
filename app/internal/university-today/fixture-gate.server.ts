import "server-only";

const TODAY_FIXTURE_ENVIRONMENT_KEY = "FORGE_UNIVERSITY_TODAY_FIXTURE";
const TODAY_FIXTURE_TOKEN = "forge-university-today.v1";

export type UniversityTodayEnvironment = Readonly<Record<string, string | undefined>>;

export type UniversityTodayGate = Readonly<{
  enabled: boolean;
  status: "today-fixture-enabled" | "today-fixture-unavailable";
}>;

/**
 * This exact server-owned switch admits synthetic workflow projections only.
 * It establishes no learner, course, institutional, or production authority.
 */
export function readUniversityTodayGate(
  environment: UniversityTodayEnvironment = process.env,
): UniversityTodayGate {
  const enabled = environment[TODAY_FIXTURE_ENVIRONMENT_KEY] === TODAY_FIXTURE_TOKEN;
  return Object.freeze({
    enabled,
    status: enabled ? "today-fixture-enabled" : "today-fixture-unavailable",
  });
}
