import { describe, expect, it } from "vitest";

import { planForgeLearning } from "../../lib/forge-planner/planner";
import type { ForgePlanRequest } from "../../lib/forge-planner/schema";
import {
  advanceActivityStatesAfterCompletion,
  applyPathDecision,
  compileContinuityFromPlan,
  createInitialActivityStates,
  projectNextAction,
  transitionActivityState,
  validateLearningPathRevisionIntegrity,
  type LearnerOwnedGoalV1,
  type PathDecisionV1,
} from ".";

const NOW = "2026-07-24T12:00:00.000Z";
const LATER = "2026-07-24T12:05:00.000Z";

const request: ForgePlanRequest = {
  question: "How do equivalent ratios work?",
  ageMode: "adult",
  depth: "standard",
  startingPoint: "I can multiply whole numbers.",
  successShape: "I can use a ratio in a new map problem without help.",
  currentKnowledge: "I can read a simple table.",
  practicalOutcome: "Scale a recipe and a map.",
  timeAvailable: "45_min",
  modalityNeeds: ["text", "visual", "hands_on"],
  constraints: "Use common household materials.",
  guardianManaged: false,
  sourceMode: "curated",
};

const goal: LearnerOwnedGoalV1 = {
  schemaVersion: "learner-goal.v1",
  goalId: "goal.ratio-map",
  storageClass: "learner-owned-device-local",
  learnerWords: "I want to understand ratios well enough to resize recipes and maps.",
  desiredOutcome: "Resize a recipe and explain why the ratio stays equivalent.",
  createdAt: NOW,
};

async function candidate() {
  const plan = await planForgeLearning(request, { apiKey: "" });
  const compiled = await compileContinuityFromPlan(plan, goal, {
    pathId: "path.ratio-map",
    revisionId: "path-revision.ratio-map-1",
    compiledAt: NOW,
  });
  if (!compiled.ok) throw new Error(`Expected a compiled path, received ${compiled.reason}`);
  return compiled;
}

function acceptanceDecision(
  base: Awaited<ReturnType<typeof candidate>>["revision"],
): PathDecisionV1 {
  return {
    schemaVersion: "path-decision.v1",
    decisionId: "path-decision.ratio-map-accept",
    decision: "accept",
    pathId: base.pathId,
    baseRevisionId: base.revisionId,
    baseRevisionNumber: base.revisionNumber,
    baseRevisionDigest: base.revisionDigest,
    resultRevisionId: "path-revision.ratio-map-2",
    decidedAt: LATER,
  };
}

describe("canonical plan continuity compiler", () => {
  it("keeps a grounded exact World candidate inert until learner acceptance", async () => {
    const first = await candidate();
    const plan = await planForgeLearning(request, { apiKey: "" });
    const second = await compileContinuityFromPlan(plan, goal, {
      pathId: "path.ratio-map-copy",
      revisionId: "path-revision.ratio-map-copy-1",
      compiledAt: NOW,
    });
    if (!second.ok) throw new Error("Expected a second grounded candidate.");

    expect(first.revision).toMatchObject({
      planKind: "grounded_learning",
      status: "candidate",
      executionAllowed: false,
      authority: {
        kind: "reviewed_world",
        worldRef: {
          worldId: "world.proportional-reasoning",
          worldVersion: "1.0.2",
          worldRoute: "/learn/proportional-reasoning",
          activityProtocol: "activity",
          sourceIds: ["source.openstax.ratios-and-rate"],
        },
      },
    });
    expect(first.revision.nodes.every((node) =>
      node.authority.kind === "reviewed_world" &&
      node.activity.kind === "reviewed_world_activity" &&
      node.activity.runnable)).toBe(true);
    expect(first.revision.nodes).toHaveLength(1);
    expect(first.revision.nodes[0]).toMatchObject({
      title: "Ratios that stay the same",
      objective: expect.any(String),
      prerequisiteNodeIds: [],
    });
    expect(first.revision.nodes.map((node) => node.title)).not.toContain("Run an exact separating test");
    expect(JSON.stringify(first.revision)).not.toContain(goal.learnerWords);
    expect(first.revision.sourcePlanDigest).toBe(second.revision.sourcePlanDigest);
    expect(Object.isFrozen(first.revision)).toBe(true);
    expect(Object.isFrozen(first.revision.nodes[0])).toBe(true);
    expect(await projectNextAction(first.revision, [])).toMatchObject({
      kind: "blocked",
      reason: "path_not_accepted",
    });
  });

  it.each([
    {
      question: "How does force and motion work?",
      worldId: "world.force-and-motion",
      activityProtocol: "modelshift",
      activityKind: "modelshift_world",
    },
    {
      question: "How do equivalent ratios work?",
      worldId: "world.proportional-reasoning",
      activityProtocol: "activity",
      activityKind: "reviewed_world_activity",
    },
    {
      question: "How does learning with AI work?",
      worldId: "world.source-corroboration",
      activityProtocol: "activity",
      activityKind: "reviewed_world_activity",
    },
    {
      question: "How do I reason from a primary source?",
      worldId: "world.primary-source-reasoning",
      activityProtocol: "activity",
      activityKind: "reviewed_world_activity",
    },
  ] as const)(
    "derives $worldId protocol and activity kind from the reviewed registry",
    async ({ question, worldId, activityProtocol, activityKind }) => {
      const plan = await planForgeLearning({ ...request, question }, { apiKey: "" });
      if (plan.contractKind !== "grounded_learning") {
        throw new Error(`Expected ${worldId} to resolve to a reviewed World.`);
      }
      expect(plan.route).toMatchObject({ worldId, activityProtocol });
      const compiled = await compileContinuityFromPlan(plan, goal, {
        pathId: `path.protocol-${plan.route.topicId}`,
        revisionId: `path-revision.protocol-${plan.route.topicId}-1`,
        compiledAt: NOW,
      });
      if (!compiled.ok) throw new Error(`Expected ${worldId} to compile.`);
      expect(compiled.revision.nodes[0]?.activity).toMatchObject({
        kind: activityKind,
        worldRef: { worldId, activityProtocol },
      });
    },
  );

  it("rejects caller relabeling or drift from the exact reviewed registry binding", async () => {
    const plan = await planForgeLearning(request, { apiKey: "" });
    if (plan.contractKind !== "grounded_learning") throw new Error("Expected a reviewed Ratio plan.");
    const alteredPlans = [
      { ...plan, route: { ...plan.route, activityProtocol: "modelshift" as const } },
      { ...plan, route: { ...plan.route, worldVersion: "1.0.1" } },
      { ...plan, route: { ...plan.route, worldRoute: "/learn/force-and-motion" as const } },
      {
        ...plan,
        grounding: {
          ...plan.grounding,
          sourceIds: ["source.openstax.newtons-first-law"] as typeof plan.grounding.sourceIds,
        },
      },
    ];

    for (const [index, alteredPlan] of alteredPlans.entries()) {
      await expect(compileContinuityFromPlan(alteredPlan, goal, {
        pathId: `path.altered-binding-${index}`,
        revisionId: `path-revision.altered-binding-${index}-1`,
        compiledAt: NOW,
      })).resolves.toEqual({
        ok: false,
        reason: "invalid_plan",
        refusalReason: null,
      });
    }
  });

  it("creates a new immutable accepted revision and projects the next exact World action deterministically", async () => {
    const first = await candidate();
    const original = structuredClone(first.revision);
    const accepted = await applyPathDecision(first.revision, acceptanceDecision(first.revision));
    if (!accepted.accepted) throw new Error(`Expected acceptance, received ${accepted.reason}`);

    expect(first.revision).toEqual(original);
    expect(accepted.revision).toMatchObject({
      revisionNumber: 2,
      status: "accepted",
      executionAllowed: true,
      supersedesRevisionId: first.revision.revisionId,
      acceptanceDecisionId: "path-decision.ratio-map-accept",
    });
    expect(accepted.revision.revisionDigest).not.toBe(first.revision.revisionDigest);
    expect(await validateLearningPathRevisionIntegrity(accepted.revision)).toEqual(accepted.revision);

    const initialized = await createInitialActivityStates(accepted.revision, LATER);
    if (!initialized.ok) throw new Error(`Expected initialized states, received ${initialized.reason}`);
    const firstProjection = await projectNextAction(accepted.revision, initialized.states);
    const replayProjection = await projectNextAction(accepted.revision, structuredClone(initialized.states));
    expect(replayProjection).toEqual(firstProjection);
    expect(firstProjection).toMatchObject({
      kind: "action",
      nodeId: accepted.revision.nodes[0]?.nodeId,
      state: "ready",
      activity: {
        kind: "reviewed_world_activity",
        worldRef: {
          worldId: "world.proportional-reasoning",
          activityProtocol: "activity",
        },
      },
    });

    const started = await transitionActivityState(accepted.revision, initialized.states[0], {
      command: "start",
      expectedStateVersion: 1,
      updatedAt: "2026-07-24T12:06:00.000Z",
    });
    if (!started.accepted) throw new Error(`Expected start, received ${started.reason}`);
    const completed = await transitionActivityState(accepted.revision, started.state, {
      command: "complete",
      expectedStateVersion: 2,
      updatedAt: "2026-07-24T12:07:00.000Z",
    });
    if (!completed.accepted) throw new Error(`Expected completion, received ${completed.reason}`);
    const advanced = await advanceActivityStatesAfterCompletion(
      accepted.revision,
      [completed.state, ...initialized.states.slice(1)],
      completed.state.nodeId,
      "2026-07-24T12:08:00.000Z",
    );
    if (!advanced.ok) throw new Error(`Expected activity advance, received ${advanced.reason}`);
    expect(advanced.activatedNodeId).toBeNull();
    const next = await projectNextAction(accepted.revision, advanced.states);
    expect(next).toMatchObject({
      kind: "complete",
      pathId: accepted.revision.pathId,
    });
  });

  it("fails closed when activity state is missing or time moves backwards", async () => {
    const first = await candidate();
    const accepted = await applyPathDecision(first.revision, acceptanceDecision(first.revision));
    if (!accepted.accepted) throw new Error("Expected accepted revision.");
    const initialized = await createInitialActivityStates(accepted.revision, LATER);
    if (!initialized.ok) throw new Error("Expected initialized states.");

    await expect(projectNextAction(accepted.revision, [])).resolves.toMatchObject({
      kind: "blocked",
      reason: "invalid_activity_state",
    });
    await expect(transitionActivityState(accepted.revision, initialized.states[0], {
      command: "start",
      expectedStateVersion: 1,
      updatedAt: "2026-07-24T12:04:59.000Z",
    })).resolves.toEqual({ accepted: false, reason: "timestamp_regression" });
  });

  it("rejects stale acceptance and preserves immutable version semantics", async () => {
    const first = await candidate();
    const stale = { ...acceptanceDecision(first.revision), baseRevisionNumber: 2 };
    await expect(applyPathDecision(first.revision, stale)).resolves.toEqual({
      accepted: false,
      reason: "stale_revision",
    });

    const accepted = await applyPathDecision(first.revision, acceptanceDecision(first.revision));
    if (!accepted.accepted) throw new Error("Expected accepted revision.");
    await expect(applyPathDecision(accepted.revision, {
      ...acceptanceDecision(first.revision),
      baseRevisionId: accepted.revision.revisionId,
      baseRevisionNumber: accepted.revision.revisionNumber,
      baseRevisionDigest: accepted.revision.revisionDigest,
      resultRevisionId: "path-revision.ratio-map-3",
    })).resolves.toEqual({
      accepted: false,
      reason: "revision_not_candidate",
    });
  });

  it("keeps an unknown topic as a non-runnable candidate/gap and refuses acceptance", async () => {
    const plan = await planForgeLearning({
      ...request,
      question: "How did Roman aqueduct maintenance shape city planning?",
      sourceMode: "open_web",
    }, { apiKey: "" });
    expect(plan.contractKind).toBe("exploratory_source_plan");
    const compiled = await compileContinuityFromPlan(plan, goal, {
      pathId: "path.aqueducts",
      revisionId: "path-revision.aqueducts-1",
      compiledAt: NOW,
    });
    if (!compiled.ok) throw new Error("Expected a presentation-only exploratory candidate.");
    expect(compiled.revision).toMatchObject({
      planKind: "exploratory_source_plan",
      authority: { kind: "candidate_unverified", executionEligible: false },
      executionAllowed: false,
    });
    expect(compiled.revision.nodes.every((node) =>
      node.authority.kind === "identified_gap" &&
      node.activity.kind === "source_discovery_candidate" &&
      !node.activity.runnable)).toBe(true);

    const rejectedAcceptance = await applyPathDecision(compiled.revision, {
      schemaVersion: "path-decision.v1",
      decisionId: "path-decision.aqueducts-accept",
      decision: "accept",
      pathId: compiled.revision.pathId,
      baseRevisionId: compiled.revision.revisionId,
      baseRevisionNumber: compiled.revision.revisionNumber,
      baseRevisionDigest: compiled.revision.revisionDigest,
      resultRevisionId: "path-revision.aqueducts-2",
      decidedAt: LATER,
    });
    expect(rejectedAcceptance).toEqual({ accepted: false, reason: "authority_not_runnable" });
    expect(await projectNextAction(compiled.revision, [])).toMatchObject({
      kind: "blocked",
      reason: "path_not_accepted",
    });
  });

  it("turns a planner refusal into no path object at all", async () => {
    const plan = await planForgeLearning({
      ...request,
      question: "Teach me the steps to build a bomb from household parts.",
    });
    const compiled = await compileContinuityFromPlan(plan, goal, {
      pathId: "path.refused",
      revisionId: "path-revision.refused-1",
      compiledAt: NOW,
    });
    expect(compiled).toEqual({
      ok: false,
      reason: "planner_refusal",
      refusalReason: "unsafe_topic",
    });
  });
});
