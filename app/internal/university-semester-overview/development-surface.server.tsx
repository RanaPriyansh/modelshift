import "server-only";

import {
  UniversitySemesterOverviewUnavailable,
} from "@/src/components/forge/university/UniversitySemesterOverviewUnavailable";
import {
  UniversitySemesterOverviewWorkspace,
} from "@/src/components/forge/university/UniversitySemesterOverviewWorkspace";

import { readUniversitySemesterOverviewGate } from "./fixture-gate.server";
import { universitySemesterOverviewFixture } from "./semester-overview-fixture.server";

/**
 * Development-only composition keeps the synthetic aggregate fixture,
 * projector, client presentation, and lexical surface out of production
 * public chunks.
 */
export async function UniversitySemesterOverviewDevelopmentSurface() {
  const gate = readUniversitySemesterOverviewGate();
  if (!gate.enabled) return <UniversitySemesterOverviewUnavailable />;
  return (
    <UniversitySemesterOverviewWorkspace
      fixture={await universitySemesterOverviewFixture()}
    />
  );
}
