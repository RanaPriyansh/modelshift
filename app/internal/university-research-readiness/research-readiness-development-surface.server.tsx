import "server-only";

import {
  UniversityResearchReadinessUnavailable,
  UniversityResearchReadinessWorkspace,
} from "@/src/components/forge/university/UniversityResearchReadinessWorkspace";

import { readUniversityResearchReadinessGate } from "./fixture-gate.server";
import { universityResearchReadinessFixtureScenarios } from "./research-readiness-fixture.server";

/**
 * Development-only import boundary. The production page never imports the
 * client workspace or its synthetic protocol copy into a public chunk.
 */
export async function UniversityResearchReadinessDevelopmentSurface() {
  const gate = readUniversityResearchReadinessGate();
  return gate.enabled
    ? (
        <UniversityResearchReadinessWorkspace
          scenarios={await universityResearchReadinessFixtureScenarios()}
        />
      )
    : <UniversityResearchReadinessUnavailable />;
}
