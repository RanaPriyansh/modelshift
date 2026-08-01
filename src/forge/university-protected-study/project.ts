import { types as nodeUtilTypes } from "node:util";
import { ZodError } from "zod";

import {
  WORLD_RUNTIME_STAGES,
  type LearningWorldPack,
} from "../contracts";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import { projectUniversityToday } from "../university-today";
import { validateLearningWorldPack } from "../validation";
import {
  UNIVERSITY_PROTECTED_STUDY_PROJECTION_SCHEMA_VERSION,
  type UniversityProtectedStudyAuthority,
  type UniversityProtectedStudyContract,
  type UniversityProtectedStudyIssue,
  type UniversityProtectedStudyProjectionV1,
  type UniversityProtectedStudyWorld,
  universityProtectedStudyRequestSchema,
} from "./contracts";

const MAX_JSON_DEPTH = 16;
const MAX_JSON_NODES = 8_192;

const AUTHORITY = deepFreeze({
  projectionClass: "fixture_only_protected_study_brief",
  identityScopeAuthority: "caller_asserted_fixture_only",
  courseSourceAuthority: "learner_connected_copy_not_institutional_truth",
  worldAuthority: "validated_supplied_package_snapshot",
  learnerIntentAuthority: "not_established",
  recommendationAllowed: false,
  assignmentAnsweringAllowed: false,
  policyInterpretationAllowed: false,
  sessionStartAllowed: false,
  previewAllowed: true,
  persistenceAllowed: false,
  evidenceClaimAllowed: false,
  eventEmissionAllowed: false,
  externalSideEffectsAllowed: false,
} satisfies UniversityProtectedStudyAuthority);

class UnsafeJsonInput extends Error {}

function copyPlainJson(value: unknown): unknown {
  const budget = { nodes: 0 };

  function visit(current: unknown, depth: number): unknown {
    budget.nodes += 1;
    if (budget.nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) throw new UnsafeJsonInput();
    if (
      current === null
      || typeof current === "string"
      || typeof current === "boolean"
    ) return current;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) throw new UnsafeJsonInput();
      return current;
    }
    if (typeof current !== "object" || nodeUtilTypes.isProxy(current)) {
      throw new UnsafeJsonInput();
    }

    if (Array.isArray(current)) {
      if (current.length > MAX_JSON_NODES - budget.nodes) {
        throw new UnsafeJsonInput();
      }
      const names = Object.getOwnPropertyNames(current);
      if (
        names.some((name) => name !== "length" && !/^(0|[1-9][0-9]*)$/.test(name))
        || names.length !== current.length + 1
      ) throw new UnsafeJsonInput();
      return names
        .filter((name) => name !== "length")
        .sort((left, right) => Number(left) - Number(right))
        .map((name) => {
          const descriptor = Object.getOwnPropertyDescriptor(current, name);
          if (!descriptor || !("value" in descriptor)) throw new UnsafeJsonInput();
          return visit(descriptor.value, depth + 1);
        });
    }

    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) throw new UnsafeJsonInput();
    const copy: Record<string, unknown> = Object.create(null);
    for (const name of Object.getOwnPropertyNames(current).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(current, name);
      if (
        !descriptor
        || !descriptor.enumerable
        || !("value" in descriptor)
        || name === "__proto__"
        || name === "prototype"
        || name === "constructor"
      ) throw new UnsafeJsonInput();
      copy[name] = visit(descriptor.value, depth + 1);
    }
    if (Object.getOwnPropertySymbols(current).length > 0) throw new UnsafeJsonInput();
    return copy;
  }

  return visit(value, 0);
}

function orderedIssues(
  issues: readonly UniversityProtectedStudyIssue[],
): readonly UniversityProtectedStudyIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0 ? codeOrder : left.path.localeCompare(right.path);
  });
}

function invalidProjection(
  issues: readonly UniversityProtectedStudyIssue[],
): Readonly<UniversityProtectedStudyProjectionV1> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_PROTECTED_STUDY_PROJECTION_SCHEMA_VERSION,
    status: "invalid",
    authority: AUTHORITY,
    todayStatus: null,
    context: null,
    world: null,
    learningContract: null,
    recovery: "repair_fixture_input",
    issues: orderedIssues(issues),
    projectionDigest: null,
  });
}

function zodIssues(error: ZodError): UniversityProtectedStudyIssue[] {
  return error.issues.map((entry) => ({
    code: "schema.invalid",
    path: entry.path.join("."),
    message: entry.message,
  }));
}

async function signedProjection(
  projection: Omit<UniversityProtectedStudyProjectionV1, "projectionDigest">,
): Promise<Readonly<UniversityProtectedStudyProjectionV1>> {
  return deepFreeze({
    ...projection,
    projectionDigest: await sha256Digest(canonicalJson(projection)),
  });
}

function exactWorldBinding(
  pack: LearningWorldPack,
  worldRef: {
    readonly worldId: string;
    readonly worldVersion: string;
    readonly worldRoute: string;
    readonly activityProtocol: string;
    readonly sourceIds: readonly string[];
  },
): boolean {
  const manifest = pack.manifest;
  return manifest.id === worldRef.worldId
    && manifest.version === worldRef.worldVersion
    && manifest.route === worldRef.worldRoute
    && manifest.activityProtocol === worldRef.activityProtocol
    && manifest.sources.length === worldRef.sourceIds.length
    && manifest.sources.every((source, index) => source.id === worldRef.sourceIds[index]);
}

function learningContract(pack: LearningWorldPack): UniversityProtectedStudyContract | null {
  const runtime = pack.runtime;
  if (!runtime) return null;
  const proofClaim = pack.proofClaims.find(
    (claim) => claim.id === runtime.proof.proofClaimId,
  );
  const capability = proofClaim
    ? pack.capabilities.find((entry) => entry.id === proofClaim.capabilityId)
    : null;
  const validator = pack.deterministicValidators.find(
    (entry) => entry.id === runtime.proof.validatorId,
  );
  if (
    !proofClaim
    || !capability
    || !validator
    || proofClaim.aiBoundary.mode !== "off"
    || runtime.semanticStages.length !== WORLD_RUNTIME_STAGES.length
    || runtime.semanticStages.some(
      (stage, index) => stage !== WORLD_RUNTIME_STAGES[index],
    )
    || runtime.access.accommodations.some(
      (entry) => entry.constructPreservation !== "preserves_construct" || entry.answerChanging,
    )
  ) return null;

  const actionLabels = new Map(runtime.actions.map((action) => [action.id, action.label]));
  return {
    semanticStages: runtime.semanticStages,
    beginsWithLearnerWork: true,
    support: {
      policyId: runtime.support.policyId,
      allowedDuringProof: runtime.support.allowedDuringProof,
      recordsCognitiveSupport: runtime.support.recordsCognitiveSupport,
      catalog: runtime.support.catalog.map((entry) => ({
        actionId: entry.actionId,
        label: actionLabels.get(entry.actionId) ?? entry.actionId,
        stage: entry.stage,
        source: entry.source,
        tier: entry.tier,
        maxOccurrences: entry.maxOccurrences,
        answerExposing: entry.answerExposing,
      })),
    },
    proof: {
      proofClaimId: proofClaim.id,
      statement: proofClaim.statement,
      successCriteria: proofClaim.successCriteria,
      aiMode: "off",
      validatorId: validator.id,
      validatorDescription: validator.description,
      modelMayDetermineCorrectness: false,
      blockedActionKinds: runtime.proof.blockedActionKinds,
      accessAllowed: runtime.proof.accessAllowed,
    },
    receipt: {
      proofAuthority: runtime.evidence.proofAuthority,
      persistence: runtime.evidence.persistence,
      durable: false,
      delayedReturnAvailable: runtime.returnProof.enabled,
      remainsUntested: runtime.evidence.remainsUntested,
    },
    accessAccommodations: runtime.access.accommodations.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      constructPreservation: "preserves_construct",
      answerChanging: false,
    })),
  };
}

/**
 * Recomputes a fixture Today request, verifies its exact released World pack,
 * and exposes only the learning-integrity facts the shared runtime enforces.
 * It neither infers learner intent nor starts, saves, or completes a session.
 */
export async function projectUniversityProtectedStudy(
  value: unknown,
): Promise<Readonly<UniversityProtectedStudyProjectionV1>> {
  try {
    let copied: unknown;
    try {
      copied = copyPlainJson(value);
    } catch {
      return invalidProjection([{
        code: "schema.invalid",
        path: "",
        message: "The protected-study request must be bounded accessor-free plain JSON.",
      }]);
    }
    const parsed = universityProtectedStudyRequestSchema.safeParse(copied);
    if (!parsed.success) return invalidProjection(zodIssues(parsed.error));

    const today = await projectUniversityToday(parsed.data.todayRequest);
    if (today.status === "invalid") {
      return invalidProjection([{
        code: "today.invalid",
        path: "todayRequest",
        message: "The university Today request did not produce a valid projection.",
      }]);
    }
    if (today.status !== "ready" || !today.action || !today.capacity) {
      return signedProjection({
        schemaVersion: UNIVERSITY_PROTECTED_STUDY_PROJECTION_SCHEMA_VERSION,
        status: "today_not_ready",
        authority: AUTHORITY,
        todayStatus: today.status,
        context: null,
        world: null,
        learningContract: null,
        recovery: "return_to_today",
        issues: [{
          code: "today.not_ready",
          path: "todayRequest",
          message: "Protected study opens only from a source-reviewed action that fits the learner-declared window.",
        }],
      });
    }

    const worldValidation = validateLearningWorldPack(parsed.data.worldPack);
    if (!worldValidation.ok) {
      return invalidProjection([{
        code: "world.invalid",
        path: "worldPack",
        message: "The supplied World package failed its full schema or invariant validation.",
      }]);
    }
    const pack = worldValidation.value;
    if (!exactWorldBinding(pack, today.action.activity.worldRef)) {
      return signedProjection({
        schemaVersion: UNIVERSITY_PROTECTED_STUDY_PROJECTION_SCHEMA_VERSION,
        status: "world_mismatch",
        authority: AUTHORITY,
        todayStatus: today.status,
        context: null,
        world: null,
        learningContract: null,
        recovery: "review_world_binding",
        issues: [{
          code: "world.binding_mismatch",
          path: "worldPack.manifest",
          message: "The supplied World package does not exactly match the accepted path's World identity, version, route, protocol, and ordered sources.",
        }],
      });
    }
    if (pack.release.status !== "released") {
      return signedProjection({
        schemaVersion: UNIVERSITY_PROTECTED_STUDY_PROJECTION_SCHEMA_VERSION,
        status: "world_unavailable",
        authority: AUTHORITY,
        todayStatus: today.status,
        context: null,
        world: null,
        learningContract: null,
        recovery: "review_world_binding",
        issues: [{
          code: "world.not_released",
          path: "worldPack.release.status",
          message: "The exact World package is not released.",
        }],
      });
    }
    if (pack.manifest.availability.status !== "available") {
      return signedProjection({
        schemaVersion: UNIVERSITY_PROTECTED_STUDY_PROJECTION_SCHEMA_VERSION,
        status: "world_unavailable",
        authority: AUTHORITY,
        todayStatus: today.status,
        context: null,
        world: null,
        learningContract: null,
        recovery: "review_world_binding",
        issues: [{
          code: "world.not_available",
          path: "worldPack.manifest.availability",
          message: "The exact released World is currently unavailable.",
        }],
      });
    }

    const contract = learningContract(pack);
    if (!contract) {
      return signedProjection({
        schemaVersion: UNIVERSITY_PROTECTED_STUDY_PROJECTION_SCHEMA_VERSION,
        status: "world_unavailable",
        authority: AUTHORITY,
        todayStatus: today.status,
        context: null,
        world: null,
        learningContract: null,
        recovery: "review_world_binding",
        issues: [{
          code: pack.runtime
            ? "world.integrity_unenforceable"
            : "world.runtime_missing",
          path: "worldPack.runtime",
          message: pack.runtime
            ? "The exact released World does not expose the canonical protected-learning sequence, AI-off proof, deterministic validator binding, and construct-preserving access contract."
            : "The exact released World has no enforceable shared-runtime binding.",
        }],
      });
    }

    const world: UniversityProtectedStudyWorld = {
      id: pack.manifest.id,
      version: pack.manifest.version,
      route: pack.manifest.route,
      title: pack.manifest.title,
      summary: pack.manifest.summary,
      activityProtocol: pack.manifest.activityProtocol,
      evidenceTier: pack.manifest.evidenceTier,
      sourceIds: pack.manifest.sources.map((source) => source.id),
      sourceProvenanceStatus: pack.runtime!.sourceBindings.every(
        (binding) => binding.provenanceStatus === "bound",
      ) ? "bound" : "incomplete",
    };
    return signedProjection({
      schemaVersion: UNIVERSITY_PROTECTED_STUDY_PROJECTION_SCHEMA_VERSION,
      status: "ready",
      authority: AUTHORITY,
      todayStatus: today.status,
      context: {
        termLabel: today.termLabel!,
        courseLabel: today.courseLabel!,
        title: today.action.title,
        objective: today.action.objective,
        effortMinutesLow: today.capacity.effortMinutesLow,
        effortMinutesHigh: today.capacity.effortMinutesHigh,
        availableMinutes: today.capacity.availableMinutes,
      },
      world,
      learningContract: contract,
      recovery: "inspect_protected_study",
      issues: [],
    });
  } catch {
    return invalidProjection([{
      code: "schema.invalid",
      path: "",
      message: "The protected-study projection failed closed before exposing a learning contract.",
    }]);
  }
}
