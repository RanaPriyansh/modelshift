import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { UniversityTodayWorkspace } from "@/src/components/forge/university/UniversityTodayWorkspace";
import { UniversityTodayWorkspaceUnavailable } from "@/src/components/forge/university/UniversityTodayWorkspaceUnavailable";

import { readUniversityTodayGate } from "./fixture-gate.server";
import { universityTodayFixtureScenarios } from "./today-fixture.server";

export const metadata: Metadata = {
  title: "Internal university Today research · FORGE",
  description: "A fail-closed sample workspace for testing one university learning action with visible source and capacity boundaries.",
};

export default async function InternalUniversityTodayPage() {
  const gate = process.env.NODE_ENV === "development"
    ? readUniversityTodayGate()
    : { enabled: false as const, status: "today-fixture-unavailable" as const };

  return (
    <ForgeShell active="learn" surface="author">
      <main id="forge-main" tabIndex={-1}>
        {gate.enabled
          ? <UniversityTodayWorkspace scenarios={await universityTodayFixtureScenarios()} />
          : <UniversityTodayWorkspaceUnavailable />}
      </main>
    </ForgeShell>
  );
}
