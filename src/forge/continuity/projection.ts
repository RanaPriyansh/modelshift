import { deepFreeze } from "../deep-freeze";
import {
  NEXT_ACTION_SCHEMA_VERSION,
  activityStateSchema,
  nextActionProjectionSchema,
  validateLearningPathRevisionIntegrity,
  type ActivityStateV1,
  type LearningPathRevisionV1,
  type NextActionProjectionV1,
} from "./contracts";

function blockedIdentity(value: unknown): { pathId: string; revisionId: string } {
  if (typeof value !== "object" || value === null) {
    return { pathId: "path.invalid", revisionId: "path-revision.invalid" };
  }
  const candidate = value as { pathId?: unknown; revisionId?: unknown };
  return {
    pathId: typeof candidate.pathId === "string" ? candidate.pathId : "path.invalid",
    revisionId: typeof candidate.revisionId === "string" ? candidate.revisionId : "path-revision.invalid",
  };
}

function blocked(
  revision: Pick<LearningPathRevisionV1, "pathId" | "revisionId">,
  reason: Extract<NextActionProjectionV1, { kind: "blocked" }>["reason"],
  nodeId: string | null,
): Readonly<NextActionProjectionV1> {
  return deepFreeze(nextActionProjectionSchema.parse({
    schemaVersion: NEXT_ACTION_SCHEMA_VERSION,
    kind: "blocked",
    pathId: revision.pathId,
    pathRevisionId: revision.revisionId,
    reason,
    nodeId,
  }));
}

/**
 * Projects one deterministic action from an immutable accepted revision and its
 * versioned activity states. It never interprets evidence or silently promotes
 * an exploratory/candidate node.
 */
export async function projectNextAction(
  revisionValue: unknown,
  stateValues: readonly unknown[],
): Promise<Readonly<NextActionProjectionV1>> {
  const revision = await validateLearningPathRevisionIntegrity(revisionValue);
  if (!revision) {
    const identity = blockedIdentity(revisionValue);
    return blocked(identity, "invalid_revision", null);
  }
  if (revision.status !== "accepted") return blocked(revision, "path_not_accepted", null);
  if (!revision.executionAllowed || revision.authority.kind !== "reviewed_world") {
    return blocked(revision, "path_not_reviewed", null);
  }

  const states = new Map<string, ActivityStateV1>();
  for (const value of stateValues) {
    const parsed = activityStateSchema.safeParse(value);
    if (!parsed.success ||
      parsed.data.pathId !== revision.pathId ||
      parsed.data.pathRevisionId !== revision.revisionId ||
      states.has(parsed.data.nodeId) ||
      !revision.nodes.some((node) => node.nodeId === parsed.data.nodeId)) {
      return blocked(revision, "invalid_activity_state", null);
    }
    states.set(parsed.data.nodeId, parsed.data);
  }
  if (states.size !== revision.nodes.length) {
    return blocked(revision, "invalid_activity_state", null);
  }

  const ordered = [...revision.nodes].sort((left, right) => left.position - right.position);
  const isDone = (nodeId: string) => {
    const status = states.get(nodeId)?.status;
    return status === "completed";
  };
  const nextNode = ordered.find((node) => !isDone(node.nodeId));
  if (!nextNode) {
    return deepFreeze(nextActionProjectionSchema.parse({
      schemaVersion: NEXT_ACTION_SCHEMA_VERSION,
      kind: "complete",
      pathId: revision.pathId,
      pathRevisionId: revision.revisionId,
    }));
  }
  if (!nextNode.prerequisiteNodeIds.every(isDone)) {
    return blocked(revision, "prerequisite_incomplete", nextNode.nodeId);
  }
  const state = states.get(nextNode.nodeId);
  if (state?.status === "blocked") return blocked(revision, "activity_blocked", nextNode.nodeId);
  if (
    (nextNode.activity.kind !== "modelshift_world"
      && nextNode.activity.kind !== "reviewed_world_activity")
    || !nextNode.activity.runnable
  ) {
    return blocked(revision, "path_not_reviewed", nextNode.nodeId);
  }
  return deepFreeze(nextActionProjectionSchema.parse({
    schemaVersion: NEXT_ACTION_SCHEMA_VERSION,
    kind: "action",
    pathId: revision.pathId,
    pathRevisionId: revision.revisionId,
    nodeId: nextNode.nodeId,
    activity: nextNode.activity,
    state: state?.status === "in_progress" ? "in_progress" : "ready",
  }));
}
