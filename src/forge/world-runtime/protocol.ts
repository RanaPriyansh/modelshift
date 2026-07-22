import type {
  LearningWorldPack,
  WorldRuntimeAccessAccommodationKind,
  WorldRuntimeAccessModality,
  WorldRuntimeAccessRepresentation,
  WorldRuntimeActionKind,
  WorldRuntimeBinding,
  WorldRuntimeStage,
} from "../contracts";

export const WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION = "1.0.1" as const;

export type RuntimePhase = "learning" | "proof" | "bounded_result";

export type ValidatorOutcome = "pass" | "fail" | "inconclusive" | "not_scored";

export type EvidenceDisposition =
  | "demonstrated"
  | "not_demonstrated"
  | "open_question"
  | "not_evaluated"
  | "invalidated";

export interface CanonicalSupportEvent {
  readonly actionId: string;
  readonly stage: WorldRuntimeStage;
  readonly source: "authored" | "model" | "human";
  readonly tier: "attention" | "cue" | "representation" | "example" | "repair" | "solution";
}

export interface AccessAccommodationEvent {
  readonly accommodationId: string;
  readonly stage: WorldRuntimeStage;
  readonly kind: WorldRuntimeAccessAccommodationKind;
  readonly modality: WorldRuntimeAccessModality;
  readonly representation: WorldRuntimeAccessRepresentation;
  readonly constructPreservation: "preserves_construct";
  readonly answerChanging: false;
  readonly policyVersion: string;
  readonly nonvisualAlternative: boolean;
}

export type RuntimeSourceBindingReceipt =
  | {
      readonly domainSourceRef: string;
      readonly sourcePackageId: string;
      readonly sourcePackageVersion: string;
      readonly sourceItemId: string;
      readonly sourceSnapshotDigest: string;
      readonly locatorIds: readonly string[];
      readonly claimIds: readonly string[];
      readonly rightsRecordId: string;
      readonly reviewDecisionIds: readonly string[];
      readonly status: "bound";
    }
  | {
  readonly domainSourceRef: string;
  readonly sourcePackageId: string | null;
  readonly sourcePackageVersion: string | null;
  readonly sourceItemId: string;
  readonly sourceSnapshotDigest: string | null;
  readonly locatorIds: readonly string[];
  readonly claimIds: readonly string[];
  readonly rightsRecordId: string | null;
  readonly reviewDecisionIds: readonly string[];
      readonly status: "legacy_metadata_only";
    };

/**
 * This is a protocol receipt, not a durable or server-authoritative evidence
 * record. The authority and provenance gaps are values in the receipt so a UI
 * or later projection cannot silently strengthen its claim.
 */
export interface BoundedLocalWorldRuntimeReceipt {
  readonly schemaVersion: typeof WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION;
  readonly kind: "forge.runtime.bounded-local-attempt";
  readonly authority: {
    readonly proofAuthority: "honour_based";
    readonly persistence: "not_persisted";
    readonly isDurable: false;
    readonly limitation: string;
  };
  readonly world: {
    readonly id: string;
    readonly version: string;
    readonly contentVersion: string;
    readonly capabilityId: string;
    readonly proofClaimId: string;
    readonly taskFamilyId: string;
  };
  readonly protocol: {
    readonly version: string;
    readonly semanticTrace: readonly WorldRuntimeStage[];
    readonly instructionalActionsRejectedDuringProof: readonly WorldRuntimeActionKind[];
  };
  readonly validator: {
    readonly id: string;
    readonly version: string;
    readonly outcome: ValidatorOutcome;
    readonly disposition: EvidenceDisposition;
    readonly criteria: readonly string[];
  };
  readonly cognitiveSupport: readonly CanonicalSupportEvent[];
  readonly accessAccommodations: readonly AccessAccommodationEvent[];
  readonly sourceBindings: readonly RuntimeSourceBindingReceipt[];
  readonly sourceProvenanceStatus: "bound" | "incomplete";
  readonly remainsUntested: readonly string[];
  readonly responseDigest: null;
}

export interface CanonicalValidatorProjection {
  readonly outcome: ValidatorOutcome;
  readonly criteria: readonly string[];
}

export type RuntimeCommand<DomainEvent> =
  | { readonly kind: "domain"; readonly event: DomainEvent }
  | { readonly kind: "access_accommodation"; readonly accommodationId: string }
  | { readonly kind: "model_action"; readonly actionId: string }
  | { readonly kind: "experience_replay"; readonly actionId: string };

export interface DomainTransitionAccepted<State> {
  readonly accepted: true;
  readonly state: State;
}

export interface DomainTransitionRejected<State> {
  readonly accepted: false;
  readonly state: State;
  readonly reason: string;
}

export type DomainTransition<State> = DomainTransitionAccepted<State> | DomainTransitionRejected<State>;

export interface WorldRuntimeAdapter<State, DomainEvent, DomainProof> {
  readonly pack: LearningWorldPack & { readonly runtime: WorldRuntimeBinding };
  createInitialState(): State;
  reduce(state: State, event: DomainEvent): DomainTransition<State>;
  phase(state: State): RuntimePhase;
  initialSemanticStage(state: State): WorldRuntimeStage;
  semanticStages(
    event: DomainEvent,
    priorState: State,
    nextState: State,
  ): readonly WorldRuntimeStage[];
  stage(state: State): WorldRuntimeStage;
  classify(event: DomainEvent): WorldRuntimeActionKind;
  supportEvent(event: DomainEvent, state: State): CanonicalSupportEvent | null;
  proof(state: State): DomainProof | null;
  projectValidator(proof: DomainProof): CanonicalValidatorProjection;
  remainsUntested(proof: DomainProof): readonly string[];
}

/**
 * ADR-001's default derivation is intentionally owned by the shared runtime.
 * Domain adapters can report only their authorized outcome and criteria; they
 * cannot pair a failed result with a stronger evidence disposition.
 */
export function deriveDefaultEvidenceDisposition(outcome: ValidatorOutcome): Exclude<EvidenceDisposition, "invalidated"> {
  switch (outcome) {
    case "pass":
      return "demonstrated";
    case "fail":
      return "not_demonstrated";
    case "inconclusive":
      return "open_question";
    case "not_scored":
      return "not_evaluated";
  }
}
