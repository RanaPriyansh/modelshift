import "server-only";

import { UniversityProtectedStudyUnavailable } from "@/src/components/forge/university/UniversityProtectedStudyUnavailable";
import { UniversityProtectedStudyWorkspace } from "@/src/components/forge/university/UniversityProtectedStudyWorkspace";

import { readUniversityProtectedStudyGate } from "./fixture-gate.server";
import { universityProtectedStudyFixtureScenarios } from "./protected-study-fixture.server";

export async function UniversityProtectedStudyDevelopmentSurface() {
  const gate = readUniversityProtectedStudyGate();
  return gate.enabled
    ? (
        <UniversityProtectedStudyWorkspace
          scenarios={await universityProtectedStudyFixtureScenarios()}
        />
      )
    : <UniversityProtectedStudyUnavailable />;
}
