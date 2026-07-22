import type { WorldRuntimeActionKind, WorldRuntimeStage } from "../contracts";
import {
  deriveEvidenceDisposition,
  deriveValidatorOutcome,
  type AccessAccommodationEvent,
  type CanonicalSupportEvent,
  type RuntimeCommand,
  type RuntimePhase,
  type TrustedWorldRuntimeReceipt,
  type WorldRuntimeAdapter,
  WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION,
} from "./protocol";

export interface WorldRuntimeSession<State, DomainProof> {
  readonly state: State;
  readonly phase: RuntimePhase;
  readonly stagesObserved: readonly WorldRuntimeStage[];
  readonly cognitiveSupport: readonly CanonicalSupportEvent[];
  readonly accessAccommodations: readonly AccessAccommodationEvent[];
  readonly proofBlockedActions: readonly WorldRuntimeActionKind[];
  readonly receipt: TrustedWorldRuntimeReceipt | null;
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
      readonly reason: "proof_action_blocked" | "model_action_disallowed" | "domain_rejected";
      readonly domainReason?: string;
    };

function appendOnce<T>(items: readonly T[], item: T): readonly T[] {
  return items.includes(item) ? items : [...items, item];
}

function receiptFor<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  session: WorldRuntimeSession<State, DomainProof>,
  proof: DomainProof,
): TrustedWorldRuntimeReceipt {
  const runtime = adapter.pack.runtime;
  const validator = adapter.validateProof(proof);
  const outcome = deriveValidatorOutcome(validator);
  const validatorDefinition = adapter.pack.deterministicValidators.find((candidate) => candidate.id === runtime.proof.validatorId);
  if (!validatorDefinition) throw new Error(`Runtime validator ${runtime.proof.validatorId} is absent from its package.`);

  const sourceBindings = runtime.sourceBindings.map((binding) => ({
    domainSourceRef: binding.domainSourceRef,
    sourcePackageId: binding.sourcePackageId,
    sourcePackageVersion: binding.sourcePackageVersion,
    sourceItemId: binding.sourceItemId,
    sourceSnapshotDigest: binding.sourceSnapshotDigest,
    locatorIds: [...binding.locatorIds],
    claimIds: [...binding.claimIds],
    rightsRecordId: binding.rightsRecordId,
    reviewDecisionIds: [...binding.reviewDecisionIds],
    status: binding.provenanceStatus,
  }));
  const proofClaim = adapter.pack.proofClaims.find((claim) => claim.id === runtime.proof.proofClaimId);
  if (!proofClaim) throw new Error(`Runtime proof claim ${runtime.proof.proofClaimId} is absent from its package.`);

  return Object.freeze({
    schemaVersion: WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION,
    kind: "forge.runtime.bounded-attempt",
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
      stagesObserved: [...session.stagesObserved],
      instructionalActionsRejectedDuringProof: [...session.proofBlockedActions],
    },
    validator: {
      id: validatorDefinition.id,
      version: validatorDefinition.outputContractVersion,
      outcome,
      disposition: deriveEvidenceDisposition(outcome),
      criteria: [...validator.evidence],
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
    stagesObserved: [adapter.stage(state)],
    cognitiveSupport: [],
    accessAccommodations: [],
    proofBlockedActions: [],
    receipt: null,
    proof: null,
  });
}

function isBlockedDuringProof(kind: WorldRuntimeActionKind): boolean {
  return kind === "instructional_support" || kind === "model_action" || kind === "experience_replay";
}

export function dispatchWorldRuntimeCommand<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  session: WorldRuntimeSession<State, DomainProof>,
  command: RuntimeCommand<DomainEvent>,
): RuntimeDispatchResult<State, DomainProof> {
  const commandKind = command.kind === "domain"
    ? adapter.classify(command.event)
    : command.kind;
  const blockedDuringProof = session.phase === "proof" && isBlockedDuringProof(commandKind);
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
    return { accepted: true, session, effects: [] };
  }

  if (command.kind === "access_accommodation") {
    const accommodation = adapter.pack.runtime.access.accommodationIds.includes(command.accommodationId)
      ? command.accommodationId
      : adapter.pack.runtime.access.nonvisualAlternativeIds.includes(command.accommodationId)
        ? command.accommodationId
        : null;
    if (!accommodation) return { accepted: false, session, reason: "domain_rejected", domainReason: "unknown_access_accommodation" };
    const nextSession = Object.freeze({
      ...session,
      accessAccommodations: [
        ...session.accessAccommodations,
        { accommodationId: accommodation, stage: adapter.stage(session.state), constructPreserving: true as const },
      ],
    });
    return { accepted: true, session: nextSession, effects: ["access_recorded"] };
  }

  const transition = adapter.reduce(session.state, command.event);
  if (!transition.accepted) {
    return { accepted: false, session, reason: "domain_rejected", domainReason: transition.reason };
  }
  const phase = adapter.phase(transition.state);
  const stage = adapter.stage(transition.state);
  if (commandKind === "reset") {
    return { accepted: true, session: createWorldRuntimeSession(adapter), effects: [] };
  }
  const support = adapter.supportEvent(command.event, transition.state);
  const proof = adapter.proof(transition.state);
  let nextSession: WorldRuntimeSession<State, DomainProof> = Object.freeze({
    ...session,
    state: transition.state,
    phase,
    stagesObserved: support
      ? appendOnce(appendOnce(session.stagesObserved, stage), support.stage)
      : appendOnce(session.stagesObserved, stage),
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
