import { describe, expect, it } from "vitest";
import { createServer, request as httpRequest } from "node:http";
import type { AddressInfo, LookupFunction } from "node:net";

import { CANONICAL_DEPLOYMENT_ROUTES, createPinnedLookup, IANA_IPV6_GLOBAL_UNICAST_POLICY_VERSION, IANA_SPECIAL_PURPOSE_POLICY_VERSION, INITIAL_HTML_CLIENT_ASSET_BUDGET, validateTargetUrl, verifyDeployment, type DeploymentVerificationReport } from "../../scripts/ops/deployment-verifier";
import { matchesImmutableDeploymentTarget, resolveDeploymentTarget } from "../../scripts/ops/deployment-target-policy";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const DIGEST = "a".repeat(64);
const TEST_DEPLOYMENT_TARGET = {
  origin: "https://forge.example",
  hostname: "forge.example",
  project_id: "prj_SnTYtzLicYKYlHvXCNwq9J7ehQZB",
  team_id: "team_lr0E9GlEDc3XYJP7xrx8po2W",
  git_source: { type: "github", ref: "main", repository_id: 1308085427 },
  git_repository: { namespace: "RanaPriyansh", name: "modelshift", path: "RanaPriyansh/modelshift", type: "github", default_branch: "main" },
  immutable_deployment: {
    hostname_prefix: "forge-learning-",
    hostname_suffix: "-ranapriyanshs-projects.vercel.app",
  },
} as const;
const DEPLOYMENT_ID = "dpl_AbCdEfGhIjKlMnOpQrStUvWxYz12";
const CSP = "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'nonce-testnonce' 'strict-dynamic'; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests";
const RELEASE_MANIFEST = {
  schema_version: "1.0",
  binding_status: "bound",
  candidate_state: "DEPLOYED_CANDIDATE",
  source_sha: SHA,
  dependency_lock_digest: DIGEST,
  public_asset: { status: "provider_receipt_required", gate: "provider_observed_asset_digest_required_before_promotion" },
  immutable_deployment: { id: DEPLOYMENT_ID, url: "https://forge-learning-test123-ranapriyanshs-projects.vercel.app/", project_id: TEST_DEPLOYMENT_TARGET.project_id },
  public_alias: { url: "https://forge.example/" },
} as const;
const PROVIDER_RECEIPT = {
  schema_version: "1.0",
  receipt_kind: "vercel_authenticated_build_log",
  provider: "vercel",
  collected_at: "2026-07-22T00:00:02.000Z",
  deployment: {
    id: DEPLOYMENT_ID,
    project_id: TEST_DEPLOYMENT_TARGET.project_id,
    source_sha: SHA,
    immutable_url: RELEASE_MANIFEST.immutable_deployment.url,
    ready_state: "READY",
    created_at: "2026-07-22T00:00:00.000Z",
  },
  public_asset: {
    algorithm: "sha256",
    digest: DIGEST,
    source: "vercel_build_log_marker",
    event_id: "evt_AbCdEfGhIjKlMnOpQrStUvWxYz12",
    observed_at: "2026-07-22T00:00:01.000Z",
  },
} as const;
const pages: Record<string, string> = {
  "/": "FORGE",
  "/learn/force-and-motion": "Force & motion",
  "/learn/ai-and-learning": "AI & learning",
  "/learn/proportional-reasoning": "Proportional reasoning",
  "/learn/primary-source-reasoning": "Primary source reasoning",
  "/paths/source-corroboration": "Verify before you trust",
  "/pathways": "What FORGE can—and cannot—offer today. Availability map only",
  "/studio": "Lesson Studio provider-neutral",
  "/login": "device profile Cloud identity · not configured",
  "/account": "device evidence No cloud account active",
};
function scriptTag(url: string): string { return `<script nonce=\"testnonce\" src=\"${url}\"></script>`; }
function mockFetch(asset = "self.__next_f=[]", defaultAssets: readonly string[] = ["/_next/static/app.js"], routeAssets: Readonly<Record<string, readonly string[]>> = {}, releaseManifest: unknown = RELEASE_MANIFEST, healthBuildTime = "2026-07-22T00:00:00.000Z") {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.pathname === "/api/health") return Response.json({ schema_version: "1.0", status: "ok", service: "forge-learning-os", app_name: "FORGE", release_sha: SHA, build_time: healthBuildTime, runtime_mode: "fallback_only", cloud_accounts_enabled: false, cloud_auth_configured: false, device_profiles: "device_only", learner_evidence_sync: "disabled", dependency_lock_digest: DIGEST, content_package_manifest_digest: DIGEST, evaluator_baseline_digest: DIGEST, database_migration_identity: "not_configured", managed_surface_flags: { lesson_studio: false, interpretation: false, planner: false }, managed_provider_flags: { openai: false, anthropic: false, gemini: false, openrouter: false }, provider_mode: "request_only_byok", release_manifest: releaseManifest }, { headers: { "cache-control": "no-store", "x-forge-release-sha": SHA } });
    if (url.pathname.startsWith("/_next/static/")) return new Response(asset, { headers: { "content-type": "application/javascript" } });
    const scripts = routeAssets[url.pathname] ?? defaultAssets;
    return new Response(`<html><body>${pages[url.pathname] ?? ""}${scripts.map(scriptTag).join("")}</body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": CSP, "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "strict-origin-when-cross-origin", "permissions-policy": "camera=(), microphone=(), geolocation=()" } });
  };
}
async function run(fetchImpl = mockFetch(), externalProviderReceipt?: unknown): Promise<DeploymentVerificationReport> { return verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: fetchImpl as typeof fetch, generatedAt: "2026-07-22T00:00:03.000Z", expectedLockfileDigest: DIGEST, externalProviderReceipt, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured", deploymentTarget: TEST_DEPLOYMENT_TARGET, resolveHostname: async () => ["8.8.8.8"] }); }
describe("deployment verifier", () => {
  it("uses the Node all-address lookup shape while pinning the validated address", async () => {
    const server = createServer((_request, response) => response.end("pinned"));
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    try {
      const port = (server.address() as AddressInfo).port;
      let lookupOptions: Parameters<LookupFunction>[1] | undefined;
      const response = await new Promise<string>((resolve, reject) => {
        const lookup: LookupFunction = (hostname, options, callback) => {
          lookupOptions = options;
          createPinnedLookup("127.0.0.1")(hostname, options, callback);
        };
        // @types/node has not yet exposed this net connection option on http.RequestOptions.
        const requestOptions: import("node:http").ClientRequestArgs & { autoSelectFamily: boolean } = { hostname: "pinned.example", port, autoSelectFamily: true, lookup };
        const request = httpRequest(requestOptions, (incoming) => {
          let body = "";
          incoming.setEncoding("utf8");
          incoming.on("data", (chunk: string) => { body += chunk; });
          incoming.on("end", () => resolve(body));
        });
        request.once("error", reject);
        request.end();
      });
      expect(lookupOptions?.all).toBe(true);
      expect(response).toBe("pinned");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
  it("checks all four Worlds, the source-corroboration path, shell routes, CSP nonce, and disabled state without promoting a plain receipt", async () => { const report = await run(); expect(report.status).toBe("fail"); expect(report.observed_release_sha).toBe(SHA); expect(report.request_policy.methods).toEqual(["GET"]); expect(report.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED"); expect(report.release_identity.source_sha).toBe(SHA); expect(report.release_identity.tested_sha).toBe(SHA); expect(report.release_identity.database).toEqual({ status: "not_configured" }); expect(report.alias_verified_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/); expect(report.checks.some((item) => item.id === "world_primary_source_reasoning.marker" && item.status === "pass")).toBe(true); expect(report.checks.some((item) => item.id === "source_corroboration_path.marker" && item.status === "pass")).toBe(true); expect(report.checks.some((item) => item.id === "pathway_availability.marker" && item.status === "pass")).toBe(true); expect(report.checks.find((item) => item.id === "provider_receipt.authority")?.status).toBe("fail"); });
  it("keeps the source-corroboration route in the exact canonical verifier route set", () => {
    expect(CANONICAL_DEPLOYMENT_ROUTES.map((route) => route.path)).toEqual([
      "/",
      "/learn/force-and-motion",
      "/learn/ai-and-learning",
      "/learn/proportional-reasoning",
      "/learn/primary-source-reasoning",
      "/paths/source-corroboration",
      "/pathways",
      "/studio",
      "/login",
      "/account",
    ]);
  });
  it("fails closed for zero and over-budget initial asset unions, but scans every asset at the exact budget", async () => {
    const assets = (count: number) => Array.from({ length: count }, (_, index) => `/_next/static/chunks/chunk-${index}.js`);
    const zero = await run(mockFetch("self.__next_f=[]", []));
    expect(zero.status).toBe("fail");
    expect(zero.checks.find((item) => item.id === "client_assets.bounded_count")).toMatchObject({ status: "fail", detail: expect.stringContaining("contains 0 distinct assets") });

    const exact = await run(mockFetch("self.__next_f=[]", assets(INITIAL_HTML_CLIENT_ASSET_BUDGET)));
    expect(exact.status).toBe("fail");
    expect(exact.checks.find((item) => item.id === "client_assets.bounded_count")).toMatchObject({ status: "pass", detail: expect.stringContaining(`contains ${INITIAL_HTML_CLIENT_ASSET_BUDGET} distinct assets`) });
    expect(exact.checks.filter((item) => item.id.startsWith("client_asset.") && item.status === "pass")).toHaveLength(INITIAL_HTML_CLIENT_ASSET_BUDGET);

    const over = await run(mockFetch("self.__next_f=[]", assets(INITIAL_HTML_CLIENT_ASSET_BUDGET + 1)));
    expect(over.status).toBe("fail");
    expect(over.checks.find((item) => item.id === "client_assets.bounded_count")).toMatchObject({ status: "fail", detail: expect.stringContaining(`contains ${INITIAL_HTML_CLIENT_ASSET_BUDGET + 1} distinct assets`) });
    expect(over.checks.some((item) => item.id.startsWith("client_asset."))).toBe(false);
  });
  it("rejects unsafe remote targets and fails without leaking asset secrets", async () => { expect(() => validateTargetUrl("http://forge.example", ["forge.example"])).toThrow(/HTTPS/); expect(() => validateTargetUrl("https://user:pass@forge.example", ["forge.example"])).toThrow(/credentials/); const secret = `sk-${"x".repeat(32)}`; const report = await run(mockFetch(`window.token=\"${secret}\"`)); expect(report.status).toBe("fail"); expect(JSON.stringify(report)).not.toContain(secret); });
  it("uses only the checked-in public deployment target policy", () => { expect(resolveDeploymentTarget("forge_learning_os_project")).toMatchObject({ origin: "https://modelshift.vercel.app", hostname: "modelshift.vercel.app", project_id: TEST_DEPLOYMENT_TARGET.project_id, immutable_deployment: TEST_DEPLOYMENT_TARGET.immutable_deployment }); expect(() => resolveDeploymentTarget("caller-controlled-host")).toThrow(/allowlist/); expect(() => validateTargetUrl("https://192.0.2.1", ["192.0.2.1"])).toThrow(/IP-literal/); expect(() => validateTargetUrl("http://localhost")).toThrow(/allow-localhost/); });
  it("defaults remote verification without immutable metadata to blocked, never deployed candidate", async () => {
    const report = await verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: mockFetch("self.__next_f=[]", ["/_next/static/app.js"], {}, { schema_version: "1.0", binding_status: "unbound", candidate_state: "unknown", source_sha: "unknown", dependency_lock_digest: "unknown", public_asset: { status: "unknown" }, immutable_deployment: { status: "unknown" }, public_alias: { status: "unknown" }, reason_codes: [] }) as typeof fetch, expectedLockfileDigest: DIGEST, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured", resolveHostname: async () => ["8.8.8.8"] });
    expect(report.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
    expect(report.status).toBe("fail");
    expect(report.checks.find((item) => item.id === "release_identity.state_bound")?.status).toBe("fail");
  });
  it("fails closed for malformed and contradictory public candidate manifests", async () => {
    const malformed = await run(mockFetch("self.__next_f=[]", ["/_next/static/app.js"], {}, { ...RELEASE_MANIFEST, public_asset: { status: "provider_receipt_required", gate: "wrong" } }) as typeof fetch);
    expect(malformed.status).toBe("fail");
    expect(malformed.checks.find((item) => item.id === "health.release_manifest.schema")?.status).toBe("fail");

    const contradictory = await run(mockFetch("self.__next_f=[]", ["/_next/static/app.js"], {}, { ...RELEASE_MANIFEST, source_sha: "f".repeat(40) }) as typeof fetch);
    expect(contradictory.status).toBe("fail");
    expect(contradictory.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
    expect(contradictory.checks.find((item) => item.id === "health.release_manifest.binding")?.status).toBe("fail");
  });
  it("binds the manifest alias exactly to the normalized verifier target", async () => {
    const report = await run(mockFetch("self.__next_f=[]", ["/_next/static/app.js"], {}, {
      ...RELEASE_MANIFEST,
      public_alias: { ...RELEASE_MANIFEST.public_alias, url: "https://unrelated.example/" },
    }) as typeof fetch);
    expect(report.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
    expect(report.checks.find((item) => item.id === "health.release_manifest.alias_target")?.status).toBe("fail");
  });
  it("keeps app build_time diagnostic-only while provider receipt timestamps control provenance", async () => {
    const report = await run(mockFetch("self.__next_f=[]", ["/_next/static/app.js"], {}, RELEASE_MANIFEST, "not-a-provider-time") as typeof fetch, PROVIDER_RECEIPT);
    expect(report.checks.find((item) => item.id === "health.build_time_diagnostic")?.status).toBe("fail");
    expect(report.checks.find((item) => item.id === "provider_receipt.tuple")?.status).toBe("pass");
    expect(report.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
  });
  it("rejects immutable deployment hosts and IDs outside the bounded FORGE naming policy", async () => {
    const alias = "https://forge.example/";
    for (const deployment of [
      { id: DEPLOYMENT_ID, url: "https://unrelated.example/", project_id: TEST_DEPLOYMENT_TARGET.project_id },
      { id: DEPLOYMENT_ID, url: "https://localhost/", project_id: TEST_DEPLOYMENT_TARGET.project_id },
      { id: DEPLOYMENT_ID, url: "https://203.0.113.1/", project_id: TEST_DEPLOYMENT_TARGET.project_id },
      { id: DEPLOYMENT_ID, url: "https://forge-learning-test123-ranapriyanshs-projects.vercel.app:444/", project_id: TEST_DEPLOYMENT_TARGET.project_id },
      { id: DEPLOYMENT_ID, url: "https://forge-learning-test123-ranapriyanshs-projects.vercel.app:8443/", project_id: TEST_DEPLOYMENT_TARGET.project_id },
      { id: DEPLOYMENT_ID, url: alias, project_id: TEST_DEPLOYMENT_TARGET.project_id },
      { id: "dpl_placeholder", url: RELEASE_MANIFEST.immutable_deployment.url, project_id: TEST_DEPLOYMENT_TARGET.project_id },
      { id: DEPLOYMENT_ID, url: RELEASE_MANIFEST.immutable_deployment.url, project_id: "prj_AbCdEfGhIjKlMnOpQrStUvWxYz12" },
    ]) expect(matchesImmutableDeploymentTarget(deployment, alias, TEST_DEPLOYMENT_TARGET)).toBe(false);

    const report = await run(mockFetch("self.__next_f=[]", ["/_next/static/app.js"], {}, {
      ...RELEASE_MANIFEST,
      immutable_deployment: { id: DEPLOYMENT_ID, url: "https://unrelated.example/", project_id: TEST_DEPLOYMENT_TARGET.project_id },
    }) as typeof fetch);
    expect(report.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
    expect(report.checks.find((item) => item.id === "health.release_manifest.immutable_target")?.status).toBe("fail");
  });
  it("blocks a mocked manifest with a non-default immutable deployment port", async () => {
    const report = await run(mockFetch("self.__next_f=[]", ["/_next/static/app.js"], {}, {
      ...RELEASE_MANIFEST,
      immutable_deployment: { ...RELEASE_MANIFEST.immutable_deployment, url: "https://forge-learning-test123-ranapriyanshs-projects.vercel.app:444/" },
    }) as typeof fetch);
    expect(report.status).toBe("fail");
    expect(report.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
    expect(report.checks.find((item) => item.id === "health.release_manifest.schema")?.status).toBe("fail");
  });
  it("treats every programmatic plain receipt as external evidence", async () => {
    const missingExpected = await verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: mockFetch() as typeof fetch, expectedLockfileDigest: DIGEST, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured", deploymentTarget: TEST_DEPLOYMENT_TARGET, resolveHostname: async () => ["8.8.8.8"] });
    expect(missingExpected.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
    expect(missingExpected.checks.find((item) => item.id === "provider_receipt.schema")?.status).toBe("fail");

    const selfReported = await run(mockFetch(), PROVIDER_RECEIPT);
    expect(selfReported.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
    expect(selfReported.checks.find((item) => item.id === "provider_receipt.authority")?.status).toBe("fail");

    const forgedAuthorityObject = await run(mockFetch(), { authority: "authenticated_vercel_api", receipt: PROVIDER_RECEIPT });
    expect(forgedAuthorityObject.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
    expect(forgedAuthorityObject.checks.find((item) => item.id === "provider_receipt.authority")?.status).toBe("fail");

    const malformed = await run(mockFetch(), { ...PROVIDER_RECEIPT, public_asset: { ...PROVIDER_RECEIPT.public_asset, digest: "short" } });
    expect(malformed.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
    expect(malformed.checks.find((item) => item.id === "provider_receipt.schema")?.status).toBe("fail");
  });
  it("fails closed for provider receipt deployment, project, source, URL, and stale-time mismatches", async () => {
    const cases = [
      { deployment: { ...PROVIDER_RECEIPT.deployment, id: "dpl_ZzYyXxWwVvUuTtSsRrQqPpOoNnMm" } },
      { deployment: { ...PROVIDER_RECEIPT.deployment, project_id: "prj_AbCdEfGhIjKlMnOpQrStUvWxYz12" } },
      { deployment: { ...PROVIDER_RECEIPT.deployment, source_sha: "f".repeat(40) } },
      { deployment: { ...PROVIDER_RECEIPT.deployment, immutable_url: "https://forge-learning-other999-ranapriyanshs-projects.vercel.app/" } },
      { public_asset: { ...PROVIDER_RECEIPT.public_asset, observed_at: "2026-07-21T23:59:59.000Z" }, collected_at: "2026-07-22T00:00:02.000Z" },
    ];
    for (const overrides of cases) {
      const report = await run(mockFetch(), { ...PROVIDER_RECEIPT, ...overrides });
      expect(report.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
      expect(report.checks.find((item) => item.id === "health.release_manifest.binding")?.status).toBe("fail");
    }
  });
  it("does not require two provider-observed builds of the same source to share an asset digest", async () => {
    const first = await run(mockFetch(), { ...PROVIDER_RECEIPT, public_asset: { ...PROVIDER_RECEIPT.public_asset, digest: "a".repeat(64) } });
    const second = await run(mockFetch(), { ...PROVIDER_RECEIPT, public_asset: { ...PROVIDER_RECEIPT.public_asset, digest: "b".repeat(64) } });
    for (const report of [first, second]) {
      expect(report.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
      expect(report.checks.find((item) => item.id === "provider_receipt.tuple")?.status).toBe("pass");
      expect(report.checks.find((item) => item.id === "provider_receipt.authority")?.status).toBe("fail");
    }
  });
  it.each([
    "::",
    "::1",
    "ff02::1",
    "fe80::1",
    "fc00::1",
    "2001:db8::1",
    "::ffff:169.254.169.254",
    "::ffff:8.8.8.8",
    "64:ff9b::7f00:1",
    "192.0.2.10",
    "192.31.196.1",
    "192.52.193.1",
    "192.175.48.1",
    "4000::1",
    "6000::1",
    "2500::1",
    "2700::1",
    "3fff::1",
    "3fff:0fff:ffff:ffff:ffff:ffff:ffff:ffff",
    "3fff:1000::1",
    "2001:30::1",
    "100:0:0:1::1",
    "2620:4f:8000::1",
    "5f00::1",
  ])("rejects non-global or special resolver answer %s before any request", async (address) => {
    let calls = 0;
    const fetchImpl = async () => { calls += 1; return new Response("unexpected"); };
    const report = await verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: fetchImpl as typeof fetch, resolveHostname: async () => [address], expectedLockfileDigest: DIGEST, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured" });
    expect(report.status).toBe("fail");
    expect(report.checks.find((item) => item.id === "target.dns_policy")?.status).toBe("fail");
    expect(calls).toBe(0);
  });
  it.each(["8.8.8.8", "2001:4860:4860::8888", "2400::1", "240f:ffff:ffff:ffff:ffff:ffff:ffff:ffff", "2600::1", "260f:ffff:ffff:ffff:ffff:ffff:ffff:ffff"])("accepts a currently allocated public address: %s", async (address) => {
    let calls = 0;
    const fetchImpl = async (input: string | URL | Request) => {
      calls += 1;
      return mockFetch()(input);
    };
    const report = await verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: fetchImpl as typeof fetch, generatedAt: "2026-07-22T00:00:03.000Z", expectedLockfileDigest: DIGEST, externalProviderReceipt: PROVIDER_RECEIPT, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured", deploymentTarget: TEST_DEPLOYMENT_TARGET, resolveHostname: async () => [address] });
    expect(report.checks.find((item) => item.id === "target.dns_policy")?.status).toBe("pass");
    expect(report.status).toBe("fail");
    expect(calls).toBeGreaterThan(0);
  });
  it("records the current IANA registry snapshot alongside the CIDR policy", () => {
    expect(IANA_SPECIAL_PURPOSE_POLICY_VERSION).toBe("2025-10-09");
    expect(IANA_IPV6_GLOBAL_UNICAST_POLICY_VERSION).toBe("2025-10-10");
  });
  it("fails closed for DNS rebinding and redirect hops without issuing an unpinned request", async () => {
    let resolveCalls = 0;
    const rebindReport = await verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: mockFetch() as typeof fetch, resolveHostname: async () => { resolveCalls += 1; return resolveCalls === 1 ? ["8.8.8.8"] : ["8.8.4.4"]; }, expectedLockfileDigest: DIGEST, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured" });
    expect(rebindReport.status).toBe("fail");
    expect(rebindReport.checks.some((item) => item.id === "health.request" && item.status === "fail")).toBe(true);
    const redirectFetch = async (input: string | URL | Request) => {
      const response = await mockFetch()(input);
      return Object.assign(response, { url: "https://untrusted.example/redirect" }) as Response;
    };
    const redirectReport = await verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: redirectFetch as typeof fetch, resolveHostname: async () => ["8.8.8.8"], expectedLockfileDigest: DIGEST, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured" });
    expect(redirectReport.status).toBe("fail");
    expect(redirectReport.checks.some((item) => item.id === "health.request" && item.status === "fail")).toBe(true);
  });
  it("requires the explicit CSP script contract for every executable element", async () => {
    const baseFetch = mockFetch();
    const badFetch = async (input: string | URL | Request, init?: RequestInit) => {
      void init;
      const response = await baseFetch(input);
      if (new URL(input instanceof Request ? input.url : input.toString()).pathname === "/api/health") return response;
      const headers = new Headers(response.headers);
      headers.set("content-security-policy", "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'nonce-testnonce' 'unsafe-inline'; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests");
      return new Response(await response.text(), { status: response.status, headers });
    };
    const report = await run(badFetch as typeof fetch);
    expect(report.status).toBe("fail");
    expect(report.checks.some((item) => item.id === "home.csp.script_src_contract" && item.status === "fail")).toBe(true);
    expect(report.checks.some((item) => item.id === "home.csp.script_elements" && item.status === "pass")).toBe(true);
    const permissiveFetch = async (input: string | URL | Request) => {
      const response = await baseFetch(input);
      if (new URL(input instanceof Request ? input.url : input.toString()).pathname === "/api/health") return response;
      const headers = new Headers(response.headers);
      headers.set("content-security-policy", `${CSP}; connect-src 'self' https://exfil.example; form-action 'self' https://evil.example; script-src-elem 'self' https://evil.example`);
      return new Response(await response.text(), { status: response.status, headers });
    };
    const permissive = await run(permissiveFetch as typeof fetch);
    expect(permissive.status).toBe("fail");
    expect(permissive.checks.some((item) => item.id === "home.csp.connect_src" && item.status === "fail")).toBe(true);
    expect(permissive.checks.some((item) => item.id === "home.csp.form_action" && item.status === "fail")).toBe(true);
    expect(permissive.checks.some((item) => item.id === "home.csp.script_src_elem_contract" && item.status === "fail")).toBe(true);
    const redTeamFetch = async (input: string | URL | Request) => {
      const response = await baseFetch(input);
      if (new URL(input instanceof Request ? input.url : input.toString()).pathname === "/api/health") return response;
      const headers = new Headers(response.headers);
      headers.set("content-security-policy", "default-src 'self' https://exfil.example; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src *; font-src 'self' https://exfil.example; style-src 'self' 'unsafe-inline' https://exfil.example; script-src 'self' 'nonce-testnonce' 'strict-dynamic'; connect-src 'self' https://exfil.example; form-action 'self' https://exfil.example; media-src https://exfil.example; worker-src https://exfil.example");
      return new Response(await response.text(), { status: response.status, headers });
    };
    const redTeam = await run(redTeamFetch as typeof fetch);
    expect(redTeam.status).toBe("fail");
    expect(redTeam.checks.some((item) => item.id === "home.csp.contract" && item.status === "fail")).toBe(true);
  });
  it("rejects terminal-state and live-proof inputs from the worker verifier", async () => {
    await expect(verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: mockFetch() as typeof fetch, candidateState: "PRODUCTION_VERIFIED", expectedLockfileDigest: DIGEST, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured", resolveHostname: async () => ["8.8.8.8"] })).rejects.toThrow(/terminal/);
    await expect(verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: mockFetch() as typeof fetch, candidateState: "ROLLED_BACK", expectedLockfileDigest: DIGEST, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured", resolveHostname: async () => ["8.8.8.8"] })).rejects.toThrow(/terminal/);
    await expect(verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: mockFetch() as typeof fetch, liveEvaluationStatus: "pass", expectedLockfileDigest: DIGEST, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured", resolveHostname: async () => ["8.8.8.8"] })).rejects.toThrow(/live evaluation proof/);
  });
});
