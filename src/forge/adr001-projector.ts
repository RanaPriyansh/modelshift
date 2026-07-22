import {
  ADR001_FORGE_EVENT_SCHEMA_VERSION,
  sealForgeEvent,
  type ForgeEvent,
  type ForgeV2Event,
} from "./events";
import { replayForgeEvents } from "./event-journal";
import {
  deriveDefaultEvidenceDisposition,
  type BoundedLocalWorldRuntimeReceipt,
  type EvidenceDisposition,
  type ValidatorOutcome,
} from "./world-runtime";

export const ADR001_PROJECTOR_VERSION = "1.0.0" as const;

export interface Adr001ProjectionEventIds {
  readonly started: string;
  readonly assistance: readonly string[];
  readonly proof: string;
  readonly evidence: string;
  readonly completed: string;
}

export interface Adr001RuntimeProjectionInput {
  readonly receipt: BoundedLocalWorldRuntimeReceipt;
  readonly attempt: {
    readonly taskId: string;
    readonly taskVersion: string;
    readonly taskFamilyId: string;
    readonly representationId: string;
    readonly contextId: string;
    readonly selectionIds: readonly string[];
    readonly responseDigest: string | null;
    readonly explicitUncertainty: boolean;
    readonly boundedClaim: string;
  };
  readonly run: {
    readonly aggregateId: string;
    readonly correlationId: string;
    readonly actor: { readonly type: "learner"; readonly id: string };
    readonly authority: {
      readonly policyVersion: string;
      readonly consentGrantIds: readonly string[];
    };
    readonly packageIntegrityHash: string;
    readonly occurredAt: string;
    readonly recordedAt: string;
    readonly idempotencyNamespace: string;
    readonly eventIds: Adr001ProjectionEventIds;
    readonly supportFacts: ReadonlyArray<{
      readonly supportId: string;
      readonly protectedOperationOverlap: number;
    }>;
    readonly evidenceId: string;
    readonly proofNonceDigest: string | null;
    readonly nextReviewAt: string | null;
  };
  readonly integrity: {
    readonly packageIntegrityMatches: boolean;
    readonly proofAuthorityMatches: boolean;
    readonly contaminationReasonCodes: readonly string[];
    readonly constructChangingAccommodation: boolean;
  };
  readonly authoredUncertaintyExceptionReference: string | null;
}

export type Adr001ProjectorErrorCode =
  | "receipt_not_projectable"
  | "incomplete_projection_identity"
  | "support_identity_mismatch"
  | "duplicate_event_id"
  | "source_provenance_mismatch"
  | "event_seal_failed"
  | "event_chain_incoherent"
  | "correction_not_appendable";

export type Adr001ProjectionResult =
  | {
      readonly ok: true;
      readonly projectorVersion: typeof ADR001_PROJECTOR_VERSION;
      readonly events: readonly ForgeV2Event[];
      readonly evidenceDisposition: EvidenceDisposition;
    }
  | {
      readonly ok: false;
      readonly code: Adr001ProjectorErrorCode;
      readonly message: string;
    };

function reject(code: Adr001ProjectorErrorCode, message: string): Adr001ProjectionResult {
  return { ok: false, code, message };
}

function sourceBindingsFor(receipt: BoundedLocalWorldRuntimeReceipt) {
  return receipt.sourceBindings.map((binding) =>
    binding.status === "bound"
      ? {
          domain_source_ref: binding.domainSourceRef,
          source_item_id: binding.sourceItemId,
          source_package_id: binding.sourcePackageId,
          source_package_version: binding.sourcePackageVersion,
          source_snapshot_digest: binding.sourceSnapshotDigest,
          locator_ids: [...binding.locatorIds],
          claim_ids: [...binding.claimIds],
          rights_record_id: binding.rightsRecordId,
          review_decision_ids: [...binding.reviewDecisionIds],
          provenance_status: "bound" as const,
        }
      : {
          domain_source_ref: binding.domainSourceRef,
          source_item_id: binding.sourceItemId,
          source_package_id: null,
          source_package_version: null,
          source_snapshot_digest: null,
          locator_ids: [],
          claim_ids: [],
          rights_record_id: null,
          review_decision_ids: [],
          provenance_status: "legacy_metadata_only" as const,
        },
  );
}

function accessAccommodationsFor(receipt: BoundedLocalWorldRuntimeReceipt) {
  return receipt.accessAccommodations.map((accommodation) => ({
    accommodation_id: accommodation.accommodationId,
    stage_id: accommodation.stage,
    kind: accommodation.kind,
    modality: accommodation.modality,
    representation: accommodation.representation,
    construct_preservation: accommodation.constructPreservation,
    answer_changing: accommodation.answerChanging,
    policy_version: accommodation.policyVersion,
    nonvisual_alternative: accommodation.nonvisualAlternative,
  }));
}

function deriveDisposition(input: Adr001RuntimeProjectionInput): EvidenceDisposition {
  if (
    !input.integrity.packageIntegrityMatches
    || !input.integrity.proofAuthorityMatches
    || input.integrity.contaminationReasonCodes.length > 0
  ) {
    return "invalidated";
  }
  if (input.integrity.constructChangingAccommodation) return "not_evaluated";
  if (
    input.receipt.validator.outcome === "fail"
    && input.attempt.explicitUncertainty
    && input.authoredUncertaintyExceptionReference !== null
  ) {
    return "open_question";
  }
  return deriveDefaultEvidenceDisposition(input.receipt.validator.outcome);
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function allEventIds(input: Adr001RuntimeProjectionInput): readonly string[] {
  return [
    input.run.eventIds.started,
    ...input.run.eventIds.assistance,
    input.run.eventIds.proof,
    input.run.eventIds.evidence,
    input.run.eventIds.completed,
  ];
}

function idempotencyKey(input: Adr001RuntimeProjectionInput, role: string): string {
  return `${input.run.idempotencyNamespace}.${input.run.aggregateId}.${role}`;
}

function receiptIsProjectable(receipt: BoundedLocalWorldRuntimeReceipt): boolean {
  return receipt.kind === "forge.runtime.bounded-local-attempt"
    && receipt.authority.persistence === "not_persisted"
    && receipt.authority.isDurable === false
    && receipt.protocol.semanticTrace.includes("cold_transfer")
    && receipt.protocol.semanticTrace.includes("bounded_result");
}

/**
 * Converts one completed runtime attempt into a sealed ADR-001 v2 event chain.
 * It has no storage, network, UI, or ID-generation side effect.
 */
export async function projectAdr001RuntimeAttempt(
  input: Adr001RuntimeProjectionInput,
): Promise<Adr001ProjectionResult> {
  if (!receiptIsProjectable(input.receipt)) {
    return reject("receipt_not_projectable", "The receipt is not a completed bounded local runtime attempt.");
  }
  if (
    input.run.aggregateId.length === 0
    || input.run.correlationId.length === 0
    || input.run.actor.id.length === 0
    || input.run.authority.policyVersion.length === 0
    || input.run.packageIntegrityHash.length === 0
    || input.run.idempotencyNamespace.length === 0
    || input.run.evidenceId.length === 0
    || input.attempt.taskId.length === 0
    || input.attempt.taskVersion.length === 0
    || input.attempt.taskFamilyId.length === 0
    || input.attempt.representationId.length === 0
    || input.attempt.contextId.length === 0
    || input.attempt.boundedClaim.length === 0
  ) {
    return reject("incomplete_projection_identity", "The projector requires explicit aggregate, actor, authority, hash, and idempotency facts.");
  }
  if (
    input.run.eventIds.assistance.length !== input.receipt.cognitiveSupport.length
    || input.run.supportFacts.length !== input.receipt.cognitiveSupport.length
    || unique(input.run.supportFacts.map((support) => support.supportId)).length !== input.run.supportFacts.length
  ) {
    return reject("support_identity_mismatch", "Every consumed cognitive support needs one explicit event and support identity.");
  }
  const eventIds = allEventIds(input);
  if (unique(eventIds).length !== eventIds.length) {
    return reject("duplicate_event_id", "Projected events must have distinct caller-provided event IDs.");
  }
  const sourceBindings = sourceBindingsFor(input.receipt);
  const accessAccommodations = accessAccommodationsFor(input.receipt);
  const derivedSourceStatus = sourceBindings.every((binding) => binding.provenance_status === "bound")
    ? "bound"
    : "incomplete";
  if (derivedSourceStatus !== input.receipt.sourceProvenanceStatus) {
    return reject("source_provenance_mismatch", "Receipt source provenance does not match its named source bindings.");
  }

  const disposition = deriveDisposition(input);
  const remainsUntested = unique([
    ...input.receipt.remainsUntested,
    ...(derivedSourceStatus === "incomplete" ? ["source-provenance.incomplete"] : []),
    "durability.not-established",
  ]);
  const common = {
    schema_version: ADR001_FORGE_EVENT_SCHEMA_VERSION,
    aggregate: { type: "world_run" as const, id: input.run.aggregateId },
    actor: input.run.actor,
    authority: {
      policy_version: input.run.authority.policyVersion,
      consent_grant_ids: [...input.run.authority.consentGrantIds],
    },
    occurred_at: input.run.occurredAt,
    recorded_at: input.run.recordedAt,
    correlation_id: input.run.correlationId,
  };

  try {
    const events: ForgeEvent[] = [];
    const assistanceEventIds: string[] = [];
    const started = await sealForgeEvent({
      ...common,
      event_id: input.run.eventIds.started,
      event_type: "world_run.started",
      aggregate: { ...common.aggregate, version: 1 },
      causation_id: null,
      idempotency_key: idempotencyKey(input, "started"),
      payload: {
        world_id: input.receipt.world.id,
        world_version: input.receipt.world.version,
        content_version: input.receipt.world.contentVersion,
        package_integrity_hash: input.run.packageIntegrityHash,
        protocol_version: input.receipt.protocol.version,
        capability_id: input.receipt.world.capabilityId,
        proof_claim_id: input.receipt.world.proofClaimId,
        task_id: input.attempt.taskId,
        task_version: input.attempt.taskVersion,
        task_family_id: input.attempt.taskFamilyId,
        representation_id: input.attempt.representationId,
        context_id: input.attempt.contextId,
        bounded_claim: input.attempt.boundedClaim,
        validator_id: input.receipt.validator.id,
        validator_version: input.receipt.validator.version,
        proof_authority: input.receipt.authority.proofAuthority,
        source_bindings: sourceBindings,
        source_provenance_status: derivedSourceStatus,
      },
    });
    events.push(started);

    let causationId = started.event_id;
    for (const [index, support] of input.receipt.cognitiveSupport.entries()) {
      const supportFact = input.run.supportFacts[index];
      const assistance = await sealForgeEvent({
        ...common,
        event_id: input.run.eventIds.assistance[index],
        event_type: "assistance.recorded",
        aggregate: { ...common.aggregate, version: events.length + 1 },
        causation_id: causationId,
        idempotency_key: idempotencyKey(input, `assistance.${index + 1}`),
        payload: {
          support_id: supportFact.supportId,
          stage_id: support.stage,
          tier: support.tier,
          source: support.source,
          content_reference: support.actionId,
          policy_version: input.run.authority.policyVersion,
          protected_operation_overlap: supportFact.protectedOperationOverlap,
        },
      });
      events.push(assistance);
      assistanceEventIds.push(assistance.event_id);
      causationId = assistance.event_id;
    }

    const proof = await sealForgeEvent({
      ...common,
      event_id: input.run.eventIds.proof,
      event_type: "proof.submitted",
      aggregate: { ...common.aggregate, version: events.length + 1 },
      causation_id: causationId,
      idempotency_key: idempotencyKey(input, "proof"),
      payload: {
        task_id: input.attempt.taskId,
        task_version: input.attempt.taskVersion,
        task_family_id: input.attempt.taskFamilyId,
        representation_id: input.attempt.representationId,
        context_id: input.attempt.contextId,
        selection_ids: [...input.attempt.selectionIds],
        response_digest: input.attempt.responseDigest,
        explicit_uncertainty: input.attempt.explicitUncertainty,
        assistance_access: "removed",
        proof_nonce_digest: input.run.proofNonceDigest,
        access_accommodations: accessAccommodations,
      },
    });
    events.push(proof);

    const evidence = await sealForgeEvent({
      ...common,
      event_id: input.run.eventIds.evidence,
      event_type: "evidence.recorded",
      aggregate: { ...common.aggregate, version: events.length + 1 },
      causation_id: proof.event_id,
      idempotency_key: idempotencyKey(input, "evidence"),
      payload: {
        evidence_id: input.run.evidenceId,
        disposition,
        validator_outcome: input.receipt.validator.outcome,
        validator_id: input.receipt.validator.id,
        validator_version: input.receipt.validator.version,
        task_id: input.attempt.taskId,
        task_version: input.attempt.taskVersion,
        task_family_id: input.attempt.taskFamilyId,
        representation_id: input.attempt.representationId,
        context_id: input.attempt.contextId,
        criteria: [...input.receipt.validator.criteria],
        proof_authority: input.receipt.authority.proofAuthority,
        cognitive_support_event_ids: assistanceEventIds,
        access_accommodations: accessAccommodations,
        source_bindings: sourceBindings,
        source_provenance_status: derivedSourceStatus,
        response_digest: input.attempt.responseDigest,
        explicit_uncertainty: input.attempt.explicitUncertainty,
        authored_uncertainty_exception_reference: input.authoredUncertaintyExceptionReference,
        validity: {
          package_integrity_matches: input.integrity.packageIntegrityMatches,
          proof_authority_matches: input.integrity.proofAuthorityMatches,
          contamination_reason_codes: [...input.integrity.contaminationReasonCodes],
          construct_changing_accommodation: input.integrity.constructChangingAccommodation,
        },
        remains_untested: remainsUntested,
        bounded_claim: input.attempt.boundedClaim,
      },
    });
    events.push(evidence);

    const completed = await sealForgeEvent({
      ...common,
      event_id: input.run.eventIds.completed,
      event_type: "world_run.completed",
      aggregate: { ...common.aggregate, version: events.length + 1 },
      causation_id: evidence.event_id,
      idempotency_key: idempotencyKey(input, "completed"),
      payload: {
        disposition,
        evidence_id: input.run.evidenceId,
        next_review_at: input.run.nextReviewAt,
      },
    });
    events.push(completed);
    const replay = await replayForgeEvents(events, {
      eventSchemaVersion: ADR001_FORGE_EVENT_SCHEMA_VERSION,
    });
    if (!replay.ok) {
      return reject("event_chain_incoherent", `The supplied runtime facts violate ADR-001 event coherence: ${replay.message}`);
    }
    return {
      ok: true,
      projectorVersion: ADR001_PROJECTOR_VERSION,
      events: events as ForgeV2Event[],
      evidenceDisposition: disposition,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown sealing error";
    return reject("event_seal_failed", `The supplied runtime attempt facts do not form a valid sealed ADR-001 event chain: ${detail}`);
  }
}

export interface Adr001CorrectionInput {
  readonly completedEvents: readonly ForgeV2Event[];
  readonly actor: { readonly type: "validator" | "human"; readonly id: string };
  readonly authority: {
    readonly policyVersion: string;
    readonly consentGrantIds: readonly string[];
  };
  readonly occurredAt: string;
  readonly recordedAt: string;
  readonly eventId: string;
  readonly idempotencyKey: string;
  readonly correctionId: string;
  readonly reasonCode: string;
  readonly correctionReference: string;
  readonly replacementValidatorOutcome: ValidatorOutcome;
  readonly replacementDisposition: EvidenceDisposition;
  readonly replacementCriteria: readonly string[];
  readonly replacementExplicitUncertainty: boolean;
  readonly replacementAuthoredUncertaintyExceptionReference: string | null;
  readonly replacementValidity: {
    readonly packageIntegrityMatches: boolean;
    readonly proofAuthorityMatches: boolean;
    readonly contaminationReasonCodes: readonly string[];
    readonly constructChangingAccommodation: boolean;
  };
}

/** Appends a correction to an already completed v2 run without rewriting it. */
export async function projectAdr001Correction(input: Adr001CorrectionInput): Promise<Adr001ProjectionResult> {
  const replay = await replayForgeEvents(input.completedEvents, {
    eventSchemaVersion: ADR001_FORGE_EVENT_SCHEMA_VERSION,
  });
  const completed = input.completedEvents.at(-1);
  if (
    !replay.ok
    || !completed
    || completed.schema_version !== ADR001_FORGE_EVENT_SCHEMA_VERSION
    || completed.event_type !== "world_run.completed"
    || input.completedEvents.some(
      (event) =>
        event.schema_version !== ADR001_FORGE_EVENT_SCHEMA_VERSION
        || event.aggregate.type !== "world_run"
        || event.aggregate.id !== completed.aggregate.id
        || event.correlation_id !== completed.correlation_id,
    )
  ) {
    return reject("correction_not_appendable", "A correction requires one verified, completed, coherent ADR-001 run.");
  }
  const evidence = [...input.completedEvents].reverse().find((event) => event.event_type === "evidence.recorded");
  if (
    !completed
    || completed.schema_version !== ADR001_FORGE_EVENT_SCHEMA_VERSION
    || completed.event_type !== "world_run.completed"
    || !evidence
    || evidence.schema_version !== ADR001_FORGE_EVENT_SCHEMA_VERSION
    || evidence.event_type !== "evidence.recorded"
  ) {
    return reject("correction_not_appendable", "A correction requires one completed ADR-001 run with recorded evidence.");
  }
  try {
    const event = await sealForgeEvent({
      event_id: input.eventId,
      event_type: "world_run.corrected",
      schema_version: ADR001_FORGE_EVENT_SCHEMA_VERSION,
      aggregate: {
        type: "world_run",
        id: completed.aggregate.id,
        version: completed.aggregate.version + 1,
      },
      actor: input.actor,
      authority: {
        policy_version: input.authority.policyVersion,
        consent_grant_ids: [...input.authority.consentGrantIds],
      },
      occurred_at: input.occurredAt,
      recorded_at: input.recordedAt,
      correlation_id: completed.correlation_id,
      causation_id: completed.event_id,
      idempotency_key: input.idempotencyKey,
      payload: {
        supersedes_event_id: evidence.event_id,
        correction_id: input.correctionId,
        reason_code: input.reasonCode,
        correction_reference: input.correctionReference,
        replacement_disposition: input.replacementDisposition,
        replacement_validator_outcome: input.replacementValidatorOutcome,
        replacement_criteria: [...input.replacementCriteria],
        replacement_explicit_uncertainty: input.replacementExplicitUncertainty,
        replacement_authored_uncertainty_exception_reference:
          input.replacementAuthoredUncertaintyExceptionReference,
        replacement_validity: {
          package_integrity_matches: input.replacementValidity.packageIntegrityMatches,
          proof_authority_matches: input.replacementValidity.proofAuthorityMatches,
          contamination_reason_codes: [...input.replacementValidity.contaminationReasonCodes],
          construct_changing_accommodation: input.replacementValidity.constructChangingAccommodation,
        },
      },
    });
    return {
      ok: true,
      projectorVersion: ADR001_PROJECTOR_VERSION,
      events: [event as ForgeV2Event],
      evidenceDisposition: input.replacementDisposition,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown sealing error";
    return reject("event_seal_failed", `The supplied correction facts do not form a valid sealed ADR-001 correction: ${detail}`);
  }
}
