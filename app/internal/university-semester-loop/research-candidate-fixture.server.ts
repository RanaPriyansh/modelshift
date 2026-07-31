import "server-only";

import {
  compileUniversityResearchCandidateScenario,
  type UniversityResearchCandidateCompilationV1,
  type UniversityResearchCandidatePackId,
} from "@/src/forge/university-research-artifacts";
import {
  compileUniversityResearchSurfacePacket,
  type UniversityResearchSurfacePacketV1,
} from "@/src/forge/university-research-artifacts/surface-packet";
import { UNIVERSITY_RESEARCH_SCENARIO_IDS } from "@/src/forge/university-research-operations/contracts";

export type UniversityResearchCandidateFixture = Readonly<{
  packet: Readonly<UniversityResearchSurfacePacketV1>;
  compilations: readonly Readonly<UniversityResearchCandidateCompilationV1>[];
}>;

export async function universityResearchCandidateFixture(
  packId: UniversityResearchCandidatePackId,
): Promise<UniversityResearchCandidateFixture> {
  const [packet, compilations] = await Promise.all([
    compileUniversityResearchSurfacePacket(packId),
    Promise.all(UNIVERSITY_RESEARCH_SCENARIO_IDS.map(
      (scenarioId) => compileUniversityResearchCandidateScenario(
        packId,
        scenarioId,
      ),
    )),
  ]);
  if (
    packet.packDigest !== compilations[0]?.digests.packDigest
    || compilations.some((compilation, index) => (
      compilation.packId !== packId
      || compilation.scenarioId !== UNIVERSITY_RESEARCH_SCENARIO_IDS[index]
      || compilation.digests.packDigest !== packet.packDigest
      || compilation.scenario.expectedStatus !== compilation.projection.status
    ))
  ) {
    throw new Error(
      "The research candidate fixture failed its exact surface binding.",
    );
  }
  return Object.freeze({
    packet,
    compilations: Object.freeze(compilations),
  });
}
