import { z } from "zod";

import {
  ARGUMENT_EVIDENCE_TRANSFER_TASK_ID,
  ARGUMENT_EVIDENCE_AUTHORED_FIXTURE,
  TRANSFER_EVIDENCE_IDS,
  TRANSFER_LIMITATION_IDS,
  TRANSFER_MECHANISM_IDS,
} from "./content";
import type {
  ArgumentEvidenceTransferEvaluation,
  ArgumentEvidenceTransferSubmission,
  TransferEvidenceItemId,
  TransferLimitationId,
  TransferMechanismId,
} from "./types";

function memberSchema<T extends string>(values: readonly T[]) {
  return z.custom<T>((value) => typeof value === "string" && values.includes(value as T));
}

const transferInputSchema = z.strictObject({
  taskId: z.literal(ARGUMENT_EVIDENCE_TRANSFER_TASK_ID),
  evidenceItemId: memberSchema<TransferEvidenceItemId>(TRANSFER_EVIDENCE_IDS),
  mechanismId: memberSchema<TransferMechanismId>(TRANSFER_MECHANISM_IDS),
  limitationId: memberSchema<TransferLimitationId>(TRANSFER_LIMITATION_IDS),
});

export function validateArgumentEvidenceTransfer(input: unknown): ArgumentEvidenceTransferEvaluation {
  const parsed = transferInputSchema.safeParse(input);
  if (!parsed.success) {
    return { inputStatus: "invalid", passed: false, score: 0, code: "invalid.transfer-input", evidence: [] };
  }
  const result = parsed.data;
  const evidencePass = result.evidenceItemId === ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.expected.evidenceItemId;
  const mechanismPass = result.mechanismId === ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.expected.mechanismId;
  const limitationPass = result.limitationId === ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.expected.limitationId;
  const passed = evidencePass && mechanismPass && limitationPass;
  return {
    inputStatus: "valid",
    passed,
    score: passed ? 1 : 0,
    code: passed ? "transfer.demonstrated" : "transfer.not-demonstrated",
    evidence: [
      `task:${ARGUMENT_EVIDENCE_TRANSFER_TASK_ID}`,
      `criterion:evidence_item:${evidencePass ? "pass" : "fail"}`,
      `criterion:mechanism:${mechanismPass ? "pass" : "fail"}`,
      `criterion:limitation:${limitationPass ? "pass" : "fail"}`,
    ],
  };
}

export function makeArgumentEvidenceTransferSubmission(
  state: Pick<
    import("./types").ArgumentEvidenceWorldState,
    "transferEvidenceItemId" | "transferMechanismId" | "transferLimitationId"
  >,
): ArgumentEvidenceTransferSubmission | null {
  if (!state.transferEvidenceItemId || !state.transferMechanismId || !state.transferLimitationId) return null;
  return {
    taskId: ARGUMENT_EVIDENCE_TRANSFER_TASK_ID,
    evidenceItemId: state.transferEvidenceItemId,
    mechanismId: state.transferMechanismId,
    limitationId: state.transferLimitationId,
  };
}
