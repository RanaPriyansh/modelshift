import { getCanonicalDeterministicValidatorRegistration } from "../../forge/deterministic-validators";
import type { WorldRuntimeBinding } from "../../forge/contracts";
import {
  isBoundedLocalWorldRuntimeReceipt,
  type BoundedLocalWorldRuntimeReceipt,
  type CanonicalSupportEvent,
  type RuntimeSourceBindingReceipt,
  WORLD_RUNTIME_PROTOCOL_VERSION,
  WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION,
} from "../../forge/world-runtime/protocol";
import { verifyPublicWorldRuntimeReceiptAttestation } from "../../forge/world-runtime/runtime-core.public";
import { PUBLIC_WORLD_PACKS } from "../../forge/worlds";
import { retainedRuntimeIdentityFor } from "../../forge/world-runtime/retained-runtime-binding";
import { createLocalStorageEvidenceLedgerAdapter } from "./local-storage";
import type { AssistanceProvenance, EvidenceLedger } from "./schema";
import {
  createEvidenceLedgerStore,
  type EvidenceLedgerMutationResult,
  type EvidenceLedgerReadStatus,
} from "./store";

export type RecordWorldRuntimeReceiptResult =
  | EvidenceLedgerMutationResult
  | {
      ok: false;
      ledger: EvidenceLedger;
      reason: "invalid_runtime_receipt";
      readStatus: EvidenceLedgerReadStatus;
    };

function boundedOutcome(receipt: BoundedLocalWorldRuntimeReceipt): "proved" | "not_proved" | "open_question" {
  if (receipt.cognitiveSupport.some((support) =>
    support.source === "model" || support.providerId !== null || support.modelId !== null || support.tier === "solution",
  )) {
    return "open_question";
  }
  switch (receipt.validator.disposition) {
    case "demonstrated":
      return "proved";
    case "not_demonstrated":
      return "not_proved";
    case "open_question":
    case "not_evaluated":
    case "invalidated":
      return "open_question";
  }
}

export function projectRuntimeSupportAssistanceKind(
  event: CanonicalSupportEvent,
): AssistanceProvenance["kind"] {
  if (event.source === "model") return "model_interpretation";
  if (event.source === "human") return "human_guidance";
  if (event.tier === "representation") return "authored_representation";
  if (event.tier === "attention" || event.tier === "cue") return "authored_hint";
  if (event.tier === "example") return "authored_contrast";
  return "authored_principle";
}

function projectAssistance(receipt: BoundedLocalWorldRuntimeReceipt): AssistanceProvenance[] {
  const seen = new Set<string>();
  const assistance: AssistanceProvenance[] = [];
  for (const event of receipt.cognitiveSupport) {
    const kind = projectRuntimeSupportAssistanceKind(event);
    const key = `${kind}:${event.actionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    assistance.push({ kind, sourceId: event.actionId });
  }
  return assistance;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameSourceBinding(
  received: RuntimeSourceBindingReceipt,
  expected: RuntimeSourceBindingReceipt,
): boolean {
  return received.domainSourceRef === expected.domainSourceRef &&
    received.sourcePackageId === expected.sourcePackageId &&
    received.sourcePackageVersion === expected.sourcePackageVersion &&
    received.sourceItemId === expected.sourceItemId &&
    received.sourceSnapshotDigest === expected.sourceSnapshotDigest &&
    sameStrings(received.locatorIds, expected.locatorIds) &&
    sameStrings(received.claimIds, expected.claimIds) &&
    received.rightsRecordId === expected.rightsRecordId &&
    sameStrings(received.reviewDecisionIds, expected.reviewDecisionIds) &&
    received.status === expected.status;
}

/**
 * Structural receipt validation cannot establish authenticity. This additional
 * client-safe gate only binds a receipt to a released built-in pack's exact
 * runtime identity so an unknown or mixed World tuple is never projected.
 */
function hasReleasedBuiltInRuntimeIdentity(receipt: BoundedLocalWorldRuntimeReceipt): boolean {
  const pack = PUBLIC_WORLD_PACKS.find((candidate) => candidate.manifest.id === receipt.world.id);
  if (!pack || pack.release.status !== "released" || !("runtime" in pack)) return false;
  const runtime = pack.runtime as WorldRuntimeBinding;

  const capability = pack.capabilities.find((candidate) => candidate.id === receipt.world.capabilityId);
  const proofClaim = pack.proofClaims.find((candidate) => candidate.id === receipt.world.proofClaimId);
  const validator = pack.deterministicValidators.find((candidate) => candidate.id === receipt.validator.id);
  const canonicalValidator = getCanonicalDeterministicValidatorRegistration(receipt.validator.id);
  if (!capability || !proofClaim || !validator || !canonicalValidator) return false;

  const expectedSourceBindings = runtime.sourceBindings.map((binding): RuntimeSourceBindingReceipt => {
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
  const expectedProvenanceStatus = expectedSourceBindings.every((binding) => binding.status === "bound")
    ? "bound"
    : "incomplete";
  const supportMatchesCatalog = (support: CanonicalSupportEvent): boolean => {
    if (!runtime.support.recordsCognitiveSupport) return false;
    const entry = runtime.support.catalog.find((candidate) => candidate.actionId === support.actionId);
    const action = runtime.actions.find((candidate) => candidate.id === support.actionId);
    if (!entry || action?.kind !== "instructional_support") return false;
    const expectedModelId = entry.modelIdentity.mode === "pinned"
      ? entry.modelIdentity.modelId
      : entry.source === "model"
        ? support.modelId
        : null;
    return support.stage === entry.stage
      && support.source === entry.source
      && support.tier === entry.tier
      && support.policyId === entry.policyId
      && support.providerId === entry.providerId
      && support.modelId === expectedModelId
      && support.fallbackReason === entry.fallbackReason;
  };

  const retainedIdentity = retainedRuntimeIdentityFor(pack);

  return retainedIdentity !== null && receipt.schemaVersion === WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION &&
    receipt.protocol.version === WORLD_RUNTIME_PROTOCOL_VERSION &&
    pack.manifest.version === receipt.world.version &&
    pack.release.contentVersion === receipt.world.contentVersion &&
    (pack.manifest.capabilityIds as readonly string[]).includes(capability.id) &&
    proofClaim.capabilityId === capability.id &&
    (capability.proofClaimIds as readonly string[]).includes(proofClaim.id) &&
    runtime.proof.proofClaimId === proofClaim.id &&
    runtime.proof.taskCode === receipt.world.taskCode &&
    runtime.proof.taskFamilyId === receipt.world.taskFamilyId &&
    pack.manifest.deterministicValidatorId === validator.id &&
    validator.capabilityId === capability.id &&
    runtime.proof.validatorId === validator.id &&
    receipt.runtimeBindingDigest === retainedIdentity.runtimeBindingDigest &&
    receipt.packageIntegrityHash === retainedIdentity.packageIntegrityHash &&
    receipt.validator.version === canonicalValidator.outputContractVersion &&
    validator.outputContractVersion === canonicalValidator.outputContractVersion &&
    runtime.protocolVersion === WORLD_RUNTIME_PROTOCOL_VERSION &&
    runtime.evidence.receiptSchemaVersion === WORLD_RUNTIME_RECEIPT_SCHEMA_VERSION &&
    receipt.sourceBindings.length === expectedSourceBindings.length &&
    receipt.sourceBindings.every((binding, index) => sameSourceBinding(binding, expectedSourceBindings[index]!)) &&
    receipt.sourceProvenanceStatus === expectedProvenanceStatus &&
    sameStrings(receipt.remainsUntested, runtime.evidence.remainsUntested) &&
    receipt.cognitiveSupport.every(supportMatchesCatalog);
}

/**
 * The compatibility ledger accepts only the exact deeply frozen object emitted
 * and privately attested by the public runtime core. It has no access to
 * validator input, reducer state, raw response, return schedule, or an adapter
 * chosen score. `attemptId` makes duplicate rerenders deterministically reject
 * within the same local ledger; it is not durable idempotency.
 */
export function recordWorldRuntimeReceipt(receipt: BoundedLocalWorldRuntimeReceipt): RecordWorldRuntimeReceiptResult {
  const store = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter());
  if (!isBoundedLocalWorldRuntimeReceipt(receipt)
    || !hasReleasedBuiltInRuntimeIdentity(receipt)
    || !verifyPublicWorldRuntimeReceiptAttestation(receipt)) {
    const current = store.read();
    return {
      ok: false,
      ledger: current.ledger,
      reason: "invalid_runtime_receipt",
      readStatus: current.status,
    };
  }

  return store.append({
    id: `proof.${receipt.attemptId}`,
    capabilityId: receipt.world.capabilityId,
    recordedAt: receipt.recordedAt,
    source: { kind: "authored_activity", refId: receipt.world.id },
    proof: {
      conditionId: receipt.world.proofClaimId,
      mode: "independent_transfer",
      assistanceAccess: "removed",
      outcome: boundedOutcome(receipt),
    },
    assistance: projectAssistance(receipt),
    sharing: { status: "private", updatedAt: receipt.recordedAt },
    returnSchedule: null,
  });
}
