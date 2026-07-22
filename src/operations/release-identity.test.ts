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
  });
});
