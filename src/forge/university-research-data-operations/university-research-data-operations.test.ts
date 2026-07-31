import { describe, expect, it, vi } from "vitest";

import {
  UNIVERSITY_RESEARCH_ALLOCATION_CELLS,
  UNIVERSITY_RESEARCH_CAPTURE_FIELD_IDS,
  UNIVERSITY_RESEARCH_DATA_OPERATION_ROLES,
  UNIVERSITY_RESEARCH_DATA_PLAN_IDS,
  UNIVERSITY_RESEARCH_DATA_OPERATIONS_PROTOCOL_DOCUMENT_DIGEST,
  UNIVERSITY_RESEARCH_PROHIBITED_DATA_CLASSES,
  projectUniversityResearchDataOperations,
  type UniversityResearchDataOperationsRequestV1,
} from ".";

function request(): UniversityResearchDataOperationsRequestV1 {
  return {
    schemaVersion: "university-research-data-operations-request.v1",
    protocol: {
      protocolId: "university-observation-protocol.phase-minus-one",
      protocolVersion: "1.0.0",
      protocolDocumentDigest:
        UNIVERSITY_RESEARCH_DATA_OPERATIONS_PROTOCOL_DOCUMENT_DIGEST,
    },
    captureSchema: {
      schemaRef: "capture-schema.fixture.phase-minus-one.v1",
      status: "requested",
      authority: "not_established",
      allowedFields: [...UNIVERSITY_RESEARCH_CAPTURE_FIELD_IDS],
      prohibitedDataClasses: [
        ...UNIVERSITY_RESEARCH_PROHIBITED_DATA_CLASSES,
      ],
      rawQuoteCaptureAllowed: false,
      freeFormNotesCaptureAllowed: false,
      realCourseworkCaptureAllowed: false,
      identityDocumentCaptureAllowed: false,
      telemetryCaptureAllowed: false,
    },
    requestedPlans: UNIVERSITY_RESEARCH_DATA_PLAN_IDS.map((planId, index) => ({
      planId,
      planRef: `plan.fixture.${planId.replaceAll("_", "-")}`,
      status: "requested",
      declaredPlanDigest: `sha256:${(index + 1).toString(16).repeat(64)}`,
      authority: "not_established",
    })),
    roles: UNIVERSITY_RESEARCH_DATA_OPERATION_ROLES.map((role) => ({
      role,
      operatorRef: `operator.fixture.${role.replaceAll("_", "-")}`,
      identityAuthority: "not_established",
    })),
    allocation: {
      plan: "paired_four_cell_two_pack",
      cells: [...UNIVERSITY_RESEARCH_ALLOCATION_CELLS],
      assignmentBasis: "rotating_approval_order_sequence",
      responseBasedReassignmentAllowed: false,
      withdrawnCellRemainsOccupied: true,
    },
    stopAndRightsRules: {
      captureAfterWithdrawalAllowed: false,
      minorOrUncertainAgeAction:
        "stop_before_or_during_exposure_and_escalate",
      prohibitedDataAction: "stop_do_not_echo_and_escalate",
      deletionCompletionRule:
        "requested_verification_per_declared_target",
      restartRule:
        "separate_principal_and_research_data_approval_requested",
    },
    authority: {
      approvalAuthority: "not_established",
      operatorIdentityAuthority: "not_established",
      adultVerificationAuthority: "not_established",
      consentAuthority: "not_established",
      participantOperationAllowed: false,
      participantDataCaptureAllowed: false,
      courseworkCaptureAllowed: false,
      persistenceAllowed: false,
      exportAllowed: false,
      eventEmissionAllowed: false,
      restartAllowed: false,
    },
  };
}

describe("projectUniversityResearchDataOperations", () => {
  it("admits only a declaration-shape-coherent synthetic plan with no real authority", async () => {
    const projection = await projectUniversityResearchDataOperations(request());

    expect(projection).toMatchObject({
      schemaVersion: "university-research-data-operations-projection.v1",
      status: "synthetic_data_operations_plan_coherent",
      capture: {
        allowedFieldCount: UNIVERSITY_RESEARCH_CAPTURE_FIELD_IDS.length,
        prohibitedDataClassCount:
          UNIVERSITY_RESEARCH_PROHIBITED_DATA_CLASSES.length,
        exactAllowlist: true,
        exactProhibitedVocabulary: true,
      },
      requirements: {
        requestedPlanCount: UNIVERSITY_RESEARCH_DATA_PLAN_IDS.length,
        requiredPlanCount: UNIVERSITY_RESEARCH_DATA_PLAN_IDS.length,
        distinctRoleCount: UNIVERSITY_RESEARCH_DATA_OPERATION_ROLES.length,
        requiredRoleCount: UNIVERSITY_RESEARCH_DATA_OPERATION_ROLES.length,
        allocationCellCount: UNIVERSITY_RESEARCH_ALLOCATION_CELLS.length,
        requiredAllocationCellCount:
          UNIVERSITY_RESEARCH_ALLOCATION_CELLS.length,
        planDeclarationDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      },
      authority: {
        approvalAuthority: "not_established",
        operatorIdentityAuthority: "not_established",
        adultVerificationAuthority: "not_established",
        consentAuthority: "not_established",
        planContentAuthority: "not_established",
        participantOperationAllowed: false,
        participantDataCaptureAllowed: false,
        courseworkCaptureAllowed: false,
        persistenceAllowed: false,
        exportAllowed: false,
        eventEmissionAllowed: false,
        restartAllowed: false,
      },
      issues: [],
    });
    expect(projection.requestDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(projection.projectionDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(projection)).not.toContain("participant_ready");
    expect(JSON.stringify(projection)).not.toContain("approved");
  });

  it("rejects drift from the exact Phase -1 protocol document digest", async () => {
    const drifted = {
      ...request(),
      protocol: {
        ...request().protocol,
        protocolDocumentDigest: `sha256:${"a".repeat(64)}`,
      },
    };

    const projection = await projectUniversityResearchDataOperations(drifted);

    expect(projection.status).toBe("invalid");
    expect(projection.issues[0]?.code).toBe("schema.invalid");
    expect(projection.issues[0]?.path).toBe("protocol.protocolDocumentDigest");
    expect(projection.requestDigest).toBeNull();
  });

  it("keeps incomplete closed vocabularies in requirements requested", async () => {
    const allowlist = request();
    allowlist.captureSchema.allowedFields =
      allowlist.captureSchema.allowedFields.slice(0, -1);
    const prohibited = request();
    prohibited.captureSchema.prohibitedDataClasses =
      prohibited.captureSchema.prohibitedDataClasses.slice(0, -1);
    const plans = request();
    plans.requestedPlans = plans.requestedPlans.slice(0, -1);
    const roles = request();
    roles.roles = roles.roles.slice(0, -1);
    const cells = request();
    cells.allocation.cells = cells.allocation.cells.slice(0, -1);

    const projections = await Promise.all(
      [allowlist, prohibited, plans, roles, cells].map(
        projectUniversityResearchDataOperations,
      ),
    );

    expect(projections.every(
      (entry) => entry.status === "requirements_requested",
    )).toBe(true);
    expect(projections.map((entry) => entry.issues[0]?.code)).toEqual([
      "capture.allowlist_mismatch",
      "capture.prohibited_vocabulary_mismatch",
      "plans.incomplete_or_conflicting",
      "roles.incomplete_or_conflicting",
      "allocation.cells_incomplete_or_conflicting",
    ]);
  });

  it("rejects duplicate role, operator, plan, and allocation identities", async () => {
    const roles = request();
    roles.roles[5] = {
      ...roles.roles[0]!,
    };
    const plans = request();
    plans.requestedPlans[8] = {
      ...plans.requestedPlans[0]!,
    };
    const cells = request();
    cells.allocation.cells[3] = cells.allocation.cells[0]!;

    const projections = await Promise.all(
      [roles, plans, cells].map(projectUniversityResearchDataOperations),
    );

    expect(projections.map((entry) => entry.status)).toEqual([
      "requirements_requested",
      "requirements_requested",
      "requirements_requested",
    ]);
    expect(projections[0]!.issues[0]?.code).toBe(
      "roles.incomplete_or_conflicting",
    );
    expect(projections[1]!.issues[0]?.code).toBe(
      "plans.incomplete_or_conflicting",
    );
    expect(projections[2]!.issues[0]?.code).toBe(
      "allocation.cells_incomplete_or_conflicting",
    );
  });

  it("rejects PII fields, prohibited capture members, and authority upgrades", async () => {
    const cases: unknown[] = [
      { ...request(), participantName: "A learner" },
      {
        ...request(),
        captureSchema: {
          ...request().captureSchema,
          participantEmail: "learner@example.test",
        },
      },
      {
        ...request(),
        captureSchema: {
          ...request().captureSchema,
          allowedFields: [
            ...request().captureSchema.allowedFields,
            "participant_email",
          ],
        },
      },
      {
        ...request(),
        authority: {
          ...request().authority,
          participantOperationAllowed: true,
        },
      },
      {
        ...request(),
        authority: {
          ...request().authority,
          approvalAuthority: "approved",
        },
      },
      {
        ...request(),
        requestedPlans: request().requestedPlans.map((plan, index) => (
          index === 0 ? { ...plan, status: "approved" } : plan
        )),
      },
    ];

    const projections = await Promise.all(
      cases.map(projectUniversityResearchDataOperations),
    );
    expect(projections.every((entry) => entry.status === "invalid")).toBe(true);
    expect(projections.every((entry) => entry.requestDigest === null)).toBe(true);
  });

  it("fixes withdrawal, minor, prohibited-data, deletion, restart, and allocation stops", async () => {
    const mutations: Array<(value: MutableRuleRequest) => void> = [
      (value) => {
        value.stopAndRightsRules.captureAfterWithdrawalAllowed = true;
      },
      (value) => {
        value.stopAndRightsRules.minorOrUncertainAgeAction = "continue";
      },
      (value) => {
        value.stopAndRightsRules.prohibitedDataAction = "log_and_continue";
      },
      (value) => {
        value.stopAndRightsRules.deletionCompletionRule =
          "complete_without_receipts";
      },
      (value) => {
        value.stopAndRightsRules.restartRule = "operator_override";
      },
      (value) => {
        value.allocation.responseBasedReassignmentAllowed = true;
      },
      (value) => {
        value.allocation.withdrawnCellRemainsOccupied = false;
      },
    ];
    const cases = mutations.map((mutate) => {
      const value = request() as unknown as MutableRuleRequest;
      mutate(value);
      return value;
    });

    const projections = await Promise.all(
      cases.map(projectUniversityResearchDataOperations),
    );
    expect(projections.every((entry) => entry.status === "invalid")).toBe(true);
  });

  it("does not execute hostile accessors or proxy traps at any depth", async () => {
    const getter = vi.fn(() => request().schemaVersion);
    const accessor = request() as unknown as Record<string, unknown>;
    Object.defineProperty(accessor, "schemaVersion", {
      enumerable: true,
      get: getter,
    });
    const trap = vi.fn(() => {
      throw new Error("proxy trap executed");
    });
    const rootProxy = new Proxy(request(), {
      getPrototypeOf: trap,
      ownKeys: trap,
      getOwnPropertyDescriptor: trap,
    });
    const nestedProxy = request() as unknown as {
      requestedPlans: unknown[];
    };
    nestedProxy.requestedPlans[0] = new Proxy(
      request().requestedPlans[0]!,
      {
        getPrototypeOf: trap,
        ownKeys: trap,
        getOwnPropertyDescriptor: trap,
      },
    );

    const projections = await Promise.all([
      projectUniversityResearchDataOperations(accessor),
      projectUniversityResearchDataOperations(rootProxy),
      projectUniversityResearchDataOperations(nestedProxy),
    ]);

    expect(projections.every((entry) => entry.status === "invalid")).toBe(true);
    expect(getter).not.toHaveBeenCalled();
    expect(trap).not.toHaveBeenCalled();
  });

  it("rejects aliases, cycles, sparse arrays, exotic prototypes, and symbols", async () => {
    const alias = request() as unknown as Record<string, unknown>;
    alias.captureSchema = alias.protocol;
    const cycle = request() as unknown as Record<string, unknown>;
    cycle.cycle = cycle;
    const sparse = request() as unknown as Record<string, unknown>;
    sparse.roles = new Array(6);
    const exotic = Object.create({ inherited: true }) as Record<string, unknown>;
    Object.assign(exotic, request());
    const symbol = request() as unknown as Record<PropertyKey, unknown>;
    symbol[Symbol("hidden")] = true;

    const projections = await Promise.all(
      [alias, cycle, sparse, exotic, symbol].map(
        projectUniversityResearchDataOperations,
      ),
    );
    expect(projections.every((entry) => entry.status === "invalid")).toBe(true);
  });

  it("is deterministic, deeply frozen, side-effect free, and digest bound", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const first = await projectUniversityResearchDataOperations(request());
    const second = await projectUniversityResearchDataOperations(request());
    const changed = request();
    changed.requestedPlans[0] = {
      ...changed.requestedPlans[0]!,
      declaredPlanDigest: `sha256:${"f".repeat(64)}`,
    };
    const changedProjection =
      await projectUniversityResearchDataOperations(changed);

    expect(first).toEqual(second);
    expect(first.projectionDigest).toBe(second.projectionDigest);
    expect(changedProjection.status).toBe(
      "synthetic_data_operations_plan_coherent",
    );
    expect(changedProjection.requirements?.planDeclarationDigest).not.toBe(
      first.requirements?.planDeclarationDigest,
    );
    expect(changedProjection.requestDigest).not.toBe(first.requestDigest);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.authority)).toBe(true);
    expect(Object.isFrozen(first.issues)).toBe(true);
    expect(() => {
      (
        first.issues as unknown as
          UniversityResearchDataOperationsProjectionIssue[]
      ).push(
        {} as UniversityResearchDataOperationsProjectionIssue,
      );
    }).toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

type UniversityResearchDataOperationsProjectionIssue = {
  code: string;
};

type MutableRuleRequest = {
  stopAndRightsRules: Record<string, unknown>;
  allocation: Record<string, unknown>;
};
