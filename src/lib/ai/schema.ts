import { z } from "zod";

import {
  ABSTAIN_REASONS,
  HYPOTHESIS_IDS,
  LEVEL_1_QUESTION_IDS,
  MISSING_DISTINCTION_IDS,
  PREDICTION_IDS,
  PROBE_IDS,
} from "../../types/modelshift";

const hypothesisId = z.enum(HYPOTHESIS_IDS);
const support = z.enum(["high", "medium", "low"]);

/**
 * This is deliberately strict at every level so the JSON Schema emitted by
 * zodTextFormat has additionalProperties: false throughout.
 */
export const interpretationSchema = z.strictObject({
  schema_version: z.literal("1.0"),
  hypotheses: z.array(
    z.strictObject({
      id: hypothesisId,
      support,
      evidence_spans: z.array(z.string().min(1).max(120)).max(2),
      rationale: z.string().min(1).max(240),
    }),
  ).min(1).max(3),
  missing_distinctions: z.array(z.enum(MISSING_DISTINCTION_IDS)).max(2),
  recommended_probe_id: z.enum(PROBE_IDS),
  recommended_level_1_question_id: z.enum(LEVEL_1_QUESTION_IDS),
  abstain: z.boolean(),
  abstain_reason: z.enum(ABSTAIN_REASONS),
});

export const interpretationRequestSchema = z.strictObject({
  scenario_id: z.literal("mystery_force_cutoff"),
  prediction_id: z.enum(PREDICTION_IDS),
  confidence: z.number().int().min(0).max(100),
  explanation: z.string().trim().min(1).max(600),
  stage: z.literal("INTERPRET"),
});

export type ModelInterpretation = z.infer<typeof interpretationSchema>;
export type InterpretRequestInput = z.infer<typeof interpretationRequestSchema>;
