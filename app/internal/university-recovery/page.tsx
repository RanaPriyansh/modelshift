import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { UniversityRecoveryWorkspace } from "@/src/components/forge/university/UniversityRecoveryWorkspace";
import { UniversityRecoveryWorkspaceUnavailable } from "@/src/components/forge/university/UniversityRecoveryWorkspaceUnavailable";

import { readUniversityRecoveryGate } from "./fixture-gate.server";
import { universityRecoveryFixtureScenarios } from "./recovery-fixture.server";

export const metadata: Metadata = {
  title: "Internal university recovery research | FORGE",
  description: "A fail-closed synthetic workspace for testing a transparent falling-behind recovery draft.",
};

export default async function InternalUniversityRecoveryPage() {
  const gate = process.env.NODE_ENV === "development"
    ? readUniversityRecoveryGate()
    : { enabled: false as const, status: "recovery-fixture-unavailable" as const };

  return (
    <ForgeShell active="learn" surface="author">
      <main id="forge-main" tabIndex={-1}>
        {gate.enabled
          ? <UniversityRecoveryWorkspace scenarios={await universityRecoveryFixtureScenarios()} />
          : <UniversityRecoveryWorkspaceUnavailable />}
      </main>
    </ForgeShell>
  );
}
