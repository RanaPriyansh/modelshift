import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { canonicalJson } from "../events";
import {
  UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
  UNIVERSITY_RESEARCH_DECISION_OUTCOMES,
  UNIVERSITY_RESEARCH_EVIDENCE_DIMENSIONS,
  UNIVERSITY_RESEARCH_EXPOSURE_TASKS,
  UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
  UNIVERSITY_RESEARCH_NEUTRAL_PROMPTS,
  UNIVERSITY_RESEARCH_NEUTRAL_PROMPT_SET_DIGEST,
  UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTIONS,
  UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTION_SET_DIGEST,
  UNIVERSITY_RESEARCH_PROTOCOL_ID,
  UNIVERSITY_RESEARCH_PROTOCOL_DOCUMENT_DIGEST,
  UNIVERSITY_RESEARCH_PROTOCOL_VERSION,
  UNIVERSITY_RESEARCH_SCENARIO_IDS,
  UNIVERSITY_RESEARCH_STOP_CHECKLIST,
  UNIVERSITY_RESEARCH_STOP_CHECKLIST_DIGEST,
  UNIVERSITY_RESEARCH_TASK_FAMILIES,
  projectUniversityResearchReadiness,
  universityResearchApprovalEnvelopeDigest,
  universityResearchApprovalEnvelopeValue,
  type UniversityResearchReadinessRequestV1,
} from ".";

const DIGESTS = Object.freeze({
  fixture: `sha256:${"1".repeat(64)}`,
  substitute: `sha256:${"2".repeat(64)}`,
  envelope: `sha256:${"3".repeat(64)}`,
  sources: `sha256:${"4".repeat(64)}`,
  deadline: `sha256:${"5".repeat(64)}`,
  capacity: `sha256:${"6".repeat(64)}`,
  path: `sha256:${"7".repeat(64)}`,
  world: `sha256:${"8".repeat(64)}`,
  effects: `sha256:${"9".repeat(64)}`,
  packP: `sha256:${"b".repeat(64)}`,
  packQ: `sha256:${"c".repeat(64)}`,
});

function bindApprovals(
  value: UniversityResearchReadinessRequestV1,
): UniversityResearchReadinessRequestV1 {
  const envelope = universityResearchApprovalEnvelopeValue(value);
  if (!envelope) throw new Error("Test request did not form an approval envelope.");
  const approvedEnvelopeDigest = `sha256:${createHash("sha256")
    .update(canonicalJson(envelope))
    .digest("hex")}`;
  value.operations.approvalReferences =
    value.operations.approvalReferences.map((approval) => ({
      ...approval,
      approvedEnvelopeDigest,
    }));
  return value;
}

function request(): UniversityResearchReadinessRequestV1 {
  const informationItems: UniversityResearchReadinessRequestV1[
    "conditions"
  ]["candidate"]["informationItems"] = [
    { itemId: "research-information.term", digest: DIGESTS.envelope },
    { itemId: "research-information.source", digest: DIGESTS.sources },
    { itemId: "research-information.deadline", digest: DIGESTS.deadline },
    { itemId: "research-information.capacity", digest: DIGESTS.capacity },
    { itemId: "research-information.path", digest: DIGESTS.path },
    { itemId: "research-information.world", digest: DIGESTS.world },
    { itemId: "research-information.effects", digest: DIGESTS.effects },
  ];
  const value: UniversityResearchReadinessRequestV1 = {
    schemaVersion: "university-research-readiness-request.v1",
    protocol: {
      protocolId: UNIVERSITY_RESEARCH_PROTOCOL_ID,
      protocolVersion: UNIVERSITY_RESEARCH_PROTOCOL_VERSION,
      protocolDocumentDigest: UNIVERSITY_RESEARCH_PROTOCOL_DOCUMENT_DIGEST,
      sourceCommit: UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
      candidateRoute: "/internal/university-semester-loop",
      candidateRequestSchemaVersion: "university-semester-loop-request.v1",
      candidateProjectionSchemaVersion:
        "university-semester-loop-projection.v1",
      scenarioIds: [...UNIVERSITY_RESEARCH_SCENARIO_IDS],
      fixtureDigest: DIGESTS.fixture,
      candidateBuildDigest: `sha256:${"a".repeat(64)}`,
      lockedAt: "2026-07-31T12:00:00.000Z",
      amendmentVersion: 0,
      comparability: "baseline",
    },
    conditions: {
      candidate: {
        conditionId: "condition.forge-semester-loop",
        kind: "forge_semester_loop",
        delivery: "deterministic_internal_fixture",
        artifactDigest: DIGESTS.fixture,
        informationItems: informationItems.map((entry) => ({ ...entry })),
        taskFamilies: [...UNIVERSITY_RESEARCH_TASK_FAMILIES],
        taskScriptDigest: UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
        automatedSynthesisAllowed: false,
        participantDataCaptureAllowed: false,
      },
      substitute: {
        conditionId: "condition.matched-manual-semester-loop",
        kind: "matched_manual",
        delivery: "static_manual_packet",
        artifactRef: "artifact.fixture.matched-manual-semester-loop",
        artifactDigest: DIGESTS.substitute,
        informationItems: informationItems.map((entry) => ({ ...entry })),
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
          packDigest: DIGESTS.packP,
          scenarioIds: [...UNIVERSITY_RESEARCH_SCENARIO_IDS],
          equivalenceReviewRef: "review.fixture.pack-p-equivalence-request",
          equivalenceReviewStatus: "requested",
        },
        {
          packId: "pack-q",
          packDigest: DIGESTS.packQ,
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
      roles: [
        {
          role: "principal_research_owner",
          operatorRef: "operator.fixture.principal-research-owner",
        },
        {
          role: "research_data_approver",
          operatorRef: "operator.fixture.research-data-approver",
        },
        {
          role: "study_operator",
          operatorRef: "operator.fixture.study-operator",
        },
        {
          role: "observation_operator",
          operatorRef: "operator.fixture.observation-operator",
        },
        {
          role: "incident_withdrawal_owner",
          operatorRef: "operator.fixture.incident-withdrawal-owner",
        },
        {
          role: "analysis_adjudicator",
          operatorRef: "operator.fixture.analysis-adjudicator",
        },
      ],
      approvalReferences: [
        {
          kind: "protocol",
          referenceId: "approval.fixture.protocol",
          declaredStatus: "independent_approved",
          approvedEnvelopeDigest: `sha256:${"0".repeat(64)}`,
        },
        {
          kind: "data_management",
          referenceId: "approval.fixture.data-management",
          declaredStatus: "independent_approved",
          approvedEnvelopeDigest: `sha256:${"0".repeat(64)}`,
        },
        {
          kind: "incident",
          referenceId: "approval.fixture.incident",
          declaredStatus: "independent_approved",
          approvedEnvelopeDigest: `sha256:${"0".repeat(64)}`,
        },
        {
          kind: "withdrawal",
          referenceId: "approval.fixture.withdrawal",
          declaredStatus: "independent_approved",
          approvedEnvelopeDigest: `sha256:${"0".repeat(64)}`,
        },
      ],
      incidentStopRule: "stop_rehearsal_and_escalate",
      withdrawalRule: "honor_immediately_and_capture_nothing_further",
      amendmentRule: "any_change_invalidates_comparability",
    },
  };
  return bindApprovals(value);
}

describe("projectUniversityResearchReadiness", () => {
  it("admits only a coherent synthetic preflight plan and preserves the authority ceiling", async () => {
    const projection = await projectUniversityResearchReadiness(request());

    expect(projection).toMatchObject({
      schemaVersion: "university-research-readiness-projection.v1",
      status: "synthetic_plan_coherent",
      protocol: {
        sourceCommit: UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
        candidateRoute: "/internal/university-semester-loop",
        candidateBuildDigest: `sha256:${"a".repeat(64)}`,
        lockedAt: "2026-07-31T12:00:00.000Z",
        amendmentVersion: 0,
      },
      comparator: {
        informationParity: true,
        taskParity: true,
        counterbalanceScheduleDeclared: true,
        scenarioPackCount: 2,
        candidateInformationItemCount: 7,
        candidateTaskFamilyCount: 8,
        comparisonPlanDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      },
      sample: {
        targetMinimum: 5,
        targetMaximum: 10,
        adultOnly: true,
        syntheticOnly: true,
        allStartersDenominator: true,
      },
      operations: {
        requiredRoleCount: 6,
        validFixtureRoleBindingCount: 6,
        requiredApprovalCount: 4,
        boundApprovalReferenceCount: 4,
        operationsPlanDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      },
      authority: {
        artifactIdentityAuthority: "caller_asserted_fixture_only",
        operatorIdentityAuthority: "caller_asserted_fixture_only",
        independentApprovalAuthority: "not_established",
        participantEnrollmentAllowed: false,
        participantDataCaptureAllowed: false,
        courseworkCaptureAllowed: false,
        claimUpgradeAllowed: false,
        externalSendAllowed: false,
        persistenceAllowed: false,
        eventEmissionAllowed: false,
      },
      issues: [],
    });
    expect(projection.projectionDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(projection)).not.toContain("participant_ready");
  });

  it("requires every independently declared approval without creating approval authority", async () => {
    const input = request();
    input.operations.approvalReferences = input.operations.approvalReferences
      .filter((entry) => entry.kind !== "withdrawal");

    const projection = await projectUniversityResearchReadiness(input);

    expect(projection.status).toBe("approval_required");
    expect(projection.operations.boundApprovalReferenceCount).toBe(3);
    expect(projection.issues).toContainEqual(expect.objectContaining({
      code: "approval.missing",
      path: "operations.approvalReferences.withdrawal",
    }));
    expect(projection.authority.independentApprovalAuthority).toBe(
      "not_established",
    );
  });

  it("keeps missing or conflicting operator ownership as a separate stop", async () => {
    const missing = request();
    missing.operations.roles = missing.operations.roles.filter(
      (entry) => entry.role !== "incident_withdrawal_owner",
    );
    const duplicate = request();
    duplicate.operations.roles[5] = {
      role: "analysis_adjudicator",
      operatorRef: duplicate.operations.roles[0]!.operatorRef,
    };
    bindApprovals(missing);
    bindApprovals(duplicate);

    const [missingProjection, duplicateProjection] = await Promise.all([
      projectUniversityResearchReadiness(missing),
      projectUniversityResearchReadiness(duplicate),
    ]);

    expect(missingProjection.status).toBe("operator_gap");
    expect(missingProjection.operations.validFixtureRoleBindingCount).toBe(5);
    expect(missingProjection.issues).toContainEqual(expect.objectContaining({
      code: "operator.missing",
    }));
    expect(duplicateProjection.status).toBe("operator_gap");
    expect(
      duplicateProjection.operations.validFixtureRoleBindingCount,
    ).toBe(4);
    expect(duplicateProjection.issues).toContainEqual(expect.objectContaining({
      code: "operator.conflict",
    }));
  });

  it("refuses unmatched information, task, or counterbalance conditions", async () => {
    const information = request();
    information.conditions.substitute.informationItems[0] = {
      ...information.conditions.substitute.informationItems[0]!,
      digest: `sha256:${"8".repeat(64)}`,
    };
    const tasks = request();
    tasks.conditions.substitute.taskFamilies =
      tasks.conditions.substitute.taskFamilies.slice(1);
    const order = request();
    order.counterbalance.cells = ["candidate_p_then_substitute_q"];
    const duplicate = request();
    duplicate.conditions.candidate.informationItems[1] = {
      ...duplicate.conditions.candidate.informationItems[0]!,
    };
    duplicate.conditions.substitute.informationItems[1] = {
      ...duplicate.conditions.substitute.informationItems[0]!,
    };

    const projections = await Promise.all([
      projectUniversityResearchReadiness(information),
      projectUniversityResearchReadiness(tasks),
      projectUniversityResearchReadiness(order),
      projectUniversityResearchReadiness(duplicate),
    ]);

    expect(projections.map((entry) => entry.status)).toEqual([
      "substitute_mismatch",
      "substitute_mismatch",
      "substitute_mismatch",
      "substitute_mismatch",
    ]);
    expect(projections[0]!.comparator?.informationParity).toBe(false);
    expect(projections[0]!.issues).toContainEqual(expect.objectContaining({
      code: "approval.envelope_mismatch",
    }));
    expect(projections[1]!.comparator?.taskParity).toBe(false);
    expect(
      projections[2]!.comparator?.counterbalanceScheduleDeclared,
    ).toBe(false);
  });

  it("invalidates source, scenario, digest, amendment, sample, evidence, and decision drift", async () => {
    const cases = [
      (() => {
        const value = request();
        value.protocol.sourceCommit = "a".repeat(40);
        return bindApprovals(value);
      })(),
      (() => {
        const value = request();
        value.protocol.scenarioIds = value.protocol.scenarioIds.slice(0, -1);
        return bindApprovals(value);
      })(),
      (() => {
        const value = request();
        value.protocol.fixtureDigest = `sha256:${"9".repeat(64)}`;
        return bindApprovals(value);
      })(),
      (() => {
        const value = request();
        value.protocol.amendmentVersion = 1;
        value.protocol.comparability = "invalidated_by_amendment";
        return bindApprovals(value);
      })(),
      (() => {
        const value = request();
        value.decisionPlan.minimumStartersReported = 6;
        return bindApprovals(value);
      })(),
      (() => {
        const value = request();
        value.evidence.dimensions = value.evidence.dimensions.slice(0, -1);
        return bindApprovals(value);
      })(),
      (() => {
        const value = request();
        value.decisionPlan.outcomes = ["reject", "repair", "narrow", "accept"];
        return bindApprovals(value);
      })(),
    ];
    const projections = await Promise.all(
      cases.map((entry) => projectUniversityResearchReadiness(entry)),
    );

    expect(projections.every((entry) => entry.status === "draft_invalid")).toBe(
      true,
    );
    expect(projections.map((entry) => entry.issues[0]?.code)).toEqual([
      "protocol.source_commit_mismatch",
      "protocol.scenario_set_mismatch",
      "protocol.fixture_digest_mismatch",
      "protocol.amendment_invalidates_comparability",
      "sample.plan_invalid",
      "evidence.plan_invalid",
      "decision.plan_invalid",
    ]);
  });

  it("rejects caller-selected readiness, participant fields, real coursework, and arbitrary routes", async () => {
    for (const extra of [
      { ready: true },
      { participantName: "A learner" },
      { participantEmail: "learner@example.test" },
      { coursework: "private assignment" },
      { candidateRoute: "/app/study" },
    ]) {
      const projection = await projectUniversityResearchReadiness({
        ...request(),
        ...extra,
      });
      expect(projection.status).toBe("draft_invalid");
      expect(projection.protocol).toBeNull();
      expect(projection.projectionDigest).toBeNull();
    }
  });

  it("does not execute hostile accessors or proxy traps", async () => {
    const getter = vi.fn(() => "university-research-readiness-request.v1");
    const accessor = request() as unknown as Record<string, unknown>;
    Object.defineProperty(accessor, "schemaVersion", {
      enumerable: true,
      get: getter,
    });
    const trap = vi.fn(() => {
      throw new Error("trap executed");
    });
    const proxy = new Proxy(request(), {
      getPrototypeOf: trap,
      ownKeys: trap,
      getOwnPropertyDescriptor: trap,
    });

    const [accessorProjection, proxyProjection, proxyEnvelopeDigest] =
      await Promise.all([
      projectUniversityResearchReadiness(accessor),
      projectUniversityResearchReadiness(proxy),
        universityResearchApprovalEnvelopeDigest(proxy),
      ]);

    expect(accessorProjection.status).toBe("draft_invalid");
    expect(proxyProjection.status).toBe("draft_invalid");
    expect(universityResearchApprovalEnvelopeValue(accessor)).toBeNull();
    expect(proxyEnvelopeDigest).toBeNull();
    expect(getter).not.toHaveBeenCalled();
    expect(trap).not.toHaveBeenCalled();
  });

  it("rejects cycles, sparse arrays, exotic prototypes, symbols, and excessive depth", async () => {
    const cycle: Record<string, unknown> = { ...request() };
    cycle.cycle = cycle;
    const sparse = request() as unknown as {
      conditions: { candidate: { informationItems: unknown[] } };
    };
    sparse.conditions.candidate.informationItems = new Array(2);
    const exotic = Object.create({ inherited: true }) as Record<string, unknown>;
    Object.assign(exotic, request());
    const symbol = request() as unknown as Record<PropertyKey, unknown>;
    symbol[Symbol("hidden")] = true;
    const arraySymbol = request();
    (arraySymbol.conditions.candidate.informationItems as unknown as Record<
      PropertyKey,
      unknown
    >)[Symbol("hidden")] = true;
    class ExtendedArray<T> extends Array<T> {}
    const arraySubclass = request();
    arraySubclass.conditions.candidate.informationItems = new ExtendedArray(
      ...arraySubclass.conditions.candidate.informationItems,
    );
    const tooBroad = {
      ...request(),
      unexpected: Array.from({ length: 9_000 }, () => null),
    };
    let deep: Record<string, unknown> = {};
    const tooDeep: Record<string, unknown> = {
      ...request(),
      unexpected: deep,
    };
    for (let index = 0; index < 20; index += 1) {
      deep.next = {};
      deep = deep.next as Record<string, unknown>;
    }

    const projections = await Promise.all(
      [
        cycle,
        sparse,
        exotic,
        symbol,
        arraySymbol,
        arraySubclass,
        tooBroad,
        tooDeep,
      ].map((entry) => projectUniversityResearchReadiness(entry)),
    );
    expect(projections.every((entry) => entry.status === "draft_invalid")).toBe(
      true,
    );
  });

  it("is deterministic, deeply frozen, and side-effect free", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const first = await projectUniversityResearchReadiness(request());
    const second = await projectUniversityResearchReadiness(request());

    expect(first).toEqual(second);
    expect(first.projectionDigest).toBe(second.projectionDigest);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.authority)).toBe(true);
    expect(Object.isFrozen(first.evidenceDimensions)).toBe(true);
    expect(Object.isFrozen(first.protocol)).toBe(true);
    expect(() => {
      (first.evidenceDimensions as string[]).push("combined_score");
    }).toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("binds artifact, comparison, and operations detail into the signed result", async () => {
    const baseline = await projectUniversityResearchReadiness(request());
    const changedArtifactRequest = request();
    changedArtifactRequest.conditions.substitute.artifactDigest =
      `sha256:${"b".repeat(64)}`;
    const changedOperatorRequest = request();
    changedOperatorRequest.operations.roles[0] = {
      ...changedOperatorRequest.operations.roles[0]!,
      operatorRef: "operator.fixture.principal-research-owner-two",
    };
    bindApprovals(changedArtifactRequest);
    bindApprovals(changedOperatorRequest);

    const [changedArtifact, changedOperator] = await Promise.all([
      projectUniversityResearchReadiness(changedArtifactRequest),
      projectUniversityResearchReadiness(changedOperatorRequest),
    ]);

    expect(changedArtifact.status).toBe("synthetic_plan_coherent");
    expect(changedOperator.status).toBe("synthetic_plan_coherent");
    expect(changedArtifact.comparator?.comparisonPlanDigest).not.toBe(
      baseline.comparator?.comparisonPlanDigest,
    );
    expect(changedOperator.operations.operationsPlanDigest).not.toBe(
      baseline.operations.operationsPlanDigest,
    );
    expect(changedArtifact.projectionDigest).not.toBe(baseline.projectionDigest);
    expect(changedOperator.projectionDigest).not.toBe(baseline.projectionDigest);
  });

  it("requires approval references to bind the exact reviewed envelope", async () => {
    const staleApproval = request();
    staleApproval.protocol.lockedAt = "2026-07-31T12:01:00.000Z";

    const projection = await projectUniversityResearchReadiness(staleApproval);

    expect(projection.status).toBe("approval_required");
    expect(projection.operations.boundApprovalReferenceCount).toBe(0);
    expect(projection.issues.filter(
      (entry) => entry.code === "approval.envelope_mismatch",
    )).toHaveLength(4);
  });

  it("binds the exact protocol document and canonical script/checklist sets", async () => {
    const digest = (value: string | Buffer): string => `sha256:${createHash(
      "sha256",
    ).update(value).digest("hex")}`;
    const protocolDocument = readFileSync(
      "docs/program/UNIVERSITY_PHASE_MINUS_ONE_PROTOCOL.md",
    );
    const protocolText = protocolDocument.toString("utf8");

    expect(digest(protocolDocument)).toBe(
      UNIVERSITY_RESEARCH_PROTOCOL_DOCUMENT_DIGEST,
    );
    expect(digest(canonicalJson(UNIVERSITY_RESEARCH_EXPOSURE_TASKS))).toBe(
      UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
    );
    expect(digest(canonicalJson(
      UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTIONS,
    ))).toBe(UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTION_SET_DIGEST);
    expect(digest(canonicalJson(UNIVERSITY_RESEARCH_NEUTRAL_PROMPTS))).toBe(
      UNIVERSITY_RESEARCH_NEUTRAL_PROMPT_SET_DIGEST,
    );
    expect(digest(canonicalJson(UNIVERSITY_RESEARCH_STOP_CHECKLIST))).toBe(
      UNIVERSITY_RESEARCH_STOP_CHECKLIST_DIGEST,
    );
    for (const exactText of [
      ...UNIVERSITY_RESEARCH_EXPOSURE_TASKS,
      ...UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTIONS,
      ...UNIVERSITY_RESEARCH_NEUTRAL_PROMPTS,
      ...UNIVERSITY_RESEARCH_STOP_CHECKLIST,
    ]) {
      expect(protocolText).toContain(exactText);
    }

    const envelope = universityResearchApprovalEnvelopeValue(request());
    expect(envelope).toMatchObject({
      digestPurpose: "university-research-approval-envelope.v1",
      schemaVersion: "university-research-readiness-request.v1",
    });
  });

  it("rejects protocol-document or canonical task-set drift under version 1.0.0", async () => {
    const documentDrift = request() as unknown as {
      protocol: { protocolDocumentDigest: string };
    };
    documentDrift.protocol.protocolDocumentDigest =
      `sha256:${"d".repeat(64)}`;
    const taskDrift = request() as unknown as {
      taskScript: { exposureTaskSetDigest: string };
    };
    taskDrift.taskScript.exposureTaskSetDigest = `sha256:${"e".repeat(64)}`;

    const [documentProjection, taskProjection] = await Promise.all([
      projectUniversityResearchReadiness(documentDrift),
      projectUniversityResearchReadiness(taskDrift),
    ]);

    expect(documentProjection.status).toBe("draft_invalid");
    expect(documentProjection.protocol).toBeNull();
    expect(taskProjection.status).toBe("draft_invalid");
    expect(taskProjection.protocol).toBeNull();
  });
});
