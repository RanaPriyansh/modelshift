import "server-only";

import {
  UniversityResearchCandidateUnavailable,
  UniversityResearchCandidateWorkspace,
} from "@/src/components/forge/university/UniversityResearchCandidateWorkspace";
import type { UniversityResearchCandidatePackId } from "@/src/forge/university-research-artifacts/candidate-contracts";

import { universityResearchCandidateFixture } from "./research-candidate-fixture.server";

export async function UniversityResearchCandidateDevelopmentSurface({
  packId,
}: Readonly<{
  packId: UniversityResearchCandidatePackId;
}>) {
  const fixture = await universityResearchCandidateFixture(packId).catch(
    () => null,
  );
  return fixture
    ? (
        <UniversityResearchCandidateWorkspace
          packet={fixture.packet}
          compilations={fixture.compilations}
        />
      )
    : <UniversityResearchCandidateUnavailable />;
}
