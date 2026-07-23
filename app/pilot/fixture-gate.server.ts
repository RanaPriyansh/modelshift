import "server-only";

/**
 * This is a server-only review switch, not a learner entitlement. It is
 * intentionally absent unless a test or review deployment provides the exact
 * value. No request input, cookie, browser storage value, or client runtime
 * configuration is read here.
 */
const REVIEW_FIXTURE_ENVIRONMENT_KEY = "FORGE_ADULT_PILOT_REVIEW_FIXTURE";
const REVIEW_FIXTURE_TOKEN = "forge-reviewed-adult-pilot-route.v1";

export type AdultPilotReviewEnvironment = Readonly<Record<string, string | undefined>>;

export type AdultPilotReviewGate = Readonly<{
  enabled: boolean;
  status: "review-fixture-enabled" | "review-fixture-unavailable";
}>;

export function readAdultPilotReviewGate(
  environment: AdultPilotReviewEnvironment = process.env,
): AdultPilotReviewGate {
  const enabled = environment[REVIEW_FIXTURE_ENVIRONMENT_KEY] === REVIEW_FIXTURE_TOKEN;
  return Object.freeze({
    enabled,
    status: enabled ? "review-fixture-enabled" : "review-fixture-unavailable",
  });
}
