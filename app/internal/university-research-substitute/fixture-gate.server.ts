import "server-only";

import { types as nodeUtilTypes } from "node:util";

import type { UniversityResearchSurfacePackId } from "@/src/forge/university-research-artifacts/surface-packet";

const UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE_ENVIRONMENT_KEY =
  "FORGE_UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE";
const UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE_TOKENS = Object.freeze({
  "forge-university-research-substitute.pack-p.v1": "pack-p",
  "forge-university-research-substitute.pack-q.v1": "pack-q",
} as const);

export type UniversityResearchSubstituteEnvironment = Readonly<
  Record<string, string | undefined>
>;

export type UniversityResearchSubstituteGate =
  | Readonly<{
      enabled: true;
      status: "research-substitute-fixture-enabled";
      packId: UniversityResearchSurfacePackId;
    }>
  | Readonly<{
      enabled: false;
      status: "research-substitute-fixture-unavailable";
      packId: null;
    }>;

/**
 * Selects one exact server-owned authored pack. The switch creates no
 * participant, capture, approval, review, publication, or effect authority.
 */
export function readUniversityResearchSubstituteGate(
  environment: UniversityResearchSubstituteEnvironment = process.env,
): UniversityResearchSubstituteGate {
  const descriptor = (
    typeof environment === "object"
    && environment !== null
    && !nodeUtilTypes.isProxy(environment)
  )
    ? Object.getOwnPropertyDescriptor(
        environment,
        UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE_ENVIRONMENT_KEY,
      )
    : undefined;
  const value = descriptor && "value" in descriptor
    ? descriptor.value
    : undefined;
  const packId = typeof value === "string"
    ? UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE_TOKENS[
        value as keyof typeof UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE_TOKENS
      ]
    : undefined;

  return packId
    ? Object.freeze({
        enabled: true,
        status: "research-substitute-fixture-enabled",
        packId,
      })
    : Object.freeze({
        enabled: false,
        status: "research-substitute-fixture-unavailable",
        packId: null,
      });
}
