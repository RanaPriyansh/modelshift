import "server-only";

import {
  UniversitySemesterLoopUnavailable,
  UniversitySemesterLoopWorkspace,
} from "@/src/components/forge/university/UniversitySemesterLoopWorkspace";

import { readUniversitySemesterLoopGate } from "./fixture-gate.server";
import { UniversityResearchCandidateDevelopmentSurface } from "./research-candidate-development-surface.server";
import { universitySemesterLoopFixtureScenarios } from "./semester-loop-fixture.server";

/**
 * Development-only route composition. Production never imports either
 * synthetic client workspace or its fixture copy into a public chunk.
 */
export async function UniversitySemesterLoopDevelopmentSurface() {
  const gate = readUniversitySemesterLoopGate();
  if (!gate.enabled) return <UniversitySemesterLoopUnavailable />;
  return gate.mode === "research_candidate"
    ? <UniversityResearchCandidateDevelopmentSurface packId={gate.packId} />
    : (
        <UniversitySemesterLoopWorkspace
          scenarios={await universitySemesterLoopFixtureScenarios()}
        />
      );
}
