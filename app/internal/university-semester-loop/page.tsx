import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import {
  UniversitySemesterLoopUnavailable,
  UniversitySemesterLoopWorkspace,
} from "@/src/components/forge/university/UniversitySemesterLoopWorkspace";

import { readUniversitySemesterLoopGate } from "./fixture-gate.server";
import { universitySemesterLoopFixtureScenarios } from "./semester-loop-fixture.server";

export const metadata: Metadata = {
  title: "Internal university semester-loop research | FORGE",
  description:
    "A fail-closed synthetic composition of source review, current capacity, an accepted learning action, and its exact protected-study boundary.",
};

export default async function InternalUniversitySemesterLoopPage() {
  const gate = process.env.NODE_ENV === "development"
    ? readUniversitySemesterLoopGate()
    : {
        enabled: false as const,
        status: "semester-loop-fixture-unavailable" as const,
      };

  return (
    <ForgeShell active="learn" surface="author">
      <main id="forge-main" tabIndex={-1}>
        {gate.enabled
          ? (
              <UniversitySemesterLoopWorkspace
                scenarios={await universitySemesterLoopFixtureScenarios()}
              />
            )
          : <UniversitySemesterLoopUnavailable />}
      </main>
    </ForgeShell>
  );
}
