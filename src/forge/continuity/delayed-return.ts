import { z } from "zod";

import { deepFreeze } from "../deep-freeze";
import {
  FORCE_MOTION_RETURN_COMPLETION_WINDOW_DAYS,
  FORCE_MOTION_RETURN_DELAY_DAYS,
  FORCE_MOTION_RETURN_TASK_FAMILY_ID,
} from "../delayed-return/force-motion-policy";
import { studySessionIdSchema } from "./study-session";

z.config({ jitless: true });

export const DELAYED_RETURN_TASK_SCHEMA_VERSION = "delayed-return-task.v1" as const;

const timestampSchema = z.string().datetime({ offset: true });
const recordIdSchema = z.string().trim().max(180)
  .regex(/^continuity-record\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const pathIdSchema = z.string().trim().max(160)
  .regex(/^path\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const pathRevisionIdSchema = z.string().trim().max(180)
  .regex(/^path-revision\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const pathNodeIdSchema = z.string().trim().max(180)
  .regex(/^path-node\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const evidenceIdSchema = z.string().trim().max(128)
  .regex(/^proof\.attempt\.[a-z0-9][a-z0-9._-]{2,113}$/);

export const delayedReturnIdSchema = z.string().trim().max(128)
  .regex(/^return-task\.[a-z0-9][a-z0-9._-]{2,112}$/);
export const returnEvidenceEntryIdSchema = z.string().trim().max(128)
  .regex(/^return-proof\.[a-z0-9][a-z0-9._-]{2,110}$/);

function addUtcDays(timestamp: string, days: number): string {
  return new Date(Date.parse(timestamp) + days * 86_400_000).toISOString();
}

/**
 * A device-local task record. Its scheduling fields are immutable. `due` is
 * deliberately derived from `dueAt`, never a manually writable status.
 */
export const delayedReturnTaskSchema = z.strictObject({
  schemaVersion: z.literal(DELAYED_RETURN_TASK_SCHEMA_VERSION),
  returnId: delayedReturnIdSchema,
  recordId: recordIdSchema,
  pathId: pathIdSchema,
  pathRevisionId: pathRevisionIdSchema,
  nodeId: pathNodeIdSchema,
  studySessionId: studySessionIdSchema,
  originEvidenceEntryId: evidenceIdSchema,
  returnEvidenceEntryId: returnEvidenceEntryIdSchema,
  worldId: z.literal("world.force-and-motion"),
  worldVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  capabilityId: z.literal("capability.force-motion.zero-net-force"),
  proofClaimId: z.literal("proof.force-motion.independent-transfer"),
  taskFamilyId: z.literal(FORCE_MOTION_RETURN_TASK_FAMILY_ID),
  scheduledAt: timestampSchema,
  dueAt: timestampSchema,
  status: z.enum(["scheduled", "completed"]),
  completedAt: timestampSchema.nullable(),
}).superRefine((task, context) => {
  if (Date.parse(task.scheduledAt) >= Date.parse(task.dueAt)) {
    context.addIssue({
      code: "custom",
      path: ["dueAt"],
      message: "A delayed return must become due after it is scheduled.",
    });
  }
  if (task.dueAt !== addUtcDays(task.scheduledAt, FORCE_MOTION_RETURN_DELAY_DAYS)) {
    context.addIssue({
      code: "custom",
      path: ["dueAt"],
      message: "The reviewed return delay must not be edited per learner.",
    });
  }
  if (task.returnId !== `return-task.${task.studySessionId.slice("study-session.".length)}`) {
    context.addIssue({
      code: "custom",
      path: ["returnId"],
      message: "The delayed-return identity must derive from its exact study session.",
    });
  }
  if (task.returnEvidenceEntryId !== `return-proof.${task.studySessionId.slice("study-session.".length)}`) {
    context.addIssue({
      code: "custom",
      path: ["returnEvidenceEntryId"],
      message: "The retention evidence identity must derive from its exact study session.",
    });
  }
  if (
    (task.status === "scheduled" && task.completedAt !== null)
    || (task.status === "completed" && (
      task.completedAt === null
      || Date.parse(task.completedAt) < Date.parse(task.dueAt)
      || Date.parse(task.completedAt) > Date.parse(addUtcDays(
        task.dueAt,
        FORCE_MOTION_RETURN_COMPLETION_WINDOW_DAYS,
      ))
    ))
  ) {
    context.addIssue({
      code: "custom",
      message: "A return task may complete only once, while its reviewed completion window is open.",
    });
  }
});

export type DelayedReturnTaskV1 = z.infer<typeof delayedReturnTaskSchema>;

export type DelayedReturnTiming = "upcoming" | "due" | "expired" | "completed";

export function delayedReturnCompletionWindowEndsAt(
  task: DelayedReturnTaskV1 | unknown,
): string | null {
  const parsedTask = delayedReturnTaskSchema.safeParse(task);
  if (!parsedTask.success) return null;
  return addUtcDays(
    parsedTask.data.dueAt,
    FORCE_MOTION_RETURN_COMPLETION_WINDOW_DAYS,
  );
}

export function delayedReturnTiming(
  task: DelayedReturnTaskV1 | unknown,
  now: string,
): DelayedReturnTiming | null {
  const parsedTask = delayedReturnTaskSchema.safeParse(task);
  const parsedNow = timestampSchema.safeParse(now);
  if (!parsedTask.success || !parsedNow.success) return null;
  if (parsedTask.data.status === "completed") return "completed";
  if (Date.parse(parsedNow.data) < Date.parse(parsedTask.data.dueAt)) return "upcoming";
  const completionWindowEndsAt = addUtcDays(
    parsedTask.data.dueAt,
    FORCE_MOTION_RETURN_COMPLETION_WINDOW_DAYS,
  );
  return Date.parse(parsedNow.data) <= Date.parse(completionWindowEndsAt)
    ? "due"
    : "expired";
}

export function createForceMotionDelayedReturnTask(input: {
  recordId: string;
  pathId: string;
  pathRevisionId: string;
  nodeId: string;
  studySessionId: string;
  originEvidenceEntryId: string;
  worldVersion: string;
  scheduledAt: string;
}): Readonly<DelayedReturnTaskV1> | null {
  const suffix = input.studySessionId.startsWith("study-session.")
    ? input.studySessionId.slice("study-session.".length)
    : "";
  const candidate = {
    schemaVersion: DELAYED_RETURN_TASK_SCHEMA_VERSION,
    returnId: `return-task.${suffix}`,
    recordId: input.recordId,
    pathId: input.pathId,
    pathRevisionId: input.pathRevisionId,
    nodeId: input.nodeId,
    studySessionId: input.studySessionId,
    originEvidenceEntryId: input.originEvidenceEntryId,
    returnEvidenceEntryId: `return-proof.${suffix}`,
    worldId: "world.force-and-motion",
    worldVersion: input.worldVersion,
    capabilityId: "capability.force-motion.zero-net-force",
    proofClaimId: "proof.force-motion.independent-transfer",
    taskFamilyId: FORCE_MOTION_RETURN_TASK_FAMILY_ID,
    scheduledAt: input.scheduledAt,
    dueAt: timestampSchema.safeParse(input.scheduledAt).success
      ? addUtcDays(input.scheduledAt, FORCE_MOTION_RETURN_DELAY_DAYS)
      : "",
    status: "scheduled",
    completedAt: null,
  };
  const parsed = delayedReturnTaskSchema.safeParse(candidate);
  return parsed.success ? deepFreeze(parsed.data) : null;
}
