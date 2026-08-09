import "server-only";

import {
  UniversityRecoveryWhatIfWorkspace,
} from "@/src/components/forge/university/UniversityRecoveryWhatIfWorkspace";
import {
  UniversityRecoveryWorkspace,
} from "@/src/components/forge/university/UniversityRecoveryWorkspace";
import {
  UniversityRecoveryWorkspaceUnavailable,
} from "@/src/components/forge/university/UniversityRecoveryWorkspaceUnavailable";

import { readUniversityRecoveryGate } from "./fixture-gate.server";
import { universityRecoveryFixtureScenarios } from "./recovery-fixture.server";
import { universityRecoveryWhatIfFixture } from "./recovery-what-if-fixture.server";

/**
 * Development-only route composition. Production never imports either
 * synthetic client workspace or its fixture copy into a public chunk.
 */
export async function UniversityRecoveryDevelopmentSurface() {
  const gate = readUniversityRecoveryGate();
  if (!gate.enabled) return <UniversityRecoveryWorkspaceUnavailable />;
  if (gate.mode === "capacity_what_if") {
    return (
      <UniversityRecoveryWhatIfWorkspace
        fixture={await universityRecoveryWhatIfFixture()}
      />
    );
  }
  return (
    <UniversityRecoveryWorkspace
      scenarios={await universityRecoveryFixtureScenarios()}
    />
  );
}
