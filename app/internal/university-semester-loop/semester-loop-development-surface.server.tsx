import "server-only";

import {
  UniversitySemesterLoopUnavailable,
  UniversitySemesterLoopWorkspace,
} from "@/src/components/forge/university/UniversitySemesterLoopWorkspace";
import {
  UniversitySemesterSandboxWorkspace,
} from "@/src/components/forge/university/UniversitySemesterSandboxWorkspace";

import { readUniversitySemesterLoopGate } from "./fixture-gate.server";
import { UniversityResearchCandidateDevelopmentSurface } from "./research-candidate-development-surface.server";
import { universitySemesterSandboxFixture } from "./semester-sandbox-fixture.server";
import { universitySemesterLoopFixtureScenarios } from "./semester-loop-fixture.server";

/**
 * Development-only route composition. Production never imports either
 * synthetic client workspace or its fixture copy into a public chunk.
 */
export async function UniversitySemesterLoopDevelopmentSurface() {
  const gate = readUniversitySemesterLoopGate();
  if (!gate.enabled) return <UniversitySemesterLoopUnavailable />;
  if (gate.mode === "research_candidate") {
    return <UniversityResearchCandidateDevelopmentSurface packId={gate.packId} />;
  }
  if (gate.mode === "semester_sandbox") {
    return (
      <UniversitySemesterSandboxWorkspace
        fixture={await universitySemesterSandboxFixture()}
      />
    );
  }
  return (
    <UniversitySemesterLoopWorkspace
      scenarios={await universitySemesterLoopFixtureScenarios()}
    />
  );
}
