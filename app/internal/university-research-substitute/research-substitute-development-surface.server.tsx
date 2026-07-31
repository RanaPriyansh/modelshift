import "server-only";

import { UniversityResearchNeutralWorksheet } from "@/src/components/forge/university/UniversityResearchNeutralWorksheet";
import { compileUniversityResearchSurfacePacket } from "@/src/forge/university-research-artifacts/surface-packet";

import { readUniversityResearchSubstituteGate } from "./fixture-gate.server";

export async function UniversityResearchSubstituteDevelopmentSurface() {
  const gate = readUniversityResearchSubstituteGate();
  return gate.enabled
    ? (
        <UniversityResearchNeutralWorksheet
          packet={await compileUniversityResearchSurfacePacket(gate.packId)}
        />
      )
    : <UniversityResearchSubstituteUnavailable />;
}

function UniversityResearchSubstituteUnavailable() {
  return (
    <main id="neutral-worksheet-main">
      <section role="alert" aria-labelledby="research-substitute-unavailable-title">
        <h1 id="research-substitute-unavailable-title">
          No neutral university research worksheet is available.
        </h1>
        <p>
          No scenario pack, comparison surface, participant task, capture, or
          external action was exposed.
        </p>
      </section>
    </main>
  );
}
