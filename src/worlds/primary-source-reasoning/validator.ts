import { z } from "zod";

import {
  PRIMARY_SOURCE_TRANSFER_TASK_ID,
  PRIMARY_SOURCE_VALIDATOR_ID,
  RESULT_BOUNDARIES,
  TRANSFER_STATEMENTS,
} from "./content";
import {
  EVIDENCE_CATEGORIES,
  type EvidenceCategory,
  type TransferEvaluation,
  type TransferStatementId,
  type TransferSubmission,
} from "./types";

const categorySchema = z.enum(EVIDENCE_CATEGORIES);

export const primarySourceTransferInputSchema = z.strictObject({
  taskId: z.literal(PRIMARY_SOURCE_TRANSFER_TASK_ID),
  assignments: z.strictObject({
    "washington-visible-detail": categorySchema,
    "washington-catalog-fact": categorySchema,
    "washington-relationship-inference": categorySchema,
    "washington-open-question": categorySchema,
  }),
});

const CORRECT_TRANSFER_ASSIGNMENTS = Object.freeze(
  Object.fromEntries(
    TRANSFER_STATEMENTS.map((statement) => [statement.id, statement.correctCategory]),
  ) as Record<TransferStatementId, EvidenceCategory>,
);

function invalidTransfer(): TransferEvaluation {
  return {
    validatorId: PRIMARY_SOURCE_VALIDATOR_ID,
    taskId: PRIMARY_SOURCE_TRANSFER_TASK_ID,
    valid: false,
    passed: false,
    score: 0,
    code: "transfer.invalid",
    evidence: "The transfer payload did not match the authored four-category task.",
    correctCount: 0,
    assignments: null,
    correctness: null,
  };
}

export function validatePrimarySourceTransfer(input: unknown): TransferEvaluation {
  const parsed = primarySourceTransferInputSchema.safeParse(input);
  if (!parsed.success) return invalidTransfer();

  const assignments = parsed.data.assignments as Record<
    TransferStatementId,
    EvidenceCategory
  >;
  const correctness = Object.fromEntries(
    TRANSFER_STATEMENTS.map((statement) => [
      statement.id,
      assignments[statement.id] === CORRECT_TRANSFER_ASSIGNMENTS[statement.id],
    ]),
  ) as Record<TransferStatementId, boolean>;
  const correctCount = Object.values(correctness).filter(Boolean).length as
    | 0
    | 1
    | 2
    | 3
    | 4;
  const passed = correctCount === TRANSFER_STATEMENTS.length;
  const score = correctCount / TRANSFER_STATEMENTS.length;

  return {
    validatorId: PRIMARY_SOURCE_VALIDATOR_ID,
    taskId: PRIMARY_SOURCE_TRANSFER_TASK_ID,
    valid: true,
    passed,
    score,
    code: passed
      ? "transfer.demonstrated"
      : correctCount > 0
        ? "transfer.partial"
        : "transfer.not-demonstrated",
    evidence: passed
      ? RESULT_BOUNDARIES.demonstrated
      : correctCount > 0
        ? RESULT_BOUNDARIES.partial
        : RESULT_BOUNDARIES.notDemonstrated,
    correctCount,
    assignments,
    correctness,
  };
}

export const primarySourceReasoningTransferValidator = Object.freeze({
  id: PRIMARY_SOURCE_VALIDATOR_ID,
  validate: validatePrimarySourceTransfer,
});

export function makeTransferSubmission(
  assignments: Partial<Record<TransferStatementId, EvidenceCategory>>,
): TransferSubmission | null {
  const candidate = {
    taskId: PRIMARY_SOURCE_TRANSFER_TASK_ID,
    assignments,
  };
  const parsed = primarySourceTransferInputSchema.safeParse(candidate);
  return parsed.success ? (parsed.data as TransferSubmission) : null;
}

export function correctTransferAssignments(): Record<
  TransferStatementId,
  EvidenceCategory
> {
  return { ...CORRECT_TRANSFER_ASSIGNMENTS };
}
