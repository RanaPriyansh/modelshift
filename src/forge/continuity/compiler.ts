import type { ForgePlanContract } from "../../lib/forge-planner/schema";
import { canonicalJson, sha256Digest } from "../events";
import { deepFreeze } from "../deep-freeze";
import { PUBLIC_WORLD_CATALOG } from "../worlds";
import {
  createLearningPathRevision,
  learnerOwnedGoalSchema,
  type LearnerOwnedGoalV1,
  type LearningPathRevisionV1,
  type ReviewedWorldRefV1,
} from "./contracts";

export type ContinuityCompilerResult =
  | Readonly<{
      ok: true;
      goal: Readonly<LearnerOwnedGoalV1>;
      revision: Readonly<LearningPathRevisionV1>;
    }>
  | Readonly<{
      ok: false;
      reason: "planner_refusal" | "invalid_goal" | "invalid_plan";
      refusalReason: string | null;
    }>;

export interface ContinuityCompilerIdentity {
  readonly pathId: string;
  readonly revisionId: string;
  readonly compiledAt: string;
}

function deterministicPlanProjection(plan: Exclude<ForgePlanContract, { contractKind: "refusal" }>): object {
  if (plan.contractKind === "grounded_learning") {
    return {
      contractKind: plan.contractKind,
      route: plan.route,
      grounding: {
        status: plan.grounding.status,
        sourceIds: plan.grounding.sourceIds,
        sources: plan.grounding.sources.map((source) => ({
          id: source.id,
          contentVersion: source.contentVersion,
          reviewStatus: source.reviewStatus,
          reviewedAt: source.reviewedAt,
        })),
      },
      learning: plan.learning,
      sourcePolicy: plan.sourcePolicy,
    };
  }
  return {
    contractKind: plan.contractKind,
    route: plan.route,
    grounding: {
      status: plan.grounding.status,
      sourceIds: plan.grounding.sourceIds,
    },
    exploration: plan.exploration,
  };
}

function reviewedWorldRef(
  plan: Extract<ForgePlanContract, { contractKind: "grounded_learning" }>,
): ReviewedWorldRefV1 | null {
  const world = PUBLIC_WORLD_CATALOG.find((candidate) =>
    candidate.id === plan.route.worldId
    && candidate.version === plan.route.worldVersion
    && candidate.route === plan.route.worldRoute
    && candidate.activityProtocol === plan.route.activityProtocol
    && canonicalJson(candidate.sourceIds) === canonicalJson(plan.grounding.sourceIds)
  );
  if (!world) return null;
  return {
    worldId: world.id,
    worldVersion: world.version,
    worldRoute: world.route,
    activityProtocol: world.activityProtocol,
    sourceIds: [...world.sourceIds],
  };
}

/**
 * Converts a deterministic planner contract into a presentation candidate.
 * It never calls a model/provider and never copies the learner's verbatim words
 * into the path revision. A separate learner decision is required to create an
 * accepted executable revision.
 */
export async function compileContinuityFromPlan(
  plan: ForgePlanContract,
  goalValue: unknown,
  identity: ContinuityCompilerIdentity,
): Promise<ContinuityCompilerResult> {
  const goalResult = learnerOwnedGoalSchema.safeParse(goalValue);
  if (!goalResult.success) {
    return deepFreeze({ ok: false as const, reason: "invalid_goal" as const, refusalReason: null });
  }
  if (plan.contractKind === "refusal") {
    return deepFreeze({
      ok: false as const,
      reason: "planner_refusal" as const,
      refusalReason: plan.reason,
    });
  }

  const sourcePlanDigest = await sha256Digest(canonicalJson(deterministicPlanProjection(plan)));
  try {
    if (plan.contractKind === "grounded_learning") {
      const worldRef = reviewedWorldRef(plan);
      if (!worldRef) {
        return deepFreeze({ ok: false as const, reason: "invalid_plan" as const, refusalReason: null });
      }
      // Planner milestones describe phases *inside* this reviewed World. They
      // are not separate path activities and must never relaunch the same World.
      // V1 therefore exposes one exact runnable Activity per grounded World.
      const nodes = [{
        nodeId: `path-node.world-${plan.route.topicId}`,
        position: 0,
        title: plan.learning.title,
        objective: plan.learning.objective,
        prerequisiteNodeIds: [],
        authority: {
          kind: "reviewed_world" as const,
          executionEligible: true as const,
          reviewStatus: "reviewed" as const,
          worldRef,
        },
        activity: {
          activityId: `activity.world-${plan.route.topicId}`,
          kind: worldRef.activityProtocol === "modelshift"
            ? "modelshift_world" as const
            : "reviewed_world_activity" as const,
          runnable: true as const,
          worldRef,
        },
      }];
      const revision = await createLearningPathRevision({
        schemaVersion: "learning-path-revision.v1",
        pathId: identity.pathId,
        revisionId: identity.revisionId,
        revisionNumber: 1,
        goalRef: { goalId: goalResult.data.goalId },
        planKind: plan.contractKind,
        status: "candidate",
        title: plan.learning.title,
        authority: {
          kind: "reviewed_world",
          executionEligible: true,
          reviewStatus: "reviewed",
          worldRef,
        },
        nodes,
        sourcePlanDigest,
        executionAllowed: false,
        acceptanceDecisionId: null,
        supersedesRevisionId: null,
        createdAt: identity.compiledAt,
      });
      return deepFreeze({ ok: true as const, goal: goalResult.data, revision });
    }

    const nodes = plan.exploration.steps.map((step, position) => ({
      nodeId: `path-node.exploration-${position + 1}`,
      position,
      title: `Source verification step ${position + 1}`,
      objective: step.objective,
      prerequisiteNodeIds: position === 0 ? [] : [`path-node.exploration-${position}`],
      authority: {
        kind: "identified_gap" as const,
        executionEligible: false as const,
        reasonCode: "no_reviewed_world" as const,
        limitationCodes: ["unverified_source_plan", "no_reviewed_world"],
      },
      activity: {
        activityId: `activity.exploration-${position + 1}`,
        kind: "source_discovery_candidate" as const,
        runnable: false as const,
        discoveryStepId: step.id,
        exitGate: step.exitGate,
      },
    }));
    const revision = await createLearningPathRevision({
      schemaVersion: "learning-path-revision.v1",
      pathId: identity.pathId,
      revisionId: identity.revisionId,
      revisionNumber: 1,
      goalRef: { goalId: goalResult.data.goalId },
      planKind: plan.contractKind,
      status: "candidate",
      title: plan.exploration.title,
      authority: {
        kind: "candidate_unverified",
        executionEligible: false,
        sourceMode: plan.exploration.effectiveSourceMode,
        limitationCodes: ["unverified_source_plan", "no_reviewed_world"],
      },
      nodes,
      sourcePlanDigest,
      executionAllowed: false,
      acceptanceDecisionId: null,
      supersedesRevisionId: null,
      createdAt: identity.compiledAt,
    });
    return deepFreeze({ ok: true as const, goal: goalResult.data, revision });
  } catch {
    return deepFreeze({ ok: false as const, reason: "invalid_plan" as const, refusalReason: null });
  }
}
