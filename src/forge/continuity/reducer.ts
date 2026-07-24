import { z } from "zod";

import { deepFreeze } from "../deep-freeze";
import {
  ACTIVITY_STATE_SCHEMA_VERSION,
  activityStateSchema,
  createLearningPathRevision,
  pathDecisionSchema,
  validateLearningPathRevisionIntegrity,
  type ActivityStateV1,
  type LearningPathRevisionV1,
} from "./contracts";

export type ApplyPathDecisionResult =
  | Readonly<{ accepted: true; revision: Readonly<LearningPathRevisionV1> }>
  | Readonly<{
      accepted: false;
      reason:
        | "invalid_revision"
        | "invalid_decision"
        | "stale_revision"
        | "revision_not_candidate"
        | "revision_requires_recompile"
        | "authority_not_runnable";
    }>;

export async function applyPathDecision(
  revisionValue: unknown,
  decisionValue: unknown,
): Promise<ApplyPathDecisionResult> {
  const revision = await validateLearningPathRevisionIntegrity(revisionValue);
  if (!revision) return deepFreeze({ accepted: false as const, reason: "invalid_revision" as const });
  const parsedDecision = pathDecisionSchema.safeParse(decisionValue);
  if (!parsedDecision.success) return deepFreeze({ accepted: false as const, reason: "invalid_decision" as const });
  const decision = parsedDecision.data;

  if (
    decision.pathId !== revision.pathId ||
    decision.baseRevisionId !== revision.revisionId ||
    decision.baseRevisionNumber !== revision.revisionNumber ||
    decision.baseRevisionDigest !== revision.revisionDigest
  ) {
    return deepFreeze({ accepted: false as const, reason: "stale_revision" as const });
  }
  if (Date.parse(decision.decidedAt) < Date.parse(revision.createdAt)) {
    return deepFreeze({ accepted: false as const, reason: "invalid_decision" as const });
  }
  if (revision.status !== "candidate") {
    return deepFreeze({ accepted: false as const, reason: "revision_not_candidate" as const });
  }
  if (decision.decision === "request_revision") {
    return deepFreeze({ accepted: false as const, reason: "revision_requires_recompile" as const });
  }
  if (decision.decision === "accept" && revision.authority.kind !== "reviewed_world") {
    return deepFreeze({ accepted: false as const, reason: "authority_not_runnable" as const });
  }

  const status = decision.decision === "accept" ? "accepted" as const : "rejected" as const;
  const next = await createLearningPathRevision({
    schemaVersion: revision.schemaVersion,
    pathId: revision.pathId,
    revisionId: decision.resultRevisionId,
    revisionNumber: revision.revisionNumber + 1,
    goalRef: revision.goalRef,
    planKind: revision.planKind,
    status,
    title: revision.title,
    authority: revision.authority,
    nodes: revision.nodes,
    sourcePlanDigest: revision.sourcePlanDigest,
    executionAllowed: status === "accepted",
    acceptanceDecisionId: status === "accepted" ? decision.decisionId : null,
    supersedesRevisionId: revision.revisionId,
    createdAt: decision.decidedAt,
  });
  return deepFreeze({ accepted: true as const, revision: next });
}

export type InitialActivityStatesResult =
  | Readonly<{ ok: true; states: readonly Readonly<ActivityStateV1>[] }>
  | Readonly<{ ok: false; reason: "invalid_revision" | "path_not_executable" }>;

export async function createInitialActivityStates(
  revisionValue: unknown,
  initializedAt: string,
): Promise<InitialActivityStatesResult> {
  const revision = await validateLearningPathRevisionIntegrity(revisionValue);
  if (!revision) return deepFreeze({ ok: false as const, reason: "invalid_revision" as const });
  if (revision.status !== "accepted" || !revision.executionAllowed || revision.authority.kind !== "reviewed_world") {
    return deepFreeze({ ok: false as const, reason: "path_not_executable" as const });
  }
  const states = [...revision.nodes]
    .sort((left, right) => left.position - right.position)
    .map((node, index) => activityStateSchema.parse({
      schemaVersion: ACTIVITY_STATE_SCHEMA_VERSION,
      pathId: revision.pathId,
      pathRevisionId: revision.revisionId,
      nodeId: node.nodeId,
      stateVersion: 1,
      status: index === 0 ? "ready" : "not_started",
      updatedAt: initializedAt,
    }));
  return deepFreeze({ ok: true as const, states });
}

const activityStateCommandSchema = z.strictObject({
  command: z.enum(["start", "complete", "block"]),
  expectedStateVersion: z.number().int().min(1).max(1_000_000),
  updatedAt: z.string().datetime({ offset: true }),
});
export type ActivityStateCommand = z.infer<typeof activityStateCommandSchema>;

export type ActivityStateTransitionResult =
  | Readonly<{ accepted: true; state: Readonly<ActivityStateV1> }>
  | Readonly<{
      accepted: false;
      reason: "invalid_revision" | "invalid_state" | "invalid_command" | "stale_state" | "timestamp_regression" | "forbidden_transition";
    }>;

export async function transitionActivityState(
  revisionValue: unknown,
  stateValue: unknown,
  commandValue: unknown,
): Promise<ActivityStateTransitionResult> {
  const revision = await validateLearningPathRevisionIntegrity(revisionValue);
  if (!revision || revision.status !== "accepted" || !revision.executionAllowed) {
    return deepFreeze({ accepted: false as const, reason: "invalid_revision" as const });
  }
  const stateResult = activityStateSchema.safeParse(stateValue);
  if (!stateResult.success ||
    stateResult.data.pathId !== revision.pathId ||
    stateResult.data.pathRevisionId !== revision.revisionId ||
    !revision.nodes.some((node) => node.nodeId === stateResult.data.nodeId)) {
    return deepFreeze({ accepted: false as const, reason: "invalid_state" as const });
  }
  const commandResult = activityStateCommandSchema.safeParse(commandValue);
  if (!commandResult.success) return deepFreeze({ accepted: false as const, reason: "invalid_command" as const });
  if (commandResult.data.expectedStateVersion !== stateResult.data.stateVersion) {
    return deepFreeze({ accepted: false as const, reason: "stale_state" as const });
  }
  if (Date.parse(commandResult.data.updatedAt) < Date.parse(stateResult.data.updatedAt)) {
    return deepFreeze({ accepted: false as const, reason: "timestamp_regression" as const });
  }

  const allowed: Readonly<Record<ActivityStateCommand["command"], readonly ActivityStateV1["status"][]>> = {
    start: ["ready"],
    complete: ["in_progress"],
    block: ["ready", "in_progress"],
  };
  if (!allowed[commandResult.data.command].includes(stateResult.data.status)) {
    return deepFreeze({ accepted: false as const, reason: "forbidden_transition" as const });
  }
  const nextStatus: Readonly<Record<ActivityStateCommand["command"], ActivityStateV1["status"]>> = {
    start: "in_progress",
    complete: "completed",
    block: "blocked",
  };
  return deepFreeze({
    accepted: true as const,
    state: activityStateSchema.parse({
      ...stateResult.data,
      stateVersion: stateResult.data.stateVersion + 1,
      status: nextStatus[commandResult.data.command],
      updatedAt: commandResult.data.updatedAt,
    }),
  });
}

export type AdvanceActivityStatesResult =
  | Readonly<{ ok: true; states: readonly Readonly<ActivityStateV1>[]; activatedNodeId: string | null }>
  | Readonly<{
      ok: false;
      reason: "invalid_revision" | "invalid_activity_states" | "completed_node_not_found";
    }>;

/**
 * Activates the first remaining node whose exact prerequisites are complete.
 * This is a disposable progress projection only; it creates no evidence and
 * never changes the accepted immutable path revision.
 */
export async function advanceActivityStatesAfterCompletion(
  revisionValue: unknown,
  stateValues: readonly unknown[],
  completedNodeId: string,
  updatedAt: string,
): Promise<AdvanceActivityStatesResult> {
  const revision = await validateLearningPathRevisionIntegrity(revisionValue);
  if (!revision || revision.status !== "accepted" || !revision.executionAllowed) {
    return deepFreeze({ ok: false as const, reason: "invalid_revision" as const });
  }
  const timestamp = z.string().datetime({ offset: true }).safeParse(updatedAt);
  const parsedStates = stateValues.map((value) => activityStateSchema.safeParse(value));
  if (
    !timestamp.success ||
    parsedStates.some((result) => !result.success) ||
    parsedStates.length !== revision.nodes.length
  ) {
    return deepFreeze({ ok: false as const, reason: "invalid_activity_states" as const });
  }
  const states = parsedStates.map((result) => {
    if (!result.success) throw new Error("Unreachable parsed-state branch.");
    return result.data;
  });
  const byNode = new Map<string, ActivityStateV1>();
  for (const state of states) {
    if (
      byNode.has(state.nodeId) ||
      state.pathId !== revision.pathId ||
      state.pathRevisionId !== revision.revisionId ||
      !revision.nodes.some((node) => node.nodeId === state.nodeId)
    ) {
      return deepFreeze({ ok: false as const, reason: "invalid_activity_states" as const });
    }
    byNode.set(state.nodeId, state);
  }
  const completed = byNode.get(completedNodeId);
  if (!completed || completed.status !== "completed") {
    return deepFreeze({ ok: false as const, reason: "completed_node_not_found" as const });
  }
  if (states.some((state) => Date.parse(timestamp.data) < Date.parse(state.updatedAt))) {
    return deepFreeze({ ok: false as const, reason: "invalid_activity_states" as const });
  }
  const done = (nodeId: string) => byNode.get(nodeId)?.status === "completed";
  const nextNode = [...revision.nodes]
    .sort((left, right) => left.position - right.position)
    .find((node) => {
      const state = byNode.get(node.nodeId);
      return state?.status === "not_started" && node.prerequisiteNodeIds.every(done);
    });
  if (!nextNode) {
    return deepFreeze({ ok: true as const, states, activatedNodeId: null });
  }
  const nextState = byNode.get(nextNode.nodeId)!;
  const advanced = states.map((state) =>
    state.nodeId === nextNode.nodeId
      ? activityStateSchema.parse({
          ...nextState,
          stateVersion: nextState.stateVersion + 1,
          status: "ready",
          updatedAt: timestamp.data,
        })
      : state,
  );
  return deepFreeze({
    ok: true as const,
    states: advanced,
    activatedNodeId: nextNode.nodeId,
  });
}
