import { describe, expect, it } from "vitest";

import { IANA_IPV6_GLOBAL_UNICAST_POLICY_VERSION, IANA_SPECIAL_PURPOSE_POLICY_VERSION, validateTargetUrl, verifyDeployment, type DeploymentVerificationReport } from "../../scripts/ops/deployment-verifier";
import { resolveDeploymentTarget } from "../../scripts/ops/deployment-target-policy";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const DIGEST = "a".repeat(64);
const CSP = "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'nonce-testnonce' 'strict-dynamic'; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests";
const pages: Record<string, string> = {
  "/": "FORGE<script nonce=\"testnonce\" src=\"/_next/static/app.js\"></script>",
  "/learn/force-and-motion": "Force & motion<script nonce=\"testnonce\" src=\"/_next/static/app.js\"></script>",
  "/learn/ai-and-learning": "AI & learning<script nonce=\"testnonce\" src=\"/_next/static/app.js\"></script>",
  "/learn/proportional-reasoning": "Proportional reasoning<script nonce=\"testnonce\" src=\"/_next/static/app.js\"></script>",
  "/learn/primary-source-reasoning": "Primary source reasoning<script nonce=\"testnonce\" src=\"/_next/static/app.js\"></script>",
  "/studio": "Lesson Studio provider-neutral<script nonce=\"testnonce\" src=\"/_next/static/app.js\"></script>",
  "/login": "device profile Cloud identity · not configured<script nonce=\"testnonce\" src=\"/_next/static/app.js\"></script>",
  "/account": "device evidence No cloud account active<script nonce=\"testnonce\" src=\"/_next/static/app.js\"></script>",
};
function mockFetch(asset = "self.__next_f=[]") {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.pathname === "/api/health") return Response.json({ schema_version: "1.0", status: "ok", service: "forge-learning-os", app_name: "FORGE", release_sha: SHA, build_time: "2026-07-22T00:00:00.000Z", runtime_mode: "fallback_only", cloud_accounts_enabled: false, cloud_auth_configured: false, device_profiles: "device_only", learner_evidence_sync: "disabled", dependency_lock_digest: DIGEST, content_package_manifest_digest: DIGEST, evaluator_baseline_digest: DIGEST, database_migration_identity: "not_configured", managed_surface_flags: { lesson_studio: false, interpretation: false, planner: false }, managed_provider_flags: { openai: false, anthropic: false, gemini: false, openrouter: false }, provider_mode: "request_only_byok" }, { headers: { "cache-control": "no-store", "x-forge-release-sha": SHA } });
    if (url.pathname.startsWith("/_next/static/")) return new Response(asset, { headers: { "content-type": "application/javascript" } });
    return new Response(`<html><body>${pages[url.pathname] ?? ""}</body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": CSP, "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "strict-origin-when-cross-origin", "permissions-policy": "camera=(), microphone=(), geolocation=()" } });
  };
}
async function run(fetchImpl = mockFetch()): Promise<DeploymentVerificationReport> { return verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: fetchImpl as typeof fetch, generatedAt: "2026-07-22T00:00:00.000Z", deploymentId: "dpl-candidate", deploymentUrl: "https://deployment.example/", expectedLockfileDigest: DIGEST, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured", resolveHostname: async () => ["8.8.8.8"] }); }
describe("deployment verifier", () => {
  it("verifies all four Worlds, Studio, device profile, CSP nonce, and disabled state", async () => { const report = await run(); expect(report.status).toBe("pass"); expect(report.observed_release_sha).toBe(SHA); expect(report.request_policy.methods).toEqual(["GET"]); expect(report.release_identity.candidate_state).toBe("DEPLOYED_CANDIDATE"); expect(report.release_identity.source_sha).toBe(SHA); expect(report.release_identity.tested_sha).toBe(SHA); expect(report.release_identity.database).toEqual({ status: "not_configured" }); expect(report.checks.some((item) => item.id === "world_primary_source_reasoning.marker" && item.status === "pass")).toBe(true); });
  it("rejects unsafe remote targets and fails without leaking asset secrets", async () => { expect(() => validateTargetUrl("http://forge.example", ["forge.example"])).toThrow(/HTTPS/); expect(() => validateTargetUrl("https://user:pass@forge.example", ["forge.example"])).toThrow(/credentials/); const secret = `sk-${"x".repeat(32)}`; const report = await run(mockFetch(`window.token=\"${secret}\"`)); expect(report.status).toBe("fail"); expect(JSON.stringify(report)).not.toContain(secret); });
  it("uses only the checked-in deployment target policy", () => { expect(resolveDeploymentTarget("forge_learning_os_project").origin).toMatch(/^https:\/\//); expect(() => resolveDeploymentTarget("caller-controlled-host")).toThrow(/allowlist/); expect(() => validateTargetUrl("https://192.0.2.1", ["192.0.2.1"])).toThrow(/IP-literal/); expect(() => validateTargetUrl("http://localhost")).toThrow(/allow-localhost/); });
  it("defaults remote verification without immutable metadata to blocked, never deployed candidate", async () => {
    const report = await verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: mockFetch() as typeof fetch, expectedLockfileDigest: DIGEST, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured", resolveHostname: async () => ["8.8.8.8"] });
    expect(report.release_identity.candidate_state).toBe("DEPLOYMENT_BLOCKED");
    expect(report.status).toBe("fail");
    expect(report.checks.find((item) => item.id === "release_identity.state_bound")?.status).toBe("fail");
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
    const report = await verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: fetchImpl as typeof fetch, generatedAt: "2026-07-22T00:00:00.000Z", deploymentId: "dpl-candidate", deploymentUrl: "https://deployment.example/", expectedLockfileDigest: DIGEST, expectedContentManifestDigest: DIGEST, expectedEvaluatorBaselineDigest: DIGEST, expectedDatabaseMigrationIdentity: "not_configured", resolveHostname: async () => [address] });
    expect(report.checks.find((item) => item.id === "target.dns_policy")?.status).toBe("pass");
    expect(report.status).toBe("pass");
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
