import { z } from "zod";

import authoredFixture from "./fixtures/authored-fixture.json";
import type {
  ArgumentEvidenceWorldEvent,
  CompilerResponse,
  InitialRuleId,
  ReconstructionRuleId,
  SupportLevel,
  TestPredictionId,
  TransferEvidenceItemId,
  TransferLimitationId,
  TransferMechanismId,
  WorkedRelationId,
} from "./types";

const authoredItemSchema = z.strictObject({
  id: z.string().min(1),
  text: z.string().min(1),
  relation: z.string().min(1),
  why: z.string().min(1),
});

const authoredConfidenceSchema = z.number().finite().int().min(0).max(100);

const authoredFixtureSchema = z.strictObject({
  world: z.strictObject({
    id: z.literal("world.argument-evidence"),
    version: z.literal("1.0.0"),
    contentVersion: z.literal("1.0.0"),
    title: z.literal("Argument & evidence"),
  }),
  defaults: z.strictObject({
    initialConfidence: authoredConfidenceSchema,
    transferConfidence: authoredConfidenceSchema,
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
    selectableItemIds: z.tuple([z.literal("roof.same-topic"), z.literal("roof.outcome-linked")]),
    relationChoices: z.tuple([
      z.strictObject({ id: z.literal("same_topic_only"), label: z.string().min(1) }),
      z.strictObject({ id: z.literal("supports_with_limit"), label: z.string().min(1) }),
    ]),
    expected: z.strictObject({
      evidenceItemId: z.enum(["roof.same-topic", "roof.outcome-linked"]),
      relationId: z.enum(["same_topic_only", "supports_with_limit"]),
    }),
  }),
  compiler: z.strictObject({
    readings: z.tuple([
      z.strictObject({ id: z.literal("same_topic_counts"), label: z.string().min(1), text: z.string().min(1), prediction: z.literal("both_cards_count_equally") }),
      z.strictObject({ id: z.literal("outcome_relation_counts"), label: z.string().min(1), text: z.string().min(1), prediction: z.literal("outcome_linked_changes_credibility") }),
    ]),
    responses: z.tuple([
      z.strictObject({ id: z.literal("accept"), label: z.string().min(1) }),
      z.strictObject({ id: z.literal("correct"), label: z.string().min(1) }),
      z.strictObject({ id: z.literal("reject"), label: z.string().min(1) }),
    ]),
    disagreement: z.string().min(1),
  }),
  support: z.tuple([
    z.strictObject({ level: z.literal(1), tier: z.literal("attention"), text: z.string().min(1) }),
    z.strictObject({ level: z.literal(2), tier: z.literal("cue"), text: z.string().min(1) }),
    z.strictObject({ level: z.literal(3), tier: z.literal("representation"), text: z.string().min(1) }),
  ]),
  reconstruction: z.strictObject({
    rules: z.tuple([
      z.strictObject({ id: z.literal("outcome_relation"), label: z.string().min(1) }),
    ]),
    expectedRuleId: z.literal("outcome_relation"),
  }),
  transfer: z.strictObject({
    taskId: z.literal("bus_route_late_arrivals_table"),
    claim: z.string().min(1),
    items: z.tuple([
      authoredItemSchema.extend({ id: z.literal("bus.same-topic"), relation: z.literal("same_topic_only") }),
      authoredItemSchema.extend({ id: z.literal("bus.outcome-linked"), relation: z.literal("supports_with_limit") }),
      authoredItemSchema.extend({ id: z.literal("bus.confounded"), relation: z.literal("limits_claim") }),
    ]),
    mechanismChoices: z.tuple([
      z.strictObject({ id: z.literal("same_subject"), label: z.string().min(1) }),
      z.strictObject({ id: z.literal("compares_named_outcome"), label: z.string().min(1) }),
      z.strictObject({ id: z.literal("personal_reaction"), label: z.string().min(1) }),
    ]),
    limitationChoices: z.tuple([
      z.strictObject({ id: z.literal("none"), label: z.string().min(1) }),
      z.strictObject({ id: z.literal("other_changes_not_ruled_out"), label: z.string().min(1) }),
      z.strictObject({ id: z.literal("colour_not_measured"), label: z.string().min(1) }),
    ]),
    expected: z.strictObject({
      evidenceItemId: z.enum(["bus.same-topic", "bus.outcome-linked", "bus.confounded"]),
      mechanismId: z.enum(["same_subject", "compares_named_outcome", "personal_reaction"]),
      limitationId: z.enum(["none", "other_changes_not_ruled_out", "colour_not_measured"]),
    }),
  }),
  results: z.strictObject({
    demonstrated: z.string().min(1),
    notDemonstrated: z.string().min(1),
    remainsUntested: z.tuple([
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
    ]),
  }),
}).superRefine((fixture, context) => {
  const references: readonly [unknown, readonly unknown[], PropertyKey[]][] = [
    [fixture.worked.expected.evidenceItemId, fixture.worked.selectableItemIds, ["worked", "expected", "evidenceItemId"]],
    [fixture.worked.expected.relationId, fixture.worked.relationChoices.map((choice) => choice.id), ["worked", "expected", "relationId"]],
    [fixture.reconstruction.expectedRuleId, fixture.reconstruction.rules.map((rule) => rule.id), ["reconstruction", "expectedRuleId"]],
    [fixture.transfer.expected.evidenceItemId, fixture.transfer.items.map((item) => item.id), ["transfer", "expected", "evidenceItemId"]],
    [fixture.transfer.expected.mechanismId, fixture.transfer.mechanismChoices.map((choice) => choice.id), ["transfer", "expected", "mechanismId"]],
    [fixture.transfer.expected.limitationId, fixture.transfer.limitationChoices.map((choice) => choice.id), ["transfer", "expected", "limitationId"]],
  ];
  for (const [selected, catalog, path] of references) {
    if (!catalog.includes(selected)) {
      context.addIssue({ code: "custom", message: "Expected value must reference its authored catalog.", path });
    }
  }
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
export const ARGUMENT_EVIDENCE_WORLD_ID = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.world.id;
export const ARGUMENT_EVIDENCE_WORLD_VERSION = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.world.version;
export const ARGUMENT_EVIDENCE_CONTENT_VERSION = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.world.contentVersion;
export const ARGUMENT_EVIDENCE_CAPABILITY_ID = "capability.language-literacy.claim-evidence-relation" as const;
export const ARGUMENT_EVIDENCE_PROOF_CLAIM_ID = "proof.argument-evidence.independent-transfer" as const;
export const ARGUMENT_EVIDENCE_VALIDATOR_ID = "validator.argument-evidence-transfer.v1" as const;
export const ARGUMENT_EVIDENCE_TRANSFER_TASK_ID = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.taskId;

export const WORKED_EVIDENCE_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.selectableItemIds;
export const WORKED_RELATION_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.relationChoices.map(
  (choice) => choice.id,
) as readonly WorkedRelationId[];
export const TRANSFER_EVIDENCE_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.items.map(
  (item) => item.id,
) as readonly TransferEvidenceItemId[];
export const TRANSFER_MECHANISM_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.mechanismChoices.map(
  (choice) => choice.id,
) as readonly TransferMechanismId[];
export const TRANSFER_LIMITATION_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.limitationChoices.map(
  (choice) => choice.id,
) as readonly TransferLimitationId[];
export const INITIAL_RULE_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings.map(
  (reading) => reading.id,
) as readonly InitialRuleId[];
export const TEST_PREDICTION_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings.map(
  (reading) => reading.prediction,
) as readonly TestPredictionId[];
export const COMPILER_RESPONSE_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.responses.map(
  (response) => response.id,
) as readonly CompilerResponse[];
export const RECONSTRUCTION_RULE_IDS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.reconstruction.rules.map(
  (rule) => rule.id,
) as readonly ReconstructionRuleId[];
export const SUPPORT_LEVELS = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.support.map(
  (support) => support.level,
) as readonly SupportLevel[];
export const ARGUMENT_EVIDENCE_RESULT_BOUNDARIES = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.results;

function memberSchema<T extends string | number>(values: readonly T[]) {
  return z.custom<T>(
    (value) => values.includes(value as T),
    { message: "Value is outside the authored fixture catalog." },
  );
}

const eventSchema = z.union([
  z.strictObject({ type: z.literal("COMMIT_INITIAL"), ruleId: memberSchema(INITIAL_RULE_IDS), confidence: authoredConfidenceSchema }),
  z.strictObject({ type: z.literal("COMMIT_EXPLANATION"), text: z.string() }),
  z.strictObject({ type: z.literal("RESPOND_TO_TWO_READINGS"), response: z.literal("accept") }),
  z.strictObject({ type: z.literal("RESPOND_TO_TWO_READINGS"), response: z.literal("reject") }),
  z.strictObject({ type: z.literal("RESPOND_TO_TWO_READINGS"), response: z.literal("correct"), correction: z.string() }),
  z.strictObject({ type: z.literal("NAME_DISAGREEMENT") }),
  z.strictObject({ type: z.literal("COMMIT_TEST_PREDICTION"), predictionId: memberSchema(TEST_PREDICTION_IDS) }),
  z.strictObject({ type: z.literal("REVEAL_SEPARATING_COMPARISON") }),
  z.strictObject({ type: z.literal("SET_WORKED_EVIDENCE_ITEM"), evidenceItemId: memberSchema(WORKED_EVIDENCE_IDS) }),
  z.strictObject({ type: z.literal("SET_WORKED_RELATION"), relationId: memberSchema(WORKED_RELATION_IDS) }),
  z.strictObject({ type: z.literal("SUBMIT_WORKED_COMPARISON") }),
  z.strictObject({ type: z.literal("CONSUME_AUTHORED_SUPPORT"), level: memberSchema(SUPPORT_LEVELS) }),
  z.strictObject({ type: z.literal("CONTINUE_TO_RECONSTRUCTION") }),
  z.strictObject({ type: z.literal("SUBMIT_RECONSTRUCTION"), ruleId: memberSchema(RECONSTRUCTION_RULE_IDS), text: z.string() }),
  z.strictObject({ type: z.literal("ACKNOWLEDGE_WITHDRAWAL") }),
  z.strictObject({ type: z.literal("SET_TRANSFER_EVIDENCE_ITEM"), evidenceItemId: memberSchema(TRANSFER_EVIDENCE_IDS) }),
  z.strictObject({ type: z.literal("SET_TRANSFER_MECHANISM"), mechanismId: memberSchema(TRANSFER_MECHANISM_IDS) }),
  z.strictObject({ type: z.literal("SET_TRANSFER_LIMITATION"), limitationId: memberSchema(TRANSFER_LIMITATION_IDS) }),
  z.strictObject({ type: z.literal("SET_TRANSFER_CONFIDENCE"), confidence: authoredConfidenceSchema }),
  z.strictObject({ type: z.literal("SUBMIT_TRANSFER") }),
  z.strictObject({ type: z.literal("RESET") }),
]);

export function parseArgumentEvidenceWorldEvent(value: unknown): ArgumentEvidenceWorldEvent | null {
  const parsed = eventSchema.safeParse(value);
  return parsed.success ? parsed.data as ArgumentEvidenceWorldEvent : null;
}
