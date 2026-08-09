import { describe, expect, it } from "vitest";

import { canonicalJson, sha256Digest } from "../events";
import {
  UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
  UNIVERSITY_RESEARCH_CANDIDATE_A_LOCAL_BUILD_DIGEST,
  UNIVERSITY_RESEARCH_SCENARIO_IDS,
} from "../university-research-operations/contracts";
import {
  authoredUniversityResearchArtifactPreflightRequest,
  compileUniversityResearchCandidateScenario,
  projectUniversityResearchArtifacts,
  UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_DESCRIPTOR,
} from ".";
import { UNIVERSITY_RESEARCH_COMMIT_A_EVIDENCE } from "./commit-a-evidence";
import { UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS } from "./contracts";
import { compileUniversityResearchSurfacePacket } from "./surface-packet";

async function compilerDescriptorDigest(): Promise<string> {
  return sha256Digest(canonicalJson({
    digestDomain: UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.candidateAdapter,
    value: UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_DESCRIPTOR,
  }));
}

describe("university research Commit A evidence binding", () => {
  it("binds the accepted candidate source and clean local build receipt", () => {
    const evidence = UNIVERSITY_RESEARCH_COMMIT_A_EVIDENCE;

    expect(evidence.candidate.sourceCommit).toBe(
      UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
    );
    expect(evidence.candidate.sourceCommit).toBe(
      "9fb4d22142deec7c29f1c15a59d0dcc4b7d118c1",
    );
    expect(evidence.build.artifactDigest).toBe(
      UNIVERSITY_RESEARCH_CANDIDATE_A_LOCAL_BUILD_DIGEST,
    );
    expect(evidence.build.sourceState).toBe("clean");
    expect(evidence.build.buildId).toContain(evidence.candidate.sourceCommit);
    expect(evidence.build.publicAssetCount).toBe(73);
    expect(evidence.supersededCandidate.disposition).toBe(
      "rejected_before_binding",
    );
    expect(evidence.supersededCandidate.sourceCommit).not.toBe(
      evidence.candidate.sourceCommit,
    );
  });

  it("recomputes the exact compiler, pack, packet, and renderer identities", async () => {
    const [
      packP,
      packQ,
      compilationP,
      compilationQ,
      compilerDigest,
      authoredRequest,
    ] =
      await Promise.all([
        compileUniversityResearchSurfacePacket("pack-p"),
        compileUniversityResearchSurfacePacket("pack-q"),
        compileUniversityResearchCandidateScenario(
          "pack-p",
          UNIVERSITY_RESEARCH_SCENARIO_IDS[0],
        ),
        compileUniversityResearchCandidateScenario(
          "pack-q",
          UNIVERSITY_RESEARCH_SCENARIO_IDS[0],
        ),
        compilerDescriptorDigest(),
        authoredUniversityResearchArtifactPreflightRequest(),
      ]);
    const evidence = UNIVERSITY_RESEARCH_COMMIT_A_EVIDENCE;
    const projection = await projectUniversityResearchArtifacts(
      authoredRequest,
    );

    expect(authoredRequest.candidateBaseline).toMatchObject({
      sourceCommit: evidence.candidate.sourceCommit,
      buildDigest: evidence.build.artifactDigest,
      bindingStatus: "manifest_only_not_rendered",
    });
    expect(compilerDigest).toBe(evidence.compiler.descriptorDigest);
    expect(compilationP.digests.compilerDigest).toBe(compilerDigest);
    expect(compilationQ.digests.compilerDigest).toBe(compilerDigest);
    expect(compilationP.digests.packDigest).toBe(
      evidence.sharedSurface.packP.packDigest,
    );
    expect(compilationQ.digests.packDigest).toBe(
      evidence.sharedSurface.packQ.packDigest,
    );
    expect(packP.packetDigest).toBe(
      evidence.sharedSurface.packP.packetDigest,
    );
    expect(packQ.packetDigest).toBe(
      evidence.sharedSurface.packQ.packetDigest,
    );
    expect(packP.rendererBindingDigest).toBe(
      evidence.sharedSurface.rendererBindingDigest,
    );
    expect(packQ.rendererBindingDigest).toBe(
      evidence.sharedSurface.rendererBindingDigest,
    );
    expect(projection.artifacts?.substitute.artifactDigest).toBe(
      evidence.sharedSurface.neutralArtifactDigest,
    );
    expect(projection.artifacts?.moderatorPacket.digest).toBe(
      evidence.sharedSurface.moderatorPacketDigest,
    );
  });

  it("retains exact observations without upgrading their authority", () => {
    const evidence = UNIVERSITY_RESEARCH_COMMIT_A_EVIDENCE;

    expect(evidence.automatedVerification).toMatchObject({
      primaryTestFilesPassed: 135,
      primaryTestsPassed: 1_235,
      evaluatorTestFilesPassed: 2,
      evaluatorTestsPassed: 13,
      typecheckPassed: true,
      lintPassed: true,
      diffCheckPassed: true,
      publicBuildBoundaryPassed: true,
    });
    expect(evidence.browserObservation).toMatchObject({
      packPSevenStatesShowExactlyOneScenario: true,
      packQSevenStatesShowExactlyOneScenario: true,
      minimumScenarioControlHeightCssPx: 44,
      horizontalOverflowObserved: false,
      nativeArrowNavigationObserved: true,
      exactLocalFragmentFocusObserved: true,
      productionTokenStillRenderedUnavailableBoundary: true,
      productionCandidateMarkersObserved: false,
    });
    expect(evidence.authority).toMatchObject({
      evidenceClass: "unsigned_local_engineering_observation",
      renderedCandidateSubstituteParityEstablished: false,
      independentEquivalenceReviewCompleted: false,
      artifactApprovalEstablished: false,
      participantOperationAuthorized: false,
      deployed: false,
      productionOperationEstablished: false,
      learningOrEfficacyEstablished: false,
    });
    expect(evidence.openGates).toHaveLength(7);
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence.browserObservation)).toBe(true);
    expect(Object.isFrozen(evidence.openGates)).toBe(true);
  });
});
