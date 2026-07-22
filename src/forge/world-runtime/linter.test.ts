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

  it("does not let legacy source metadata pretend to be a reviewed snapshot", () => {
    const fakeSnapshot = primarySourcePack();
    fakeSnapshot.runtime!.sourceBindings[0]!.sourceSnapshotDigest = `sha256:${"a".repeat(64)}`;
    expect(lintCodes(fakeSnapshot)).toContain("schema.invalid");

    const incompleteBoundSource = primarySourcePack();
    incompleteBoundSource.runtime!.sourceBindings[0]!.provenanceStatus = "bound";
    expect(lintCodes(incompleteBoundSource)).toContain("schema.invalid");

    const durableClaim = primarySourcePack() as unknown as {
      runtime: { evidence: { persistence: string } };
    };
    durableClaim.runtime.evidence.persistence = "durable_event";
    expect(lintCodes(durableClaim)).toContain("schema.invalid");
  });
});
