import { describe, expect, it } from "vitest";

import { buildReleaseManifest, isBoundReleaseManifest, validateReleaseManifest } from "./release-manifest";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const DIGEST = "a".repeat(64);
const TIME = "2026-07-23T00:00:00.000Z";

function candidate(overrides: Record<string, string | undefined> = {}) {
  return buildReleaseManifest({
    FORGE_RELEASE_CANDIDATE_STATE: "DEPLOYED_CANDIDATE",
    FORGE_RELEASE_SHA: SHA,
    VERCEL_GIT_COMMIT_SHA: SHA,
    VERCEL_DEPLOYMENT_ID: "dpl_AbCdEfGhIjKlMnOpQrStUvWxYz12",
    VERCEL_URL: "forge-learning-test123-ranapriyanshs-projects.vercel.app",
    VERCEL_PROJECT_ID: "prj_SnTYtzLicYKYlHvXCNwq9J7ehQZB",
    FORGE_BUILD_TIME: TIME,
    FORGE_LOCKFILE_DIGEST: DIGEST,
    ...overrides,
  });
}

describe("release manifest", () => {
  it("keeps a local build unbound instead of manufacturing public provenance", () => {
    const manifest = buildReleaseManifest({ FORGE_RELEASE_SHA: SHA, FORGE_BUILD_TIME: TIME, FORGE_LOCKFILE_DIGEST: DIGEST });
    expect(manifest).toMatchObject({ binding_status: "unbound", candidate_state: "unknown", source_sha: "unknown" });
    expect(validateReleaseManifest(manifest)).toEqual([]);
  });

  it("binds a complete exact candidate tuple", () => {
    const manifest = candidate();
    expect(isBoundReleaseManifest(manifest)).toBe(true);
    expect(manifest).toMatchObject({
      candidate_state: "DEPLOYED_CANDIDATE",
      source_sha: SHA,
      dependency_lock_digest: DIGEST,
      immutable_deployment: { id: "dpl_AbCdEfGhIjKlMnOpQrStUvWxYz12", url: "https://forge-learning-test123-ranapriyanshs-projects.vercel.app/", project_id: "prj_SnTYtzLicYKYlHvXCNwq9J7ehQZB" },
      public_alias: { url: "https://modelshift.vercel.app/" },
      public_asset: { status: "provider_receipt_required", gate: "provider_observed_asset_digest_required_before_promotion" },
    });
    expect("build_time" in manifest).toBe(false);
  });

  it("keeps caller build time out of the bound provenance tuple", () => {
    const manifest = candidate({ FORGE_BUILD_TIME: "not-provider-provenance" });
    expect(isBoundReleaseManifest(manifest)).toBe(true);
    expect(JSON.stringify(manifest)).not.toContain("build_time");
  });

  it("rejects a caller-supplied build asset digest instead of self-attesting remote output", () => {
    const manifest = candidate({
      FORGE_PUBLIC_ASSET_DIGEST: DIGEST,
    });
    expect(isBoundReleaseManifest(manifest)).toBe(false);
    expect(manifest).toMatchObject({ binding_status: "unbound", reason_codes: expect.arrayContaining(["public_asset_digest"]) });
  });

  it.each([
    ["unknown candidate state", { FORGE_RELEASE_CANDIDATE_STATE: "PRODUCTION_VERIFIED" }, "candidate_state"],
    ["malformed lock digest", { FORGE_LOCKFILE_DIGEST: "short" }, "dependency_lock_digest"],
    ["caller public asset absence gate", { FORGE_PUBLIC_ASSET_DIGEST_STATUS: "absent_with_gate" }, "public_asset_digest"],
    ["malformed platform immutable URL", { VERCEL_URL: "forge-learning-test123-ranapriyanshs-projects.vercel.app/path" }, "immutable_deployment"],
    ["non-default Vercel HTTPS port 444", { VERCEL_URL: "forge-learning-test123-ranapriyanshs-projects.vercel.app:444" }, "immutable_deployment"],
    ["non-default Vercel HTTPS port 8443", { VERCEL_URL: "forge-learning-test123-ranapriyanshs-projects.vercel.app:8443" }, "immutable_deployment"],
    ["caller alias receipt", { FORGE_RELEASE_ALIAS_RESOLVED_AT: "2026-07-23T00:00:01.000Z" }, "public_alias"],
    ["placeholder deployment identity", { VERCEL_DEPLOYMENT_ID: "dpl-placeholder" }, "immutable_deployment"],
    ["localhost immutable origin", { VERCEL_URL: "localhost" }, "immutable_deployment"],
    ["IP-literal immutable origin", { VERCEL_URL: "203.0.113.1" }, "immutable_deployment"],
    ["wrong Vercel project", { VERCEL_PROJECT_ID: "prj_AbCdEfGhIjKlMnOpQrStUvWxYz12" }, "deployment_project"],
    ["caller identity conflicts with platform identity", { FORGE_RELEASE_DEPLOYMENT_ID: "dpl_ZzYyXxWwVvUuTtSsRrQqPpOoNnMm" }, "immutable_deployment"],
    ["unexpected source drift", { VERCEL_GIT_COMMIT_SHA: "f".repeat(40) }, "source_drift"],
  ])("fails closed for %s", (_label, overrides, expected) => {
    const manifest = candidate(overrides);
    expect(isBoundReleaseManifest(manifest)).toBe(false);
    expect(manifest).toMatchObject({ binding_status: "unbound", reason_codes: expect.arrayContaining([expected]) });
  });

  it("rejects forged unknown fields and malformed nested payloads", () => {
    const bound = candidate();
    expect(validateReleaseManifest({ ...bound, token: "not-allowed" })).not.toEqual([]);
    expect(validateReleaseManifest({ ...bound, public_asset: { status: "provider_receipt_required", gate: "provider_observed_asset_digest_required_before_promotion", extra: true } })).not.toEqual([]);
    expect(validateReleaseManifest({ ...bound, immutable_deployment: { id: "dpl_AbCdEfGhIjKlMnOpQrStUvWxYz12", url: "https://forge-learning-test123-ranapriyanshs-projects.vercel.app/", project_id: "prj_SnTYtzLicYKYlHvXCNwq9J7ehQZB", api_key: "not-allowed" } })).not.toEqual([]);
    expect(validateReleaseManifest({ ...bound, public_alias: { url: "https://modelshift.vercel.app/", resolved_at: TIME } })).toContain("public_alias");
  });

  it("rejects non-canonical alias and immutable URL attack forms", () => {
    const bound = candidate();
    const forms = [
      "https://user:pass@forge-learning-test123-ranapriyanshs-projects.vercel.app/",
      "https://forge-learning-test123-ranapriyanshs-projects.vercel.app/path",
      "https://forge-learning-test123-ranapriyanshs-projects.vercel.app/?query=1",
      "https://forge-learning-test123-ranapriyanshs-projects.vercel.app/#fragment",
      "https://203.0.113.1/",
      "https://localhost/",
      "https://forge-learning-test123-ranapriyanshs-projects.vercel.app:444/",
      "https://forge-learning-test123-ranapriyanshs-projects.vercel.app:8443/",
    ];
    for (const url of forms) {
      expect(validateReleaseManifest({ ...bound, public_alias: { url } })).toContain("public_alias");
      expect(validateReleaseManifest({ ...bound, immutable_deployment: { ...bound.immutable_deployment, url } })).toContain("immutable_deployment");
    }
  });

  it("normalizes an explicit default HTTPS port away but never accepts a non-default one", () => {
    const manifest = candidate({ VERCEL_URL: "forge-learning-test123-ranapriyanshs-projects.vercel.app:443" });
    expect(manifest).toMatchObject({ binding_status: "bound", immutable_deployment: { url: "https://forge-learning-test123-ranapriyanshs-projects.vercel.app/" } });
  });

  it("never trusts a caller-supplied post-deploy alias timestamp", () => {
    const manifest = candidate({ FORGE_RELEASE_ALIAS_RESOLVED_AT: TIME });
    expect(manifest).toMatchObject({ binding_status: "unbound", reason_codes: expect.arrayContaining(["public_alias"]) });
    expect(JSON.stringify(manifest)).not.toContain("resolved_at");
  });
});
