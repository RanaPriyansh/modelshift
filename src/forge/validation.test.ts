import { describe, expect, it } from "vitest";

import type { LearningWorldPack } from "./contracts";
import { parseLearningWorldPack, validateLearningWorldPack, WorldContractError } from "./validation";
import { FORCE_AND_MOTION_WORLD, PROPORTIONAL_REASONING_WORLD, SOURCE_CORROBORATION_WORLD } from "./worlds";

function forcePack() {
  return structuredClone(FORCE_AND_MOTION_WORLD) as LearningWorldPack;
}

function sourcePack() {
  return structuredClone(SOURCE_CORROBORATION_WORLD) as LearningWorldPack;
}

function issueCodes(candidate: unknown): readonly string[] {
  const result = validateLearningWorldPack(candidate);
  return result.ok ? [] : result.issues.map((issue) => issue.code);
}

describe("Learning world pack invariants", () => {
  it("accepts all built-in packs", () => {
    expect(validateLearningWorldPack(FORCE_AND_MOTION_WORLD).ok).toBe(true);
    expect(validateLearningWorldPack(PROPORTIONAL_REASONING_WORLD).ok).toBe(true);
    expect(validateLearningWorldPack(SOURCE_CORROBORATION_WORLD).ok).toBe(true);
  });

  it("requires a released package for public availability while allowing retained released-unavailable packages", () => {
    const pack = sourcePack();
    pack.release.status = "draft";
    expect(issueCodes(pack)).toContain("availability.mismatch");
    const retained = sourcePack();
    retained.manifest.availability = { status: "unavailable", reason: "Retained package awaiting public-release authority." };
    expect(validateLearningWorldPack(retained).ok).toBe(true);
  });

  it("requires every manifest capability to exist in the pack", () => {
    const pack = forcePack();
    pack.manifest.capabilityIds = ["capability.missing.from-pack"];
    expect(issueCodes(pack)).toEqual(
      expect.arrayContaining(["capability.reference-missing", "capability.reference-extra"]),
    );
  });

  it("requires capability proof references to exist", () => {
    const pack = forcePack();
    pack.capabilities[0].proofClaimIds = ["proof.missing.from-pack"];
    expect(issueCodes(pack)).toContain("proof.reference-missing");
  });

  it("requires proof claims to belong to their capability", () => {
    const pack = forcePack();
    pack.proofClaims[0].capabilityId = "capability.other.unknown";
    expect(issueCodes(pack)).toContain("proof.capability-mismatch");
  });

  it("requires verified worlds to declare a deterministic validator", () => {
    const pack = forcePack();
    delete pack.manifest.deterministicValidatorId;
    expect(issueCodes(pack)).toContain("verified.validator-required");
  });

  it("requires a declared validator to exist in the pack", () => {
    const pack = forcePack();
    pack.manifest.deterministicValidatorId = "validator.not-in-pack.v1";
    expect(issueCodes(pack)).toContain("validator.reference-missing");
  });

  it("requires validator definitions to reference known capabilities", () => {
    const pack = forcePack();
    pack.deterministicValidators[0].capabilityId = "capability.not-in-pack";
    expect(issueCodes(pack)).toContain("validator.capability-missing");
  });

  it("requires grounded worlds to contain only reviewed sources", () => {
    const noSources = sourcePack();
    noSources.manifest.sources = [];
    expect(issueCodes(noSources)).toContain("grounded.reviewed-sources-required");

    const pendingSource = sourcePack();
    pendingSource.manifest.sources[0].review = { status: "pending" };
    expect(issueCodes(pendingSource)).toContain("grounded.reviewed-sources-required");
  });

  it("requires under-13 worlds to be guardian managed", () => {
    const pack = sourcePack();
    pack.manifest.ageModes.push("under-13");
    pack.manifest.safety.guardianManaged = false;
    expect(issueCodes(pack)).toContain("under-13.guardian-managed-required");
  });

  it("requires under-13 worlds to use curated retrieval and blocks open-web AI retrieval", () => {
    const unsafeRetrieval = sourcePack();
    unsafeRetrieval.manifest.ageModes.push("under-13");
    unsafeRetrieval.manifest.safety.retrievalMode = "open-web";
    expect(issueCodes(unsafeRetrieval)).toContain("under-13.curated-retrieval-required");

    const openWebAI = sourcePack();
    openWebAI.manifest.ageModes.push("under-13");
    openWebAI.manifest.aiBoundary.retrievalMode = "open-web";
    expect(issueCodes(openWebAI)).toContain("under-13.curated-retrieval-required");

    const noRetrieval = structuredClone(PROPORTIONAL_REASONING_WORLD) as LearningWorldPack;
    expect(issueCodes(noRetrieval)).not.toContain("under-13.curated-retrieval-required");
  });

  it("rejects duplicate IDs and routes through strict schema validation", () => {
    const pack = forcePack();
    pack.manifest.capabilityIds.push(pack.manifest.capabilityIds[0]);
    expect(issueCodes(pack)).toContain("schema.invalid");

    const malformedRoute = forcePack();
    malformedRoute.manifest.route = "/Worlds/Not Normalized";
    expect(issueCodes(malformedRoute)).toContain("schema.invalid");
  });

  it("rejects proof and return-proof policies that enable AI", () => {
    const proof = forcePack();
    proof.proofClaims[0].aiBoundary = {
      mode: "bounded",
      allowedActions: ["coach-question"],
      retrievalMode: "none",
      modelMayDetermineCorrectness: false,
      modelMayChangePolicy: false,
    };
    expect(issueCodes(proof)).toContain("schema.invalid");

    const returnProof = forcePack();
    returnProof.manifest.returnProof.aiBoundary = {
      mode: "bounded",
      allowedActions: ["coach-question"],
      retrievalMode: "none",
      modelMayDetermineCorrectness: false,
      modelMayChangePolicy: false,
    };
    expect(issueCodes(returnProof)).toContain("schema.invalid");
  });

  it("throws a structured contract error from the parsing API", () => {
    const pack = forcePack();
    pack.release.status = "draft";
    expect(() => parseLearningWorldPack(pack)).toThrow(WorldContractError);

    try {
      parseLearningWorldPack(pack);
    } catch (error) {
      expect(error).toBeInstanceOf(WorldContractError);
      expect((error as WorldContractError).issues[0]?.code).toBe("availability.mismatch");
    }
  });
});
