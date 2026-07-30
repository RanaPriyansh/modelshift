import { z } from "zod";

import {
  isBoundedLocalWorldRuntimeReceipt,
  isWorldRuntimeAttemptId,
  WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION,
  type BoundedLocalWorldRuntimeReceipt,
} from "../world-runtime/protocol";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, forgeEventDigestSchema } from "../events";
import {
  activityStateSchema,
  reviewedWorldRefSchema,
  validateLearningPathRevisionIntegrity,
  type ActivityStateV1,
  type LearningPathNodeV1,
  type LearningPathRevisionV1,
  type PathActivityV1,
  type PathNodeAuthorityV1,
  type ReviewedWorldRefV1,
} from "./contracts";
import {
  advanceActivityStatesAfterCompletion,
  transitionActivityState,
} from "./reducer";

z.config({ jitless: true });

export const STUDY_SESSION_SCHEMA_VERSION = "study-session.v1" as const;
export const STUDY_RUNTIME_CORRELATION_SCHEMA_VERSION =
  "study-runtime-correlation.v1" as const;

const timestampSchema = z.string().datetime({ offset: true });
export const studySessionIdSchema = z.string().trim().max(160)
  .regex(/^study-session\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const continuityRecordIdSchema = z.string().trim().max(180)
  .regex(/^continuity-record\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const evidenceEntryIdSchema = z.string().trim().max(128)
  .regex(/^proof\.attempt\.[a-z0-9][a-z0-9._-]{2,113}$/);

export const studyRuntimeCorrelationSchema = z.strictObject({
  schemaVersion: z.literal(STUDY_RUNTIME_CORRELATION_SCHEMA_VERSION),
  receiptSchemaVersion: z.literal(WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION),
  attemptId: z.string().refine(isWorldRuntimeAttemptId, "Invalid runtime attempt identity."),
  receiptRecordedAt: timestampSchema,
  worldId: z.string().trim().min(1).max(160),
  worldVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  runtimeBindingDigest: forgeEventDigestSchema,
  packageIntegrityHash: forgeEventDigestSchema,
  evidenceEntryId: evidenceEntryIdSchema,
});

export type StudyRuntimeCorrelationV1 = z.infer<typeof studyRuntimeCorrelationSchema>;

export const studySessionSchema = z.strictObject({
  schemaVersion: z.literal(STUDY_SESSION_SCHEMA_VERSION),
  sessionId: studySessionIdSchema,
  recordId: continuityRecordIdSchema,
  pathId: z.string().trim().max(160)
    .regex(/^path\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  pathRevisionId: z.string().trim().max(180)
    .regex(/^path-revision\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  pathRevisionDigest: forgeEventDigestSchema,
  nodeId: z.string().trim().max(180)
    .regex(/^path-node\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  activityId: z.string().trim().max(180)
    .regex(/^activity\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  worldRef: reviewedWorldRefSchema,
  sessionVersion: z.number().int().min(1).max(2),
  status: z.enum(["active", "completed"]),
  startedAt: timestampSchema,
  updatedAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
  runtimeCorrelation: studyRuntimeCorrelationSchema.nullable(),
}).superRefine((session, context) => {
  if (Date.parse(session.updatedAt) < Date.parse(session.startedAt)) {
    context.addIssue({
      code: "custom",
      path: ["updatedAt"],
      message: "Study session time cannot regress.",
    });
  }

  if (session.status === "active") {
    if (
      session.sessionVersion !== 1
      || session.completedAt !== null
      || session.runtimeCorrelation !== null
    ) {
      context.addIssue({
        code: "custom",
        message: "An active session is exactly version one and has no receipt authority.",
      });
    }
    return;
  }

  if (
    session.sessionVersion !== 2
    || session.completedAt === null
    || session.runtimeCorrelation === null
  ) {
    context.addIssue({
      code: "custom",
      message: "A completed session requires its version-two runtime correlation.",
    });
    return;
  }

  if (
    session.updatedAt !== session.completedAt
    || Date.parse(session.runtimeCorrelation.receiptRecordedAt) < Date.parse(session.startedAt)
    || Date.parse(session.completedAt) < Date.parse(session.runtimeCorrelation.receiptRecordedAt)
    || session.runtimeCorrelation.worldId !== session.worldRef.worldId
    || session.runtimeCorrelation.worldVersion !== session.worldRef.worldVersion
    || session.runtimeCorrelation.evidenceEntryId
      !== `proof.${session.runtimeCorrelation.attemptId}`
  ) {
    context.addIssue({
      code: "custom",
      path: ["runtimeCorrelation"],
      message: "Runtime correlation does not exactly bind this session, evidence identity, and time.",
    });
  }
});

export type StudySessionV1 = z.infer<typeof studySessionSchema>;

type ReviewedWorldNode = LearningPathNodeV1 & Readonly<{
  authority: Extract<PathNodeAuthorityV1, { kind: "reviewed_world" }>;
  activity:
    | Extract<PathActivityV1, { kind: "modelshift_world" }>
    | Extract<PathActivityV1, { kind: "reviewed_world_activity" }>;
}>;

function exactReviewedNode(
  revision: LearningPathRevisionV1,
  nodeId: string,
): ReviewedWorldNode | null {
  if (
    revision.status !== "accepted"
    || !revision.executionAllowed
    || revision.authority.kind !== "reviewed_world"
    || revision.nodes.length !== 1
  ) {
    return null;
  }
  const node = revision.nodes.find((candidate) => candidate.nodeId === nodeId);
  if (
    !node
    || node.authority.kind !== "reviewed_world"
    || (node.activity.kind !== "modelshift_world"
      && node.activity.kind !== "reviewed_world_activity")
    || !node.activity.runnable
    || canonicalJson(node.authority.worldRef) !== canonicalJson(revision.authority.worldRef)
    || canonicalJson(node.activity.worldRef) !== canonicalJson(revision.authority.worldRef)
  ) {
    return null;
  }
  return node as ReviewedWorldNode;
}

function exactActivityState(
  revision: LearningPathRevisionV1,
  nodeId: string,
  stateValue: unknown,
): ActivityStateV1 | null {
  const parsed = activityStateSchema.safeParse(stateValue);
  if (
    !parsed.success
    || parsed.data.pathId !== revision.pathId
    || parsed.data.pathRevisionId !== revision.revisionId
    || parsed.data.nodeId !== nodeId
  ) {
    return null;
  }
  return parsed.data;
}

export type StartStudySessionResult =
  | Readonly<{
      ok: true;
      operation: "created" | "reused";
      session: Readonly<StudySessionV1>;
      activityState: Readonly<ActivityStateV1>;
    }>
  | Readonly<{
      ok: false;
      reason:
        | "invalid_revision"
        | "invalid_activity_state"
        | "invalid_identity"
        | "invalid_time"
        | "session_conflict"
        | "already_completed"
        | "state_not_ready";
    }>;

export async function startOrReuseStudySession(input: {
  recordId: string;
  revision: unknown;
  nodeId: string;
  activityState: unknown;
  existingSessions: readonly unknown[];
  sessionId: string;
  startedAt: string;
}): Promise<StartStudySessionResult> {
  const revision = await validateLearningPathRevisionIntegrity(input.revision);
  if (!revision) return deepFreeze({ ok: false as const, reason: "invalid_revision" as const });
  const node = exactReviewedNode(revision, input.nodeId);
  if (!node) return deepFreeze({ ok: false as const, reason: "invalid_revision" as const });
  const state = exactActivityState(revision, node.nodeId, input.activityState);
  if (!state) return deepFreeze({ ok: false as const, reason: "invalid_activity_state" as const });
  const parsedSessions = input.existingSessions.map((value) => studySessionSchema.safeParse(value));
  if (parsedSessions.some((parsed) => !parsed.success)) {
    return deepFreeze({ ok: false as const, reason: "session_conflict" as const });
  }
  const sessions = parsedSessions.flatMap((parsed) => parsed.success ? [parsed.data] : []);
  const matching = sessions.filter((session) =>
    session.pathRevisionId === revision.revisionId
    && session.nodeId === node.nodeId
  );
  if (matching.length > 1) {
    return deepFreeze({ ok: false as const, reason: "session_conflict" as const });
  }
  const existing = matching[0];
  if (existing) {
    if (
      existing.recordId !== input.recordId
      || existing.pathId !== revision.pathId
      || existing.pathRevisionDigest !== revision.revisionDigest
      || existing.activityId !== node.activity.activityId
      || canonicalJson(existing.worldRef) !== canonicalJson(node.activity.worldRef)
      || state.status !== (existing.status === "active" ? "in_progress" : "completed")
    ) {
      return deepFreeze({ ok: false as const, reason: "session_conflict" as const });
    }
    if (existing.status === "completed") {
      return deepFreeze({ ok: false as const, reason: "already_completed" as const });
    }
    return deepFreeze({
      ok: true as const,
      operation: "reused" as const,
      session: existing,
      activityState: state,
    });
  }

  if (
    !continuityRecordIdSchema.safeParse(input.recordId).success
    || !studySessionIdSchema.safeParse(input.sessionId).success
    || sessions.some((session) => session.sessionId === input.sessionId)
  ) {
    return deepFreeze({ ok: false as const, reason: "invalid_identity" as const });
  }
  const parsedTime = timestampSchema.safeParse(input.startedAt);
  if (
    !parsedTime.success
    || Date.parse(parsedTime.data) < Date.parse(revision.createdAt)
    || Date.parse(parsedTime.data) < Date.parse(state.updatedAt)
  ) {
    return deepFreeze({ ok: false as const, reason: "invalid_time" as const });
  }
  if (state.status !== "ready") {
    return deepFreeze({ ok: false as const, reason: "state_not_ready" as const });
  }

  const started = await transitionActivityState(revision, state, {
    command: "start",
    expectedStateVersion: state.stateVersion,
    updatedAt: parsedTime.data,
  });
  if (!started.accepted) {
    return deepFreeze({ ok: false as const, reason: "invalid_activity_state" as const });
  }

  const session = studySessionSchema.parse({
    schemaVersion: STUDY_SESSION_SCHEMA_VERSION,
    sessionId: input.sessionId,
    recordId: input.recordId,
    pathId: revision.pathId,
    pathRevisionId: revision.revisionId,
    pathRevisionDigest: revision.revisionDigest,
    nodeId: node.nodeId,
    activityId: node.activity.activityId,
    worldRef: node.activity.worldRef,
    sessionVersion: 1,
    status: "active",
    startedAt: parsedTime.data,
    updatedAt: parsedTime.data,
    completedAt: null,
    runtimeCorrelation: null,
  });
  return deepFreeze({
    ok: true as const,
    operation: "created" as const,
    session,
    activityState: started.state,
  });
}

export type CompleteStudySessionResult =
  | Readonly<{
      ok: true;
      session: Readonly<StudySessionV1>;
      activityStates: readonly Readonly<ActivityStateV1>[];
      evidenceEntryId: string;
    }>
  | Readonly<{
      ok: false;
      reason:
        | "invalid_revision"
        | "invalid_session"
        | "invalid_activity_state"
        | "invalid_runtime_receipt"
        | "receipt_binding_mismatch"
        | "invalid_time";
    }>;

export async function completeStudySessionFromRuntimeReceipt(input: {
  revision: unknown;
  activityStates: readonly unknown[];
  session: unknown;
  receipt: unknown;
  evidenceEntryId: string;
  completedAt: string;
}): Promise<CompleteStudySessionResult> {
  const revision = await validateLearningPathRevisionIntegrity(input.revision);
  if (!revision) return deepFreeze({ ok: false as const, reason: "invalid_revision" as const });
  const parsedSession = studySessionSchema.safeParse(input.session);
  if (!parsedSession.success || parsedSession.data.status !== "active") {
    return deepFreeze({ ok: false as const, reason: "invalid_session" as const });
  }
  const session = parsedSession.data;
  const node = exactReviewedNode(revision, session.nodeId);
  if (
    !node
    || session.pathId !== revision.pathId
    || session.pathRevisionId !== revision.revisionId
    || session.pathRevisionDigest !== revision.revisionDigest
    || session.activityId !== node.activity.activityId
    || canonicalJson(session.worldRef) !== canonicalJson(node.activity.worldRef)
  ) {
    return deepFreeze({ ok: false as const, reason: "invalid_session" as const });
  }
  const parsedStates = input.activityStates.map((value) => activityStateSchema.safeParse(value));
  if (
    parsedStates.some((parsed) => !parsed.success)
    || parsedStates.length !== revision.nodes.length
  ) {
    return deepFreeze({ ok: false as const, reason: "invalid_activity_state" as const });
  }
  const states = parsedStates.flatMap((parsed) => parsed.success ? [parsed.data] : []);
  const currentState = exactActivityState(
    revision,
    session.nodeId,
    states.find((state) => state.nodeId === session.nodeId),
  );
  if (!currentState || currentState.status !== "in_progress") {
    return deepFreeze({ ok: false as const, reason: "invalid_activity_state" as const });
  }
  if (!isBoundedLocalWorldRuntimeReceipt(input.receipt)) {
    return deepFreeze({ ok: false as const, reason: "invalid_runtime_receipt" as const });
  }
  const receipt: BoundedLocalWorldRuntimeReceipt = input.receipt;
  if (
    receipt.world.id !== session.worldRef.worldId
    || receipt.world.version !== session.worldRef.worldVersion
    || input.evidenceEntryId !== `proof.${receipt.attemptId}`
  ) {
    return deepFreeze({ ok: false as const, reason: "receipt_binding_mismatch" as const });
  }
  const parsedCompletedAt = timestampSchema.safeParse(input.completedAt);
  if (
    !parsedCompletedAt.success
    || Date.parse(receipt.recordedAt) < Date.parse(session.startedAt)
    || Date.parse(parsedCompletedAt.data) < Date.parse(receipt.recordedAt)
    || Date.parse(parsedCompletedAt.data) < Date.parse(session.updatedAt)
  ) {
    return deepFreeze({ ok: false as const, reason: "invalid_time" as const });
  }

  const completedState = await transitionActivityState(revision, currentState, {
    command: "complete",
    expectedStateVersion: currentState.stateVersion,
    updatedAt: parsedCompletedAt.data,
  });
  if (!completedState.accepted) {
    return deepFreeze({ ok: false as const, reason: "invalid_activity_state" as const });
  }
  const withCompletion = states.map((state) =>
    state.nodeId === completedState.state.nodeId ? completedState.state : state);
  const advanced = await advanceActivityStatesAfterCompletion(
    revision,
    withCompletion,
    completedState.state.nodeId,
    parsedCompletedAt.data,
  );
  if (!advanced.ok) {
    return deepFreeze({ ok: false as const, reason: "invalid_activity_state" as const });
  }

  const completedSession = studySessionSchema.parse({
    ...session,
    sessionVersion: 2,
    status: "completed",
    updatedAt: parsedCompletedAt.data,
    completedAt: parsedCompletedAt.data,
    runtimeCorrelation: {
      schemaVersion: STUDY_RUNTIME_CORRELATION_SCHEMA_VERSION,
      receiptSchemaVersion: receipt.schemaVersion,
      attemptId: receipt.attemptId,
      receiptRecordedAt: receipt.recordedAt,
      worldId: receipt.world.id,
      worldVersion: receipt.world.version,
      runtimeBindingDigest: receipt.runtimeBindingDigest,
      packageIntegrityHash: receipt.packageIntegrityHash,
      evidenceEntryId: input.evidenceEntryId,
    },
  });
  return deepFreeze({
    ok: true as const,
    session: completedSession,
    activityStates: advanced.states,
    evidenceEntryId: input.evidenceEntryId,
  });
}

export function studySessionWorldRef(
  session: StudySessionV1,
): Readonly<ReviewedWorldRefV1> {
  return session.worldRef;
}
