import { z } from "zod";

import {
  ARGUMENT_EVIDENCE_TRANSFER_TASK_ID,
  TRANSFER_EVIDENCE_IDS,
  TRANSFER_LIMITATION_IDS,
  TRANSFER_MECHANISM_IDS,
} from "./content";
import type { ArgumentEvidenceTransferEvaluation, ArgumentEvidenceTransferSubmission } from "./types";

const transferInputSchema = z.strictObject({
  taskId: z.literal(ARGUMENT_EVIDENCE_TRANSFER_TASK_ID),
  evidenceItemId: z.enum(TRANSFER_EVIDENCE_IDS as [string, ...string[]]),
  mechanismId: z.enum(TRANSFER_MECHANISM_IDS),
  limitationId: z.enum(TRANSFER_LIMITATION_IDS),
});

export function validateArgumentEvidenceTransfer(input: unknown): ArgumentEvidenceTransferEvaluation {
  const parsed = transferInputSchema.safeParse(input);
  if (!parsed.success) {
    return { inputStatus: "invalid", passed: false, score: 0, code: "invalid.transfer-input", evidence: [] };
  }
  const result = parsed.data;
  const evidencePass = result.evidenceItemId === "bus.outcome-linked";
  const mechanismPass = result.mechanismId === "compares_named_outcome";
  const limitationPass = result.limitationId === "other_changes_not_ruled_out";
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
