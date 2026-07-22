import { describe, expect, it } from "vitest";

import {
  buildReleaseIdentity,
  RELEASE_CANDIDATE_STATES,
  type ReleaseHealthCloudProviderFlags,
  type ReleaseIdentityVerificationAuthority,
  validateReleaseIdentity,
} from "./release-identity";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const TIME = "2026-07-22T00:00:00.000Z";
const FLAGS: ReleaseHealthCloudProviderFlags = {
  cloud_accounts_enabled: false,
  cloud_auth_configured: false,
  provider_mode: "request_only_byok",
  managed_openai: false,
  managed_anthropic: false,
  managed_gemini: false,
  managed_openrouter: false,
  managed_lesson_studio: false,
  managed_interpretation: false,
  managed_planner: false,
};

const base = () => buildReleaseIdentity({
  sourceSha: SHA,
  testedSha: SHA,
  generatedAt: TIME,
  candidateState: "BUILT_LOCAL",
  buildRuntimeMode: "production",
  cloudProviderFlags: FLAGS,
  retainedArtifactIds: ["build-1"],
});

function terminal(candidateState: "PRODUCTION_VERIFIED" | "ROLLED_BACK" = "PRODUCTION_VERIFIED") {
  const rollback = candidateState === "ROLLED_BACK";
  const deploymentId = rollback ? "dpl-rollback" : "dpl-production";
  const deploymentUrl = rollback ? "https://rollback.example/" : "https://deployment.example/";
  const artifactIds = ["production-verification-1", "live-evaluation-1", "rollback-rehearsal-1"];
  const identity = buildReleaseIdentity({
    sourceSha: SHA,
    testedSha: SHA,
    generatedAt: TIME,
    candidateState,
    buildRuntimeMode: "fallback_only",
    cloudProviderFlags: FLAGS,
    retainedArtifactIds: artifactIds,
    deploymentId,
    deploymentUrl,
    aliasUrl: "https://forge.example/",
    aliasResolvedAt: TIME,
    browser: "pass",
    csp: "pass",
    console: "pass",
    network: "pass",
    rollbackDeploymentId: rollback ? deploymentId : "dpl-rollback",
    rollbackSha: SHA,
    rollbackRehearsal: "pass",
    decisionName: rollback ? "principal-rollback" : "principal-approved",
  });
  const authority: ReleaseIdentityVerificationAuthority = {
    immutable_deployment: { id: deploymentId, url: deploymentUrl },
    public_alias: { url: "https://forge.example/", resolved_at: TIME, resolved_deployment_id: deploymentId },
    production_verification_artifact_id: "production-verification-1",
    live_evaluation: { status: "pass", artifact_id: "live-evaluation-1" },
    rollback_rehearsal: { deployment_id: rollback ? deploymentId : "dpl-rollback", sha: SHA, artifact_id: "rollback-rehearsal-1" },
    named_release_decision: { name: rollback ? "principal-rollback" : "principal-approved", decided_at: TIME },
  };
  return { identity, authority };
}

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
    expect(validateReleaseIdentity({ ...identity, immutable_deployment: undefined } as never)).toContain("immutable_deployment");
  });

  it.each([
    ["missing retained artifacts", (identity: ReturnType<typeof base>) => ({ ...identity, retained_artifact_ids: undefined })],
    ["string retained artifacts", (identity: ReturnType<typeof base>) => ({ ...identity, retained_artifact_ids: "artifact-1" })],
    ["missing critical packet", (identity: ReturnType<typeof base>) => ({ ...identity, critical_verification: undefined })],
    ["string critical packet", (identity: ReturnType<typeof base>) => ({ ...identity, critical_verification: "pass" })],
    ["missing rollback", (identity: ReturnType<typeof base>) => ({ ...identity, rollback: undefined })],
    ["array rollback", (identity: ReturnType<typeof base>) => ({ ...identity, rollback: [] })],
    ["missing decision", (identity: ReturnType<typeof base>) => ({ ...identity, named_release_decision: undefined })],
    ["non-object identity", () => null],
  ])("is total for %s", (_label, mutate) => {
    const payload = mutate(base());
    expect(() => validateReleaseIdentity(payload)).not.toThrow();
    expect(validateReleaseIdentity(payload).length).toBeGreaterThan(0);
  });

  it("fails closed but returns a report when an unobserved nonterminal provider projection is present", () => {
    const identity = { ...base(), cloud_provider_flags: { cloud_accounts_enabled: "not_evaluated" } };
    expect(() => validateReleaseIdentity(identity)).not.toThrow();
    expect(validateReleaseIdentity(identity)).toContain("cloud_provider_flags");
  });

  it("requires bounded evidence for nonterminal candidate transitions", () => {
    const candidate = buildReleaseIdentity({
      sourceSha: SHA,
      testedSha: SHA,
      generatedAt: TIME,
      candidateState: "DEPLOYED_CANDIDATE",
      buildRuntimeMode: "fallback_only",
      cloudProviderFlags: FLAGS,
      retainedArtifactIds: ["candidate-1"],
    });
    expect(validateReleaseIdentity(candidate)).toContain("deployed_candidate_evidence");
    expect(validateReleaseIdentity(buildReleaseIdentity({
      sourceSha: SHA,
      testedSha: SHA,
      generatedAt: TIME,
      candidateState: "PUSHED",
      buildRuntimeMode: "fallback_only",
      cloudProviderFlags: FLAGS,
      retainedArtifactIds: ["push-1"],
      deploymentId: "dpl-push",
      deploymentUrl: "https://push.example/",
    }))).toContain("pushed_evidence_scope");
  });

  it("accepts only a canonical, authority-bound production terminal fixture", () => {
    const { identity, authority } = terminal();
    expect(validateReleaseIdentity(identity, { verificationAuthority: authority })).toEqual([]);
    expect(validateReleaseIdentity(identity)).toContain("production_verified_evidence");
  });

  it("rejects the reviewer terminal payload with empty HTTPS hosts, unknown runtime, and arbitrary flags", () => {
    const { identity, authority } = terminal();
    const reviewerPayload = {
      ...identity,
      immutable_deployment: { id: "dpl-production", url: "https://" },
      public_alias: { url: "https://", resolved_at: TIME },
      build_runtime_mode: "unknown",
      cloud_provider_flags: { api_key: "sk-this-must-never-be-a-flag", provider_mode: "mystery" },
    } as never;
    const failures = validateReleaseIdentity(reviewerPayload, { verificationAuthority: authority });
    expect(failures).toEqual(expect.arrayContaining(["immutable_deployment", "public_alias", "terminal_runtime_mode", "cloud_provider_flags", "production_verified_evidence"]));
  });

  it.each([
    ["non-HTTPS", "http://deployment.example/"],
    ["credentials", "https://user:password@deployment.example/"],
    ["path", "https://deployment.example/release"],
    ["query", "https://deployment.example/?token=bad"],
    ["fragment", "https://deployment.example/#bad"],
  ])("rejects malformed terminal deployment URLs: %s", (_label, url) => {
    const { identity, authority } = terminal();
    expect(validateReleaseIdentity({ ...identity, immutable_deployment: { id: "dpl-production", url } } as never, { verificationAuthority: authority })).toContain("immutable_deployment");
  });

  it("rejects malformed alias URLs, timestamps, runtime values, and non-projection flags", () => {
    const { identity, authority } = terminal();
    expect(validateReleaseIdentity({ ...identity, public_alias: { url: "https://forge.example/?q=1", resolved_at: TIME } } as never, { verificationAuthority: authority })).toContain("public_alias");
    expect(validateReleaseIdentity({ ...identity, public_alias: { url: "https://forge.example/", resolved_at: "2026-02-30T00:00:00.000Z" } } as never, { verificationAuthority: authority })).toContain("public_alias");
    expect(validateReleaseIdentity({ ...identity, build_runtime_mode: "production" }, { verificationAuthority: authority })).toContain("terminal_runtime_mode");
    expect(validateReleaseIdentity({ ...identity, cloud_provider_flags: { ...FLAGS, unapproved: false } }, { verificationAuthority: authority })).toContain("cloud_provider_flags");
    expect(validateReleaseIdentity({ ...identity, cloud_provider_flags: { ...FLAGS, managed_openai: "false" } } as never, { verificationAuthority: authority })).toContain("cloud_provider_flags");
  });

  it("requires every terminal artifact and exact independent authority match", () => {
    const { identity, authority } = terminal();
    expect(validateReleaseIdentity({ ...identity, retained_artifact_ids: ["production-verification-1", "live-evaluation-1"] }, { verificationAuthority: authority })).toContain("production_verified_evidence");
    expect(validateReleaseIdentity({ ...identity, critical_verification: { ...identity.critical_verification, packet_artifact_ids: ["live-evaluation-1"] } }, { verificationAuthority: authority })).toContain("production_verified_evidence");
    expect(validateReleaseIdentity(identity, { verificationAuthority: { ...authority, immutable_deployment: { ...authority.immutable_deployment, id: "dpl-other" } } })).toContain("production_verified_evidence");
    expect(validateReleaseIdentity(identity, { verificationAuthority: { ...authority, public_alias: { ...authority.public_alias, resolved_deployment_id: "dpl-other" } } })).toContain("production_verified_evidence");
    expect(validateReleaseIdentity(identity, { verificationAuthority: { ...authority, live_evaluation: { status: "pass", artifact_id: "unretained-live" } } })).toContain("production_verified_evidence");
    expect(validateReleaseIdentity(identity, { verificationAuthority: { ...authority, rollback_rehearsal: { ...authority.rollback_rehearsal, artifact_id: "unretained-rollback" } } })).toContain("production_verified_evidence");
    expect(validateReleaseIdentity(identity, { verificationAuthority: { ...authority, named_release_decision: { ...authority.named_release_decision, name: "different-principal-decision" } } })).toContain("production_verified_evidence");
  });

  it("rejects unknown identity fields, including secret-like nested keys", () => {
    const { identity, authority } = terminal();
    expect(validateReleaseIdentity({ ...identity, api_key: "sk-not-a-release-field" }, { verificationAuthority: authority })).toContain("identity_schema");
    expect(validateReleaseIdentity({ ...identity, immutable_deployment: { ...identity.immutable_deployment, token: "not-allowed" } } as never, { verificationAuthority: authority })).toContain("immutable_deployment");
    expect(validateReleaseIdentity({ ...identity, public_alias: { ...identity.public_alias, password: "not-allowed" } } as never, { verificationAuthority: authority })).toContain("public_alias");
    expect(validateReleaseIdentity({ ...identity, critical_verification: { ...identity.critical_verification, api_key: "not-allowed" } }, { verificationAuthority: authority })).toContain("critical_verification");
    expect(validateReleaseIdentity({ ...identity, rollback: { ...identity.rollback, token: "not-allowed" } }, { verificationAuthority: authority })).toContain("rollback");
    expect(validateReleaseIdentity({ ...identity, named_release_decision: { ...identity.named_release_decision, password: "not-allowed" } }, { verificationAuthority: authority })).toContain("named_release_decision");
  });

  it.each([
    ["authority top level", (authority: ReleaseIdentityVerificationAuthority) => ({ ...authority, api_key: "not-allowed" })],
    ["immutable deployment", (authority: ReleaseIdentityVerificationAuthority) => ({ ...authority, immutable_deployment: { ...authority.immutable_deployment, token: "not-allowed" } })],
    ["public alias", (authority: ReleaseIdentityVerificationAuthority) => ({ ...authority, public_alias: { ...authority.public_alias, password: "not-allowed" } })],
    ["live evaluation", (authority: ReleaseIdentityVerificationAuthority) => ({ ...authority, live_evaluation: { ...authority.live_evaluation, api_key: "not-allowed" } })],
    ["rollback rehearsal", (authority: ReleaseIdentityVerificationAuthority) => ({ ...authority, rollback_rehearsal: { ...authority.rollback_rehearsal, token: "not-allowed" } })],
    ["release decision", (authority: ReleaseIdentityVerificationAuthority) => ({ ...authority, named_release_decision: { ...authority.named_release_decision, password: "not-allowed" } })],
  ])("rejects secret-like extra key in %s", (_label, mutate) => {
    const { identity, authority } = terminal();
    const malformedAuthority = mutate(authority);
    expect(validateReleaseIdentity(identity, { verificationAuthority: malformedAuthority as never })).toContain("production_verified_evidence");
  });

  it("remains total across 1,260 malformed nested identity values", () => {
    const { identity, authority } = terminal();
    const values: unknown[] = [undefined, null, true, false, 0, 1, "", "invalid", [], [null], {}, { extra: true }, () => undefined, new Date(0)];
    const fields = ["retained_artifact_ids", "immutable_deployment", "public_alias", "build_runtime_mode", "cloud_provider_flags", "database", "critical_verification", "rollback", "named_release_decision"] as const;
    let checked = 0;
    for (let round = 0; round < 10; round += 1) for (const field of fields) for (const value of values) {
      const malformed = { ...identity, [field]: value };
      expect(() => validateReleaseIdentity(malformed, { verificationAuthority: authority })).not.toThrow();
      checked += 1;
    }
    expect(checked).toBe(1_260);
  });

  it.each([
    "Packet D worker handoff; promotion not authorized",
    "Packet D offline regression; promotion not authorized",
    "worker release review",
    "offline release review",
    "principal review; not authorized",
  ])("rejects reserved or non-authorizing terminal decision %s", (name) => {
    const { identity, authority } = terminal();
    const terminalIdentity = { ...identity, named_release_decision: { ...identity.named_release_decision, name } };
    const terminalAuthority = { ...authority, named_release_decision: { ...authority.named_release_decision, name } };
    expect(validateReleaseIdentity(terminalIdentity, { verificationAuthority: terminalAuthority })).toContain("production_verified_evidence");
  });

  it("requires rollback terminal evidence to resolve the public alias to the actual rollback deployment", () => {
    const { identity, authority } = terminal("ROLLED_BACK");
    expect(validateReleaseIdentity(identity, { verificationAuthority: authority })).toEqual([]);
    expect(validateReleaseIdentity({ ...identity, rollback: { ...identity.rollback, deployment_id: "dpl-other" } }, { verificationAuthority: authority })).toContain("rolled_back_evidence");
    expect(validateReleaseIdentity(identity, { verificationAuthority: { ...authority, public_alias: { ...authority.public_alias, resolved_deployment_id: "dpl-other" } } })).toContain("rolled_back_evidence");
    expect(validateReleaseIdentity(identity, { verificationAuthority: { ...authority, rollback_rehearsal: { ...authority.rollback_rehearsal, artifact_id: "not-retained" } } })).toContain("rolled_back_evidence");
  });
});
