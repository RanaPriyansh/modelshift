import "server-only";

import { UniversityTodayWorkspace } from "@/src/components/forge/university/UniversityTodayWorkspace";
import { UniversityTodayWorkspaceUnavailable } from "@/src/components/forge/university/UniversityTodayWorkspaceUnavailable";

import { readUniversityTodayGate } from "./fixture-gate.server";
import { universityTodayFixtureScenarios } from "./today-fixture.server";

export async function UniversityTodayDevelopmentSurface() {
  const gate = readUniversityTodayGate();
  return gate.enabled
    ? (
        <UniversityTodayWorkspace
          scenarios={await universityTodayFixtureScenarios()}
        />
      )
    : <UniversityTodayWorkspaceUnavailable />;
}
