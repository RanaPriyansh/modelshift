import { describe, expect, it } from "vitest";

import {
  createSemesterDesk,
  orderedPlanItems,
  progressEvidenceFor,
  transitionSemesterDesk,
  type SemesterDeskCommand,
  type SemesterDeskResult,
  type SemesterDeskRuntime,
  type SemesterDeskState,
} from ".";

const PROFILE_ID = "profile.pri";

function runtimeAt(initialTime = "2026-08-03T09:00:00.000Z") {
  let currentTime = initialTime;
  let sequence = 0;
  const runtime: SemesterDeskRuntime = {
    clock: {
      now: () => currentTime,
    },
    identifiers: {
      next: (kind) => `${kind}-${String(sequence++).padStart(3, "0")}`,
    },
  };
  return {
    runtime,
    setTime(value: string) {
      currentTime = value;
    },
  };
}

function valueOf<T>(result: SemesterDeskResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
}

function command(
  state: SemesterDeskState,
  input: SemesterDeskCommand,
  runtime: SemesterDeskRuntime,
): SemesterDeskState {
  return valueOf(transitionSemesterDesk(state, input, runtime));
}

function createBase(runtime: SemesterDeskRuntime): SemesterDeskState {
  return valueOf(createSemesterDesk({ profileId: PROFILE_ID, title: "Autumn 2026" }, runtime));
}

function withCourseAndPlan(runtime: SemesterDeskRuntime): {
  state: SemesterDeskState;
  courseId: string;
  planItemId: string;
} {
  let state = createBase(runtime);
  state = command(state, {
    kind: "add-course",
    profileId: PROFILE_ID,
    code: "CS201",
    title: "Algorithms",
  }, runtime);
  const courseId = state.courses[0]?.id;
  if (!courseId) throw new Error("Expected a course.");
  state = command(state, {
    kind: "add-plan-item",
    profileId: PROFILE_ID,
    courseId,
    title: "Graph proof practice",
    date: "2026-08-05",
    minutes: 75,
  }, runtime);
  const planItemId = state.planItems[0]?.id;
  if (!planItemId) throw new Error("Expected a plan item.");
  return { state, courseId, planItemId };
}

function startStudy(
  state: SemesterDeskState,
  planItemId: string,
  runtime: SemesterDeskRuntime,
): SemesterDeskState {
  state = command(state, {
    kind: "choose-next-action",
    profileId: PROFILE_ID,
    planItemId,
  }, runtime);
  return command(state, {
    kind: "start-protected-study",
    profileId: PROFILE_ID,
    planItemId,
  }, runtime);
}

function reachProof(
  state: SemesterDeskState,
  planItemId: string,
  runtime: SemesterDeskRuntime,
): SemesterDeskState {
  state = startStudy(state, planItemId, runtime);
  const studySessionId = state.protectedStudySessions[0]?.id;
  if (!studySessionId) throw new Error("Expected a protected study session.");
  state = command(state, {
    kind: "complete-practice",
    profileId: PROFILE_ID,
    studySessionId,
    outcome: "completed",
  }, runtime);
  return command(state, {
    kind: "submit-independent-proof",
    profileId: PROFILE_ID,
    planItemId,
    outcome: "demonstrated",
  }, runtime);
}

describe("Semester Desk v2 domain engine", () => {
  it("runs the profile-bound happy loop without hiding work", () => {
    const controlled = runtimeAt();
    let state = createBase(controlled.runtime);
    state = command(state, {
      kind: "add-course",
      profileId: PROFILE_ID,
      code: "CS201",
      title: "Algorithms",
    }, controlled.runtime);
    const courseId = state.courses[0]?.id;
    if (!courseId) throw new Error("Expected a course.");
    state = command(state, {
      kind: "add-course-fact",
      profileId: PROFILE_ID,
      courseId,
      label: "Midterm",
      value: "2026-08-21",
      status: "checked",
      sourceLabel: "Course outline",
      checkedAt: "2026-08-03T09:00:00.000Z",
    }, controlled.runtime);
    state = command(state, {
      kind: "draft-capacity",
      profileId: PROFILE_ID,
      availableMinutes: 120,
    }, controlled.runtime);
    expect(state.capacity).toBeNull();
    expect(state.capacityDraft?.availableMinutes).toBe(120);
    state = command(state, { kind: "confirm-capacity", profileId: PROFILE_ID }, controlled.runtime);
    expect(state.capacity).toEqual({ availableMinutes: 120, declaredAt: "2026-08-03T09:00:00.000Z" });
    state = command(state, {
      kind: "add-plan-item",
      profileId: PROFILE_ID,
      courseId,
      title: "Graph proof practice",
      date: "2026-08-05",
      minutes: 75,
    }, controlled.runtime);
    const planItemId = state.planItems[0]?.id;
    if (!planItemId) throw new Error("Expected a plan item.");
    state = reachProof(state, planItemId, controlled.runtime);
    state = command(state, {
      kind: "schedule-delayed-return",
      profileId: PROFILE_ID,
      planItemId,
      dueAt: "2026-08-10T09:00:00.000Z",
    }, controlled.runtime);
    const delayedReturnId = state.delayedReturns[0]?.id;
    if (!delayedReturnId) throw new Error("Expected a delayed return.");
    controlled.setTime("2026-08-10T09:00:00.000Z");
    state = command(state, {
      kind: "open-delayed-return",
      profileId: PROFILE_ID,
      delayedReturnId,
    }, controlled.runtime);
    state = command(state, {
      kind: "complete-delayed-return",
      profileId: PROFILE_ID,
      delayedReturnId,
      outcome: "retained",
      rawAnswer: "THE-DELAYED-RETURN-ANSWER-MUST-NOT-LEAK",
    } as unknown as SemesterDeskCommand, controlled.runtime);

    expect(orderedPlanItems(state)).toEqual([{
      id: planItemId,
      courseId,
      title: "Graph proof practice",
      originalDate: "2026-08-05",
      currentDate: "2026-08-05",
      originalMinutes: 75,
      currentMinutes: 75,
      status: "return-complete",
    }]);
    expect(state.delayedReturns[0]).toMatchObject({
      status: "completed",
      completedAt: "2026-08-10T09:00:00.000Z",
      retentionOutcome: "retained",
    });
    expect(state.selectedNextActionId).toBeNull();
    expect(progressEvidenceFor(state).map((entry) => entry.kind)).toEqual([
      "practice-completed",
      "independent-proof-completed",
      "delayed-return-completed",
    ]);
    expect(progressEvidenceFor(state)[2]).toMatchObject({
      kind: "delayed-return-completed",
      outcome: "retained",
    });
    expect(JSON.stringify(progressEvidenceFor(state))).not.toContain("THE-DELAYED-RETURN-ANSWER-MUST-NOT-LEAK");
  });

  it("requires explicit review for changed facts and source conflicts", () => {
    const controlled = runtimeAt();
    let state = createBase(controlled.runtime);
    state = command(state, {
      kind: "add-course",
      profileId: PROFILE_ID,
      code: "HIS122",
      title: "Modern history",
    }, controlled.runtime);
    const courseId = state.courses[0]?.id;
    if (!courseId) throw new Error("Expected a course.");
    state = command(state, {
      kind: "add-course-fact",
      profileId: PROFILE_ID,
      courseId,
      label: "Essay deadline",
      value: "2026-08-20",
      status: "changed-since-last-check",
      sourceLabel: "Portal",
    }, controlled.runtime);
    state = command(state, {
      kind: "add-course-fact",
      profileId: PROFILE_ID,
      courseId,
      label: "Essay deadline",
      value: "2026-08-22",
      status: "checked",
      sourceLabel: "Course outline",
      checkedAt: "2026-08-03T09:00:00.000Z",
    }, controlled.runtime);
    const [changedFact, checkedFact] = state.courses[0]?.facts ?? [];
    if (!changedFact || !checkedFact) throw new Error("Expected two course facts.");
    state = command(state, {
      kind: "record-source-conflict",
      profileId: PROFILE_ID,
      courseId,
      factIds: [changedFact.id, checkedFact.id],
      summary: "The two dates do not match.",
    }, controlled.runtime);
    state = command(state, {
      kind: "add-plan-item",
      profileId: PROFILE_ID,
      courseId,
      title: "Write essay outline",
      date: "2026-08-07",
      minutes: 60,
    }, controlled.runtime);
    const planItemId = state.planItems[0]?.id;
    if (!planItemId) throw new Error("Expected a plan item.");

    let result = transitionSemesterDesk(state, {
      kind: "choose-next-action",
      profileId: PROFILE_ID,
      planItemId,
    }, controlled.runtime);
    expect(result).toMatchObject({ ok: false, error: { code: "course-review-required" } });
    state = command(state, {
      kind: "set-course-fact-status",
      profileId: PROFILE_ID,
      courseId,
      factId: changedFact.id,
      status: "checked",
      checkedAt: "2026-08-03T09:00:00.000Z",
    }, controlled.runtime);
    result = transitionSemesterDesk(state, {
      kind: "choose-next-action",
      profileId: PROFILE_ID,
      planItemId,
    }, controlled.runtime);
    expect(result).toMatchObject({ ok: false, error: { code: "course-review-required" } });
    const conflictId = state.courses[0]?.sourceConflicts[0]?.id;
    if (!conflictId) throw new Error("Expected a source conflict.");
    state = command(state, {
      kind: "review-source-conflict",
      profileId: PROFILE_ID,
      courseId,
      conflictId,
    }, controlled.runtime);
    state = command(state, {
      kind: "choose-next-action",
      profileId: PROFILE_ID,
      planItemId,
    }, controlled.runtime);
    expect(state.selectedNextActionId).toBe(planItemId);
    expect(state.courses[0]?.sourceConflicts[0]).toMatchObject({ status: "reviewed" });
  });

  it("keeps a capacity declaration as a draft until confirmation", () => {
    const controlled = runtimeAt();
    let state = createBase(controlled.runtime);
    state = command(state, {
      kind: "draft-capacity",
      profileId: PROFILE_ID,
      availableMinutes: 180,
    }, controlled.runtime);
    expect(state.capacity).toBeNull();
    expect(state.capacityDraft?.availableMinutes).toBe(180);
    state = command(state, { kind: "confirm-capacity", profileId: PROFILE_ID }, controlled.runtime);
    expect(state.capacity?.availableMinutes).toBe(180);
    state = command(state, {
      kind: "draft-capacity",
      profileId: PROFILE_ID,
      availableMinutes: 45,
    }, controlled.runtime);
    expect(state.capacity?.availableMinutes).toBe(180);
    expect(state.capacityDraft?.availableMinutes).toBe(45);
  });

  it("requires a valid check time whenever a course fact enters checked", () => {
    const controlled = runtimeAt();
    let state = createBase(controlled.runtime);
    state = command(state, {
      kind: "add-course",
      profileId: PROFILE_ID,
      code: "BIO120",
      title: "Cell biology",
    }, controlled.runtime);
    const courseId = state.courses[0]?.id;
    if (!courseId) throw new Error("Expected a course.");
    expect(transitionSemesterDesk(state, {
      kind: "add-course-fact",
      profileId: PROFILE_ID,
      courseId,
      label: "Lab date",
      value: "2026-08-12",
      status: "checked",
      sourceLabel: "Portal",
    }, controlled.runtime)).toMatchObject({ ok: false, error: { code: "invalid-input" } });
    state = command(state, {
      kind: "add-course-fact",
      profileId: PROFILE_ID,
      courseId,
      label: "Lab date",
      value: "2026-08-12",
      status: "needs-review",
      sourceLabel: "Portal",
    }, controlled.runtime);
    const factId = state.courses[0]?.facts[0]?.id;
    if (!factId) throw new Error("Expected a course fact.");
    expect(transitionSemesterDesk(state, {
      kind: "set-course-fact-status",
      profileId: PROFILE_ID,
      courseId,
      factId,
      status: "checked",
    }, controlled.runtime)).toMatchObject({ ok: false, error: { code: "invalid-input" } });
    expect(transitionSemesterDesk(state, {
      kind: "set-course-fact-status",
      profileId: PROFILE_ID,
      courseId,
      factId,
      status: "checked",
      checkedAt: "not-a-time",
    }, controlled.runtime)).toMatchObject({ ok: false, error: { code: "invalid-input" } });
    state = command(state, {
      kind: "set-course-fact-status",
      profileId: PROFILE_ID,
      courseId,
      factId,
      status: "checked",
      checkedAt: "2026-08-03T09:00:00.000Z",
    }, controlled.runtime);
    expect(state.courses[0]?.facts[0]).toMatchObject({
      status: "checked",
      checkedAt: "2026-08-03T09:00:00.000Z",
    });
  });

  it("records every broken-week recovery choice and preserves authored plan order", () => {
    const controlled = runtimeAt();
    let state = createBase(controlled.runtime);
    state = command(state, {
      kind: "add-course",
      profileId: PROFILE_ID,
      code: "MAT220",
      title: "Linear algebra",
    }, controlled.runtime);
    const courseId = state.courses[0]?.id;
    if (!courseId) throw new Error("Expected a course.");
    for (const [title, date, minutes] of [
      ["Problem set", "2026-08-05", 90],
      ["Lecture review", "2026-08-06", 60],
      ["Office hour notes", "2026-08-07", 45],
      ["Optional extension", "2026-08-08", 30],
    ] as const) {
      state = command(state, {
        kind: "add-plan-item",
        profileId: PROFILE_ID,
        courseId,
        title,
        date,
        minutes,
      }, controlled.runtime);
    }
    const itemIds = state.planItems.map((item) => item.id);
    const before = orderedPlanItems(state);
    state = command(state, {
      kind: "prepare-recovery",
      profileId: PROFILE_ID,
      summary: "The week changed after two missed days.",
      decisions: [
        { planItemId: itemIds[0]!, outcome: "moved", nextDate: "2026-08-11", reason: "Keep the full practice block." },
        { planItemId: itemIds[1]!, outcome: "reduced", nextMinutes: 30, reason: "Use the available capacity." },
        { planItemId: itemIds[2]!, outcome: "kept", reason: "It is still manageable." },
        { planItemId: itemIds[3]!, outcome: "deferred", nextDate: "2026-08-20", reason: "It is optional this week." },
      ],
    }, controlled.runtime);
    expect(orderedPlanItems(state)).toEqual(before);
    expect(state.recoveryDraft?.decisions.map((entry) => entry.outcome)).toEqual([
      "moved",
      "reduced",
      "kept",
      "deferred",
    ]);
    state = command(state, { kind: "confirm-recovery", profileId: PROFILE_ID }, controlled.runtime);

    expect(orderedPlanItems(state).map((item) => item.id)).toEqual(itemIds);
    expect(orderedPlanItems(state).map((item) => ({
      date: item.currentDate,
      minutes: item.currentMinutes,
      status: item.status,
    }))).toEqual([
      { date: "2026-08-11", minutes: 90, status: "planned" },
      { date: "2026-08-06", minutes: 30, status: "planned" },
      { date: "2026-08-07", minutes: 45, status: "planned" },
      { date: "2026-08-20", minutes: 30, status: "deferred" },
    ]);
    expect(state.recoveryChanges.map((change) => ({ outcome: change.outcome, reason: change.reason }))).toEqual([
      { outcome: "moved", reason: "Keep the full practice block." },
      { outcome: "reduced", reason: "Use the available capacity." },
      { outcome: "kept", reason: "It is still manageable." },
      { outcome: "deferred", reason: "It is optional this week." },
    ]);
  });

  it("clears the selected action when confirmed recovery defers that item", () => {
    const controlled = runtimeAt();
    let state = createBase(controlled.runtime);
    state = command(state, {
      kind: "add-course",
      profileId: PROFILE_ID,
      code: "ENG210",
      title: "Writing workshop",
    }, controlled.runtime);
    const courseId = state.courses[0]?.id;
    if (!courseId) throw new Error("Expected a course.");
    for (const [title, date] of [
      ["Revise thesis", "2026-08-05"],
      ["Read feedback", "2026-08-06"],
    ] as const) {
      state = command(state, {
        kind: "add-plan-item",
        profileId: PROFILE_ID,
        courseId,
        title,
        date,
        minutes: 45,
      }, controlled.runtime);
    }
    const [selectedItem, keptItem] = state.planItems;
    if (!selectedItem || !keptItem) throw new Error("Expected two plan items.");
    state = command(state, {
      kind: "choose-next-action",
      profileId: PROFILE_ID,
      planItemId: selectedItem.id,
    }, controlled.runtime);
    state = command(state, {
      kind: "prepare-recovery",
      profileId: PROFILE_ID,
      summary: "The available study time changed.",
      decisions: [
        {
          planItemId: selectedItem.id,
          outcome: "deferred",
          nextDate: "2026-08-15",
          reason: "The deadline is later than the other work.",
        },
        {
          planItemId: keptItem.id,
          outcome: "kept",
          reason: "This work still fits today.",
        },
      ],
    }, controlled.runtime);
    state = command(state, { kind: "confirm-recovery", profileId: PROFILE_ID }, controlled.runtime);
    expect(state.planItems[0]).toMatchObject({ id: selectedItem.id, status: "deferred" });
    expect(state.selectedNextActionId).toBeNull();
    state = command(state, {
      kind: "resume-deferred-item",
      profileId: PROFILE_ID,
      planItemId: selectedItem.id,
    }, controlled.runtime);
    expect(state.planItems[0]).toMatchObject({
      id: selectedItem.id,
      currentDate: "2026-08-15",
      status: "planned",
    });
  });

  it("blocks independent proof until protected practice completes", () => {
    const controlled = runtimeAt();
    const base = withCourseAndPlan(controlled.runtime);
    const state = startStudy(base.state, base.planItemId, controlled.runtime);
    const result = transitionSemesterDesk(state, {
      kind: "submit-independent-proof",
      profileId: PROFILE_ID,
      planItemId: base.planItemId,
      outcome: "demonstrated",
    }, controlled.runtime);
    expect(result).toMatchObject({ ok: false, error: { code: "practice-required" } });
  });

  it("keeps protected practice active when the student needs more work", () => {
    const controlled = runtimeAt();
    const base = withCourseAndPlan(controlled.runtime);
    let state = startStudy(base.state, base.planItemId, controlled.runtime);
    const studySessionId = state.protectedStudySessions[0]?.id;
    if (!studySessionId) throw new Error("Expected a protected study session.");

    state = command(state, {
      kind: "complete-practice",
      profileId: PROFILE_ID,
      studySessionId,
      outcome: "needs-more-work",
    }, controlled.runtime);

    expect(state.planItems[0]?.status).toBe("in-progress");
    expect(state.protectedStudySessions[0]).toMatchObject({
      status: "active",
      practiceCompletedAt: null,
      practiceOutcome: "needs-more-work",
    });
    expect(progressEvidenceFor(state).at(-1)).toMatchObject({
      kind: "practice-completed",
      outcome: "needs-more-work",
    });
    expect(transitionSemesterDesk(state, {
      kind: "submit-independent-proof",
      profileId: PROFILE_ID,
      planItemId: base.planItemId,
      outcome: "demonstrated",
    }, controlled.runtime)).toMatchObject({
      ok: false,
      error: { code: "practice-required" },
    });

    state = command(state, {
      kind: "complete-practice",
      profileId: PROFILE_ID,
      studySessionId,
      outcome: "completed",
    }, controlled.runtime);
    expect(state.planItems[0]?.status).toBe("practice-complete");
    expect(state.protectedStudySessions[0]?.status).toBe("practice-complete");
  });

  it("does not open a delayed return before its due time", () => {
    const controlled = runtimeAt();
    const base = withCourseAndPlan(controlled.runtime);
    let state = reachProof(base.state, base.planItemId, controlled.runtime);
    state = command(state, {
      kind: "schedule-delayed-return",
      profileId: PROFILE_ID,
      planItemId: base.planItemId,
      dueAt: "2026-08-09T09:00:00.000Z",
    }, controlled.runtime);
    const delayedReturnId = state.delayedReturns[0]?.id;
    if (!delayedReturnId) throw new Error("Expected a delayed return.");
    const early = transitionSemesterDesk(state, {
      kind: "open-delayed-return",
      profileId: PROFILE_ID,
      delayedReturnId,
    }, controlled.runtime);
    expect(early).toMatchObject({ ok: false, error: { code: "return-not-due" } });
    controlled.setTime("2026-08-09T09:00:00.000Z");
    state = command(state, {
      kind: "open-delayed-return",
      profileId: PROFILE_ID,
      delayedReturnId,
    }, controlled.runtime);
    expect(state.delayedReturns[0]).toMatchObject({ status: "open" });
    state = command(state, {
      kind: "complete-delayed-return",
      profileId: PROFILE_ID,
      delayedReturnId,
      outcome: "needs-more-work",
    }, controlled.runtime);
    expect(state.delayedReturns[0]).toMatchObject({
      status: "completed",
      retentionOutcome: "needs-more-work",
    });
    expect(state.planItems[0]).toMatchObject({
      id: base.planItemId,
      status: "planned",
    });
    expect(state.selectedNextActionId).toBe(base.planItemId);
    expect(progressEvidenceFor(state).at(-1)).toMatchObject({
      kind: "delayed-return-completed",
      outcome: "needs-more-work",
    });
  });

  it("keeps a different selected action when another delayed return completes", () => {
    const controlled = runtimeAt();
    const base = withCourseAndPlan(controlled.runtime);
    let state = command(base.state, {
      kind: "add-plan-item",
      profileId: PROFILE_ID,
      courseId: base.courseId,
      title: "Second proof practice",
      date: "2026-08-06",
      minutes: 45,
    }, controlled.runtime);
    state = reachProof(state, base.planItemId, controlled.runtime);
    state = command(state, {
      kind: "schedule-delayed-return",
      profileId: PROFILE_ID,
      planItemId: base.planItemId,
      dueAt: "2026-08-09T09:00:00.000Z",
    }, controlled.runtime);
    const delayedReturnId = state.delayedReturns[0]?.id;
    const secondItemId = state.planItems[1]?.id;
    if (!delayedReturnId || !secondItemId) throw new Error("Expected a return and second item.");
    state = command(state, {
      kind: "choose-next-action",
      profileId: PROFILE_ID,
      planItemId: secondItemId,
    }, controlled.runtime);
    controlled.setTime("2026-08-09T09:00:00.000Z");
    state = command(state, {
      kind: "open-delayed-return",
      profileId: PROFILE_ID,
      delayedReturnId,
    }, controlled.runtime);
    state = command(state, {
      kind: "complete-delayed-return",
      profileId: PROFILE_ID,
      delayedReturnId,
      outcome: "retained",
    }, controlled.runtime);

    expect(state.selectedNextActionId).toBe(secondItemId);
  });

  it("rejects commands from another profile", () => {
    const controlled = runtimeAt();
    const state = createBase(controlled.runtime);
    const result = transitionSemesterDesk(state, {
      kind: "draft-capacity",
      profileId: "profile.someone-else",
      availableMinutes: 120,
    }, controlled.runtime);
    expect(result).toMatchObject({ ok: false, error: { code: "profile-mismatch" } });
    expect(state.capacity).toBeNull();
  });

  it("returns deterministic state when clock and identifiers are injected", () => {
    function run(): SemesterDeskState {
      const controlled = runtimeAt();
      let state = createBase(controlled.runtime);
      state = command(state, {
        kind: "add-course",
        profileId: PROFILE_ID,
        code: "PHY101",
        title: "Mechanics",
      }, controlled.runtime);
      const courseId = state.courses[0]?.id;
      if (!courseId) throw new Error("Expected a course.");
      return command(state, {
        kind: "add-plan-item",
        profileId: PROFILE_ID,
        courseId,
        title: "Derive Newton second law",
        date: "2026-08-06",
        minutes: 50,
      }, controlled.runtime);
    }

    expect(run()).toEqual(run());
  });

  it("returns explicit errors for invalid transitions", () => {
    const controlled = runtimeAt();
    const base = withCourseAndPlan(controlled.runtime);
    expect(transitionSemesterDesk(base.state, {
      kind: "confirm-capacity",
      profileId: PROFILE_ID,
    }, controlled.runtime)).toMatchObject({ ok: false, error: { code: "capacity-draft-missing" } });
    expect(transitionSemesterDesk(base.state, {
      kind: "start-protected-study",
      profileId: PROFILE_ID,
      planItemId: base.planItemId,
    }, controlled.runtime)).toMatchObject({ ok: false, error: { code: "next-action-required" } });
    expect(transitionSemesterDesk(base.state, {
      kind: "prepare-recovery",
      profileId: PROFILE_ID,
      summary: "One decision is missing.",
      decisions: [],
    }, controlled.runtime)).toMatchObject({ ok: false, error: { code: "recovery-decision-invalid" } });
  });

  it("excludes injected raw answer text from state and progress evidence", () => {
    const controlled = runtimeAt();
    const base = withCourseAndPlan(controlled.runtime);
    let state = startStudy(base.state, base.planItemId, controlled.runtime);
    const studySessionId = state.protectedStudySessions[0]?.id;
    if (!studySessionId) throw new Error("Expected a protected study session.");
    state = command(state, {
      kind: "complete-practice",
      profileId: PROFILE_ID,
      studySessionId,
      outcome: "completed",
    }, controlled.runtime);
    state = command(state, {
      kind: "submit-independent-proof",
      profileId: PROFILE_ID,
      planItemId: base.planItemId,
      outcome: "demonstrated",
      rawAnswer: "THE-RAW-ANSWER-MUST-NOT-LEAK",
    } as unknown as SemesterDeskCommand, controlled.runtime);

    expect(JSON.stringify(state)).not.toContain("THE-RAW-ANSWER-MUST-NOT-LEAK");
    expect(JSON.stringify(progressEvidenceFor(state))).not.toContain("THE-RAW-ANSWER-MUST-NOT-LEAK");
    expect(progressEvidenceFor(state)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "independent-proof-completed", outcome: "demonstrated" }),
    ]));
  });
});
