import "server-only";

import {
  UniversitySemesterDeskUnavailable,
} from "@/src/components/forge/university/UniversitySemesterDeskUnavailable";
import {
  UniversitySemesterDeskWorkspace,
} from "@/src/components/forge/university/UniversitySemesterDeskWorkspace";

import { readUniversitySemesterDeskGate } from "./fixture-gate.server";
import { universitySemesterDeskFixture } from "./semester-desk-fixture.server";

/**
 * Development-only composition keeps the synthetic semester-desk fixture,
 * client presentation, and lexical surface out of production public chunks.
 */
export async function UniversitySemesterDeskDevelopmentSurface() {
  const gate = readUniversitySemesterDeskGate();
  if (!gate.enabled) return <UniversitySemesterDeskUnavailable />;
  return (
    <UniversitySemesterDeskWorkspace
      fixture={await universitySemesterDeskFixture()}
    />
  );
}
