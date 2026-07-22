import type {
  DeterministicValidationResult,
  LearningWorldPack,
  WorldRuntimeAccessAccommodationKind,
  WorldRuntimeAccessModality,
  WorldRuntimeAccessRepresentation,
  WorldRuntimeActionKind,
  WorldRuntimeBinding,
  WorldRuntimeStage,
} from "../contracts";

export const WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION = "1.1.0" as const;
export const WORLD_RUNTIME_PROTOCOL_VERSION = "1.1.0" as const;
export const LOCAL_RUNTIME_RECEIPT_LIMITATION =
  "This is a client runtime receipt only. It is not server-enforced, durable, tamper-resistant, or an independent evidence record.";

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
  /** Reviewed policy that permitted this bounded support event. */
  readonly policyId: string;
  /** Null for authored support; never a credential or endpoint. */
  readonly providerId: string | null;
  /** Null for authored support; never raw prompt or output content. */
  readonly modelId: string | null;
  /** A bounded code only when an authored fallback replaced model support. */
  readonly fallbackReason: string | null;
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
  /** Local idempotency key only; not learner identity or authentication. */
  readonly attemptId: string;
  readonly recordedAt: string;
  /** Retained release-manifest digest; the compiler compares it with a fresh runtime digest. */
  readonly runtimeBindingDigest: string;
  /** Retained package digest; binds non-runtime released package facts as well. */
  readonly packageIntegrityHash: string;
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
    readonly taskCode: string;
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
    /** Exact canonical validator result code, not adapter-authored explanation. */
    readonly code: string;
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
  /** Provides only validator input; the shared runtime resolves the validator. */
  validatorInput(proof: DomainProof): unknown;
  /**
   * Compatibility-only adapter hook. Its value is never allowed to alter the
   * receipt: criteria and code come directly from the released validator.
   */
  validatorCriteria?(result: DeterministicValidationResult, proof: DomainProof): readonly string[];
  /**
   * Compatibility-only hook retained for older adapters. The shared runtime
   * never reads it: receipt limitations come only from pack.runtime.evidence.
   */
  remainsUntested?(proof: DomainProof): readonly string[];
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

export function deriveCanonicalValidatorOutcome(result: DeterministicValidationResult): ValidatorOutcome {
  if (result.inputStatus === "invalid") return "not_scored";
  return result.passed ? "pass" : "fail";
}

export function isWorldRuntimeAttemptId(value: unknown): value is string {
  // The evidence projector prefixes this with "proof.", so keep the local
  // attempt identity at <= 122 characters for the 128-character ledger ID.
  return typeof value === "string" && /^attempt\.[a-z0-9][a-z0-9._-]{2,113}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString() === value;
}

function isStringArray(value: unknown, maximum = 64, minimum = 0): value is readonly string[] {
  return Array.isArray(value) && value.length >= minimum && value.length <= maximum && value.every((item) => typeof item === "string" && item.length > 0 && item.length <= 240);
}

const runtimeStages = new Set<WorldRuntimeStage>([
  "encounter", "commit_model", "interpret_two_readings", "name_disagreement", "commit_test_prediction",
  "run_separating_experience", "governed_support", "reconstruct", "withdraw_instructional_ai",
  "cold_transfer", "bounded_result", "return_or_apply",
]);
const runtimeActionKinds = new Set<WorldRuntimeActionKind>([
  "learner_operation", "instructional_support", "model_action", "experience_replay",
  "access_accommodation", "return_proof", "reset",
]);
const cognitiveSupportProtectedStages = new Set<WorldRuntimeStage>([
  "withdraw_instructional_ai",
  "cold_transfer",
  "bounded_result",
  "return_or_apply",
]);
const requiredReceiptStages: readonly WorldRuntimeStage[] = [
  "encounter", "commit_model", "interpret_two_readings", "name_disagreement", "commit_test_prediction",
  "run_separating_experience", "reconstruct", "withdraw_instructional_ai", "cold_transfer", "bounded_result",
];
const governedSupportReceiptIndex = requiredReceiptStages.indexOf("reconstruct");
const receiptStagesWithGovernedSupport: readonly WorldRuntimeStage[] = [
  ...requiredReceiptStages.slice(0, governedSupportReceiptIndex),
  "governed_support",
  ...requiredReceiptStages.slice(governedSupportReceiptIndex),
];

function hasCompleteReceiptTrace(trace: readonly unknown[]): boolean {
  const equals = (expected: readonly WorldRuntimeStage[]) =>
    trace.length === expected.length && trace.every((stage, index) => stage === expected[index]);
  // A bounded attempt receipt is emitted at bounded_result and is immutable.
  // return_or_apply is therefore never part of this receipt. Governed support
  // is the only optional trace stage and has one canonical pre-proof slot.
  return equals(requiredReceiptStages) || equals(receiptStagesWithGovernedSupport);
}

function isBoundedMetadataId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
}

function isSemver(value: unknown): value is string {
  return typeof value === "string" && /^\d+\.\d+\.\d+$/.test(value);
}

function isSha256Digest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

export function isCanonicalSupportEvent(value: unknown): value is CanonicalSupportEvent {
  if (!isRecord(value) || !hasExactKeys(value, [
    "actionId", "stage", "source", "tier", "policyId", "providerId", "modelId", "fallbackReason",
  ])) return false;
  const metadataValid = value.providerId === null || isBoundedMetadataId(value.providerId);
  const modelValid = value.modelId === null || isBoundedMetadataId(value.modelId);
  const fallbackValid = value.fallbackReason === null || isBoundedMetadataId(value.fallbackReason);
  if (!isBoundedMetadataId(value.actionId) || !isBoundedMetadataId(value.policyId) || !metadataValid || !modelValid || !fallbackValid) return false;
  if (value.source === "authored" && (value.providerId !== null || value.modelId !== null)) return false;
  if (value.source === "model" && (value.providerId === null || value.modelId === null)) return false;
  if (value.source === "human" && (value.providerId !== null || value.modelId !== null)) return false;
  if (value.source !== "authored" && value.fallbackReason !== null) return false;
  if (typeof value.stage !== "string" ||
    cognitiveSupportProtectedStages.has(value.stage as WorldRuntimeStage)) return false;
  return (
    runtimeStages.has(value.stage as WorldRuntimeStage) &&
    (value.source === "authored" || value.source === "model" || value.source === "human") &&
    ["attention", "cue", "representation", "example", "repair", "solution"].includes(value.tier as string)
  );
}

function isAccessAccommodationEvent(value: unknown): value is AccessAccommodationEvent {
  if (!isRecord(value) || !hasExactKeys(value, [
    "accommodationId", "stage", "kind", "modality", "representation", "constructPreservation",
    "answerChanging", "policyVersion", "nonvisualAlternative",
  ])) return false;
  return isBoundedMetadataId(value.accommodationId) && typeof value.stage === "string" &&
    runtimeStages.has(value.stage as WorldRuntimeStage) &&
    ["text_alternative", "keyboard_operation", "motion_reduction"].includes(value.kind as string) &&
    ["textual", "keyboard", "motion"].includes(value.modality as string) &&
    ["text_description", "native_control", "reduced_motion"].includes(value.representation as string) &&
    value.constructPreservation === "preserves_construct" && value.answerChanging === false &&
    isSemver(value.policyVersion) && typeof value.nonvisualAlternative === "boolean";
}

function isRuntimeSourceBindingReceipt(value: unknown): value is RuntimeSourceBindingReceipt {
  if (!isRecord(value)) return false;
  const legacy = value.status === "legacy_metadata_only";
  const bound = value.status === "bound";
  if (!legacy && !bound) return false;
  const expected = [
    "domainSourceRef", "sourcePackageId", "sourcePackageVersion", "sourceItemId", "sourceSnapshotDigest",
    "locatorIds", "claimIds", "rightsRecordId", "reviewDecisionIds", "status",
  ];
  if (!hasExactKeys(value, expected) || !isBoundedMetadataId(value.domainSourceRef) || !isBoundedMetadataId(value.sourceItemId) ||
    !isStringArray(value.locatorIds) || !isStringArray(value.claimIds) || !isStringArray(value.reviewDecisionIds) ||
    !value.locatorIds.every(isBoundedMetadataId) || !value.claimIds.every(isBoundedMetadataId) ||
    !value.reviewDecisionIds.every(isBoundedMetadataId)) return false;
  if (legacy) {
    return value.sourcePackageId === null && value.sourcePackageVersion === null && value.sourceSnapshotDigest === null &&
      value.rightsRecordId === null && value.locatorIds.length === 0 && value.claimIds.length === 0 && value.reviewDecisionIds.length === 0;
  }
  return isBoundedMetadataId(value.sourcePackageId) && isSemver(value.sourcePackageVersion) &&
    isSha256Digest(value.sourceSnapshotDigest) && isBoundedMetadataId(value.rightsRecordId) &&
    value.locatorIds.length > 0 && value.claimIds.length > 0 && value.reviewDecisionIds.length > 0;
}

/**
 * Receipt projection is intentionally structural, not authenticity proof: a
 * local browser receipt is not tamper-resistant. This gate rejects malformed,
 * strengthened, and raw-shape direct calls before they reach the local ledger.
 */
export function isBoundedLocalWorldRuntimeReceipt(value: unknown): value is BoundedLocalWorldRuntimeReceipt {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schemaVersion", "kind", "attemptId", "recordedAt", "authority", "world", "protocol", "validator",
    "runtimeBindingDigest", "packageIntegrityHash", "cognitiveSupport", "accessAccommodations", "sourceBindings", "sourceProvenanceStatus", "remainsUntested", "responseDigest",
  ])) return false;
  if (value.schemaVersion !== WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION || value.kind !== "forge.runtime.bounded-local-attempt" ||
    !isWorldRuntimeAttemptId(value.attemptId) || !isIsoTimestamp(value.recordedAt) || value.responseDigest !== null ||
    !isSha256Digest(value.runtimeBindingDigest) || !isSha256Digest(value.packageIntegrityHash) ||
    !isRecord(value.authority) || !isRecord(value.world) || !isRecord(value.protocol) || !isRecord(value.validator)) return false;
  if (!hasExactKeys(value.authority, ["proofAuthority", "persistence", "isDurable", "limitation"]) ||
    value.authority.proofAuthority !== "honour_based" || value.authority.persistence !== "not_persisted" ||
    value.authority.isDurable !== false || value.authority.limitation !== LOCAL_RUNTIME_RECEIPT_LIMITATION) return false;
  if (!hasExactKeys(value.world, ["id", "version", "contentVersion", "capabilityId", "proofClaimId", "taskCode", "taskFamilyId"]) ||
    !isBoundedMetadataId(value.world.id) || !isSemver(value.world.version) || !isSemver(value.world.contentVersion) ||
    !isBoundedMetadataId(value.world.capabilityId) || !isBoundedMetadataId(value.world.proofClaimId) ||
    typeof value.world.taskCode !== "string" || !/^[a-z][a-z0-9_]{2,127}$/.test(value.world.taskCode) ||
    !isBoundedMetadataId(value.world.taskFamilyId)) return false;
  if (!hasExactKeys(value.protocol, ["version", "semanticTrace", "instructionalActionsRejectedDuringProof"]) ||
    value.protocol.version !== WORLD_RUNTIME_PROTOCOL_VERSION || !Array.isArray(value.protocol.semanticTrace) ||
    !value.protocol.semanticTrace.every((stage) => typeof stage === "string" && runtimeStages.has(stage as WorldRuntimeStage)) ||
    !hasCompleteReceiptTrace(value.protocol.semanticTrace) ||
    !Array.isArray(value.protocol.instructionalActionsRejectedDuringProof) ||
    !value.protocol.instructionalActionsRejectedDuringProof.every((kind) => typeof kind === "string" && runtimeActionKinds.has(kind as WorldRuntimeActionKind))) return false;
  if (!hasExactKeys(value.validator, ["id", "version", "code", "outcome", "disposition", "criteria"]) ||
    !isBoundedMetadataId(value.validator.id) || !isSemver(value.validator.version) || !isBoundedMetadataId(value.validator.code) ||
    !["pass", "fail", "inconclusive", "not_scored"].includes(value.validator.outcome as string) ||
    !["demonstrated", "not_demonstrated", "open_question", "not_evaluated", "invalidated"].includes(value.validator.disposition as string) ||
    !isStringArray(value.validator.criteria, 8) || new Set(value.validator.criteria).size !== value.validator.criteria.length || !value.validator.criteria.every((criterion) =>
      /^[A-Za-z0-9][A-Za-z0-9:._,/-]{0,159}$/.test(criterion)
    ) ||
    deriveDefaultEvidenceDisposition(value.validator.outcome as ValidatorOutcome) !== value.validator.disposition) return false;
  const sourceProvenanceStatus = Array.isArray(value.sourceBindings) &&
    value.sourceBindings.every((binding) => isRuntimeSourceBindingReceipt(binding) && binding.status === "bound")
      ? "bound"
      : "incomplete";
  return Array.isArray(value.cognitiveSupport) && value.cognitiveSupport.length <= 8 && value.cognitiveSupport.every(isCanonicalSupportEvent) &&
    Array.isArray(value.accessAccommodations) && value.accessAccommodations.length <= 16 && value.accessAccommodations.every(isAccessAccommodationEvent) &&
    Array.isArray(value.sourceBindings) && value.sourceBindings.length > 0 && value.sourceBindings.length <= 16 && value.sourceBindings.every(isRuntimeSourceBindingReceipt) &&
    value.sourceProvenanceStatus === sourceProvenanceStatus && isStringArray(value.remainsUntested, 16, 1);
}
