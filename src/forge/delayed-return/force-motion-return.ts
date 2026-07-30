import { z } from "zod";

import {
  delayedReturnTaskSchema,
  delayedReturnTiming,
  type DelayedReturnTaskV1,
} from "../continuity/delayed-return";
import { deepFreeze } from "../deep-freeze";
import {
  FORCE_MOTION_RETURN_FAMILY,
  type ForceMotionReturnChoiceId,
} from "./force-motion-policy";

z.config({ jitless: true });

const timestampSchema = z.string().datetime({ offset: true });

export const FORCE_MOTION_RETURN_RECEIPT_SCHEMA_VERSION =
  "force-motion-return-receipt.v1" as const;

export type ForceMotionReturnAttemptReceipt = Readonly<{
  schemaVersion: typeof FORCE_MOTION_RETURN_RECEIPT_SCHEMA_VERSION;
  kind: "forge.return.bounded-local-attempt";
  returnId: string;
  taskFamilyId: typeof FORCE_MOTION_RETURN_FAMILY.taskFamilyId;
  attemptedAt: string;
  outcome: "proved" | "not_proved" | "open_question";
  validator: Readonly<{
    id: "validator.force-motion-delayed-return.v1";
    version: "1.0.0";
    code: "return.constant-velocity" | "return.incorrect-model" | "return.open-question";
    criteria: readonly string[];
  }>;
  assistance: readonly [];
  access: Readonly<{
    textAlternativeAvailable: true;
    keyboardOperationAvailable: true;
    reducedMotionAvailable: true;
  }>;
  responseDigest: null;
}>;

interface ReturnAttemptAttestation {
  readonly returnId: string;
  readonly taskFamilyId: string;
  readonly attemptedAt: string;
  readonly outcome: ForceMotionReturnAttemptReceipt["outcome"];
  readonly code: ForceMotionReturnAttemptReceipt["validator"]["code"];
}

const returnAttemptAttestations = new WeakMap<ForceMotionReturnAttemptReceipt, ReturnAttemptAttestation>();

function outcomeFor(choiceId: ForceMotionReturnChoiceId): {
  outcome: ForceMotionReturnAttemptReceipt["outcome"];
  code: ForceMotionReturnAttemptReceipt["validator"]["code"];
} {
  if (choiceId === FORCE_MOTION_RETURN_FAMILY.correctChoiceId) {
    return { outcome: "proved", code: "return.constant-velocity" };
  }
  if (choiceId === "not_sure") return { outcome: "open_question", code: "return.open-question" };
  return { outcome: "not_proved", code: "return.incorrect-model" };
}

/**
 * Produces a private, bounded object only after the reviewed task is due. The
 * WeakMap is intentionally not serializable: callers cannot replace it with a
 * hand-authored "passed" JSON object when recording retention evidence.
 */
export function createForceMotionReturnAttemptReceipt(input: {
  task: DelayedReturnTaskV1 | unknown;
  choiceId: ForceMotionReturnChoiceId;
  attemptedAt: string;
}): Readonly<ForceMotionReturnAttemptReceipt> | null {
  const task = delayedReturnTaskSchema.safeParse(input.task);
  if (!task.success || !timestampSchema.safeParse(input.attemptedAt).success) return null;
  if (delayedReturnTiming(task.data, input.attemptedAt) !== "due") return null;
  if (!FORCE_MOTION_RETURN_FAMILY.choices.some((choice) => choice.id === input.choiceId)) return null;

  const result = outcomeFor(input.choiceId);
  const receipt = deepFreeze({
    schemaVersion: FORCE_MOTION_RETURN_RECEIPT_SCHEMA_VERSION,
    kind: "forge.return.bounded-local-attempt",
    returnId: task.data.returnId,
    taskFamilyId: FORCE_MOTION_RETURN_FAMILY.taskFamilyId,
    attemptedAt: input.attemptedAt,
    outcome: result.outcome,
    validator: {
      id: "validator.force-motion-delayed-return.v1" as const,
      version: "1.0.0" as const,
      code: result.code,
      criteria: [
        `task:${FORCE_MOTION_RETURN_FAMILY.taskCode}`,
        "one-unaided-authored-choice",
      ],
    },
    assistance: [] as const,
    access: {
      textAlternativeAvailable: true as const,
      keyboardOperationAvailable: true as const,
      reducedMotionAvailable: true as const,
    },
    responseDigest: null,
  } satisfies ForceMotionReturnAttemptReceipt);
  returnAttemptAttestations.set(receipt, deepFreeze({
    returnId: receipt.returnId,
    taskFamilyId: receipt.taskFamilyId,
    attemptedAt: receipt.attemptedAt,
    outcome: receipt.outcome,
    code: receipt.validator.code,
  }));
  return receipt;
}

export function verifyForceMotionReturnAttemptReceipt(
  receipt: ForceMotionReturnAttemptReceipt | unknown,
): receipt is ForceMotionReturnAttemptReceipt {
  if (typeof receipt !== "object" || receipt === null) return false;
  const candidate = receipt as ForceMotionReturnAttemptReceipt;
  const attestation = returnAttemptAttestations.get(candidate);
  return attestation !== undefined
    && Object.isFrozen(candidate)
    && Object.isFrozen(candidate.validator)
    && candidate.schemaVersion === FORCE_MOTION_RETURN_RECEIPT_SCHEMA_VERSION
    && candidate.kind === "forge.return.bounded-local-attempt"
    && candidate.returnId === attestation.returnId
    && candidate.taskFamilyId === attestation.taskFamilyId
    && candidate.attemptedAt === attestation.attemptedAt
    && candidate.outcome === attestation.outcome
    && candidate.validator.code === attestation.code
    && candidate.assistance.length === 0
    && candidate.responseDigest === null;
}
