import {
  projectAdr001RuntimeAttempt,
} from "../adr001-projector";
import { canonicalJson, sha256Digest, type ForgeV2Event } from "../events";
import {
  ForgeEventJournal,
  type Adr001WorldRunProjection,
  type ForgeAggregateProjection,
} from "../event-journal";
import {
  getCanonicalDeterministicValidatorRegistration,
  validateCanonicalDeterministicResult,
} from "../deterministic-validators";
import { BUILT_IN_WORLD_PACKS } from "../worlds";
import type { LearningWorldPack, WorldRuntimeBinding } from "../contracts";
import {
  deriveCanonicalValidatorOutcome,
  deriveDefaultEvidenceDisposition,
  isBoundedLocalWorldRuntimeReceipt,
  type BoundedLocalWorldRuntimeReceipt,
  type RuntimeSourceBindingReceipt,
} from "./protocol";
import { lintWorldRuntimePack } from "./linter";

/**
 * The compiler is deliberately an in-memory, client-safe boundary. It turns a
 * receipt plus the transient canonical validator input into an ADR-001 v2
 * chain; it does not authenticate a learner, persist an event, or make the
 * local receipt independent evidence.
 */
export const WORLD_RUNTIME_ADR001_COMPILER_VERSION = "1.0.0" as const;

export interface ReleasedWorldRuntimeIdentity {
  readonly worldId: string;
  readonly worldVersion: string;
  readonly contentVersion: string;
  readonly runtimeBindingDigest: string;
  readonly packageIntegrityHash: string;
}

export interface WorldRuntimeAdr001CompilerInput {
  /** A completed bounded-local runtime receipt. Unknown is intentional at the admission boundary. */
  readonly receipt: unknown;
  /**
   * Transient input for the named canonical validator. It is never placed in
   * an event: some World validators legitimately receive learner prose.
   */
  readonly validatorInput: unknown;
}

export type WorldRuntimeAdr001CompilerErrorCode =
  | "malformed_receipt"
  | "unreleased_world"
  | "runtime_identity_mismatch"
  | "validator_identity_mismatch"
  | "validator_input_rejected"
  | "validator_outcome_mismatch"
  | "source_identity_mismatch"
  | "support_identity_mismatch"
  | "access_identity_mismatch"
  | "projection_rejected"
  | "journal_replay_rejected";

export type WorldRuntimeAdr001CompileResult =
  | {
      readonly ok: true;
      readonly compilerVersion: typeof WORLD_RUNTIME_ADR001_COMPILER_VERSION;
      readonly identity: ReleasedWorldRuntimeIdentity;
      readonly events: readonly ForgeV2Event[];
      readonly projection: Adr001WorldRunProjection;
    }
  | {
      readonly ok: false;
      readonly code: WorldRuntimeAdr001CompilerErrorCode;
      readonly message: string;
    };

function reject(
  code: WorldRuntimeAdr001CompilerErrorCode,
  message: string,
): WorldRuntimeAdr001CompileResult {
  return { ok: false, code, message };
}

function sameCanonicalJson(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function receiptSourceBindings(runtime: WorldRuntimeBinding): readonly RuntimeSourceBindingReceipt[] {
  return runtime.sourceBindings.map((binding) =>
    binding.provenanceStatus === "bound"
      ? {
          domainSourceRef: binding.domainSourceRef,
          sourcePackageId: binding.sourcePackageId,
          sourcePackageVersion: binding.sourcePackageVersion,
          sourceItemId: binding.sourceItemId,
          sourceSnapshotDigest: binding.sourceSnapshotDigest,
          locatorIds: [...binding.locatorIds],
          claimIds: [...binding.claimIds],
          rightsRecordId: binding.rightsRecordId,
          reviewDecisionIds: [...binding.reviewDecisionIds],
          status: "bound" as const,
        }
      : {
          domainSourceRef: binding.domainSourceRef,
          sourcePackageId: null,
          sourcePackageVersion: null,
          sourceItemId: binding.sourceItemId,
          sourceSnapshotDigest: null,
          locatorIds: [],
          claimIds: [],
          rightsRecordId: null,
          reviewDecisionIds: [],
          status: "legacy_metadata_only" as const,
        },
  );
}

function releasedRuntimePack(worldId: string): (LearningWorldPack & { readonly runtime: WorldRuntimeBinding }) | null {
  const candidate = BUILT_IN_WORLD_PACKS.find((pack) => pack.manifest.id === worldId);
  if (!candidate || candidate.release.status !== "released" || !candidate.runtime) return null;
  const lint = lintWorldRuntimePack(candidate);
  // The runtime linter has already checked the exact candidate. Keep this
  // narrow cast at the read-only package boundary because Zod's inferred
  // optional-runtime intersection is not assignable to the authored pack's
  // required-runtime intersection.
  return lint.ok ? lint.pack as unknown as LearningWorldPack & { readonly runtime: WorldRuntimeBinding } : null;
}

function proofClaimFor(pack: LearningWorldPack & { readonly runtime: WorldRuntimeBinding }) {
  return pack.proofClaims.find((claim) => claim.id === pack.runtime.proof.proofClaimId) ?? null;
}

function declaredAccessMatches(
  receipt: BoundedLocalWorldRuntimeReceipt,
  runtime: WorldRuntimeBinding,
): boolean {
  const seen = new Set<string>();
  return receipt.accessAccommodations.every((access) => {
    if (seen.has(access.accommodationId)) return false;
    seen.add(access.accommodationId);
    const declared = runtime.access.accommodations.find((candidate) => candidate.id === access.accommodationId);
    return declared !== undefined
      && declared.kind === access.kind
      && declared.modality === access.modality
      && declared.representation === access.representation
      && declared.constructPreservation === access.constructPreservation
      && declared.answerChanging === access.answerChanging
      && declared.policyVersion === access.policyVersion
      && declared.nonvisualAlternative === access.nonvisualAlternative;
  });
}

function declaredSupportMatches(
  receipt: BoundedLocalWorldRuntimeReceipt,
  runtime: WorldRuntimeBinding,
): boolean {
  if (!runtime.support.recordsCognitiveSupport && receipt.cognitiveSupport.length > 0) return false;
  return receipt.cognitiveSupport.every((support) =>
    runtime.actions.some(
      (action) => action.id === support.actionId && action.kind === "instructional_support",
    ) && support.policyId === runtime.support.policyId,
  );
}

function uuidFromDigest(digest: string): string {
  const characters = digest.slice("sha256:".length, "sha256:".length + 32).split("");
  // UUID syntax is an event-envelope requirement. The remaining digest bytes
  // remain deterministic; version/variant bits are only a wire encoding.
  characters[12] = "4";
  const variant = Number.parseInt(characters[16] ?? "0", 16);
  characters[16] = (Number.isNaN(variant) ? 8 : (variant & 0x3) | 0x8).toString(16);
  const hex = characters.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function stableId(seed: unknown, prefix: string, length = 24): Promise<string> {
  const digest = await sha256Digest(canonicalJson(seed));
  return `${prefix}.${digest.slice("sha256:".length, "sha256:".length + length)}`;
}

async function eventId(seed: unknown, role: string): Promise<string> {
  return uuidFromDigest(await sha256Digest(canonicalJson({ seed, role })));
}

/**
 * Produces identities from the compiled released package, not from caller
 * fields. The runtime digest has the same canonical JSON semantics as the
 * retained-content release manifest, without importing server-only tooling.
 */
export async function releasedWorldRuntimeIdentity(
  pack: LearningWorldPack & { readonly runtime: WorldRuntimeBinding },
): Promise<ReleasedWorldRuntimeIdentity> {
  const [runtimeBindingDigest, packageIntegrityHash] = await Promise.all([
    sha256Digest(canonicalJson(pack.runtime)),
    sha256Digest(canonicalJson(pack)),
  ]);
  return {
    worldId: pack.manifest.id,
    worldVersion: pack.manifest.version,
    contentVersion: pack.release.contentVersion,
    runtimeBindingDigest,
    packageIntegrityHash,
  };
}

function taskIdFor(
  receipt: BoundedLocalWorldRuntimeReceipt,
  canonicalCriteria: readonly string[],
): string {
  // Where a canonical validator has a task identifier, retain it. Older
  // authored validators only name their released task family; that immutable
  // family is the narrowest truthful task identifier available to this event
  // compiler and must not be replaced with an adapter-invented task label.
  const taskId = canonicalCriteria.find((criterion) => criterion.startsWith("task:"))?.slice("task:".length);
  // Domain validators may use an internal task code such as
  // `cargo_pod_force_graph`. ADR-001 envelope identifiers deliberately use a
  // narrower namespace grammar, so retain that code only when it can be
  // represented exactly; otherwise the released task-family identifier is the
  // truthful stable identity.
  return taskId && /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(taskId)
    ? taskId
    : receipt.world.taskFamilyId;
}

function isAdr001WorldRunProjection(
  projection: ForgeAggregateProjection,
): projection is Adr001WorldRunProjection {
  return "schema_version" in projection && projection.schema_version === 2;
}

/**
 * Compiles one verified-shape local receipt. It is intentionally not a
 * persistence API: a local receipt remains honour-based and no proof nonce is
 * emitted until a future server-owned attempt exists.
 */
export async function compileWorldRuntimeReceiptToAdr001(
  input: WorldRuntimeAdr001CompilerInput,
): Promise<WorldRuntimeAdr001CompileResult> {
  if (!isBoundedLocalWorldRuntimeReceipt(input.receipt)) {
    return reject("malformed_receipt", "The compiler accepts only an exact bounded-local runtime receipt shape.");
  }
  const receipt = input.receipt;
  const pack = releasedRuntimePack(receipt.world.id);
  if (!pack) {
    return reject("unreleased_world", "The receipt World is not an exact released built-in runtime package.");
  }
  const runtime = pack.runtime;
  const proofClaim = proofClaimFor(pack);
  if (
    !proofClaim
    || receipt.world.version !== pack.manifest.version
    || receipt.world.contentVersion !== pack.release.contentVersion
    || receipt.world.capabilityId !== proofClaim.capabilityId
    || receipt.world.proofClaimId !== proofClaim.id
    || receipt.world.taskFamilyId !== runtime.proof.taskFamilyId
    || receipt.protocol.version !== runtime.protocolVersion
    || receipt.authority.proofAuthority !== "honour_based"
    || runtime.evidence.proofAuthority !== "honour_based"
    || runtime.evidence.persistence !== "not_persisted"
  ) {
    return reject("runtime_identity_mismatch", "Receipt package, content, protocol, proof, or local authority does not match the released runtime binding.");
  }

  const expectedSources = receiptSourceBindings(runtime);
  const expectedSourceStatus = expectedSources.every((binding) => binding.status === "bound") ? "bound" : "incomplete";
  if (
    receipt.sourceProvenanceStatus !== expectedSourceStatus
    || !sameCanonicalJson(receipt.sourceBindings, expectedSources)
  ) {
    return reject("source_identity_mismatch", "Receipt source bindings or provenance status differ from the released package tuple.");
  }
  if (!declaredSupportMatches(receipt, runtime)) {
    return reject("support_identity_mismatch", "Receipt cognitive support is not a declared pre-proof runtime support fact.");
  }
  if (!declaredAccessMatches(receipt, runtime)) {
    return reject("access_identity_mismatch", "Receipt access accommodation is not an exact declared construct-preserving runtime alternative.");
  }

  const validatorDefinition = pack.deterministicValidators.find(
    (validator) => validator.id === runtime.proof.validatorId,
  );
  const registration = getCanonicalDeterministicValidatorRegistration(runtime.proof.validatorId);
  if (
    !validatorDefinition
    || !registration
    || receipt.validator.id !== runtime.proof.validatorId
    || receipt.validator.version !== registration.outputContractVersion
    || validatorDefinition.outputContractVersion !== registration.outputContractVersion
  ) {
    return reject("validator_identity_mismatch", "Receipt validator identity is not the canonical validator released with this World.");
  }
  const validation = validateCanonicalDeterministicResult(registration.validator, input.validatorInput);
  if (!validation || validation.inputStatus !== "valid") {
    return reject("validator_input_rejected", "The transient validator input was malformed or not accepted by the canonical validator.");
  }
  const validatorOutcome = deriveCanonicalValidatorOutcome(validation);
  if (receipt.validator.outcome !== validatorOutcome) {
    return reject("validator_outcome_mismatch", "Receipt validator outcome differs from the named canonical validator result.");
  }
  if (validation.evidence.length === 0) {
    return reject("validator_input_rejected", "The canonical validator did not produce bounded criteria for this completed receipt.");
  }

  const identity = await releasedWorldRuntimeIdentity(pack);
  const attemptToken = await stableId(
    { worldId: receipt.world.id, attemptId: receipt.attemptId, packageIntegrityHash: identity.packageIntegrityHash },
    "attempt-token",
  );
  const aggregateId = `run.${receipt.world.id}.${attemptToken.slice("attempt-token.".length)}`;
  const correlationId = `correlation.${attemptToken.slice("attempt-token.".length)}`;
  const supportEventIds = await Promise.all(
    receipt.cognitiveSupport.map((_support, index) => eventId({ aggregateId, index }, "assistance")),
  );
  // Canonical validator criteria are bounded codes, but some authored domains
  // use their own colon/underscore grammar. Event selection references use the
  // stricter shared identifier grammar, so derive opaque stable references
  // rather than copying criterion text into the event envelope.
  const selectionIds = await Promise.all(
    validation.evidence.map((criterion, index) => stableId({ aggregateId, criterion, index }, "selection")),
  );
  const normalizedReceipt: BoundedLocalWorldRuntimeReceipt = {
    ...receipt,
    // The compiler does not let an adapter-chosen disposition or criterion
    // become event authority. Both come from the canonical validator result.
    validator: {
      ...receipt.validator,
      outcome: validatorOutcome,
      disposition: deriveDefaultEvidenceDisposition(validatorOutcome),
      criteria: [...validation.evidence],
    },
  };
  const taskId = taskIdFor(receipt, validation.evidence);
  const project = await projectAdr001RuntimeAttempt({
    receipt: normalizedReceipt,
    attempt: {
      taskId,
      taskVersion: receipt.world.contentVersion,
      taskFamilyId: receipt.world.taskFamilyId,
      representationId: receipt.world.capabilityId,
      contextId: receipt.world.proofClaimId,
      selectionIds,
      responseDigest: null,
      explicitUncertainty: false,
      boundedClaim: proofClaim.statement,
    },
    run: {
      aggregateId,
      correlationId,
      actor: { type: "learner", id: `device.${attemptToken.slice("attempt-token.".length)}` },
      authority: { policyVersion: runtime.support.policyId, consentGrantIds: [] },
      packageIntegrityHash: identity.packageIntegrityHash,
      occurredAt: receipt.recordedAt,
      recordedAt: receipt.recordedAt,
      idempotencyNamespace: "idempotency.world-runtime-v2",
      eventIds: {
        started: await eventId(aggregateId, "started"),
        assistance: supportEventIds,
        proof: await eventId(aggregateId, "proof"),
        evidence: await eventId(aggregateId, "evidence"),
        completed: await eventId(aggregateId, "completed"),
      },
      supportFacts: receipt.cognitiveSupport.map((_support, index) => ({
        supportId: `support.${attemptToken.slice("attempt-token.".length)}.${index + 1}`,
        protectedOperationOverlap: 0,
      })),
      evidenceId: `evidence.${attemptToken.slice("attempt-token.".length)}`,
      proofNonceDigest: null,
      nextReviewAt: null,
    },
    integrity: {
      packageIntegrityMatches: true,
      proofAuthorityMatches: true,
      contaminationReasonCodes: [],
      constructChangingAccommodation: false,
    },
    authoredUncertaintyExceptionReference: null,
  });
  if (!project.ok) return reject("projection_rejected", project.message);

  const journal = new ForgeEventJournal();
  for (const event of project.events) {
    const appended = await journal.append(event);
    if (!appended.accepted || appended.disposition !== "appended") {
      return reject("journal_replay_rejected", "The compiler event chain did not append coherently to a fresh ADR-001 journal.");
    }
  }
  const projection = journal.projection("world_run", aggregateId);
  if (!projection || !isAdr001WorldRunProjection(projection) || projection.status !== "completed") {
    return reject("journal_replay_rejected", "The coherent compiler chain did not project one completed ADR-001 World run.");
  }
  return {
    ok: true,
    compilerVersion: WORLD_RUNTIME_ADR001_COMPILER_VERSION,
    identity,
    events: project.events,
    projection,
  };
}
