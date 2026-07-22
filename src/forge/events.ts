import { z } from "zod";

import { ASSISTANCE_KINDS, WORLD_RUNTIME_STAGES, identifierSchema } from "./contracts";

/**
 * Version 1 remains readable for existing local journals and staged database
 * rows. New ADR-001 runtime projections write version 2 only.
 */
export const FORGE_EVENT_SCHEMA_VERSION = 1 as const;
export const ADR001_FORGE_EVENT_SCHEMA_VERSION = 2 as const;
export const FORGE_EVENT_SCHEMA_VERSIONS = [
  FORGE_EVENT_SCHEMA_VERSION,
  ADR001_FORGE_EVENT_SCHEMA_VERSION,
] as const;
export type ForgeEventSchemaVersion = (typeof FORGE_EVENT_SCHEMA_VERSIONS)[number];

export const FORGE_EVENT_DIGEST_PREFIX = "sha256:" as const;
export const FORGE_EVENT_TYPES = [
  "world_run.started",
  "attempt.committed",
  "assistance.recorded",
  "proof.submitted",
  "evidence.recorded",
  "world_run.paused",
  "world_run.resumed",
  "world_run.completed",
  "world_run.corrected",
  "world_package.published",
  "world_package.disabled",
  "world_package.superseded",
] as const;

export type ForgeEventType = (typeof FORGE_EVENT_TYPES)[number];
export type ForgeAggregateType = "world_run" | "world_package";

export const forgeEventSemverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, "Use semantic versioning such as 1.0.0.");
export const forgeEventTimestampSchema = z.string().datetime({ offset: true });
export const forgeEventDigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
export const forgeEventIdSchema = z.string().uuid();
export const forgeEventReferenceSchema = z
  .string()
  .min(3)
  .max(180)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, "Use an opaque, bounded reference.");
export const forgeIdempotencyKeySchema = z
  .string()
  .min(16)
  .max(180)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, "Use an opaque idempotency key.");

function uniqueArray<T extends z.ZodTypeAny>(item: T, maximum: number) {
  return z.array(item).max(maximum).superRefine((values, context) => {
    const seen = new Set<unknown>();
    values.forEach((value, index) => {
      if (seen.has(value)) {
        context.addIssue({ code: "custom", message: `Duplicate value: ${String(value)}`, path: [index] });
      }
      seen.add(value);
    });
  });
}

const identifiersSchema = uniqueArray(identifierSchema, 32);
const eventIdsSchema = uniqueArray(forgeEventIdSchema, 64);
const criteriaSchema = uniqueArray(z.string().trim().min(1).max(1_200), 32);
const reasonCodesSchema = uniqueArray(identifierSchema, 32);

const worldRunStartedPayloadSchema = z.strictObject({
  world_id: identifierSchema,
  world_version: forgeEventSemverSchema,
  content_version: forgeEventSemverSchema,
  capability_id: identifierSchema,
  proof_claim_id: identifierSchema,
  validator_id: identifierSchema,
  validator_version: forgeEventSemverSchema,
  package_integrity_hash: forgeEventDigestSchema,
  assistance_mode: z.enum(["closed", "hints_only", "collaborative_ai", "ai_required"]),
  source_ids: identifiersSchema,
  proof_authority: z.enum(["honour_based", "server_enforced", "human_observed"]),
});

const attemptCommittedPayloadSchema = z
  .strictObject({
    phase: z.enum(["initial", "reconstruction", "proof"]),
    stage_id: identifierSchema,
    selection_ids: identifiersSchema,
    response_digest: forgeEventDigestSchema.nullable(),
    explicit_uncertainty: z.boolean(),
  })
  .superRefine((payload, context) => {
    if (payload.selection_ids.length === 0 && payload.response_digest === null && !payload.explicit_uncertainty) {
      context.addIssue({
        code: "custom",
        message: "An attempt must contain a structured selection, a digest, or explicit uncertainty.",
      });
    }
  });

const assistanceRecordedPayloadSchema = z.strictObject({
  assistance_id: identifierSchema,
  stage_id: identifierSchema,
  kind: z.enum(ASSISTANCE_KINDS),
  source: z.enum(["authored", "model", "accessibility", "human"]),
  content_reference: identifierSchema,
  policy_decision: z.enum(["allowed", "fallback"]),
  protected_operation_overlap: z.number().min(0).max(1),
});

const proofSubmittedPayloadSchema = z.strictObject({
  task_id: identifierSchema,
  task_version: forgeEventSemverSchema,
  transfer_family_id: identifierSchema,
  selection_ids: identifiersSchema,
  response_digest: forgeEventDigestSchema.nullable(),
  assistance_access: z.literal("removed"),
  proof_nonce_digest: forgeEventDigestSchema.nullable(),
});

const evidenceRecordedPayloadSchema = z.strictObject({
  evidence_id: identifierSchema,
  result: z.enum(["proved", "not_proved", "open_question"]),
  validator_id: identifierSchema,
  validator_version: forgeEventSemverSchema,
  source_ids: identifiersSchema,
  assistance_event_ids: eventIdsSchema,
  remains_untested: identifiersSchema,
});

const pausedPayloadSchema = z.strictObject({
  stage_id: identifierSchema,
  reason_code: identifierSchema,
});

const resumedPayloadSchema = z.strictObject({
  stage_id: identifierSchema,
});

const completedPayloadSchema = z.strictObject({
  result: z.enum(["proved", "not_proved", "open_question"]),
  evidence_id: identifierSchema,
  next_review_at: forgeEventTimestampSchema.nullable(),
});

const correctedPayloadSchema = z.strictObject({
  supersedes_event_id: forgeEventIdSchema,
  reason_code: identifierSchema,
  correction_reference: identifierSchema,
});

const packagePublishedPayloadSchema = z.strictObject({
  world_id: identifierSchema,
  world_version: forgeEventSemverSchema,
  content_version: forgeEventSemverSchema,
  bundle_integrity_hash: forgeEventDigestSchema,
});

const packageDisabledPayloadSchema = z.strictObject({
  world_id: identifierSchema,
  world_version: forgeEventSemverSchema,
  reason_code: identifierSchema,
});

const packageSupersededPayloadSchema = z.strictObject({
  world_id: identifierSchema,
  world_version: forgeEventSemverSchema,
  successor_version: forgeEventSemverSchema,
  successor_bundle_integrity_hash: forgeEventDigestSchema,
});

export const FORGE_EVENT_PAYLOAD_SCHEMAS = {
  "world_run.started": worldRunStartedPayloadSchema,
  "attempt.committed": attemptCommittedPayloadSchema,
  "assistance.recorded": assistanceRecordedPayloadSchema,
  "proof.submitted": proofSubmittedPayloadSchema,
  "evidence.recorded": evidenceRecordedPayloadSchema,
  "world_run.paused": pausedPayloadSchema,
  "world_run.resumed": resumedPayloadSchema,
  "world_run.completed": completedPayloadSchema,
  "world_run.corrected": correctedPayloadSchema,
  "world_package.published": packagePublishedPayloadSchema,
  "world_package.disabled": packageDisabledPayloadSchema,
  "world_package.superseded": packageSupersededPayloadSchema,
} as const;

export type ForgeEventPayloadMap = {
  [K in ForgeEventType]: z.infer<(typeof FORGE_EVENT_PAYLOAD_SCHEMAS)[K]>;
};

const adr001ValidatorOutcomeSchema = z.enum(["pass", "fail", "inconclusive", "not_scored"]);
const adr001EvidenceDispositionSchema = z.enum([
  "demonstrated",
  "not_demonstrated",
  "open_question",
  "not_evaluated",
  "invalidated",
]);
const adr001SupportTierSchema = z.enum(["attention", "cue", "representation", "example", "repair", "solution"]);
const adr001SupportSourceSchema = z.enum(["authored", "model", "human"]);
const adr001RuntimeStageSchema = z.enum(WORLD_RUNTIME_STAGES);

const adr001SourceBindingSchema = z.discriminatedUnion("provenance_status", [
  z.strictObject({
    domain_source_ref: identifierSchema,
    source_item_id: identifierSchema,
    source_package_id: identifierSchema,
    source_package_version: forgeEventSemverSchema,
    source_snapshot_digest: forgeEventDigestSchema,
    locator_ids: identifiersSchema.min(1),
    claim_ids: identifiersSchema.min(1),
    rights_record_id: identifierSchema,
    review_decision_ids: identifiersSchema.min(1),
    provenance_status: z.literal("bound"),
  }),
  z.strictObject({
    domain_source_ref: identifierSchema,
    source_item_id: identifierSchema,
    source_package_id: z.null(),
    source_package_version: z.null(),
    source_snapshot_digest: z.null(),
    locator_ids: z.array(identifierSchema).length(0),
    claim_ids: z.array(identifierSchema).length(0),
    rights_record_id: z.null(),
    review_decision_ids: z.array(identifierSchema).length(0),
    provenance_status: z.literal("legacy_metadata_only"),
  }),
]);

const adr001WorldRunStartedPayloadSchema = z.strictObject({
  world_id: identifierSchema,
  world_version: forgeEventSemverSchema,
  content_version: forgeEventSemverSchema,
  package_integrity_hash: forgeEventDigestSchema,
  protocol_version: forgeEventSemverSchema,
  capability_id: identifierSchema,
  proof_claim_id: identifierSchema,
  task_id: identifierSchema,
  task_version: forgeEventSemverSchema,
  task_family_id: identifierSchema,
  representation_id: identifierSchema,
  context_id: identifierSchema,
  bounded_claim: z.string().trim().min(1).max(1_200),
  validator_id: identifierSchema,
  validator_version: forgeEventSemverSchema,
  proof_authority: z.enum(["honour_based", "server_enforced", "human_observed"]),
  source_bindings: z.array(adr001SourceBindingSchema).min(1).max(32),
  source_provenance_status: z.enum(["bound", "incomplete"]),
});

const adr001AttemptCommittedPayloadSchema = z
  .strictObject({
    phase: z.enum(["initial", "reconstruction", "proof"]),
    stage_id: adr001RuntimeStageSchema,
    selection_ids: identifiersSchema,
    response_digest: forgeEventDigestSchema.nullable(),
    explicit_uncertainty: z.boolean(),
  })
  .superRefine((payload, context) => {
    if (payload.selection_ids.length === 0 && payload.response_digest === null && !payload.explicit_uncertainty) {
      context.addIssue({
        code: "custom",
        message: "An attempt must contain a structured selection, a digest, or explicit uncertainty.",
      });
    }
  });

const adr001AssistanceRecordedPayloadSchema = z.strictObject({
  support_id: identifierSchema,
  stage_id: adr001RuntimeStageSchema,
  tier: adr001SupportTierSchema,
  source: adr001SupportSourceSchema,
  content_reference: identifierSchema,
  policy_version: forgeEventReferenceSchema,
  protected_operation_overlap: z.number().min(0).max(1),
});

const adr001ProofSubmittedPayloadSchema = z.strictObject({
  task_id: identifierSchema,
  task_version: forgeEventSemverSchema,
  task_family_id: identifierSchema,
  representation_id: identifierSchema,
  context_id: identifierSchema,
  selection_ids: identifiersSchema,
  response_digest: forgeEventDigestSchema.nullable(),
  explicit_uncertainty: z.boolean(),
  assistance_access: z.literal("removed"),
  proof_nonce_digest: forgeEventDigestSchema.nullable(),
  access_accommodation_ids: identifiersSchema,
});

const adr001EvidenceRecordedPayloadSchema = z.strictObject({
  evidence_id: identifierSchema,
  disposition: adr001EvidenceDispositionSchema,
  validator_outcome: adr001ValidatorOutcomeSchema,
  validator_id: identifierSchema,
  validator_version: forgeEventSemverSchema,
  criteria: criteriaSchema,
  proof_authority: z.enum(["honour_based", "server_enforced", "human_observed"]),
  cognitive_support_event_ids: eventIdsSchema,
  access_accommodation_ids: identifiersSchema,
  source_bindings: z.array(adr001SourceBindingSchema).min(1).max(32),
  source_provenance_status: z.enum(["bound", "incomplete"]),
  response_digest: forgeEventDigestSchema.nullable(),
  explicit_uncertainty: z.boolean(),
  contamination: z.strictObject({
    status: z.enum(["clear", "contaminated"]),
    reason_codes: reasonCodesSchema,
  }),
  remains_untested: uniqueArray(z.string().trim().min(1).max(1_200), 32),
  bounded_claim: z.string().trim().min(1).max(1_200),
});

const adr001CompletedPayloadSchema = z.strictObject({
  disposition: adr001EvidenceDispositionSchema,
  evidence_id: identifierSchema,
  next_review_at: forgeEventTimestampSchema.nullable(),
});

const adr001CorrectedPayloadSchema = z.strictObject({
  supersedes_event_id: forgeEventIdSchema,
  correction_id: identifierSchema,
  reason_code: identifierSchema,
  correction_reference: identifierSchema,
  replacement_disposition: adr001EvidenceDispositionSchema,
  replacement_validator_outcome: adr001ValidatorOutcomeSchema,
  replacement_criteria: criteriaSchema,
});

export const ADR001_FORGE_EVENT_PAYLOAD_SCHEMAS = {
  "world_run.started": adr001WorldRunStartedPayloadSchema,
  "attempt.committed": adr001AttemptCommittedPayloadSchema,
  "assistance.recorded": adr001AssistanceRecordedPayloadSchema,
  "proof.submitted": adr001ProofSubmittedPayloadSchema,
  "evidence.recorded": adr001EvidenceRecordedPayloadSchema,
  "world_run.paused": pausedPayloadSchema,
  "world_run.resumed": resumedPayloadSchema,
  "world_run.completed": adr001CompletedPayloadSchema,
  "world_run.corrected": adr001CorrectedPayloadSchema,
  "world_package.published": packagePublishedPayloadSchema,
  "world_package.disabled": packageDisabledPayloadSchema,
  "world_package.superseded": packageSupersededPayloadSchema,
} as const;

export type Adr001ForgeEventPayloadMap = {
  [K in ForgeEventType]: z.infer<(typeof ADR001_FORGE_EVENT_PAYLOAD_SCHEMAS)[K]>;
};

export interface ForgeEventMetadata<Version extends ForgeEventSchemaVersion> {
  event_id: string;
  schema_version: Version;
  aggregate: {
    type: ForgeAggregateType;
    id: string;
    version: number;
  };
  actor: {
    type: "learner" | "system" | "validator" | "policy" | "human";
    id: string;
  };
  authority: {
    policy_version: string;
    consent_grant_ids: string[];
  };
  occurred_at: string;
  recorded_at: string;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
}

type ForgeEventUnion<
  Version extends ForgeEventSchemaVersion,
  PayloadMap extends Record<ForgeEventType, unknown>,
  Sealed extends boolean,
> = {
  [K in ForgeEventType]: ForgeEventMetadata<Version> & {
    event_type: K;
    payload: PayloadMap[K];
  } & (Sealed extends true ? { integrity_hash: string } : Record<never, never>);
}[ForgeEventType];

export type ForgeV1UnsignedEvent = ForgeEventUnion<1, ForgeEventPayloadMap, false>;
export type ForgeV1Event = ForgeEventUnion<1, ForgeEventPayloadMap, true>;
export type ForgeV2UnsignedEvent = ForgeEventUnion<2, Adr001ForgeEventPayloadMap, false>;
export type ForgeV2Event = ForgeEventUnion<2, Adr001ForgeEventPayloadMap, true>;
export type ForgeUnsignedEvent = ForgeV1UnsignedEvent | ForgeV2UnsignedEvent;
export type ForgeEvent = ForgeV1Event | ForgeV2Event;

const metadataFields = {
  event_id: forgeEventIdSchema,
  event_type: z.enum(FORGE_EVENT_TYPES),
  aggregate: z.strictObject({
    type: z.enum(["world_run", "world_package"]),
    id: forgeEventReferenceSchema,
    version: z.number().int().min(1),
  }),
  actor: z.strictObject({
    type: z.enum(["learner", "system", "validator", "policy", "human"]),
    id: forgeEventReferenceSchema,
  }),
  authority: z.strictObject({
    policy_version: forgeEventReferenceSchema,
    consent_grant_ids: uniqueArray(forgeEventReferenceSchema, 32),
  }),
  occurred_at: forgeEventTimestampSchema,
  recorded_at: forgeEventTimestampSchema,
  correlation_id: forgeEventReferenceSchema,
  causation_id: forgeEventIdSchema.nullable(),
  idempotency_key: forgeIdempotencyKeySchema,
  payload: z.unknown(),
} as const;

type EnvelopeForSemanticValidation = {
  schema_version: ForgeEventSchemaVersion;
  event_type: ForgeEventType;
  aggregate: { type: ForgeAggregateType };
  occurred_at: string;
  recorded_at: string;
  payload: unknown;
};

function payloadSchemaFor(
  schemaVersion: ForgeEventSchemaVersion,
  eventType: ForgeEventType,
): z.ZodTypeAny {
  return schemaVersion === ADR001_FORGE_EVENT_SCHEMA_VERSION
    ? ADR001_FORGE_EVENT_PAYLOAD_SCHEMAS[eventType]
    : FORGE_EVENT_PAYLOAD_SCHEMAS[eventType];
}

function validateEnvelopeSemantics(event: EnvelopeForSemanticValidation, context: z.RefinementCtx): void {
  if (Date.parse(event.recorded_at) < Date.parse(event.occurred_at)) {
    context.addIssue({ code: "custom", message: "recorded_at cannot precede occurred_at", path: ["recorded_at"] });
  }

  const expectedAggregate = event.event_type.startsWith("world_package.") ? "world_package" : "world_run";
  if (event.aggregate.type !== expectedAggregate) {
    context.addIssue({
      code: "custom",
      message: `${event.event_type} requires aggregate type ${expectedAggregate}`,
      path: ["aggregate", "type"],
    });
  }

  const payload = payloadSchemaFor(event.schema_version, event.event_type).safeParse(event.payload);
  if (!payload.success) {
    for (const issue of payload.error.issues) {
      context.addIssue({ ...issue, path: ["payload", ...issue.path] });
    }
  }
}

const unsignedForgeV1EventSchema = z
  .strictObject({ ...metadataFields, schema_version: z.literal(FORGE_EVENT_SCHEMA_VERSION) })
  .superRefine(validateEnvelopeSemantics);
const unsignedForgeV2EventSchema = z
  .strictObject({ ...metadataFields, schema_version: z.literal(ADR001_FORGE_EVENT_SCHEMA_VERSION) })
  .superRefine(validateEnvelopeSemantics);
const forgeV1EventSchema = z
  .strictObject({ ...metadataFields, schema_version: z.literal(FORGE_EVENT_SCHEMA_VERSION), integrity_hash: forgeEventDigestSchema })
  .superRefine(validateEnvelopeSemantics);
const forgeV2EventSchema = z
  .strictObject({ ...metadataFields, schema_version: z.literal(ADR001_FORGE_EVENT_SCHEMA_VERSION), integrity_hash: forgeEventDigestSchema })
  .superRefine(validateEnvelopeSemantics);

export const unsignedForgeEventSchema = z.union([unsignedForgeV1EventSchema, unsignedForgeV2EventSchema]);
export const forgeEventSchema = z.union([forgeV1EventSchema, forgeV2EventSchema]);

export function parseUnsignedForgeEvent(value: unknown): ForgeUnsignedEvent {
  return unsignedForgeEventSchema.parse(value) as ForgeUnsignedEvent;
}

export function parseForgeEvent(value: unknown): ForgeEvent {
  return deepFreeze(forgeEventSchema.parse(value) as ForgeEvent);
}

export async function sealForgeEvent(value: unknown): Promise<ForgeEvent> {
  const unsigned = parseUnsignedForgeEvent(value);
  const integrity_hash = await sha256Digest(canonicalJson(unsigned));
  return parseForgeEvent({ ...unsigned, integrity_hash });
}

export async function verifyForgeEventIntegrity(value: unknown): Promise<boolean> {
  const parsed = forgeEventSchema.safeParse(value);
  if (!parsed.success) return false;
  const { integrity_hash, ...unsigned } = parsed.data;
  return constantTimeEqual(integrity_hash, await sha256Digest(canonicalJson(unsigned)));
}

/** Stable JSON representation shared by hashing, collision checks, and local persistence. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(",")}}`;
  }
  throw new TypeError("Forge event data must be finite JSON data.");
}

export async function sha256Digest(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("SHA-256 is unavailable in this runtime.");
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await subtle.digest("SHA-256", bytes));
  return `${FORGE_EVENT_DIGEST_PREFIX}${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
