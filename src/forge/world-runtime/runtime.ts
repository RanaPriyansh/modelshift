import type { WorldRuntimeActionKind, WorldRuntimeStage } from "../contracts";
import {
  deriveDefaultEvidenceDisposition,
  type AccessAccommodationEvent,
  type BoundedLocalWorldRuntimeReceipt,
  type CanonicalSupportEvent,
  type RuntimeCommand,
  type RuntimePhase,
  type RuntimeSourceBindingReceipt,
  type WorldRuntimeAdapter,
  WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION,
} from "./protocol";

export interface WorldRuntimeSession<State, DomainProof> {
  readonly state: State;
  readonly phase: RuntimePhase;
  readonly semanticTrace: readonly WorldRuntimeStage[];
  readonly cognitiveSupport: readonly CanonicalSupportEvent[];
  readonly accessAccommodations: readonly AccessAccommodationEvent[];
  readonly proofBlockedActions: readonly WorldRuntimeActionKind[];
  readonly receipt: BoundedLocalWorldRuntimeReceipt | null;
  readonly proof: DomainProof | null;
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
    if (nextTrace.includes(stage)) continue;

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

function receiptFor<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  session: WorldRuntimeSession<State, DomainProof>,
  proof: DomainProof,
): BoundedLocalWorldRuntimeReceipt {
  const runtime = adapter.pack.runtime;
  const validator = adapter.projectValidator(proof);
  const validatorDefinition = adapter.pack.deterministicValidators.find((candidate) => candidate.id === runtime.proof.validatorId);
  if (!validatorDefinition) throw new Error(`Runtime validator ${runtime.proof.validatorId} is absent from its package.`);

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

  return Object.freeze({
    schemaVersion: WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION,
    kind: "forge.runtime.bounded-local-attempt",
    authority: {
      proofAuthority: runtime.evidence.proofAuthority,
      persistence: runtime.evidence.persistence,
      isDurable: false as const,
      limitation:
        "This is a client runtime receipt only. It is not server-enforced, durable, tamper-resistant, or an independent evidence record.",
    },
    world: {
      id: adapter.pack.manifest.id,
      version: adapter.pack.manifest.version,
      contentVersion: adapter.pack.release.contentVersion,
      capabilityId: proofClaim.capabilityId,
      proofClaimId: proofClaim.id,
      taskFamilyId: runtime.proof.taskFamilyId,
    },
    protocol: {
      version: runtime.protocolVersion,
      semanticTrace: [...session.semanticTrace],
      instructionalActionsRejectedDuringProof: [...session.proofBlockedActions],
    },
    validator: {
      id: validatorDefinition.id,
      version: validatorDefinition.outputContractVersion,
      outcome: validator.outcome,
      disposition: deriveDefaultEvidenceDisposition(validator.outcome),
      criteria: [...validator.criteria],
    },
    cognitiveSupport: [...session.cognitiveSupport],
    accessAccommodations: [...session.accessAccommodations],
    sourceBindings,
    sourceProvenanceStatus: sourceBindings.every((binding) => binding.status === "bound") ? "bound" : "incomplete",
    remainsUntested: [...adapter.remainsUntested(proof)],
    responseDigest: null,
  });
}

export function createWorldRuntimeSession<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
): WorldRuntimeSession<State, DomainProof> {
  const state = adapter.createInitialState();
  return Object.freeze({
    state,
    phase: adapter.phase(state),
    semanticTrace: [adapter.initialSemanticStage(state)],
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

  if (command.kind === "model_action") {
    return { accepted: false, session, reason: "model_action_disallowed" };
  }

  if (command.kind === "experience_replay") {
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
    const nextSession = Object.freeze({
      ...session,
      accessAccommodations: [
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
    return { accepted: true, session: nextSession, effects: ["access_recorded"] };
  }

  const transition = adapter.reduce(session.state, command.event);
  if (!transition.accepted) {
    return {
      accepted: false,
      session: Object.freeze({
        ...session,
        state: transition.state,
        phase: adapter.phase(transition.state),
        proof: adapter.proof(transition.state),
      }),
      reason: "domain_rejected",
      domainReason: transition.reason,
    };
  }
  const phase = adapter.phase(transition.state);
  if (commandKind === "reset") {
    return { accepted: true, session: createWorldRuntimeSession(adapter), effects: [] };
  }
  const semanticTrace = appendValidatedSemanticStages(
    session.semanticTrace,
    adapter.semanticStages(command.event, session.state, transition.state),
  );
  if (!semanticTrace) {
    return { accepted: false, session, reason: "runtime_trace_invalid" };
  }
  const support = adapter.supportEvent(command.event, transition.state);
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
    nextSession = Object.freeze({ ...nextSession, receipt: receiptFor(adapter, nextSession, proof) });
    effects.push("receipt_emitted");
  }
  return { accepted: true, session: nextSession, effects };
}
