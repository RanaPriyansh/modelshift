import { z } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, forgeEventDigestSchema, sha256Digest } from "../events";

z.config({ jitless: true });

export const LEARNER_GOAL_SCHEMA_VERSION = "learner-goal.v1" as const;
export const LEARNING_PATH_REVISION_SCHEMA_VERSION = "learning-path-revision.v1" as const;
export const PATH_DECISION_SCHEMA_VERSION = "path-decision.v1" as const;
export const ACTIVITY_STATE_SCHEMA_VERSION = "activity-state.v1" as const;
export const NEXT_ACTION_SCHEMA_VERSION = "next-action.v1" as const;

const timestampSchema = z.string().datetime({ offset: true });
const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const goalIdSchema = z.string().trim().max(160).regex(/^goal\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const pathIdSchema = z.string().trim().max(160).regex(/^path\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const revisionIdSchema = z.string().trim().max(180).regex(/^path-revision\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const decisionIdSchema = z.string().trim().max(180).regex(/^path-decision\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const nodeIdSchema = z.string().trim().max(180).regex(/^path-node\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const activityIdSchema = z.string().trim().max(180).regex(/^activity\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const worldIdSchema = z.string().trim().max(160).regex(/^world\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const sourceIdSchema = z.string().trim().max(180).regex(/^source\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const reasonCodeSchema = z.string().trim().max(160).regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);
const worldRouteSchema = z.string().trim().max(240).regex(/^\/learn\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/);

function uniqueStrings<T extends z.ZodString>(schema: T, minimum: number, maximum: number) {
  return z.array(schema).min(minimum).max(maximum).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      if (seen.has(value)) context.addIssue({ code: "custom", path: [index], message: `Duplicate value: ${value}` });
      seen.add(value);
    });
  });
}

/**
 * The learner's verbatim question is deliberately isolated in this device-local
 * object. Path revisions contain only authored planner material and this goal's
 * opaque identity; provider and server contracts must not import learnerWords.
 */
export const learnerOwnedGoalSchema = z.strictObject({
  schemaVersion: z.literal(LEARNER_GOAL_SCHEMA_VERSION),
  goalId: goalIdSchema,
  storageClass: z.literal("learner-owned-device-local"),
  learnerWords: z.string().trim().min(3).max(8_000),
  desiredOutcome: z.string().trim().min(1).max(1_200),
  createdAt: timestampSchema,
});
export type LearnerOwnedGoalV1 = z.infer<typeof learnerOwnedGoalSchema>;

export const reviewedWorldRefSchema = z.strictObject({
  worldId: worldIdSchema,
  worldVersion: semverSchema,
  worldRoute: worldRouteSchema,
  activityProtocol: z.enum(["modelshift", "activity"]),
  sourceIds: uniqueStrings(sourceIdSchema, 1, 32),
});
export type ReviewedWorldRefV1 = z.infer<typeof reviewedWorldRefSchema>;

const reviewedWorldAuthoritySchema = z.strictObject({
  kind: z.literal("reviewed_world"),
  executionEligible: z.literal(true),
  reviewStatus: z.literal("reviewed"),
  worldRef: reviewedWorldRefSchema,
});

const candidateAuthoritySchema = z.strictObject({
  kind: z.literal("candidate_unverified"),
  executionEligible: z.literal(false),
  sourceMode: z.enum(["authored_only", "curated", "guardian_curated", "open_web"]),
  limitationCodes: uniqueStrings(reasonCodeSchema, 1, 16),
});

const gapAuthoritySchema = z.strictObject({
  kind: z.literal("identified_gap"),
  executionEligible: z.literal(false),
  reasonCode: z.literal("no_reviewed_world"),
  limitationCodes: uniqueStrings(reasonCodeSchema, 1, 16),
});

export const pathAuthoritySchema = z.discriminatedUnion("kind", [
  reviewedWorldAuthoritySchema,
  candidateAuthoritySchema,
]);
export type PathAuthorityV1 = z.infer<typeof pathAuthoritySchema>;

export const pathNodeAuthoritySchema = z.discriminatedUnion("kind", [
  reviewedWorldAuthoritySchema,
  candidateAuthoritySchema,
  gapAuthoritySchema,
]);
export type PathNodeAuthorityV1 = z.infer<typeof pathNodeAuthoritySchema>;

const modelshiftWorldActivitySchema = z.strictObject({
  activityId: activityIdSchema,
  kind: z.literal("modelshift_world"),
  runnable: z.literal(true),
  worldRef: reviewedWorldRefSchema.extend({
    activityProtocol: z.literal("modelshift"),
  }),
});

const standardReviewedWorldActivitySchema = z.strictObject({
  activityId: activityIdSchema,
  kind: z.literal("reviewed_world_activity"),
  runnable: z.literal(true),
  worldRef: reviewedWorldRefSchema.extend({
    activityProtocol: z.literal("activity"),
  }),
});

const reviewedWorldActivitySchema = z.discriminatedUnion("kind", [
  modelshiftWorldActivitySchema,
  standardReviewedWorldActivitySchema,
]);

const sourceDiscoveryActivitySchema = z.strictObject({
  activityId: activityIdSchema,
  kind: z.literal("source_discovery_candidate"),
  runnable: z.literal(false),
  discoveryStepId: reasonCodeSchema,
  exitGate: z.string().trim().min(1).max(1_200),
});

export const pathActivitySchema = z.discriminatedUnion("kind", [
  modelshiftWorldActivitySchema,
  standardReviewedWorldActivitySchema,
  sourceDiscoveryActivitySchema,
]);
export type PathActivityV1 = z.infer<typeof pathActivitySchema>;

export const learningPathNodeSchema = z.strictObject({
  nodeId: nodeIdSchema,
  position: z.number().int().min(0).max(127),
  title: z.string().trim().min(1).max(240),
  objective: z.string().trim().min(1).max(1_200),
  prerequisiteNodeIds: uniqueStrings(nodeIdSchema, 0, 32),
  authority: pathNodeAuthoritySchema,
  activity: pathActivitySchema,
}).superRefine((node, context) => {
  if (node.authority.kind === "reviewed_world") {
    if ((node.activity.kind !== "modelshift_world" &&
      node.activity.kind !== "reviewed_world_activity") ||
      canonicalJson(node.authority.worldRef) !== canonicalJson(node.activity.worldRef)) {
      context.addIssue({
        code: "custom",
        path: ["activity"],
        message: "A reviewed node must run the exact reviewed World reference.",
      });
    }
    return;
  }
  if (node.activity.runnable) {
    context.addIssue({
      code: "custom",
      path: ["activity", "runnable"],
      message: "Candidate and gap nodes can never become runnable.",
    });
  }
});
export type LearningPathNodeV1 = z.infer<typeof learningPathNodeSchema>;

const pathRevisionBaseShape = {
  schemaVersion: z.literal(LEARNING_PATH_REVISION_SCHEMA_VERSION),
  pathId: pathIdSchema,
  revisionId: revisionIdSchema,
  revisionNumber: z.number().int().min(1).max(1_000_000),
  goalRef: z.strictObject({ goalId: goalIdSchema }),
  planKind: z.enum(["grounded_learning", "exploratory_source_plan"]),
  status: z.enum(["candidate", "accepted", "rejected", "superseded"]),
  title: z.string().trim().min(1).max(240),
  authority: pathAuthoritySchema,
  nodes: z.array(learningPathNodeSchema).min(1).max(128),
  sourcePlanDigest: forgeEventDigestSchema,
  executionAllowed: z.boolean(),
  acceptanceDecisionId: decisionIdSchema.nullable(),
  supersedesRevisionId: revisionIdSchema.nullable(),
  createdAt: timestampSchema,
} as const;

const pathRevisionBaseSchema = z.strictObject(pathRevisionBaseShape);
type PathRevisionSemanticValue = z.infer<typeof pathRevisionBaseSchema>;

function validatePathRevisionSemantics(
  revision: PathRevisionSemanticValue,
  context: z.RefinementCtx,
): void {
  const accepted = revision.status === "accepted";
  const reviewed = revision.authority.kind === "reviewed_world";
  if (revision.executionAllowed !== (accepted && reviewed)) {
    context.addIssue({
      code: "custom",
      path: ["executionAllowed"],
      message: "Execution is allowed only for a learner-accepted reviewed path.",
    });
  }
  if (accepted !== (revision.acceptanceDecisionId !== null)) {
    context.addIssue({
      code: "custom",
      path: ["acceptanceDecisionId"],
      message: "Only an accepted revision carries its exact learner acceptance decision.",
    });
  }
  if ((revision.revisionNumber === 1) !== (revision.supersedesRevisionId === null)) {
    context.addIssue({
      code: "custom",
      path: ["supersedesRevisionId"],
      message: "Only the first immutable revision may omit a predecessor.",
    });
  }
  if ((revision.planKind === "grounded_learning") !== reviewed) {
    context.addIssue({
      code: "custom",
      path: ["authority"],
      message: "Only a grounded planner contract may carry reviewed World authority.",
    });
  }
  if (revision.planKind === "exploratory_source_plan" && accepted) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "An exploratory source plan cannot become an accepted runnable path.",
    });
  }

  const seenIds = new Set<string>();
  const seenPositions = new Set<number>();
  const positionById = new Map<string, number>();
  revision.nodes.forEach((node, index) => {
    if (seenIds.has(node.nodeId)) {
      context.addIssue({ code: "custom", path: ["nodes", index, "nodeId"], message: "Path node IDs must be unique." });
    }
    if (seenPositions.has(node.position)) {
      context.addIssue({ code: "custom", path: ["nodes", index, "position"], message: "Path node positions must be unique." });
    }
    seenIds.add(node.nodeId);
    seenPositions.add(node.position);
    positionById.set(node.nodeId, node.position);
  });

  const orderedPositions = [...seenPositions].sort((left, right) => left - right);
  if (orderedPositions.some((position, index) => position !== index)) {
    context.addIssue({ code: "custom", path: ["nodes"], message: "Path node positions must form a contiguous zero-based order." });
  }

  revision.nodes.forEach((node, index) => {
    node.prerequisiteNodeIds.forEach((prerequisiteId) => {
      const prerequisitePosition = positionById.get(prerequisiteId);
      if (prerequisitePosition === undefined || prerequisitePosition >= node.position) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "prerequisiteNodeIds"],
          message: "Every prerequisite must reference an earlier node in this immutable revision.",
        });
      }
    });
  });

  if (revision.authority.kind === "reviewed_world") {
    if (revision.nodes.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["nodes"],
        message: "A V1 grounded path contains one exact reviewed World activity; internal World phases are not path nodes.",
      });
    }
    const expected = canonicalJson(revision.authority.worldRef);
    revision.nodes.forEach((node, index) => {
      if (node.authority.kind !== "reviewed_world" || canonicalJson(node.authority.worldRef) !== expected) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "authority"],
          message: "Every grounded node must bind the exact path-level reviewed World reference.",
        });
      }
    });
  } else {
    revision.nodes.forEach((node, index) => {
      if (node.authority.kind === "reviewed_world" || node.activity.runnable) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index],
          message: "An exploratory path may contain only non-runnable candidate or gap nodes.",
        });
      }
    });
  }
}

const pathRevisionUnsignedSchema = pathRevisionBaseSchema.superRefine(validatePathRevisionSemantics);

export const learningPathRevisionSchema = z.strictObject({
  ...pathRevisionBaseShape,
  revisionDigest: forgeEventDigestSchema,
}).superRefine(validatePathRevisionSemantics);
export type LearningPathRevisionV1 = z.infer<typeof learningPathRevisionSchema>;
export type LearningPathRevisionInputV1 = z.input<typeof pathRevisionUnsignedSchema>;

export async function createLearningPathRevision(value: unknown): Promise<Readonly<LearningPathRevisionV1>> {
  const unsigned = pathRevisionUnsignedSchema.parse(value);
  return deepFreeze(learningPathRevisionSchema.parse({
    ...unsigned,
    revisionDigest: await sha256Digest(canonicalJson(unsigned)),
  }));
}

export async function validateLearningPathRevisionIntegrity(value: unknown): Promise<Readonly<LearningPathRevisionV1> | null> {
  const parsed = learningPathRevisionSchema.safeParse(value);
  if (!parsed.success) return null;
  const { revisionDigest, ...unsigned } = parsed.data;
  if (revisionDigest !== await sha256Digest(canonicalJson(unsigned))) return null;
  return deepFreeze(parsed.data);
}

export const pathDecisionSchema = z.strictObject({
  schemaVersion: z.literal(PATH_DECISION_SCHEMA_VERSION),
  decisionId: decisionIdSchema,
  decision: z.enum(["accept", "reject", "request_revision"]),
  pathId: pathIdSchema,
  baseRevisionId: revisionIdSchema,
  baseRevisionNumber: z.number().int().min(1).max(1_000_000),
  baseRevisionDigest: forgeEventDigestSchema,
  resultRevisionId: revisionIdSchema,
  decidedAt: timestampSchema,
}).superRefine((decision, context) => {
  if (decision.resultRevisionId === decision.baseRevisionId) {
    context.addIssue({
      code: "custom",
      path: ["resultRevisionId"],
      message: "A path decision must create a distinct immutable revision identity.",
    });
  }
});
export type PathDecisionV1 = z.infer<typeof pathDecisionSchema>;

export const activityStateSchema = z.strictObject({
  schemaVersion: z.literal(ACTIVITY_STATE_SCHEMA_VERSION),
  pathId: pathIdSchema,
  pathRevisionId: revisionIdSchema,
  nodeId: nodeIdSchema,
  stateVersion: z.number().int().min(1).max(1_000_000),
  status: z.enum(["not_started", "ready", "in_progress", "completed", "blocked"]),
  updatedAt: timestampSchema,
});
export type ActivityStateV1 = z.infer<typeof activityStateSchema>;

export const nextActionProjectionSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    schemaVersion: z.literal(NEXT_ACTION_SCHEMA_VERSION),
    kind: z.literal("action"),
    pathId: pathIdSchema,
    pathRevisionId: revisionIdSchema,
    nodeId: nodeIdSchema,
    activity: reviewedWorldActivitySchema,
    state: z.enum(["ready", "in_progress"]),
  }),
  z.strictObject({
    schemaVersion: z.literal(NEXT_ACTION_SCHEMA_VERSION),
    kind: z.literal("complete"),
    pathId: pathIdSchema,
    pathRevisionId: revisionIdSchema,
  }),
  z.strictObject({
    schemaVersion: z.literal(NEXT_ACTION_SCHEMA_VERSION),
    kind: z.literal("blocked"),
    pathId: pathIdSchema,
    pathRevisionId: revisionIdSchema,
    reason: z.enum([
      "path_not_accepted",
      "path_not_reviewed",
      "invalid_revision",
      "invalid_activity_state",
      "activity_blocked",
      "prerequisite_incomplete",
    ]),
    nodeId: nodeIdSchema.nullable(),
  }),
]);
export type NextActionProjectionV1 = z.infer<typeof nextActionProjectionSchema>;
