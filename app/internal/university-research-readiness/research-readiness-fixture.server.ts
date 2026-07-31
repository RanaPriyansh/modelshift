import "server-only";

import {
  UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
  UNIVERSITY_RESEARCH_CANDIDATE_ROUTE,
  UNIVERSITY_RESEARCH_DECISION_OUTCOMES,
  UNIVERSITY_RESEARCH_EVIDENCE_DIMENSIONS,
  UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
  UNIVERSITY_RESEARCH_NEUTRAL_PROMPT_SET_DIGEST,
  UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTION_SET_DIGEST,
  UNIVERSITY_RESEARCH_PROTOCOL_ID,
  UNIVERSITY_RESEARCH_PROTOCOL_DOCUMENT_DIGEST,
  UNIVERSITY_RESEARCH_PROTOCOL_VERSION,
  UNIVERSITY_RESEARCH_REQUIRED_APPROVALS,
  UNIVERSITY_RESEARCH_REQUIRED_ROLES,
  UNIVERSITY_RESEARCH_SCENARIO_IDS,
  UNIVERSITY_RESEARCH_STOP_CHECKLIST_DIGEST,
  UNIVERSITY_RESEARCH_TASK_FAMILIES,
  projectUniversityResearchReadiness,
  universityResearchApprovalEnvelopeDigest,
  type UniversityResearchReadinessProjectionV1,
  type UniversityResearchReadinessRequestV1,
} from "@/src/forge/university-research-operations";
import { canonicalJson, sha256Digest } from "@/src/forge/events";

import { universitySemesterLoopFixtureScenarios } from "../university-semester-loop/semester-loop-fixture.server";

type UniversityResearchReadinessFixtureId =
  | "invalid-protocol"
  | "missing-approval"
  | "operator-gap"
  | "comparator-mismatch"
  | "synthetic-plan-coherent";

const INFORMATION_ITEMS = Object.freeze([
  Object.freeze({
    itemId: "research-information.term",
    digest: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  }),
  Object.freeze({
    itemId: "research-information.source",
    digest: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
  }),
  Object.freeze({
    itemId: "research-information.deadline",
    digest: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
  }),
  Object.freeze({
    itemId: "research-information.capacity",
    digest: "sha256:4444444444444444444444444444444444444444444444444444444444444444",
  }),
  Object.freeze({
    itemId: "research-information.path",
    digest: "sha256:5555555555555555555555555555555555555555555555555555555555555555",
  }),
  Object.freeze({
    itemId: "research-information.world",
    digest: "sha256:6666666666666666666666666666666666666666666666666666666666666666",
  }),
  Object.freeze({
    itemId: "research-information.effects",
    digest: "sha256:7777777777777777777777777777777777777777777777777777777777777777",
  }),
] as const);

type ArtifactDigests = Readonly<{
  candidate: string;
  substitute: string;
  packP: string;
  packQ: string;
}>;

async function artifactDigests(): Promise<ArtifactDigests> {
  const candidateScenarios = await universitySemesterLoopFixtureScenarios();
  const candidate = await sha256Digest(canonicalJson(candidateScenarios));
  const substitute = await sha256Digest(canonicalJson({
    artifactRef: "matched-substitute.phase-minus-one.v1",
    status: "planned_not_authored",
    delivery: "static_manual_packet",
    informationItems: INFORMATION_ITEMS,
    taskFamilies: UNIVERSITY_RESEARCH_TASK_FAMILIES,
    taskScriptDigest: UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
    automatedSynthesisAllowed: false,
    participantDataCaptureAllowed: false,
  }));
  const packP = await sha256Digest(canonicalJson({
    packId: "pack-p",
    status: "planned_not_authored",
    scenarioIds: UNIVERSITY_RESEARCH_SCENARIO_IDS,
  }));
  const packQ = await sha256Digest(canonicalJson({
    packId: "pack-q",
    status: "planned_not_authored",
    scenarioIds: UNIVERSITY_RESEARCH_SCENARIO_IDS,
  }));
  return Object.freeze({
    candidate,
    substitute,
    packP,
    packQ,
  });
}

function baseRequest(digests: ArtifactDigests): UniversityResearchReadinessRequestV1 {
  return {
    schemaVersion: "university-research-readiness-request.v1",
    protocol: {
      protocolId: UNIVERSITY_RESEARCH_PROTOCOL_ID,
      protocolVersion: UNIVERSITY_RESEARCH_PROTOCOL_VERSION,
      protocolDocumentDigest: UNIVERSITY_RESEARCH_PROTOCOL_DOCUMENT_DIGEST,
      sourceCommit: UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
      candidateRoute: UNIVERSITY_RESEARCH_CANDIDATE_ROUTE,
      candidateRequestSchemaVersion: "university-semester-loop-request.v1",
      candidateProjectionSchemaVersion:
        "university-semester-loop-projection.v1",
      scenarioIds: [...UNIVERSITY_RESEARCH_SCENARIO_IDS],
      fixtureDigest: digests.candidate,
      candidateBuildDigest:
        "sha256:65dbe36be81ad208c52b22e627feef33601e3a1bc46df09c746a72db2da3e58d",
      lockedAt: "2026-07-31T09:00:00.000Z",
      amendmentVersion: 0,
      comparability: "baseline",
    },
    conditions: {
      candidate: {
        conditionId: "research-condition.forge-candidate",
        kind: "forge_semester_loop",
        delivery: "deterministic_internal_fixture",
        artifactDigest: digests.candidate,
        informationItems: INFORMATION_ITEMS.map((item) => ({ ...item })),
        taskFamilies: [...UNIVERSITY_RESEARCH_TASK_FAMILIES],
        taskScriptDigest: UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
        automatedSynthesisAllowed: false,
        participantDataCaptureAllowed: false,
      },
      substitute: {
        conditionId: "research-condition.matched-substitute",
        kind: "matched_manual",
        delivery: "static_manual_packet",
        artifactRef: "matched-substitute.phase-minus-one.v1",
        artifactDigest: digests.substitute,
        informationItems: INFORMATION_ITEMS.map((item) => ({ ...item })),
        taskFamilies: [...UNIVERSITY_RESEARCH_TASK_FAMILIES],
        taskScriptDigest: UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
        automatedSynthesisAllowed: false,
        participantDataCaptureAllowed: false,
      },
    },
    counterbalance: {
      plan: "paired_four_cell_two_pack",
      scenarioPacks: [
        {
          packId: "pack-p",
          packDigest: digests.packP,
          scenarioIds: [...UNIVERSITY_RESEARCH_SCENARIO_IDS],
          equivalenceReviewRef: "review.fixture.pack-p-equivalence-request",
          equivalenceReviewStatus: "requested",
        },
        {
          packId: "pack-q",
          packDigest: digests.packQ,
          scenarioIds: [...UNIVERSITY_RESEARCH_SCENARIO_IDS],
          equivalenceReviewRef: "review.fixture.pack-q-equivalence-request",
          equivalenceReviewStatus: "requested",
        },
      ],
      cells: [
        "candidate_p_then_substitute_q",
        "substitute_p_then_candidate_q",
        "candidate_q_then_substitute_p",
        "substitute_q_then_candidate_p",
      ],
      assignmentBasis: "rotating_approval_order_sequence",
    },
    taskScript: {
      exposureTaskCount: 9,
      postComparisonQuestionCount: 3,
      exposureMinutes: 12,
      resetMinutes: 3,
      exposureTaskSetDigest: UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
      postComparisonQuestionSetDigest:
        UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTION_SET_DIGEST,
      neutralPromptSetDigest: UNIVERSITY_RESEARCH_NEUTRAL_PROMPT_SET_DIGEST,
      stopChecklistDigest: UNIVERSITY_RESEARCH_STOP_CHECKLIST_DIGEST,
    },
    sample: {
      targetMinimum: 5,
      targetMaximum: 10,
      adultOnly: true,
      syntheticOnly: true,
      allStartersDenominator: true,
      withdrawalsRemainInDenominator: true,
      operatorAndSafetyStopsRemainInDenominator: true,
      technicalStopsRemainInDenominator: true,
      protocolDeviationsRemainInDenominator: true,
      unusablePermittedFieldsRemainInDenominator: true,
      incompletesReportedSeparately: true,
      attritionReportedSeparately: true,
      notExposedReportedSeparately: true,
      replacementAllowed: false,
      completersOnlyPrimaryAllowed: false,
    },
    evidence: {
      dimensions: [...UNIVERSITY_RESEARCH_EVIDENCE_DIMENSIONS],
      compositeScoreAllowed: false,
      rawQuoteCaptureAllowed: false,
      freeFormNotesCaptureAllowed: false,
    },
    decisionPlan: {
      outcomes: [...UNIVERSITY_RESEARCH_DECISION_OUTCOMES],
      minimumStartersReported: 5,
      accept: {
        nextJobCorrectRateMinimum: 0.8,
        authorityErrorMaximum: 0,
        unresolvedMaterialHarmMaximum: 0,
        candidateMustMeetOrExceedSubstitute: true,
      },
      narrow: {
        stateSpecificValueOnly: true,
      },
      repair: {
        repairableComprehensionOrAccessFailure: true,
      },
      reject: {
        noIncrementalValueOrMaterialHarm: true,
      },
      preserveNegativeFindings: true,
      preserveDissent: true,
    },
    operations: {
      roles: UNIVERSITY_RESEARCH_REQUIRED_ROLES.map((role) => ({
        role,
        operatorRef: `operator.fixture.${role.replaceAll("_", "-")}`,
      })),
      approvalReferences: UNIVERSITY_RESEARCH_REQUIRED_APPROVALS.map((kind) => ({
        kind,
        referenceId: `approval.fixture.${kind.replaceAll("_", "-")}`,
        declaredStatus: "independent_approved" as const,
        approvedEnvelopeDigest:
          "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      })),
      incidentStopRule: "stop_rehearsal_and_escalate",
      withdrawalRule: "honor_immediately_and_capture_nothing_further",
      amendmentRule: "any_change_invalidates_comparability",
    },
  };
}

async function request(
  scenario: UniversityResearchReadinessFixtureId,
  digests: ArtifactDigests,
): Promise<UniversityResearchReadinessRequestV1> {
  let base = baseRequest(digests);

  if (scenario === "invalid-protocol") {
    base = {
      ...base,
      protocol: {
        ...base.protocol,
        sourceCommit: "ffffffffffffffffffffffffffffffffffffffff",
      },
    };
  } else if (scenario === "missing-approval") {
    base = {
      ...base,
      operations: {
        ...base.operations,
        approvalReferences: base.operations.approvalReferences.slice(0, -1),
      },
    };
  } else if (scenario === "operator-gap") {
    base = {
      ...base,
      operations: {
        ...base.operations,
        roles: base.operations.roles.slice(0, -1),
      },
    };
  } else if (scenario === "comparator-mismatch") {
    base = {
      ...base,
      conditions: {
        ...base.conditions,
        substitute: {
          ...base.conditions.substitute,
          informationItems: base.conditions.substitute.informationItems.map(
            (item, index) => (
              index === 0
                ? {
                    ...item,
                    digest:
                      "sha256:8888888888888888888888888888888888888888888888888888888888888888",
                  }
                : item
            ),
          ),
        },
      },
    };
  }
  const approvedEnvelopeDigest =
    await universityResearchApprovalEnvelopeDigest(base);
  if (!approvedEnvelopeDigest) {
    throw new Error(
      "University research-readiness fixture could not bind its approval envelope.",
    );
  }
  return {
    ...base,
    operations: {
      ...base.operations,
      approvalReferences: base.operations.approvalReferences.map(
        (approval) => ({
          ...approval,
          approvedEnvelopeDigest,
        }),
      ),
    },
  };
}

export type UniversityResearchReadinessFixtureScenario = Readonly<{
  id: UniversityResearchReadinessFixtureId;
  label: string;
  projection: Readonly<UniversityResearchReadinessProjectionV1>;
}>;

export async function universityResearchReadinessFixtureScenarios(): Promise<
  readonly UniversityResearchReadinessFixtureScenario[]
> {
  const digests = await artifactDigests();
  const requests = await Promise.all([
    request("invalid-protocol", digests),
    request("comparator-mismatch", digests),
    request("missing-approval", digests),
    request("operator-gap", digests),
    request("synthetic-plan-coherent", digests),
  ]);
  const [
    invalidProtocol,
    comparatorMismatch,
    missingApproval,
    operatorGap,
    syntheticPlanCoherent,
  ] = await Promise.all([
    ...requests.map((entry) => projectUniversityResearchReadiness(entry)),
  ]);

  return Object.freeze([
    Object.freeze({
      id: "invalid-protocol",
      label: "Invalid protocol",
      projection: invalidProtocol,
    }),
    Object.freeze({
      id: "comparator-mismatch",
      label: "Comparator mismatch",
      projection: comparatorMismatch,
    }),
    Object.freeze({
      id: "missing-approval",
      label: "Missing approval",
      projection: missingApproval,
    }),
    Object.freeze({
      id: "operator-gap",
      label: "Operator gap",
      projection: operatorGap,
    }),
    Object.freeze({
      id: "synthetic-plan-coherent",
      label: "Synthetic plan coherent",
      projection: syntheticPlanCoherent,
    }),
  ]);
}
