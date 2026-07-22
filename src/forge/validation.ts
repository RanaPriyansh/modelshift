import type { z } from "zod";

import {
  learningWorldPackSchema,
  type LearningWorldPack,
} from "./contracts";

export const WORLD_INVARIANT_CODES = [
  "schema.invalid",
  "availability.mismatch",
  "capability.reference-missing",
  "capability.reference-extra",
  "proof.reference-missing",
  "proof.capability-mismatch",
  "proof.ai-enabled",
  "validator.reference-missing",
  "validator.capability-missing",
  "verified.validator-required",
  "grounded.reviewed-sources-required",
  "under-13.guardian-managed-required",
  "under-13.curated-retrieval-required",
  "runtime.proof-claim-mismatch",
  "runtime.validator-mismatch",
  "runtime.source-binding-missing",
  "runtime.return-proof-mismatch",
] as const;

export type WorldInvariantCode = (typeof WORLD_INVARIANT_CODES)[number];

export interface WorldInvariantIssue {
  readonly code: WorldInvariantCode;
  readonly path: string;
  readonly message: string;
}

export type WorldPackValidation =
  | { readonly ok: true; readonly value: LearningWorldPack }
  | { readonly ok: false; readonly issues: readonly WorldInvariantIssue[] };

export class WorldContractError extends Error {
  readonly issues: readonly WorldInvariantIssue[];

  constructor(message: string, issues: readonly WorldInvariantIssue[]) {
    super(message);
    this.name = "WorldContractError";
    this.issues = issues;
  }
}

function schemaIssues(error: z.ZodError): readonly WorldInvariantIssue[] {
  return error.issues.map((issue) => ({
    code: "schema.invalid",
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function validateInvariants(pack: LearningWorldPack): readonly WorldInvariantIssue[] {
  const issues: WorldInvariantIssue[] = [];
  const manifest = pack.manifest;
  const capabilityIds = new Set(pack.capabilities.map((capability) => capability.id));
  const manifestCapabilityIds = new Set(manifest.capabilityIds);
  const proofClaims = new Map(pack.proofClaims.map((claim) => [claim.id, claim]));
  const validators = new Map(pack.deterministicValidators.map((validator) => [validator.id, validator]));

  const availableWithoutReleasedPackage =
    manifest.availability.status === "available" && pack.release.status !== "released";
  if (availableWithoutReleasedPackage) {
    issues.push({
      code: "availability.mismatch",
      path: "manifest.availability",
      message: "A public available world requires a released package; a released package may remain unavailable as a retained executable artifact.",
    });
  }

  for (const capabilityId of manifestCapabilityIds) {
    if (!capabilityIds.has(capabilityId)) {
      issues.push({
        code: "capability.reference-missing",
        path: "manifest.capabilityIds",
        message: `Manifest capability ${capabilityId} is absent from the pack.`,
      });
    }
  }
  for (const capabilityId of capabilityIds) {
    if (!manifestCapabilityIds.has(capabilityId)) {
      issues.push({
        code: "capability.reference-extra",
        path: "capabilities",
        message: `Pack capability ${capabilityId} is not declared by the manifest.`,
      });
    }
  }

  for (const capability of pack.capabilities) {
    for (const proofClaimId of capability.proofClaimIds) {
      const claim = proofClaims.get(proofClaimId);
      if (!claim) {
        issues.push({
          code: "proof.reference-missing",
          path: `capabilities.${capability.id}.proofClaimIds`,
          message: `Proof claim ${proofClaimId} is absent from the pack.`,
        });
      } else if (claim.capabilityId !== capability.id) {
        issues.push({
          code: "proof.capability-mismatch",
          path: `proofClaims.${claim.id}.capabilityId`,
          message: `Proof claim ${claim.id} belongs to ${claim.capabilityId}, not ${capability.id}.`,
        });
      }
    }
  }

  for (const claim of pack.proofClaims) {
    if (!capabilityIds.has(claim.capabilityId)) {
      issues.push({
        code: "proof.capability-mismatch",
        path: `proofClaims.${claim.id}.capabilityId`,
        message: `Proof claim ${claim.id} references unknown capability ${claim.capabilityId}.`,
      });
    }
    if (claim.aiBoundary.mode !== "off") {
      issues.push({
        code: "proof.ai-enabled",
        path: `proofClaims.${claim.id}.aiBoundary.mode`,
        message: `Proof claim ${claim.id} must turn AI off.`,
      });
    }
  }

  for (const validator of pack.deterministicValidators) {
    if (!capabilityIds.has(validator.capabilityId)) {
      issues.push({
        code: "validator.capability-missing",
        path: `deterministicValidators.${validator.id}.capabilityId`,
        message: `Validator ${validator.id} references unknown capability ${validator.capabilityId}.`,
      });
    }
  }

  if (manifest.deterministicValidatorId && !validators.has(manifest.deterministicValidatorId)) {
    issues.push({
      code: "validator.reference-missing",
      path: "manifest.deterministicValidatorId",
      message: `Manifest validator ${manifest.deterministicValidatorId} is absent from the pack.`,
    });
  }

  if (manifest.evidenceTier === "verified" && !manifest.deterministicValidatorId) {
    issues.push({
      code: "verified.validator-required",
      path: "manifest.deterministicValidatorId",
      message: "Verified worlds require a deterministic validator.",
    });
  }

  if (
    manifest.evidenceTier === "grounded" &&
    (manifest.sources.length === 0 || manifest.sources.some((source) => source.review.status !== "reviewed"))
  ) {
    issues.push({
      code: "grounded.reviewed-sources-required",
      path: "manifest.sources",
      message: "Grounded worlds require one or more reviewed sources and cannot include unreviewed sources.",
    });
  }

  if (manifest.ageModes.includes("under-13")) {
    if (!manifest.safety.guardianManaged) {
      issues.push({
        code: "under-13.guardian-managed-required",
        path: "manifest.safety.guardianManaged",
        message: "Under-13 worlds must be guardian managed.",
      });
    }
    if (manifest.safety.retrievalMode === "open-web" || manifest.aiBoundary.retrievalMode === "open-web") {
      issues.push({
        code: "under-13.curated-retrieval-required",
        path: "manifest.safety.retrievalMode",
        message: "Under-13 worlds may use no retrieval or curated-only retrieval, and cannot expose open-web retrieval.",
      });
    }
  }

  if (pack.runtime) {
    if (!proofClaims.has(pack.runtime.proof.proofClaimId)) {
      issues.push({
        code: "runtime.proof-claim-mismatch",
        path: "runtime.proof.proofClaimId",
        message: `Runtime proof claim ${pack.runtime.proof.proofClaimId} is absent from the pack.`,
      });
    }
    if (manifest.deterministicValidatorId !== pack.runtime.proof.validatorId || !validators.has(pack.runtime.proof.validatorId)) {
      issues.push({
        code: "runtime.validator-mismatch",
        path: "runtime.proof.validatorId",
        message: "Runtime proof validation must use the manifest's declared deterministic validator.",
      });
    }
    if (pack.runtime.returnProof.enabled !== manifest.returnProof.enabled) {
      issues.push({
        code: "runtime.return-proof-mismatch",
        path: "runtime.returnProof.enabled",
        message: "Runtime return-proof availability must match the manifest policy.",
      });
    }

    const manifestSourceIds = new Set(manifest.sources.map((source) => source.id));
    const runtimeSourceIds = new Set(pack.runtime.sourceBindings.map((binding) => binding.sourceItemId));
    for (const sourceId of manifestSourceIds) {
      if (!runtimeSourceIds.has(sourceId)) {
        issues.push({
          code: "runtime.source-binding-missing",
          path: "runtime.sourceBindings",
          message: `Runtime binding does not map manifest source ${sourceId}.`,
        });
      }
    }
    for (const sourceId of runtimeSourceIds) {
      if (!manifestSourceIds.has(sourceId)) {
        issues.push({
          code: "runtime.source-binding-missing",
          path: "runtime.sourceBindings",
          message: `Runtime binding references source ${sourceId}, which is absent from the manifest.`,
        });
      }
    }
  }

  return issues;
}

export function validateLearningWorldPack(candidate: unknown): WorldPackValidation {
  const parsed = learningWorldPackSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, issues: schemaIssues(parsed.error) };

  const issues = validateInvariants(parsed.data);
  return issues.length === 0 ? { ok: true, value: parsed.data } : { ok: false, issues };
}

export function parseLearningWorldPack(candidate: unknown): LearningWorldPack {
  const result = validateLearningWorldPack(candidate);
  if (result.ok) return result.value;
  throw new WorldContractError("Learning world pack violates the Forge contract.", result.issues);
}
