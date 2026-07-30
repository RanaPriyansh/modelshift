import "server-only";

const REVIEW_FIXTURE_ENVIRONMENT_KEY = "FORGE_UNIVERSITY_SOURCE_REVIEW_FIXTURE";
const REVIEW_FIXTURE_TOKEN = "forge-university-source-review.v1";

export type UniversitySourceReviewEnvironment = Readonly<Record<string, string | undefined>>;

export type UniversitySourceReviewGate = Readonly<{
  enabled: boolean;
  status: "review-fixture-enabled" | "review-fixture-unavailable";
}>;

/**
 * This exact server-owned switch admits a reviewed fixture. It is not learner,
 * reviewer, course, or institutional authority.
 */
export function readUniversitySourceReviewGate(
  environment: UniversitySourceReviewEnvironment = process.env,
): UniversitySourceReviewGate {
  const enabled = environment[REVIEW_FIXTURE_ENVIRONMENT_KEY] === REVIEW_FIXTURE_TOKEN;
  return Object.freeze({
    enabled,
    status: enabled ? "review-fixture-enabled" : "review-fixture-unavailable",
  });
}
