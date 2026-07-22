import type { WorldRuntimeActionKind, WorldRuntimeBinding, WorldRuntimeStage } from "../contracts";
import {
  getCanonicalDeterministicValidator,
  getCanonicalDeterministicValidatorRegistration,
  validateCanonicalDeterministicResult,
} from "../deterministic-validators";
import { lintWorldRuntimePack } from "./linter";
import {
  deriveCanonicalValidatorOutcome,
  deriveDefaultEvidenceDisposition,
  type AccessAccommodationEvent,
  type BoundedLocalWorldRuntimeReceipt,
  type CanonicalSupportEvent,
  isCanonicalSupportEvent,
  isWorldRuntimeAttemptId,
  type RuntimeCommand,
  type RuntimePhase,
  type RuntimeSourceBindingReceipt,
  type WorldRuntimeAdapter,
  LOCAL_RUNTIME_RECEIPT_LIMITATION,
  WORLD_RUNTIME_PROTOCOL_VERSION,
  WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION,
} from "./protocol";
import { retainedRuntimeIdentityFor } from "./retained-runtime-binding";

export interface WorldRuntimeSession<State, DomainProof> {
  /** Local idempotency key only; never identity or authentication. */
  readonly attemptId: string;
  readonly state: State;
  readonly phase: RuntimePhase;
  readonly semanticTrace: readonly WorldRuntimeStage[];
  readonly cognitiveSupport: readonly CanonicalSupportEvent[];
  readonly accessAccommodations: readonly AccessAccommodationEvent[];
  readonly proofBlockedActions: readonly WorldRuntimeActionKind[];
  readonly receipt: BoundedLocalWorldRuntimeReceipt | null;
  readonly proof: DomainProof | null;
}

export type WorldRuntimeConfigurationErrorCode =
  | "pack_invalid"
  | "unsupported_protocol"
  | "receipt_schema_mismatch"
  | "unknown_canonical_validator"
  | "retained_runtime_binding_missing";

/**
 * A typed, fail-fast admission boundary. Runtime callers cannot defer a bad
 * pack/action/source/receipt version failure until a learner reaches proof.
 */
export class WorldRuntimeConfigurationError extends Error {
  readonly code: WorldRuntimeConfigurationErrorCode;

  constructor(code: WorldRuntimeConfigurationErrorCode, message: string) {
    super(message);
    this.name = "WorldRuntimeConfigurationError";
    this.code = code;
  }
}

export type RuntimeDispatchResult<State, DomainProof> =
  | {
      readonly accepted: true;
      readonly session: WorldRuntimeSession<State, DomainProof>;
      readonly effects: readonly ("support_recorded" | "access_recorded" | "proof_opened" | "receipt_emitted")[];
    }
  | {
      readonly accepted: false;
      readonly session: WorldRuntimeSession<State, DomainProof>;
      readonly reason:
        | "proof_action_blocked"
        | "model_action_disallowed"
        | "runtime_action_unavailable"
        | "unknown_runtime_action"
        | "access_not_construct_preserving"
        | "runtime_trace_invalid"
        | "runtime_support_mismatch"
        | "canonical_validator_malformed"
        | "canonical_validator_input_invalid"
        | "domain_rejected";
      readonly domainReason?: string;
    };

function appendOnce<T>(items: readonly T[], item: T): readonly T[] {
  return items.includes(item) ? items : [...items, item];
}

const REQUIRED_RECEIPT_SEMANTIC_STAGES = [
  "encounter",
  "commit_model",
  "interpret_two_readings",
  "name_disagreement",
  "commit_test_prediction",
  "run_separating_experience",
  "reconstruct",
  "withdraw_instructional_ai",
  "cold_transfer",
  "bounded_result",
] as const satisfies readonly WorldRuntimeStage[];

const OPTIONAL_SEMANTIC_STAGES = new Set<WorldRuntimeStage>([
  "governed_support",
  "return_or_apply",
]);

/**
 * The adapter maps domain transitions to semantic stages, but it cannot vouch
 * for its own trace. Keep the ordering policy here, before a transition is
 * accepted into the runtime session or can emit a receipt.
 */
function appendValidatedSemanticStages(
  trace: readonly WorldRuntimeStage[],
  stages: readonly WorldRuntimeStage[],
): readonly WorldRuntimeStage[] | null {
  let nextTrace = trace;
  let newCoreStages = 0;

  for (const stage of stages) {
    if (nextTrace.includes(stage)) {
      // A learner may consume multiple governed supports, but the semantic
      // trace records that protocol stage once. Every core and return/apply
      // duplicate is an adapter forgery rather than a harmless no-op.
      if (stage === "governed_support") continue;
      return null;
    }

    if (OPTIONAL_SEMANTIC_STAGES.has(stage)) {
      if (stage === "governed_support") {
        const hasRunSeparatingExperience = nextTrace.includes("run_separating_experience");
        const hasWithdrawnInstruction = nextTrace.includes("withdraw_instructional_ai");
        if (!hasRunSeparatingExperience || hasWithdrawnInstruction) return null;
      } else if (!REQUIRED_RECEIPT_SEMANTIC_STAGES.every((required) => nextTrace.includes(required))) {
        return null;
      }
      nextTrace = appendOnce(nextTrace, stage);
      continue;
    }

    const expected = REQUIRED_RECEIPT_SEMANTIC_STAGES.find((required) => !nextTrace.includes(required));
    if (stage !== expected) return null;

    // A display transition may legitimately cross withdrawal into cold
    // transfer, but a single adapter event cannot fabricate a whole journey.
    newCoreStages += 1;
    if (newCoreStages > 2) return null;
    nextTrace = appendOnce(nextTrace, stage);
  }

  return nextTrace;
}

function hasCompletedReceiptTrace(trace: readonly WorldRuntimeStage[]): boolean {
  const coreTrace = trace.filter((stage): stage is (typeof REQUIRED_RECEIPT_SEMANTIC_STAGES)[number] =>
    REQUIRED_RECEIPT_SEMANTIC_STAGES.includes(stage as (typeof REQUIRED_RECEIPT_SEMANTIC_STAGES)[number]),
  );
  return REQUIRED_RECEIPT_SEMANTIC_STAGES.every((stage, index) => coreTrace[index] === stage);
}

function blockedInstructionalSupportSession<State, DomainProof>(
  session: WorldRuntimeSession<State, DomainProof>,
): WorldRuntimeSession<State, DomainProof> {
  return Object.freeze({
    ...session,
    proofBlockedActions: appendOnce(session.proofBlockedActions, "instructional_support"),
  });
}

type ReceiptCreation =
  | { readonly ok: true; readonly receipt: BoundedLocalWorldRuntimeReceipt }
  | { readonly ok: false; readonly reason: "canonical_validator_malformed" | "canonical_validator_input_invalid" };

function receiptFor<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  session: WorldRuntimeSession<State, DomainProof>,
  proof: DomainProof,
): ReceiptCreation {
  const runtime = adapter.pack.runtime;
  const validatorDefinition = adapter.pack.deterministicValidators.find((candidate) => candidate.id === runtime.proof.validatorId);
  if (!validatorDefinition) throw new Error(`Runtime validator ${runtime.proof.validatorId} is absent from its package.`);
  const canonicalValidator = getCanonicalDeterministicValidator(runtime.proof.validatorId);
  if (!canonicalValidator) throw new WorldRuntimeConfigurationError(
    "unknown_canonical_validator",
    `Runtime validator ${runtime.proof.validatorId} is not in the canonical deterministic registry.`,
  );
  const validation = validateCanonicalDeterministicResult(canonicalValidator, adapter.validatorInput(proof));
  // A domain adapter that reaches a terminal state with invalid validator
  // input, or a malformed validator implementation/result, fails closed
  // before it can create a receipt or poison a retryable domain attempt.
  if (!validation) return { ok: false, reason: "canonical_validator_malformed" };
  if (validation.inputStatus === "invalid") {
    return { ok: false, reason: "canonical_validator_input_invalid" };
  }
  const outcome = deriveCanonicalValidatorOutcome(validation);
  // The receipt commits the exact released validator result. Adapter criteria
  // are deliberately not an authority surface for compiler evidence.
  const criteria = validation.evidence;
  const retainedIdentity = retainedRuntimeIdentityFor(adapter.pack);
  if (!retainedIdentity) throw new WorldRuntimeConfigurationError(
    "retained_runtime_binding_missing",
    `Released runtime ${adapter.pack.manifest.id} has no retained runtime binding digest.`,
  );

  const sourceBindings: RuntimeSourceBindingReceipt[] = runtime.sourceBindings.map((binding) => {
    if (binding.provenanceStatus === "bound") {
      return {
        domainSourceRef: binding.domainSourceRef,
        sourcePackageId: binding.sourcePackageId,
        sourcePackageVersion: binding.sourcePackageVersion,
        sourceItemId: binding.sourceItemId,
        sourceSnapshotDigest: binding.sourceSnapshotDigest,
        locatorIds: [...binding.locatorIds],
        claimIds: [...binding.claimIds],
        rightsRecordId: binding.rightsRecordId,
        reviewDecisionIds: [...binding.reviewDecisionIds],
        status: "bound",
      };
    }
    return {
      domainSourceRef: binding.domainSourceRef,
      sourcePackageId: null,
      sourcePackageVersion: null,
      sourceItemId: binding.sourceItemId,
      sourceSnapshotDigest: null,
      locatorIds: [],
      claimIds: [],
      rightsRecordId: null,
      reviewDecisionIds: [],
      status: "legacy_metadata_only",
    };
  });
  const proofClaim = adapter.pack.proofClaims.find((claim) => claim.id === runtime.proof.proofClaimId);
  if (!proofClaim) throw new Error(`Runtime proof claim ${runtime.proof.proofClaimId} is absent from its package.`);

  return {
    ok: true,
    receipt: Object.freeze({
    schemaVersion: WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION,
    kind: "forge.runtime.bounded-local-attempt",
    attemptId: session.attemptId,
    recordedAt: new Date().toISOString(),
    runtimeBindingDigest: retainedIdentity.runtimeBindingDigest,
    packageIntegrityHash: retainedIdentity.packageIntegrityHash,
    authority: {
      proofAuthority: runtime.evidence.proofAuthority,
      persistence: runtime.evidence.persistence,
      isDurable: false as const,
      limitation: LOCAL_RUNTIME_RECEIPT_LIMITATION,
    },
    world: {
      id: adapter.pack.manifest.id,
      version: adapter.pack.manifest.version,
      contentVersion: adapter.pack.release.contentVersion,
      capabilityId: proofClaim.capabilityId,
      proofClaimId: proofClaim.id,
      taskCode: runtime.proof.taskCode,
      taskFamilyId: runtime.proof.taskFamilyId,
    },
    protocol: {
      version: runtime.protocolVersion,
      semanticTrace: [...session.semanticTrace],
      instructionalActionsRejectedDuringProof: [...session.proofBlockedActions],
    },
    validator: {
      id: validatorDefinition.id,
      version: getCanonicalDeterministicValidatorRegistration(runtime.proof.validatorId)?.outputContractVersion
        ?? validatorDefinition.outputContractVersion,
      code: validation.code,
      outcome,
      disposition: deriveDefaultEvidenceDisposition(outcome),
      criteria,
    },
    cognitiveSupport: [...session.cognitiveSupport],
    accessAccommodations: [...session.accessAccommodations],
    sourceBindings,
    sourceProvenanceStatus: sourceBindings.every((binding) => binding.status === "bound") ? "bound" : "incomplete",
    remainsUntested: [...adapter.remainsUntested(proof)],
    responseDigest: null,
    }),
  };
}

function createRuntimeAttemptId(): string {
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replaceAll("-", "")
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `attempt.${uuid.toLowerCase()}`;
}

function assertWorldRuntimeConfiguration<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
): void {
  const lint = lintWorldRuntimePack(adapter.pack);
  if (!lint.ok) {
    throw new WorldRuntimeConfigurationError(
      "pack_invalid",
      `World runtime pack is invalid: ${lint.issues.map((issue) => issue.code).join(", ")}.`,
    );
  }
  const runtime = adapter.pack.runtime;
  if (runtime.protocolVersion !== WORLD_RUNTIME_PROTOCOL_VERSION) {
    throw new WorldRuntimeConfigurationError(
      "unsupported_protocol",
      `World runtime protocol ${runtime.protocolVersion} is unsupported; expected ${WORLD_RUNTIME_PROTOCOL_VERSION}.`,
    );
  }
  if (runtime.evidence.receiptSchemaVersion !== WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION) {
    throw new WorldRuntimeConfigurationError(
      "receipt_schema_mismatch",
      `World runtime receipt schema ${runtime.evidence.receiptSchemaVersion} must be ${WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION}.`,
    );
  }
  if (!retainedRuntimeIdentityFor(adapter.pack)) {
    throw new WorldRuntimeConfigurationError(
      "retained_runtime_binding_missing",
      `Released runtime ${adapter.pack.manifest.id} has no retained runtime binding digest.`,
    );
  }
  const canonicalRegistration = getCanonicalDeterministicValidatorRegistration(runtime.proof.validatorId);
  const declaredValidator = adapter.pack.deterministicValidators.find(
    (validator) => validator.id === runtime.proof.validatorId,
  );
  if (!canonicalRegistration || canonicalRegistration.validator.id !== runtime.proof.validatorId ||
    !declaredValidator ||
    declaredValidator.inputContractVersion !== canonicalRegistration.inputContractVersion ||
    declaredValidator.outputContractVersion !== canonicalRegistration.outputContractVersion) {
    throw new WorldRuntimeConfigurationError(
      "unknown_canonical_validator",
      `World runtime validator ${runtime.proof.validatorId} is not a canonical deterministic validator.`,
    );
  }
}

export function createWorldRuntimeSession<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  attemptId = createRuntimeAttemptId(),
): WorldRuntimeSession<State, DomainProof> {
  assertWorldRuntimeConfiguration(adapter);
  if (!isWorldRuntimeAttemptId(attemptId)) {
    throw new WorldRuntimeConfigurationError(
      "pack_invalid",
      "World runtime attempt IDs must use the local attempt.<opaque> format.",
    );
  }
  const state = adapter.createInitialState();
  return Object.freeze({
    attemptId,
    state,
    phase: adapter.phase(state),
    // The runtime, rather than a domain adapter, owns the invariant that
    // every attempt begins at encounter. Retain the adapter field for API
    // compatibility while refusing to let it seed a forged trace.
    semanticTrace: ["encounter"],
    cognitiveSupport: [],
    accessAccommodations: [],
    proofBlockedActions: [],
    receipt: null,
    proof: null,
  });
}

function isDeclaredRuntimeAction<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  kind: "model_action" | "experience_replay",
  actionId: string,
): boolean {
  return adapter.pack.runtime.actions.some((action) => action.id === actionId && action.kind === kind);
}

function canonicalSupportFromCatalog(
  runtime: WorldRuntimeBinding,
  support: CanonicalSupportEvent,
): CanonicalSupportEvent | null {
  const declared = runtime.support.catalog.find((entry) => entry.actionId === support.actionId);
  if (!declared) return null;
  const action = runtime.actions.find((candidate) => candidate.id === declared.actionId);
  if (!action || action.kind !== "instructional_support") return null;
  const expectedModelId = declared.modelIdentity.mode === "pinned"
    ? declared.modelIdentity.modelId
    : declared.source === "model"
      ? support.modelId
      : null;
  const canonical: CanonicalSupportEvent = {
    actionId: declared.actionId,
    stage: declared.stage,
    source: declared.source,
    tier: declared.tier,
    policyId: declared.policyId,
    providerId: declared.providerId,
    modelId: expectedModelId,
    fallbackReason: declared.fallbackReason,
  };
  return canonical.actionId === support.actionId
    && canonical.stage === support.stage
    && canonical.source === support.source
    && canonical.tier === support.tier
    && canonical.policyId === support.policyId
    && canonical.providerId === support.providerId
    && canonical.modelId === support.modelId
    && canonical.fallbackReason === support.fallbackReason
    ? canonical
    : null;
}

export function dispatchWorldRuntimeCommand<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  session: WorldRuntimeSession<State, DomainProof>,
  command: RuntimeCommand<DomainEvent>,
): RuntimeDispatchResult<State, DomainProof> {
  const commandKind = command.kind === "domain"
    ? adapter.classify(command.event)
    : command.kind;
  if (
    (command.kind === "model_action" || command.kind === "experience_replay") &&
    !isDeclaredRuntimeAction(adapter, command.kind, command.actionId)
  ) {
    return { accepted: false, session, reason: "unknown_runtime_action" };
  }

  const blockedDuringProof = session.phase === "proof" && adapter.pack.runtime.proof.blockedActionKinds.some(
    (kind) => kind === commandKind,
  );
  if (blockedDuringProof) {
    const blockedSession = Object.freeze({
      ...session,
      proofBlockedActions: appendOnce(session.proofBlockedActions, commandKind),
    });
    return { accepted: false, session: blockedSession, reason: "proof_action_blocked" };
  }

  if (commandKind === "model_action") {
    return { accepted: false, session, reason: "model_action_disallowed" };
  }

  // A wrapper replay has no domain event to reduce. A domain event classified
  // as replay continues to the adapter during learning; the proof lock above
  // still rejects it before reduction once the session enters proof.
  if (command.kind === "experience_replay") {
    return { accepted: false, session, reason: "runtime_action_unavailable" };
  }

  if (commandKind === "access_accommodation" && command.kind !== "access_accommodation") {
    return { accepted: false, session, reason: "runtime_action_unavailable" };
  }

  if (commandKind === "return_proof" && !adapter.pack.runtime.returnProof.enabled) {
    return { accepted: false, session, reason: "runtime_action_unavailable" };
  }

  if (command.kind === "access_accommodation") {
    const accommodation = adapter.pack.runtime.access.accommodations.find(
      (candidate) => candidate.id === command.accommodationId,
    );
    if (!accommodation) return { accepted: false, session, reason: "domain_rejected", domainReason: "unknown_access_accommodation" };
    if (accommodation.constructPreservation !== "preserves_construct" || accommodation.answerChanging) {
      return { accepted: false, session, reason: "access_not_construct_preserving" };
    }
    const duplicateAccess = session.accessAccommodations.some(
      (recorded) => recorded.accommodationId === accommodation.id,
    );
    const nextSession = Object.freeze({
      ...session,
      // ADR-001 models one selected access alternative as one factual event
      // reference. Re-selecting the same alternative may remain a harmless UI
      // operation, but it must not create a duplicate receipt fact that no v2
      // event chain can faithfully represent.
      accessAccommodations: duplicateAccess
        ? session.accessAccommodations
        : [
            ...session.accessAccommodations,
            {
              accommodationId: accommodation.id,
              stage: adapter.stage(session.state),
              kind: accommodation.kind,
              modality: accommodation.modality,
              representation: accommodation.representation,
              constructPreservation: accommodation.constructPreservation,
              answerChanging: accommodation.answerChanging,
              policyVersion: accommodation.policyVersion,
              nonvisualAlternative: accommodation.nonvisualAlternative,
            } satisfies AccessAccommodationEvent,
          ],
    });
    return { accepted: true, session: nextSession, effects: duplicateAccess ? [] : ["access_recorded"] };
  }

  // The action wrappers above are terminal. Keep this explicit narrowing so
  // domain reduction is impossible for every non-domain command shape.
  if (command.kind !== "domain") {
    return { accepted: false, session, reason: "runtime_action_unavailable" };
  }

  const transition = adapter.reduce(session.state, command.event);
  if (!transition.accepted) {
    const rejectedPhase = adapter.phase(transition.state);
    const rejectedProof = adapter.proof(transition.state);
    const retainsOnlyRetryState = rejectedPhase === session.phase && Object.is(rejectedProof, session.proof);
    return {
      accepted: false,
      session: retainsOnlyRetryState
        ? Object.freeze({ ...session, state: transition.state })
        : session,
      reason: "domain_rejected",
      domainReason: transition.reason,
    };
  }
  const phase = adapter.phase(transition.state);
  if (commandKind === "reset") {
    return { accepted: true, session: createWorldRuntimeSession(adapter), effects: [] };
  }
  const reportedSupport = adapter.supportEvent(command.event, transition.state);
  const isInstructionalSupport = commandKind === "instructional_support";
  const supportTouchesProtectedPhase = session.phase !== "learning" || phase !== "learning";
  if (isInstructionalSupport && supportTouchesProtectedPhase) {
    return {
      accepted: false,
      session: blockedInstructionalSupportSession(session),
      reason: "proof_action_blocked",
    };
  }
  if ((reportedSupport !== null && !isCanonicalSupportEvent(reportedSupport)) || (reportedSupport !== null) !== isInstructionalSupport) {
    if (reportedSupport !== null && supportTouchesProtectedPhase) {
      return {
        accepted: false,
        session: blockedInstructionalSupportSession(session),
        reason: "proof_action_blocked",
      };
    }
    return { accepted: false, session, reason: "runtime_support_mismatch" };
  }
  const support = reportedSupport === null ? null : canonicalSupportFromCatalog(adapter.pack.runtime, reportedSupport);
  if (reportedSupport !== null && support === null) {
    return { accepted: false, session, reason: "runtime_support_mismatch" };
  }
  if (support) {
    const declared = adapter.pack.runtime.support.catalog.find((entry) => entry.actionId === support.actionId);
    const priorOccurrences = session.cognitiveSupport.filter((recorded) => recorded.actionId === support.actionId).length;
    if (!declared || priorOccurrences >= declared.maxOccurrences) {
      return { accepted: false, session, reason: "runtime_support_mismatch" };
    }
  }
  const semanticTrace = appendValidatedSemanticStages(
    session.semanticTrace,
    adapter.semanticStages(command.event, session.state, transition.state),
  );
  if (!semanticTrace) {
    return { accepted: false, session, reason: "runtime_trace_invalid" };
  }
  const proof = adapter.proof(transition.state);
  if (proof && !session.receipt && (phase !== "bounded_result" || !hasCompletedReceiptTrace(semanticTrace))) {
    return { accepted: false, session, reason: "runtime_trace_invalid" };
  }
  let nextSession: WorldRuntimeSession<State, DomainProof> = Object.freeze({
    ...session,
    state: transition.state,
    phase,
    semanticTrace,
    cognitiveSupport: support ? [...session.cognitiveSupport, support] : session.cognitiveSupport,
    proof,
  });
  const effects: Array<"support_recorded" | "access_recorded" | "proof_opened" | "receipt_emitted"> = [];
  if (support) effects.push("support_recorded");
  if (session.phase !== "proof" && phase === "proof") effects.push("proof_opened");
  if (proof && !session.receipt) {
    const receiptCreation = receiptFor(adapter, nextSession, proof);
    if (!receiptCreation.ok) {
      return { accepted: false, session, reason: receiptCreation.reason };
    }
    nextSession = Object.freeze({ ...nextSession, receipt: receiptCreation.receipt });
    effects.push("receipt_emitted");
  }
  return { accepted: true, session: nextSession, effects };
}
