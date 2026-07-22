import { describe, expect, it } from "vitest";

import { buildReleaseIdentity, RELEASE_CANDIDATE_STATES, validateReleaseIdentity } from "./release-identity";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const base = () => buildReleaseIdentity({ sourceSha: SHA, testedSha: SHA, generatedAt: "2026-07-22T00:00:00.000Z", candidateState: "BUILT_LOCAL", buildRuntimeMode: "production", cloudProviderFlags: { managed_openai: false }, retainedArtifactIds: ["build-1"] });

describe("ADR-006 release identity", () => {
  it("exposes exactly the six canonical candidate states", () => {
    expect(RELEASE_CANDIDATE_STATES).toEqual(["BUILT_LOCAL", "PUSHED", "DEPLOYMENT_BLOCKED", "DEPLOYED_CANDIDATE", "PRODUCTION_VERIFIED", "ROLLED_BACK"]);
  });
  it("fails closed for malformed or mismatched identity fields", () => {
    const identity = base();
    expect(validateReleaseIdentity(identity)).toEqual([]);
    expect(validateReleaseIdentity({ ...identity, tested_sha: "bad" })).toContain("source_tested_sha");
    expect(validateReleaseIdentity({ ...identity, retained_artifact_ids: ["bad id"] })).toContain("retained_artifact_ids");
    expect(validateReleaseIdentity({ ...identity, named_release_decision: { name: "x", decided_at: "not-a-time" } })).toContain("named_release_decision");
    expect(validateReleaseIdentity({ ...identity, immutable_deployment: undefined } as never)).toContain("missing_fields");
  });
  it("requires bounded evidence for candidate transitions and production closure", () => {
    const candidate = buildReleaseIdentity({ sourceSha: SHA, testedSha: SHA, generatedAt: "2026-07-22T00:00:00.000Z", candidateState: "DEPLOYED_CANDIDATE", buildRuntimeMode: "production", cloudProviderFlags: { managed_openai: false }, retainedArtifactIds: ["candidate-1"] });
    expect(validateReleaseIdentity(candidate)).toContain("deployed_candidate_evidence");
    const production = buildReleaseIdentity({ sourceSha: SHA, testedSha: SHA, generatedAt: "2026-07-22T00:00:00.000Z", candidateState: "PRODUCTION_VERIFIED", buildRuntimeMode: "production", cloudProviderFlags: { managed_openai: false }, retainedArtifactIds: ["live-1"], deploymentId: "dpl-1", deploymentUrl: "https://deploy.example", aliasUrl: "https://forge.example", aliasResolvedAt: "2026-07-22T00:00:00.000Z", browser: "pass", csp: "pass", console: "pass", network: "pass", rollbackDeploymentId: "dpl-0", rollbackSha: SHA, rollbackRehearsal: "pass", decisionName: "principal-approved" });
    expect(validateReleaseIdentity(production, { liveEvaluationStatus: "not_evaluated", liveEvaluationArtifactId: "live-1" })).toContain("production_verified_evidence");
    expect(validateReleaseIdentity(production, { liveEvaluationStatus: "pass", liveEvaluationArtifactId: "live-1" })).toEqual([]);
    expect(validateReleaseIdentity({ ...production, rollback: { ...production.rollback, sha: "not_evaluated" } }, { liveEvaluationStatus: "pass", liveEvaluationArtifactId: "live-1" })).toContain("production_verified_evidence");
    const rolledBack = buildReleaseIdentity({ sourceSha: SHA, testedSha: SHA, generatedAt: "2026-07-22T00:00:00.000Z", candidateState: "ROLLED_BACK", buildRuntimeMode: "production", cloudProviderFlags: { managed_openai: false }, retainedArtifactIds: ["rollback-rehearsal-1"], deploymentId: "https://rollback.example", deploymentUrl: "https://rollback.example", aliasUrl: "https://rollback.example", aliasResolvedAt: "2026-07-22T00:00:00.000Z", browser: "pass", csp: "pass", console: "pass", network: "pass", rollbackDeploymentId: "dpl-rollback", rollbackSha: SHA, rollbackRehearsal: "pass" });
    expect(validateReleaseIdentity(rolledBack)).toContain("rolled_back_evidence");
    expect(validateReleaseIdentity(rolledBack, { rollbackRehearsalArtifactId: "rollback-rehearsal-1" })).toEqual([]);
    expect(validateReleaseIdentity(buildReleaseIdentity({ sourceSha: SHA, testedSha: SHA, generatedAt: "2026-07-22T00:00:00.000Z", candidateState: "PUSHED", buildRuntimeMode: "production", cloudProviderFlags: { managed_openai: false }, retainedArtifactIds: ["push-1"], deploymentId: "dpl-push", deploymentUrl: "https://push.example" }))).toContain("pushed_evidence_scope");
  });
});
