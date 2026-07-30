import { describe, expect, it, vi } from "vitest";

import {
  parseCourseSourceReconciliationRequest,
  type CourseSourceReconciliationRequestV1,
} from "../course-sources";
import {
  projectUniversityRecovery,
  type UniversityRecoveryItemV1,
  type UniversityRecoveryRequestV1,
} from ".";

const OWNER_USER_ID = "11111111-1111-4111-8111-111111111111";
const TENANT_ID = "22222222-2222-4222-8222-222222222222";
const TERM_ID = "term.sample-autumn-2026";
const AS_OF = "2026-09-14T09:00:00.000Z";

function sourceRequest(
  courseToken: string,
  dueAt: string,
  options: {
    asOf?: string;
    courseId?: string;
    consequenceClass?: "routine" | "consequential" | "unknown";
    conflict?: boolean;
    freshnessReviewDueAt?: string | null;
  } = {},
): Readonly<CourseSourceReconciliationRequestV1> {
  const courseId = options.courseId ?? `course.sample-${courseToken}`;
  const scope = {
    ownerUserId: OWNER_USER_ID,
    tenantId: TENANT_ID,
    termId: TERM_ID,
    courseId,
  };
  const candidateId = `course-source-candidate.sample-${courseToken}-deadline`;
  const claimKey = `course-claim.sample-${courseToken}-deadline`;
  const candidates: CourseSourceReconciliationRequestV1["candidates"] = [{
    schemaVersion: "course-source-candidate.v1",
    candidateId,
    scope,
    sourceRevisionId: `course-source-revision.sample-${courseToken}-syllabus`,
    claimKey,
    locator: { kind: "manual_field", fieldKey: `${courseToken}_deadline` },
    extractedBy: "learner_manual",
    fact: {
      kind: "deadline",
      title: courseToken === "cs102" ? "Argument analysis" : "Problem set four",
      dueAt,
      timeZone: "Asia/Kolkata",
      consequenceClass: options.consequenceClass ?? "consequential",
    },
    createdAt: "2026-09-10T09:05:00.000Z",
  }];
  const decisions: CourseSourceReconciliationRequestV1["decisions"] = [{
    schemaVersion: "course-source-decision.v1",
    decisionId: `course-source-decision.sample-${courseToken}-deadline-accept`,
    candidateId,
    scope,
    actor: "learner",
    kind: "accept",
    extractionMatch: "learner_confirmed",
    decidedAt: "2026-09-13T09:00:00.000Z",
  }];
  if (options.conflict) {
    candidates.push({
      ...candidates[0]!,
      candidateId: `course-source-candidate.sample-${courseToken}-deadline-conflict`,
      sourceRevisionId: `course-source-revision.sample-${courseToken}-calendar`,
      locator: { kind: "manual_field", fieldKey: `${courseToken}_calendar_deadline` },
      fact: {
        kind: "deadline",
        title: courseToken === "cs102" ? "Argument analysis" : "Problem set four",
        dueAt: "2026-09-19T12:30:00+05:30",
        timeZone: "Asia/Kolkata",
        consequenceClass: options.consequenceClass ?? "consequential",
      },
    });
    decisions.push({
      ...decisions[0]!,
      decisionId: `course-source-decision.sample-${courseToken}-deadline-conflict-accept`,
      candidateId: `course-source-candidate.sample-${courseToken}-deadline-conflict`,
    });
  }
  return parseCourseSourceReconciliationRequest({
    schemaVersion: "course-source-reconciliation.v1",
    scope,
    asOf: options.asOf ?? AS_OF,
    sourceRevisions: [
      {
        schemaVersion: "course-source-revision.v1",
        revisionId: `course-source-revision.sample-${courseToken}-syllabus`,
        scope,
        inputKind: "manual",
        sourceLabel: `${courseToken.toUpperCase()} syllabus copy`,
        sourceDigest: `sha256:${"a".repeat(64)}`,
        observedAt: "2026-09-10T09:00:00.000Z",
        freshnessReviewDueAt: options.freshnessReviewDueAt === undefined
          ? "2026-10-10T09:00:00.000Z"
          : options.freshnessReviewDueAt,
        coverage: {
          status: "declared_complete_for_source",
          window: {
            startsAt: "2026-08-01T00:00:00.000Z",
            endsAt: "2026-12-31T23:59:59.000Z",
          },
          inspectedScopes: ["deadlines"],
          unknownOrOmittedScopes: [],
        },
        privacy: {
          visibility: "private_to_owner",
          retentionClass: "derived_fields_only",
          originalBytesRetained: false,
          redistributionAllowed: false,
        },
      },
      ...(options.conflict ? [{
        schemaVersion: "course-source-revision.v1" as const,
        revisionId: `course-source-revision.sample-${courseToken}-calendar`,
        scope,
        inputKind: "manual" as const,
        sourceLabel: `${courseToken.toUpperCase()} calendar copy`,
        sourceDigest: `sha256:${"b".repeat(64)}`,
        observedAt: "2026-09-10T09:00:00.000Z",
        freshnessReviewDueAt: "2026-10-10T09:00:00.000Z",
        coverage: {
          status: "declared_complete_for_source" as const,
          window: {
            startsAt: "2026-08-01T00:00:00.000Z",
            endsAt: "2026-12-31T23:59:59.000Z",
          },
          inspectedScopes: ["deadlines" as const],
          unknownOrOmittedScopes: [],
        },
        privacy: {
          visibility: "private_to_owner" as const,
          retentionClass: "derived_fields_only" as const,
          originalBytesRetained: false as const,
          redistributionAllowed: false as const,
        },
      }] : []),
    ],
    candidates,
    decisions,
  });
}

function item(
  courseToken: string,
  learnerDisposition: UniversityRecoveryItemV1["learnerDisposition"],
  changes: Partial<UniversityRecoveryItemV1> = {},
): UniversityRecoveryItemV1 {
  return {
    schemaVersion: "university-recovery-item.v1",
    itemId: `recovery-item.sample-${courseToken}`,
    courseId: `course.sample-${courseToken}`,
    deadlineCandidateId: `course-source-candidate.sample-${courseToken}-deadline`,
    learnerDisposition,
    learningEssential: {
      value: learnerDisposition === "required",
      declaredBy: "learner_fixture",
    },
    effort: {
      minutesLow: courseToken === "cs102" ? 90 : 40,
      minutesHigh: courseToken === "cs102" ? 120 : 60,
      basis: "fixture_authored",
    },
    dependencyItemIds: [],
    humanRoute: learnerDisposition === "required"
      ? { owner: "instructor", declaredBy: "learner_fixture" }
      : null,
    ...changes,
  };
}

function request(
  changes: Partial<UniversityRecoveryRequestV1> = {},
): UniversityRecoveryRequestV1 {
  return {
    schemaVersion: "university-recovery-request.v1",
    scope: {
      ownerUserId: OWNER_USER_ID,
      tenantId: TENANT_ID,
      termId: TERM_ID,
    },
    asOf: AS_OF,
    termLabel: "Autumn 2026",
    timeZone: "Asia/Kolkata",
    declaredChange: {
      kind: "capacity_changed",
      declaredBy: "learner_fixture",
    },
    recoveryWindow: {
      startsAt: AS_OF,
      endsAt: "2026-09-21T09:00:00.000Z",
      availableMinutes: 240,
      bufferMinutes: 30,
      declaredBy: "learner_fixture",
    },
    courses: [
      {
        courseId: "course.sample-cs102",
        courseLabel: "CS102: Evidence and computation",
        reconciliationRequest: sourceRequest("cs102", "2026-09-16T12:30:00+05:30"),
      },
      {
        courseId: "course.sample-math110",
        courseLabel: "MATH110: Discrete structures",
        reconciliationRequest: sourceRequest(
          "math110",
          "2026-09-25T12:30:00+05:30",
          { consequenceClass: "routine" },
        ),
      },
    ],
    items: [
      item("cs102", "required"),
      item("math110", "deferrable", {
        learningEssential: { value: false, declaredBy: "learner_fixture" },
      }),
    ],
    ...changes,
  };
}

describe("projectUniversityRecovery", () => {
  it("builds a deadline-ordered draft from reviewed sources and learner declarations", async () => {
    const projection = await projectUniversityRecovery(request());

    expect(projection.status).toBe("draft_ready");
    expect(projection.lanes.protectNow).toHaveLength(1);
    expect(projection.lanes.protectNow[0]).toMatchObject({
      title: "Argument analysis",
      learnerDisposition: "required",
      laneReason: "learner_marked_required",
      includedInProtectedCapacity: true,
      source: {
        factAuthority: "learner_connected_source_copy",
        sourceAuthenticity: "not_established",
      },
    });
    expect(projection.lanes.outsideThisWindow[0]).toMatchObject({
      title: "Problem set four",
      learnerDisposition: "deferrable",
      includedInProtectedCapacity: false,
    });
    expect(projection.capacity).toMatchObject({
      state: "fits_declared_window",
      availableMinutes: 240,
      protectedBufferMinutes: 30,
      workableMinutes: 210,
      protectedEffortMinutesLow: 90,
      protectedEffortMinutesHigh: 120,
    });
    expect(projection.humanHelpDraft).toBeNull();
    expect(projection.authority).toMatchObject({
      orderBasis: "reviewed_deadline_then_item_id_not_priority_score",
      recommendationAllowed: false,
      automaticDeferralAllowed: false,
      backlogDebtAllowed: false,
      persistenceAllowed: false,
      messageSendAllowed: false,
    });
    expect(JSON.stringify(projection)).not.toContain('"priorityScore"');
    expect(JSON.stringify(projection)).not.toContain('"backlogDebtCount"');
  });

  it("requires learner choice when only the low protected estimate fits", async () => {
    const input = request({
      recoveryWindow: {
        startsAt: AS_OF,
        endsAt: "2026-09-21T09:00:00.000Z",
        availableMinutes: 130,
        bufferMinutes: 30,
        declaredBy: "learner_fixture",
      },
    });
    const projection = await projectUniversityRecovery(input);

    expect(projection.status).toBe("learner_choice_required");
    expect(projection.capacity?.state).toBe("tight_declared_window");
    expect(projection.recovery).toBe("learner_revision_required");
    expect(projection.humanHelpDraft).toBeNull();
  });

  it("keeps learner-declared negotiable learning work visible for a choice", async () => {
    const input = request({
      items: [
        item("cs102", "required"),
        item("math110", "negotiable", {
          learningEssential: { value: true, declaredBy: "learner_fixture" },
        }),
      ],
    });
    const projection = await projectUniversityRecovery(input);

    expect(projection.status).toBe("learner_choice_required");
    expect(projection.lanes.decideOrAsk[0]).toMatchObject({
      itemId: "recovery-item.sample-math110",
      learningEssential: true,
      lane: "decide_or_ask",
      includedInProtectedCapacity: false,
    });
    expect(projection.capacity?.protectedEffortMinutesHigh).toBe(120);
  });

  it("prepares but never sends a human question when required work cannot fit", async () => {
    const input = request({
      recoveryWindow: {
        startsAt: AS_OF,
        endsAt: "2026-09-21T09:00:00.000Z",
        availableMinutes: 100,
        bufferMinutes: 20,
        declaredBy: "learner_fixture",
      },
    });
    const projection = await projectUniversityRecovery(input);

    expect(projection.status).toBe("human_help_required");
    expect(projection.capacity?.state).toBe("insufficient_declared_window");
    expect(projection.humanHelpDraft).toMatchObject({
      state: "prepared_not_sent",
      route: "instructor",
      relatedItemId: "recovery-item.sample-cs102",
      sendAllowed: false,
      sourceLinkAvailable: false,
    });
    expect(projection.humanHelpDraft?.question).toContain("80 workable minutes");
    expect(projection.recovery).toBe("review_prepared_human_question");
  });

  it("surfaces an overdue consequential deadline even when the workload fits", async () => {
    const input = request({
      courses: [
        {
          courseId: "course.sample-cs102",
          courseLabel: "CS102: Evidence and computation",
          reconciliationRequest: sourceRequest("cs102", "2026-09-13T12:30:00+05:30"),
        },
      ],
      items: [item("cs102", "required")],
    });
    const projection = await projectUniversityRecovery(input);

    expect(projection.status).toBe("human_help_required");
    expect(projection.capacity?.state).toBe("fits_declared_window");
    expect(projection.highConsequenceConflictItemIds).toEqual(["recovery-item.sample-cs102"]);
    expect(projection.humanHelpDraft?.subject).toBe("Recovery question about Argument analysis");
  });

  it("withholds every lane when a connected-source copy still needs review", async () => {
    const input = request({
      courses: [{
        courseId: "course.sample-cs102",
        courseLabel: "CS102: Evidence and computation",
        reconciliationRequest: sourceRequest(
          "cs102",
          "2026-09-16T12:30:00+05:30",
          { conflict: true },
        ),
      }],
      items: [item("cs102", "required")],
    });
    const projection = await projectUniversityRecovery(input);

    expect(projection.status).toBe("source_review_required");
    expect(projection.capacity).toBeNull();
    expect(projection.lanes).toEqual({
      protectNow: [],
      decideOrAsk: [],
      outsideThisWindow: [],
    });
    expect(projection.sourceCourses[0]).toMatchObject({
      reconciliationStatus: "review_required",
      unresolvedConflictCount: 1,
    });
  });

  it("treats stale source copies as review work, not lower-confidence planning input", async () => {
    const input = request({
      courses: [{
        courseId: "course.sample-cs102",
        courseLabel: "CS102: Evidence and computation",
        reconciliationRequest: sourceRequest(
          "cs102",
          "2026-09-16T12:30:00+05:30",
          { freshnessReviewDueAt: "2026-09-14T08:00:00.000Z" },
        ),
      }],
      items: [item("cs102", "required")],
    });
    const projection = await projectUniversityRecovery(input);

    expect(projection.status).toBe("source_review_required");
    expect(projection.sourceCourses[0]?.staleOrUnknownSourceCount).toBe(1);
  });

  it.each([
    {
      label: "cross-course source",
      mutate: (input: UniversityRecoveryRequestV1) => {
        input.courses[0]!.reconciliationRequest = sourceRequest(
          "cs102",
          "2026-09-16T12:30:00+05:30",
          { courseId: "course.sample-other" },
        );
      },
      issue: "source.scope_mismatch",
    },
    {
      label: "source time mismatch",
      mutate: (input: UniversityRecoveryRequestV1) => {
        input.courses[0]!.reconciliationRequest = sourceRequest(
          "cs102",
          "2026-09-16T12:30:00+05:30",
          { asOf: "2026-09-14T10:00:00.000Z" },
        );
      },
      issue: "source.as_of_mismatch",
    },
    {
      label: "missing deadline",
      mutate: (input: UniversityRecoveryRequestV1) => {
        input.items[0]!.deadlineCandidateId = "course-source-candidate.sample-missing";
      },
      issue: "source.deadline_missing",
    },
  ])("fails closed for $label", async ({ mutate, issue }) => {
    const input = structuredClone(request());
    mutate(input);
    const projection = await projectUniversityRecovery(input);

    expect(projection.status).toBe("invalid");
    expect(projection.projectionDigest).toBeNull();
    expect(projection.capacity).toBeNull();
    expect(projection.issues.map((entry) => entry.code)).toContain(issue);
  });

  it("rejects dependency cycles instead of using them as hidden ordering input", async () => {
    const input = request({
      items: [
        item("cs102", "required", {
          dependencyItemIds: ["recovery-item.sample-math110"],
        }),
        item("math110", "deferrable", {
          learningEssential: { value: false, declaredBy: "learner_fixture" },
          dependencyItemIds: ["recovery-item.sample-cs102"],
        }),
      ],
    });
    const projection = await projectUniversityRecovery(input);

    expect(projection.status).toBe("invalid");
    expect(projection.issues.map((entry) => entry.code)).toContain("item.dependency_cycle");
  });

  it("is deterministic across input order and deeply immutable", async () => {
    const firstInput = request();
    const secondInput = request({
      courses: [...request().courses].reverse(),
      items: [...request().items].reverse(),
    });
    const [first, second] = await Promise.all([
      projectUniversityRecovery(firstInput),
      projectUniversityRecovery(secondInput),
    ]);

    expect(second).toEqual(first);
    expect(second.projectionDigest).toBe(first.projectionDigest);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.lanes.protectNow)).toBe(true);
    expect(Object.isFrozen(first.authority)).toBe(true);
    expect(() => {
      (first.authority as { messageSendAllowed: boolean }).messageSendAllowed = true;
    }).toThrow();
  });

  it("copies hostile input without executing accessors, networking, or storage", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    let getterCalls = 0;
    const hostile = {};
    Object.defineProperty(hostile, "schemaVersion", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return "university-recovery-request.v1";
      },
    });

    const [accessor, proxy] = await Promise.all([
      projectUniversityRecovery(hostile),
      projectUniversityRecovery(new Proxy({}, {
        ownKeys: () => {
          throw new Error("must fail closed");
        },
      })),
    ]);

    expect(accessor).toMatchObject({ status: "invalid", projectionDigest: null });
    expect(proxy).toMatchObject({ status: "invalid", projectionDigest: null });
    expect(getterCalls).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
