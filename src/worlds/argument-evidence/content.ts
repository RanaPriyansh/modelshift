import authoredFixture from "../../../public/worlds/argument-evidence/authored-fixture.json";
import { z } from "zod";

import type {
  InitialRuleId,
  ReconstructionRuleId,
  SupportLevel,
  TestPredictionId,
  TransferEvidenceItemId,
  TransferLimitationId,
  TransferMechanismId,
  WorkedEvidenceItemId,
  WorkedRelationId,
} from "./types";

const authoredItemSchema = z.strictObject({
  id: z.string().min(1),
  text: z.string().min(1),
  relation: z.string().min(1),
  why: z.string().min(1),
});

const authoredFixtureSchema = z.strictObject({
  world: z.strictObject({
    id: z.literal("world.argument-evidence"),
    version: z.literal("1.0.0"),
    contentVersion: z.literal("1.0.0"),
    title: z.literal("Argument & evidence"),
  }),
  worked: z.strictObject({
    taskCode: z.literal("rooftop_garden_evidence_table"),
    claim: z.string().min(1),
    items: z.tuple([
      authoredItemSchema.extend({ id: z.literal("roof.same-topic"), relation: z.literal("same_topic_only") }),
      authoredItemSchema.extend({ id: z.literal("roof.outcome-linked"), relation: z.literal("supports_with_limit") }),
      authoredItemSchema.extend({ id: z.literal("roof.uncontrolled-testimonial"), relation: z.literal("weak_or_open") }),
      authoredItemSchema.extend({ id: z.literal("roof.contradictory-pair"), relation: z.literal("contradicts_under_changed_condition") }),
    ]),
  }),
  transfer: z.strictObject({
    taskId: z.literal("bus_route_late_arrivals_table"),
    claim: z.string().min(1),
    items: z.tuple([
      authoredItemSchema.extend({ id: z.literal("bus.same-topic"), relation: z.literal("same_topic_only") }),
      authoredItemSchema.extend({ id: z.literal("bus.outcome-linked"), relation: z.literal("supports_with_limit") }),
      authoredItemSchema.extend({ id: z.literal("bus.confounded"), relation: z.literal("limits_claim") }),
    ]),
  }),
  compiler: z.strictObject({
    readings: z.tuple([
      z.strictObject({ id: z.literal("same_topic_counts"), label: z.string().min(1), text: z.string().min(1), prediction: z.literal("both_cards_count_equally") }),
      z.strictObject({ id: z.literal("outcome_relation_counts"), label: z.string().min(1), text: z.string().min(1), prediction: z.literal("outcome_linked_changes_credibility") }),
    ]),
    disagreement: z.string().min(1),
  }),
  support: z.tuple([
    z.strictObject({ level: z.literal(1), tier: z.literal("attention"), text: z.string().min(1) }),
    z.strictObject({ level: z.literal(2), tier: z.literal("cue"), text: z.string().min(1) }),
    z.strictObject({ level: z.literal(3), tier: z.literal("representation"), text: z.string().min(1) }),
  ]),
});

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function parseArgumentEvidenceAuthoredFixture(value: unknown) {
  return deepFreeze(authoredFixtureSchema.parse(value));
}

export const ARGUMENT_EVIDENCE_AUTHORED_FIXTURE = parseArgumentEvidenceAuthoredFixture(authoredFixture);
export const ARGUMENT_EVIDENCE_WORLD_ID = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.world.id as "world.argument-evidence";
export const ARGUMENT_EVIDENCE_WORLD_VERSION = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.world.version as "1.0.0";
export const ARGUMENT_EVIDENCE_CONTENT_VERSION = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.world.contentVersion as "1.0.0";
export const ARGUMENT_EVIDENCE_CAPABILITY_ID = "capability.language-literacy.claim-evidence-relation" as const;
export const ARGUMENT_EVIDENCE_PROOF_CLAIM_ID = "proof.argument-evidence.independent-transfer" as const;
export const ARGUMENT_EVIDENCE_VALIDATOR_ID = "validator.argument-evidence-transfer.v1" as const;
export const ARGUMENT_EVIDENCE_TRANSFER_TASK_ID = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.taskId as "bus_route_late_arrivals_table";

export const WORKED_EVIDENCE_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.items
  .filter((item) => item.id === "roof.same-topic" || item.id === "roof.outcome-linked")
  .map((item) => item.id) as readonly WorkedEvidenceItemId[];
export const TRANSFER_EVIDENCE_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.items.map(
  (item) => item.id,
) as readonly TransferEvidenceItemId[];
export const TRANSFER_MECHANISM_IDS = [
  "same_subject",
  "compares_named_outcome",
  "personal_reaction",
] as const satisfies readonly TransferMechanismId[];
export const TRANSFER_LIMITATION_IDS = [
  "none",
  "other_changes_not_ruled_out",
  "colour_not_measured",
] as const satisfies readonly TransferLimitationId[];
export const INITIAL_RULE_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings.map(
  (reading) => reading.id,
) as readonly InitialRuleId[];
export const TEST_PREDICTION_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings.map(
  (reading) => reading.prediction,
) as readonly TestPredictionId[];
export const WORKED_RELATION_IDS = ["same_topic_only", "supports_with_limit"] as const satisfies readonly WorkedRelationId[];
export const RECONSTRUCTION_RULE_IDS = ["outcome_relation"] as const satisfies readonly ReconstructionRuleId[];
export const SUPPORT_LEVELS = [1, 2, 3] as const satisfies readonly SupportLevel[];

export const ARGUMENT_EVIDENCE_RESULT_BOUNDARIES = Object.freeze({
  demonstrated:
    "On this unfamiliar authored bus-route task, the learner independently met the named claim-to-evidence classification criteria once.",
  notDemonstrated:
    "On this unfamiliar authored bus-route task, the submitted selections did not yet meet the named claim-to-evidence classification criteria.",
  notYetTested: [
    "Whether this single bus-route classification transfers to other claims or contexts.",
    "Whether the learner can evaluate real-world truth, source authenticity, bias, statistical significance, or causal attribution.",
    "Whether the learner can write, revise, or evaluate persuasive arguments.",
    "Whether the distinction is retained over time or across repeated unaided attempts.",
    "Whether the authored fixture and its access routes are valid for representative learners.",
    "Whether a local, honour-based, non-persisted receipt establishes durable or independent evidence.",
  ],
});
