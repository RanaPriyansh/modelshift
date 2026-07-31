import "server-only";

import {
  UniversityPostAttemptRepairWorkspace,
} from "@/src/components/forge/university/UniversityPostAttemptRepairWorkspace";
import {
  UniversityPostAttemptRepairUnavailable,
} from "@/src/components/forge/university/UniversityPostAttemptRepairUnavailable";

import { readUniversityPostAttemptRepairGate } from "./fixture-gate.server";
import { universityPostAttemptRepairFixture } from "./post-attempt-repair-fixture.server";

/**
 * Development-only composition keeps the synthetic fixture, repair policy,
 * and client surface outside production public chunks.
 */
export async function UniversityPostAttemptRepairDevelopmentSurface() {
  const gate = readUniversityPostAttemptRepairGate();
  if (!gate.enabled) return <UniversityPostAttemptRepairUnavailable />;
  return (
    <UniversityPostAttemptRepairWorkspace
      fixture={await universityPostAttemptRepairFixture()}
    />
  );
}
