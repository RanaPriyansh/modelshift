import "server-only";

import { types as nodeUtilTypes } from "node:util";

const RESEARCH_READINESS_FIXTURE_ENVIRONMENT_KEY =
  "FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE";
const RESEARCH_READINESS_FIXTURE_TOKEN =
  "forge-university-research-readiness.v1";

export type UniversityResearchReadinessEnvironment = Readonly<
  Record<string, string | undefined>
>;

export type UniversityResearchReadinessGate = Readonly<{
  enabled: boolean;
  status:
    | "research-readiness-fixture-enabled"
    | "research-readiness-fixture-unavailable";
}>;

/**
 * This exact server-owned switch admits one transient synthetic operator
 * rehearsal only. It creates no approval, recruiting, recording, research,
 * participant, export, or production authority.
 */
export function readUniversityResearchReadinessGate(
  environment: UniversityResearchReadinessEnvironment = process.env,
): UniversityResearchReadinessGate {
  const descriptor = (
    typeof environment === "object"
    && environment !== null
    && !nodeUtilTypes.isProxy(environment)
  )
    ? Object.getOwnPropertyDescriptor(
        environment,
        RESEARCH_READINESS_FIXTURE_ENVIRONMENT_KEY,
      )
    : undefined;
  const enabled = Boolean(
    descriptor
    && "value" in descriptor
    && descriptor.value === RESEARCH_READINESS_FIXTURE_TOKEN,
  );

  return Object.freeze({
    enabled,
    status: enabled
      ? "research-readiness-fixture-enabled"
      : "research-readiness-fixture-unavailable",
  });
}
