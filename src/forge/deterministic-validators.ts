import { z } from "zod";

import { TRANSFER } from "../content/scenarios";
import { scoreColdTransfer } from "../worlds/ai-learning/validator";
import {
  PRIMARY_SOURCE_TRANSFER_TASK_ID,
  PRIMARY_SOURCE_VALIDATOR_ID,
  validatePrimarySourceTransfer,
} from "../worlds/primary-source-reasoning";
import {
  ARGUMENT_EVIDENCE_VALIDATOR_ID,
  validateArgumentEvidenceTransfer,
} from "../worlds/argument-evidence";
import {
  evaluateTransfer,
  isIndependentProportionalTransferDemonstrated,
} from "../worlds/proportional-reasoning/validator";
import {
  deterministicValidationResultSchema,
  type DeterministicValidationResult,
  type DeterministicValidator,
} from "./contracts";

/**
 * This is the client-safe authority for the built-in deterministic validators.
 * It deliberately imports authored domain validators and content, but never a
 * World pack or runtime binding; packs may therefore point here without a
 * worlds -> runtime -> worlds dependency cycle.
 */
export const FORCE_AND_MOTION_VALIDATOR_ID = "validator.force-motion-transfer.v1" as const;
export const SOURCE_CORROBORATION_VALIDATOR_ID = "validator.source-corroboration-transfer.v1" as const;
export const PROPORTIONAL_REASONING_VALIDATOR_ID = "validator.proportional-reasoning-transfer.v1" as const;

const forceMotionTransferInputSchema = z.strictObject({
  taskId: z.literal("cargo_pod_force_graph"),
  selectedAnswer: z.enum(["returns_to_zero", "stays_constant_after_force", "keeps_accelerating"]),
});

export const forceAndMotionTransferValidator: DeterministicValidator = Object.freeze({
  id: FORCE_AND_MOTION_VALIDATOR_ID,
  validate(input: unknown) {
    const parsed = forceMotionTransferInputSchema.safeParse(input);
    if (!parsed.success) {
      return deterministicValidationResultSchema.parse({
        inputStatus: "invalid",
        passed: false,
        score: 0,
        code: "invalid.transfer-input",
        evidence: [],
      });
    }

    const passed = parsed.data.selectedAnswer === TRANSFER.correctChoiceId;
    return deterministicValidationResultSchema.parse({
      inputStatus: "valid",
      passed,
      score: passed ? 1 : 0,
      code: passed ? "transfer.demonstrated" : "transfer.not-demonstrated",
      evidence: [`task:${parsed.data.taskId}`, `answer:${parsed.data.selectedAnswer}`],
    });
  },
});

const sourceCorroborationTransferInputSchema = z.strictObject({
  choiceId: z.enum(["always-helps", "always-harms", "bounded-measures", "same-measure"]),
  openQuestionId: z.enum(["color-choice", "held-constant", "reader-preference"]),
});

export const sourceCorroborationTransferValidator: DeterministicValidator = Object.freeze({
  id: SOURCE_CORROBORATION_VALIDATOR_ID,
  validate(input: unknown) {
    const parsed = sourceCorroborationTransferInputSchema.safeParse(input);
    if (!parsed.success) {
      return deterministicValidationResultSchema.parse({
        inputStatus: "invalid",
        passed: false,
        score: 0,
        code: "invalid.transfer-input",
        evidence: [],
      });
    }

    const result = scoreColdTransfer(parsed.data.choiceId, parsed.data.openQuestionId);
    return deterministicValidationResultSchema.parse({
      inputStatus: "valid",
      passed: result.outcome === "held",
      score: result.points / 2,
      code: `transfer.${result.outcome}`,
      evidence: [`choice:${parsed.data.choiceId}`, `open-question:${parsed.data.openQuestionId}`],
    });
  },
});

const proportionalReasoningTransferInputSchema = z.strictObject({
  choiceId: z.enum(["18_km", "24_km", "32_km", "96_km"]),
  explanation: z.string().trim().min(8).max(400),
  confidence: z.number().int().min(0).max(100),
});

export const proportionalReasoningTransferValidator: DeterministicValidator = Object.freeze({
  id: PROPORTIONAL_REASONING_VALIDATOR_ID,
  validate(input: unknown) {
    const parsed = proportionalReasoningTransferInputSchema.safeParse(input);
    if (!parsed.success) {
      return deterministicValidationResultSchema.parse({
        inputStatus: "invalid",
        passed: false,
        score: 0,
        code: "invalid.transfer-input",
        evidence: [],
      });
    }

    const result = evaluateTransfer(parsed.data.choiceId, parsed.data.explanation, parsed.data.confidence);
    const demonstrated = isIndependentProportionalTransferDemonstrated(result);
    return deterministicValidationResultSchema.parse({
      inputStatus: "valid",
      passed: demonstrated,
      score: demonstrated ? 1 : 0,
      code: demonstrated ? "transfer.demonstrated" : "transfer.not-demonstrated",
      evidence: [
        `answer:${result.choiceId}`,
        `mechanism-signals:${result.mechanismSignals.join(",") || "none"}`,
      ],
    });
  },
});

export const primarySourceReasoningTransferValidator: DeterministicValidator = Object.freeze({
  id: PRIMARY_SOURCE_VALIDATOR_ID,
  validate(input: unknown) {
    const result = validatePrimarySourceTransfer(input);
    return deterministicValidationResultSchema.parse({
      inputStatus: result.valid ? "valid" : "invalid",
      passed: result.passed,
      score: result.score,
      code: result.code,
      evidence: result.valid
        ? [
            `task:${PRIMARY_SOURCE_TRANSFER_TASK_ID}`,
            `correct-categories:${result.correctCount}/4`,
          ]
        : [],
    });
  },
});

export const argumentEvidenceTransferValidator: DeterministicValidator = Object.freeze({
  id: ARGUMENT_EVIDENCE_VALIDATOR_ID,
  validate(input: unknown) {
    return deterministicValidationResultSchema.parse(validateArgumentEvidenceTransfer(input));
  },
});

export const CANONICAL_DETERMINISTIC_VALIDATORS = Object.freeze([
  forceAndMotionTransferValidator,
  sourceCorroborationTransferValidator,
  proportionalReasoningTransferValidator,
  primarySourceReasoningTransferValidator,
  argumentEvidenceTransferValidator,
] as const);

export interface CanonicalDeterministicValidatorRegistration {
  readonly validator: DeterministicValidator;
  readonly inputContractVersion: "1.0.0";
  readonly outputContractVersion: "1.0.0";
}

const canonicalValidatorsById = new Map<string, CanonicalDeterministicValidatorRegistration>(
  CANONICAL_DETERMINISTIC_VALIDATORS.map((validator) => [validator.id, {
    validator,
    inputContractVersion: "1.0.0",
    outputContractVersion: "1.0.0",
  }]),
);

export function getCanonicalDeterministicValidator(id: string): DeterministicValidator | null {
  return canonicalValidatorsById.get(id)?.validator ?? null;
}

export function getCanonicalDeterministicValidatorRegistration(
  id: string,
): CanonicalDeterministicValidatorRegistration | null {
  return canonicalValidatorsById.get(id) ?? null;
}

/**
 * Validators are authored code, but their output is still parsed at the
 * runtime boundary. A malformed implementation never becomes a pass.
 */
export function validateCanonicalDeterministicResult(
  validator: DeterministicValidator,
  input: unknown,
): DeterministicValidationResult | null {
  try {
    const result = deterministicValidationResultSchema.safeParse(validator.validate(input));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
