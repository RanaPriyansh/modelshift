import "server-only";

import { types as nodeUtilTypes } from "node:util";

import type { BoundedLocalWorldRuntimeReceipt } from "../world-runtime";
import { boundedJsonSnapshot } from "../bounded-json-snapshot";
import { canonicalJson, sha256Digest } from "../events";
import { deepFreeze } from "../deep-freeze";
import { projectUniversityProtectedStudy } from "../university-protected-study";
import { retainedRuntimeIdentityFor } from "../world-runtime/retained-runtime-binding";
import { verifyPublicWorldRuntimeReceiptAttestation } from "../world-runtime/runtime-core.public";
import { SOURCE_CORROBORATION_WORLD } from "../worlds";
import { UNIVERSITY_POST_ATTEMPT_REPAIR_POLICY } from "./authored-policy.server";
import {
  UNIVERSITY_POST_ATTEMPT_REPAIR_PROJECTION_SCHEMA_VERSION,
  UNIVERSITY_POST_ATTEMPT_REPAIR_REQUEST_SCHEMA_VERSION,
  type UniversityPostAttemptRepairAuthority,
  type UniversityPostAttemptRepairEvidence,
  type UniversityPostAttemptRepairIssue,
  type UniversityPostAttemptRepairProjectionV1,
} from "./contracts";

const AUTHORITY = deepFreeze({
  projectionClass: "fixture_only_authored_post_attempt_repair_brief",
  identityScopeAuthority: "caller_asserted_fixture_only",
  courseSourceAuthority: "learner_connected_copy_not_institutional_truth",
  receiptContextBinding: "not_established",
  receiptAuthority: "exact_process_local_runtime_attestation",
  repairSelectionAuthority: "fixed_internal_authored_research_mapping",
  modelUsed: false,
  retrievalUsed: false,
  answerGenerationAllowed: false,
  diagnosisAllowed: false,
  masteryClaimAllowed: false,
  gradeAllowed: false,
  capabilityClaimAllowed: false,
  personalizedRecommendationAllowed: false,
  assignmentAllowed: false,
  pathMutationAllowed: false,
  sessionStartAllowed: false,
  retryStartAllowed: false,
  proofStartAllowed: false,
  persistenceAllowed: false,
  eventEmissionAllowed: false,
  evidenceUpgradeAllowed: false,
  messagingAllowed: false,
  schedulingAllowed: false,
  providerCallAllowed: false,
  externalSideEffectsAllowed: false,
} satisfies UniversityPostAttemptRepairAuthority);

const MAXIMUM_STRING_LENGTH = 4_096;
const MAXIMUM_SERIALIZED_JSON_BYTES = 512 * 1_024;

type OuterRequest = Readonly<{
  todayRequest: unknown;
  worldPack: unknown;
  runtimeReceipt: unknown;
}>;

function exactOuterRequest(value: unknown): OuterRequest | null {
  if (
    typeof value !== "object"
    || value === null
    || Array.isArray(value)
    || nodeUtilTypes.isProxy(value)
  ) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  if (Object.getOwnPropertySymbols(value).length > 0) return null;

  const names = Object.getOwnPropertyNames(value).sort();
  const expected = [
    "runtimeReceipt",
    "schemaVersion",
    "todayRequest",
    "worldPack",
  ];
  if (
    names.length !== expected.length
    || names.some((name, index) => name !== expected[index])
  ) return null;

  const values = new Map<string, unknown>();
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (
      !descriptor
      || !descriptor.enumerable
      || !("value" in descriptor)
    ) return null;
    values.set(name, descriptor.value);
  }
  if (
    values.get("schemaVersion")
    !== UNIVERSITY_POST_ATTEMPT_REPAIR_REQUEST_SCHEMA_VERSION
  ) return null;
  return Object.freeze({
    todayRequest: values.get("todayRequest"),
    worldPack: values.get("worldPack"),
    runtimeReceipt: values.get("runtimeReceipt"),
  });
}

function sameOrderedStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length
    && left.every((entry, index) => entry === right[index]);
}

function invalidProjection(
  issue: UniversityPostAttemptRepairIssue,
): Readonly<UniversityPostAttemptRepairProjectionV1> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_POST_ATTEMPT_REPAIR_PROJECTION_SCHEMA_VERSION,
    status: "invalid",
    authority: AUTHORITY,
    context: null,
    evidence: null,
    repair: null,
    message:
      "The exact attempt boundary was unavailable, so no result or repair was exposed.",
    issues: [issue],
    projectionDigest: null,
  });
}

async function signedProjection(
  projection: Omit<
    UniversityPostAttemptRepairProjectionV1,
    "projectionDigest"
  >,
): Promise<Readonly<UniversityPostAttemptRepairProjectionV1>> {
  return deepFreeze({
    ...projection,
    projectionDigest: await sha256Digest(canonicalJson(projection)),
  });
}

function exactReceiptBinding(
  receipt: BoundedLocalWorldRuntimeReceipt,
  protectedWorld: NonNullable<
    Awaited<ReturnType<typeof projectUniversityProtectedStudy>>["world"]
  >,
): boolean {
  const policy = UNIVERSITY_POST_ATTEMPT_REPAIR_POLICY;
  const world = policy.world;
  return receipt.world.id === world.id
    && receipt.world.version === world.version
    && receipt.world.contentVersion === world.contentVersion
    && receipt.world.proofClaimId === world.proofClaimId
    && receipt.world.taskCode === world.taskCode
    && receipt.world.taskFamilyId === world.taskFamilyId
    && receipt.protocol.version === world.protocolVersion
    && receipt.runtimeBindingDigest === world.runtimeBindingDigest
    && receipt.packageIntegrityHash === world.packageIntegrityHash
    && receipt.validator.id === policy.validator.id
    && receipt.validator.version === policy.validator.outputVersion
    && receipt.authority.proofAuthority === "honour_based"
    && receipt.authority.persistence === "not_persisted"
    && receipt.authority.isDurable === false
    && receipt.cognitiveSupport.length === 0
    && protectedWorld.id === world.id
    && protectedWorld.version === world.version
    && protectedWorld.route === world.route
    && protectedWorld.sourceProvenanceStatus
      === receipt.sourceProvenanceStatus;
}

function exactResult(
  receipt: BoundedLocalWorldRuntimeReceipt,
  expected: {
    readonly code: string;
    readonly outcome: string;
    readonly disposition: string;
    readonly criteria: readonly string[];
  },
): boolean {
  return receipt.validator.code === expected.code
    && receipt.validator.outcome === expected.outcome
    && receipt.validator.disposition === expected.disposition
    && sameOrderedStrings(receipt.validator.criteria, expected.criteria);
}

function passEvidence(): UniversityPostAttemptRepairEvidence {
  return {
    checksTotal: 2,
    checksHeld: 2,
    countLabel: "2 of 2 authored checks",
    summary:
      "Both authored checks held in this immediate attempt. Delayed retention and broader capability remain untested.",
    checks: [
      {
        id: "bounded_conclusion",
        label: "Bounded conclusion",
        state: "held_this_attempt",
      },
      {
        id: "unresolved_condition",
        label: "Unresolved condition",
        state: "held_this_attempt",
      },
    ],
    immediateAttemptOnly: true,
  };
}

function missingMappingEvidence(
  receipt: BoundedLocalWorldRuntimeReceipt,
): UniversityPostAttemptRepairEvidence {
  const held = receipt.validator.code === "transfer.partial" ? 1 : 0;
  return {
    checksTotal: 2,
    checksHeld: held,
    countLabel: `${held} of 2 authored checks`,
    summary:
      "The exact attempt is valid, but this result has no fixed authored repair mapping. FORGE stops instead of inventing advice.",
    checks: [],
    immediateAttemptOnly: true,
  };
}

/**
 * Converts one exact process-attested result into at most one exact authored
 * repair preview. It does not parse serialized receipts, start repair, or
 * upgrade the bounded local receipt.
 */
export async function projectUniversityPostAttemptRepair(
  value: unknown,
): Promise<Readonly<UniversityPostAttemptRepairProjectionV1>> {
  try {
    const request = exactOuterRequest(value);
    if (!request || request.worldPack !== SOURCE_CORROBORATION_WORLD) {
      return invalidProjection({
        code: "request.invalid",
        message:
          "The repair request must use the exact server-owned World and an accessor-free outer envelope.",
      });
    }

    const receipt = request.runtimeReceipt as BoundedLocalWorldRuntimeReceipt;
    if (!verifyPublicWorldRuntimeReceiptAttestation(receipt)) {
      return invalidProjection({
        code: "receipt.unattested",
        message:
          "Only the exact frozen receipt object emitted by the current canonical runtime can enter this preview.",
      });
    }

    let todayRequestSnapshot: unknown;
    try {
      todayRequestSnapshot = boundedJsonSnapshot(request.todayRequest, {
        maximumStringLength: MAXIMUM_STRING_LENGTH,
        maximumSerializedJsonBytes: MAXIMUM_SERIALIZED_JSON_BYTES,
        rejectObject: nodeUtilTypes.isProxy,
      });
    } catch {
      return invalidProjection({
        code: "request.invalid",
        message:
          "The Today request must be a bounded accessor-free JSON graph with no nested proxies, symbols, or exotic prototypes.",
      });
    }

    const protectedStudy = await projectUniversityProtectedStudy({
      schemaVersion: "university-protected-study-request.v1",
      todayRequest: todayRequestSnapshot,
      worldPack: request.worldPack,
    });
    if (
      protectedStudy.status !== "ready"
      || !protectedStudy.context
      || !protectedStudy.world
      || !protectedStudy.learningContract
    ) {
      return invalidProjection({
        code: "protected_study.not_ready",
        message:
          "Post-attempt repair requires the exact ready protected-study binding.",
      });
    }

    const retained = retainedRuntimeIdentityFor(SOURCE_CORROBORATION_WORLD);
    const [runtimeBindingDigest, packageIntegrityHash] = await Promise.all([
      sha256Digest(canonicalJson(SOURCE_CORROBORATION_WORLD.runtime)),
      sha256Digest(canonicalJson(SOURCE_CORROBORATION_WORLD)),
    ]);
    const policyWorld = UNIVERSITY_POST_ATTEMPT_REPAIR_POLICY.world;
    if (
      !retained
      || retained.runtimeBindingDigest !== policyWorld.runtimeBindingDigest
      || retained.packageIntegrityHash !== policyWorld.packageIntegrityHash
      || runtimeBindingDigest !== policyWorld.runtimeBindingDigest
      || packageIntegrityHash !== policyWorld.packageIntegrityHash
      || !exactReceiptBinding(receipt, protectedStudy.world)
    ) {
      return invalidProjection({
        code: "binding.mismatch",
        message:
          "The attested result did not match the exact protected World, task, validator, runtime, and package identities.",
      });
    }

    const context = {
      binding: "server_paired_synthetic_not_receipt_bound" as const,
      termLabel: protectedStudy.context.termLabel,
      courseLabel: protectedStudy.context.courseLabel,
      activityTitle: protectedStudy.context.title,
      worldTitle: protectedStudy.world.title,
      worldVersion: protectedStudy.world.version,
      taskLabel: "Two authored source-corroboration checks",
      resultBoundary:
        "Server-paired synthetic course context; not bound into the receipt. The immediate honour-based result is not persisted, durable, independently verified, or evidence of retention.",
    };
    const policy = UNIVERSITY_POST_ATTEMPT_REPAIR_POLICY;

    if (exactResult(receipt, policy.pass)) {
      return signedProjection({
        schemaVersion:
          UNIVERSITY_POST_ATTEMPT_REPAIR_PROJECTION_SCHEMA_VERSION,
        status: "not_applicable",
        authority: AUTHORITY,
        context,
        evidence: passEvidence(),
        repair: null,
        message:
          "No immediate repair is selected for this exact result. Delayed retention and broader capability remain untested.",
        issues: [],
      });
    }

    if (exactResult(receipt, policy.mapping)) {
      return signedProjection({
        schemaVersion:
          UNIVERSITY_POST_ATTEMPT_REPAIR_PROJECTION_SCHEMA_VERSION,
        status: "repair_ready",
        authority: AUTHORITY,
        context,
        evidence: policy.mapping.evidence,
        repair: policy.mapping.repair,
        message:
          "One exact authored repair move is available for inspection. Nothing starts, saves, or changes.",
        issues: [],
      });
    }

    if (
      receipt.validator.outcome === "fail"
      && receipt.validator.disposition === "not_demonstrated"
      && (
        receipt.validator.code === "transfer.partial"
        || receipt.validator.code === "transfer.not-yet"
      )
    ) {
      return signedProjection({
        schemaVersion:
          UNIVERSITY_POST_ATTEMPT_REPAIR_PROJECTION_SCHEMA_VERSION,
        status: "repair_mapping_missing",
        authority: AUTHORITY,
        context,
        evidence: missingMappingEvidence(receipt),
        repair: null,
        message:
          "No fixed authored repair mapping exists for this exact result. FORGE will not invent one.",
        issues: [{
          code: "repair.mapping_missing",
          message:
            "The exact attested failure has no fixed internal authored repair mapping.",
        }],
      });
    }

    return invalidProjection({
      code: "binding.mismatch",
      message:
        "The attested validator result is outside the exact fixed internal post-attempt policy.",
    });
  } catch {
    return invalidProjection({
      code: "projection.unexpected",
      message:
        "Post-attempt repair failed closed before exposing attempt evidence or advice.",
    });
  }
}
