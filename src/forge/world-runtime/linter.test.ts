import { describe, expect, it } from "vitest";

import type { LearningWorldPack } from "../contracts";
import { PRIMARY_SOURCE_REASONING_WORLD } from "../worlds";
import { lintWorldRuntimePack } from "./linter";

function primarySourcePack(): LearningWorldPack {
  return structuredClone(PRIMARY_SOURCE_REASONING_WORLD) as LearningWorldPack;
}

function lintCodes(candidate: unknown): readonly string[] {
  return lintWorldRuntimePack(candidate).issues.map((issue) => issue.code);
}

function sourceFields(pack: LearningWorldPack): Record<string, unknown> {
  return pack.runtime!.sourceBindings[0] as unknown as Record<string, unknown>;
}

function makeCompleteBoundSource(pack: LearningWorldPack): Record<string, unknown> {
  const source = sourceFields(pack);
  Object.assign(source, {
    provenanceStatus: "bound",
    sourcePackageId: "package.loc.primary-source-review",
    sourcePackageVersion: "1.0.0",
    sourceSnapshotDigest: `sha256:${"a".repeat(64)}`,
    locatorIds: ["locator.loc.primary-source-analysis"],
    claimIds: ["claim.loc.primary-source-analysis"],
    rightsRecordId: "rights.loc.primary-source-analysis",
    reviewDecisionIds: ["review.loc.primary-source-analysis"],
  });
  return source;
}

describe("World runtime package linter", () => {
  it("accepts the Primary Source binding on the existing package identity", () => {
    const result = lintWorldRuntimePack(PRIMARY_SOURCE_REASONING_WORLD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack?.manifest.id).toBe("world.primary-source-reasoning");
    expect(result.pack?.runtime.proof.validatorId).toBe(result.pack?.manifest.deterministicValidatorId);
  });

  it("requires a runtime caller to use a versioned binding on that package", () => {
    const pack = primarySourcePack();
    delete pack.runtime;
    expect(lintCodes(pack)).toEqual(["schema.invalid"]);
  });

  it("rejects every proof-isolation and source-binding manifest failure", () => {
    const missingStage = primarySourcePack();
    missingStage.runtime!.semanticStages.pop();
    expect(lintCodes(missingStage)).toContain("schema.invalid");

    const missingBlockedAction = primarySourcePack();
    missingBlockedAction.runtime!.proof.blockedActionKinds = ["instructional_support", "model_action"];
    expect(lintCodes(missingBlockedAction)).toContain("schema.invalid");

    const missingBlockedActionDeclaration = primarySourcePack();
    missingBlockedActionDeclaration.runtime!.actions = missingBlockedActionDeclaration.runtime!.actions.filter(
      (action) => action.kind !== "experience_replay",
    );
    expect(lintCodes(missingBlockedActionDeclaration)).toContain("schema.invalid");

    const wrongProofClaim = primarySourcePack();
    wrongProofClaim.runtime!.proof.proofClaimId = "proof.primary-source-reasoning.missing";
    expect(lintCodes(wrongProofClaim)).toContain("runtime.proof-claim-mismatch");

    const wrongValidator = primarySourcePack();
    wrongValidator.runtime!.proof.validatorId = "validator.primary-source-reasoning.other";
    expect(lintCodes(wrongValidator)).toContain("runtime.validator-mismatch");

    const missingManifestSource = primarySourcePack();
    missingManifestSource.runtime!.sourceBindings.pop();
    expect(lintCodes(missingManifestSource)).toContain("runtime.source-binding-missing");

    const inventedSource = primarySourcePack();
    inventedSource.runtime!.sourceBindings[0]!.sourceItemId = "source.primary-source.invented";
    expect(lintCodes(inventedSource)).toContain("runtime.source-binding-missing");

    const mismatchedReturnProof = primarySourcePack();
    mismatchedReturnProof.runtime!.returnProof.enabled = true;
    expect(lintCodes(mismatchedReturnProof)).toContain("runtime.return-proof-mismatch");

    const duplicateSourceBinding = primarySourcePack();
    duplicateSourceBinding.runtime!.sourceBindings[1]!.sourceItemId = duplicateSourceBinding.runtime!.sourceBindings[0]!.sourceItemId;
    expect(lintCodes(duplicateSourceBinding)).toContain("schema.invalid");
  });

  it("fails reviewer fake-bound sources without every ADR-003 authority field", () => {
    const incompleteBoundSource = primarySourcePack();
    sourceFields(incompleteBoundSource).provenanceStatus = "bound";
    expect(lintCodes(incompleteBoundSource)).toContain("schema.invalid");

    const requiredTupleFailures: ReadonlyArray<readonly [string, unknown]> = [
      ["sourcePackageId", null],
      ["sourcePackageVersion", null],
      ["sourceSnapshotDigest", null],
      ["locatorIds", []],
      ["claimIds", []],
      ["rightsRecordId", null],
      ["reviewDecisionIds", []],
    ];
    for (const [_field, value] of requiredTupleFailures) {
      const candidate = primarySourcePack();
      const source = makeCompleteBoundSource(candidate);
      source[_field] = value;
      expect(lintCodes(candidate)).toContain("schema.invalid");
    }

    for (const field of ["locatorIds", "claimIds", "reviewDecisionIds"] as const) {
      const candidate = primarySourcePack();
      const source = makeCompleteBoundSource(candidate);
      source[field] = [`${field}.duplicate`, `${field}.duplicate`];
      expect(lintCodes(candidate)).toContain("schema.invalid");
    }
  });

  it("does not let explicitly incomplete legacy metadata carry authority fields", () => {
    const forgedLegacyFields: ReadonlyArray<readonly [string, unknown]> = [
      ["sourcePackageId", "package.forged"],
      ["sourcePackageVersion", "1.0.0"],
      ["sourceSnapshotDigest", `sha256:${"b".repeat(64)}`],
      ["locatorIds", ["locator.forged"]],
      ["claimIds", ["claim.forged"]],
      ["rightsRecordId", "rights.forged"],
      ["reviewDecisionIds", ["review.forged"]],
    ];
    for (const [field, value] of forgedLegacyFields) {
      const candidate = primarySourcePack();
      sourceFields(candidate)[field] = value;
      expect(lintCodes(candidate)).toContain("schema.invalid");
    }

    const durableClaim = primarySourcePack() as unknown as {
      runtime: { evidence: { persistence: string } };
    };
    durableClaim.runtime.evidence.persistence = "durable_event";
    expect(lintCodes(durableClaim)).toContain("schema.invalid");
  });
});
