import { describe, expect, it } from "vitest";

import { validateTargetUrl, verifyDeployment, type DeploymentVerificationReport } from "../../scripts/ops/deployment-verifier";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const CSP = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'nonce-testnonce' 'strict-dynamic'";
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
    if (url.pathname === "/api/health") return Response.json({ schema_version: "1.0", status: "ok", service: "forge-learning-os", app_name: "FORGE", release_sha: SHA, build_time: "2026-07-22T00:00:00.000Z", runtime_mode: "fallback_only", cloud_accounts_enabled: false, cloud_auth_configured: false, device_profiles: "device_only", learner_evidence_sync: "disabled", managed_provider_flags: { openai: false, anthropic: false, gemini: false, openrouter: false }, provider_mode: "request_only_byok" }, { headers: { "cache-control": "no-store", "x-forge-release-sha": SHA } });
    if (url.pathname.startsWith("/_next/static/")) return new Response(asset, { headers: { "content-type": "application/javascript" } });
    return new Response(`<html><body>${pages[url.pathname] ?? ""}</body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": CSP, "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "strict-origin-when-cross-origin", "permissions-policy": "camera=(), microphone=(), geolocation=()" } });
  };
}
async function run(fetchImpl = mockFetch()): Promise<DeploymentVerificationReport> { return verifyDeployment({ baseUrl: "https://forge.example", expectedSha: SHA, allowedHosts: ["forge.example"], fetchImpl: fetchImpl as typeof fetch, generatedAt: "2026-07-22T00:00:00.000Z" }); }
describe("deployment verifier", () => {
  it("verifies all four Worlds, Studio, device profile, CSP nonce, and disabled state", async () => { const report = await run(); expect(report.status).toBe("pass"); expect(report.observed_release_sha).toBe(SHA); expect(report.request_policy.methods).toEqual(["GET"]); expect(report.checks.some((item) => item.id === "world_primary_source_reasoning.marker" && item.status === "pass")).toBe(true); });
  it("rejects unsafe remote targets and fails without leaking asset secrets", async () => { expect(() => validateTargetUrl("http://forge.example", ["forge.example"])).toThrow(/HTTPS/); expect(() => validateTargetUrl("https://user:pass@forge.example", ["forge.example"])).toThrow(/credentials/); const secret = `sk-${"x".repeat(32)}`; const report = await run(mockFetch(`window.token=\"${secret}\"`)); expect(report.status).toBe("fail"); expect(JSON.stringify(report)).not.toContain(secret); });
});
