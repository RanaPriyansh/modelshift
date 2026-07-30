import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import {
  UniversityProtectedStudyWorkspace,
  UniversityProtectedStudyWorkspaceUnavailable,
} from "@/src/components/forge/university/UniversityProtectedStudyWorkspace";

import { readUniversityProtectedStudyGate } from "./fixture-gate.server";
import { universityProtectedStudyFixtureScenarios } from "./protected-study-fixture.server";

export const metadata: Metadata = {
  title: "Internal protected university study research | FORGE",
  description:
    "A fail-closed synthetic brief for inspecting the learning-integrity contract of an exact reviewed World.",
};

export default async function InternalUniversityProtectedStudyPage() {
  const gate = process.env.NODE_ENV === "development"
    ? readUniversityProtectedStudyGate()
    : {
        enabled: false as const,
        status: "protected-study-fixture-unavailable" as const,
      };

  return (
    <ForgeShell active="learn" surface="author">
      <main id="forge-main" tabIndex={-1}>
        {gate.enabled
          ? (
              <UniversityProtectedStudyWorkspace
                scenarios={await universityProtectedStudyFixtureScenarios()}
              />
            )
          : <UniversityProtectedStudyWorkspaceUnavailable />}
      </main>
    </ForgeShell>
  );
}
