import { isIP } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DEPLOYMENT_VERIFIER_VERSION = "2.0.0";
const SHA = /^[0-9a-f]{40}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const ROUTES = [
  { id: "home", path: "/", marker: /FORGE|What do you want to understand/i },
  { id: "world_force_motion", path: "/learn/force-and-motion", marker: /Force & motion|force-and-motion/i },
  { id: "world_ai_learning", path: "/learn/ai-and-learning", marker: /AI & learning|ai-and-learning/i },
  { id: "world_proportional_reasoning", path: "/learn/proportional-reasoning", marker: /Proportional|proportional-reasoning/i },
  { id: "world_primary_source_reasoning", path: "/learn/primary-source-reasoning", marker: /Primary source|primary-source-reasoning/i },
  { id: "studio", path: "/studio", marker: /Lesson Studio|provider-neutral|learning question/i },
  { id: "device_profile_login", path: "/login", marker: /device profile|Cloud identity · not configured|Pick where your learning trail lives/i },
  { id: "device_profile_account", path: "/account", marker: /device evidence|No cloud account active|Your access/i },
] as const;
const FORBIDDEN_CLIENT_PATTERNS = [
  { id: "openai_secret_name", pattern: /OPENAI_API_KEY/i },
  { id: "database_credential_name", pattern: /DATABASE_URL/i },
  { id: "service_role_credential_name", pattern: /(?:SUPABASE_SERVICE_ROLE_KEY|FORGE_SUPABASE_SERVICE_ROLE_KEY)/i },
  { id: "private_key_material", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { id: "credential_like_token", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
] as const;
const MAX_HTML = 1_500_000;
const MAX_HEALTH = 32_000;
const MAX_ASSET = 2_000_000;
const MAX_ASSETS = 24;
type FetchLike = typeof fetch;

export type VerificationCheck = { id: string; status: "pass" | "fail"; detail: string };
export type DeploymentVerificationReport = {
  schema_version: "1.0";
  report_kind: "read_only_deployment_verification";
  verifier_version: string;
  generated_at: string;
  target_origin: string;
  expected_release_sha: string;
  observed_release_sha: string | "unknown";
  request_policy: { methods: ["GET"]; same_origin_only: true; redirects_followed: false; state_changing_requests: false; response_bodies_retained: false; learner_data_collected: false };
  checks: VerificationCheck[];
  summary: { passed: number; failed: number };
  status: "pass" | "fail";
};
export type VerifyDeploymentOptions = { baseUrl: string; expectedSha: string; allowedHosts?: readonly string[]; allowLocalhost?: boolean; fetchImpl?: FetchLike; generatedAt?: string; timeoutMs?: number };

function normalizeSha(value: string): string { if (!SHA.test(value)) throw new Error("expected release SHA must be a full 40-character Git SHA"); return value.toLowerCase(); }
export function validateTargetUrl(raw: string, allowedHosts: readonly string[] = [], allowLocalhost = false): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("base URL must be an absolute URL"); }
  if (url.username || url.password) throw new Error("base URL must not contain credentials");
  if (url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) throw new Error("base URL must use the origin root without query or fragment");
  const local = LOCAL_HOSTS.has(url.hostname);
  if (local) { if (!allowLocalhost) throw new Error("localhost targets require --allow-localhost"); if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("localhost target must use HTTP or HTTPS"); }
  else { if (url.protocol !== "https:") throw new Error("remote deployment verification requires HTTPS"); if (url.port && url.port !== "443") throw new Error("remote deployment verification requires the default HTTPS port"); if (isIP(url.hostname) !== 0) throw new Error("remote deployment verification does not allow IP-literal targets"); if (!allowedHosts.includes(url.hostname)) throw new Error("remote deployment host is not allowlisted"); }
  url.pathname = "/";
  return url;
}
async function readBounded(response: Response, maximum: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let bytes = 0; let text = "";
  while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > maximum) { await reader.cancel(); throw new Error("response exceeded the bounded verification size"); } text += decoder.decode(value, { stream: true }); }
  return text + decoder.decode();
}
function record(checks: VerificationCheck[], id: string, passed: boolean, detail: string): void { checks.push({ id, status: passed ? "pass" : "fail", detail: passed ? detail : `FAILED: ${detail}` }); }
function forbidden(text: string): string[] { return FORBIDDEN_CLIENT_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ id }) => id); }
function scripts(html: string, origin: string): { urls: URL[]; rejected: number } {
  const urls = new Set<string>(); let rejected = 0;
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    try { const url = new URL(match[1] ?? "", origin); if (url.origin !== origin || !url.pathname.startsWith("/_next/static/")) rejected += 1; else urls.add(url.href); } catch { rejected += 1; }
  }
  return { urls: [...urls].map((url) => new URL(url)), rejected };
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
async function get(fetchImpl: FetchLike, url: URL, timeoutMs: number): Promise<Response> { return fetchImpl(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(timeoutMs), headers: { Accept: "text/html,application/json;q=0.9,*/*;q=0.1", "User-Agent": `FORGE-deployment-verifier/${DEPLOYMENT_VERIFIER_VERSION}` } }); }
function headerChecks(checks: VerificationCheck[], response: Response, prefix: string, html: string): void {
  const csp = response.headers.get("content-security-policy") ?? "";
  for (const directive of ["default-src 'self'", "base-uri 'self'", "frame-ancestors 'none'", "object-src 'none'"]) record(checks, `${prefix}.csp.${directive.split(" ", 1)[0]}`, csp.includes(directive), `CSP contains ${directive}`);
  const nonces = [...csp.matchAll(/nonce-([^' ;]+)/g)].map((match) => match[1]);
  const htmlNonces = [...html.matchAll(/<script\b[^>]*\bnonce=["']([^"']+)["']/gi)].map((match) => match[1]);
  record(checks, `${prefix}.csp.nonce`, nonces.length > 0 && htmlNonces.length > 0 && htmlNonces.every((nonce) => nonces.includes(nonce)), "CSP nonce is present and matches framework script nonces");
  record(checks, `${prefix}.nosniff`, response.headers.get("x-content-type-options")?.toLowerCase() === "nosniff", "X-Content-Type-Options is nosniff");
  record(checks, `${prefix}.frame_protection`, response.headers.get("x-frame-options")?.toUpperCase() === "DENY", "X-Frame-Options is DENY");
  record(checks, `${prefix}.referrer_policy`, response.headers.get("referrer-policy") === "strict-origin-when-cross-origin", "Referrer-Policy is strict-origin-when-cross-origin");
  const permissions = response.headers.get("permissions-policy") ?? "";
  record(checks, `${prefix}.permissions_policy`, ["camera=()", "microphone=()", "geolocation=()"].every((value) => permissions.includes(value)), "sensitive browser capabilities are disabled");
}

export async function verifyDeployment(options: VerifyDeploymentOptions): Promise<DeploymentVerificationReport> {
  const expected = normalizeSha(options.expectedSha); const target = validateTargetUrl(options.baseUrl, options.allowedHosts, options.allowLocalhost); const origin = target.origin; const fetchImpl = options.fetchImpl ?? fetch; const timeoutMs = options.timeoutMs ?? 10_000; const checks: VerificationCheck[] = []; let observed: string | "unknown" = "unknown"; const assets = new Map<string, URL>();
  try {
    const response = await get(fetchImpl, new URL("/api/health", origin), timeoutMs);
    record(checks, "health.status", response.status === 200, "health endpoint returns 200");
    record(checks, "health.content_type", response.headers.get("content-type")?.toLowerCase().includes("application/json") === true, "health endpoint returns JSON");
    record(checks, "health.cache_control", response.headers.get("cache-control")?.toLowerCase().includes("no-store") === true, "health response is not cached");
    const text = await readBounded(response, MAX_HEALTH); let payload: unknown; try { payload = JSON.parse(text); } catch { payload = null; }
    const expectedKeys = ["app_name", "build_time", "cloud_accounts_enabled", "cloud_auth_configured", "device_profiles", "learner_evidence_sync", "managed_provider_flags", "provider_mode", "release_sha", "runtime_mode", "schema_version", "service", "status"];
    const shape = isRecord(payload) && Object.keys(payload).sort().join(",") === expectedKeys.join(",") && payload.schema_version === "1.0" && payload.status === "ok" && payload.service === "forge-learning-os" && payload.app_name === "FORGE";
    record(checks, "health.schema", shape, "health payload uses the allowlisted release schema");
    if (shape && isRecord(payload)) {
      observed = typeof payload.release_sha === "string" && SHA.test(payload.release_sha) ? payload.release_sha.toLowerCase() : "unknown";
      record(checks, "health.build_time", typeof payload.build_time === "string" && ISO.test(payload.build_time), "release candidate exposes an ISO build time");
      record(checks, "health.disabled_cloud", payload.cloud_accounts_enabled === false && payload.cloud_auth_configured === false && payload.device_profiles === "device_only" && payload.learner_evidence_sync === "disabled", "cloud identity and learner evidence sync are disabled");
      const flags = payload.managed_provider_flags;
      record(checks, "health.disabled_providers", payload.runtime_mode === "fallback_only" && payload.provider_mode === "request_only_byok" && isRecord(flags) && flags.openai === false && flags.anthropic === false && flags.gemini === false && flags.openrouter === false, "managed providers are disabled; request-only BYOK remains the explicit boundary");
    }
    record(checks, "release.identity", observed === expected, "observed release SHA matches the expected immutable SHA");
    record(checks, "release.header_consistency", response.headers.get("x-forge-release-sha")?.toLowerCase() === observed, "release header matches the health payload");
  } catch { record(checks, "health.request", false, "health request failed or exceeded a verification bound"); record(checks, "release.identity", false, "release identity could not be verified"); }

  for (const route of ROUTES) {
    try {
      const response = await get(fetchImpl, new URL(route.path, origin), timeoutMs);
      record(checks, `${route.id}.status`, response.status === 200, `${route.path} returns 200 without a redirect or access challenge`);
      record(checks, `${route.id}.content_type`, response.headers.get("content-type")?.toLowerCase().includes("text/html") === true, `${route.path} returns HTML`);
      const html = await readBounded(response, MAX_HTML);
      headerChecks(checks, response, route.id, html);
      record(checks, `${route.id}.marker`, route.marker.test(html), `${route.path} contains its allowlisted application marker`);
      const leaks = forbidden(html); record(checks, `${route.id}.secret_scan`, leaks.length === 0, leaks.length === 0 ? "no forbidden secret pattern appears in HTML" : `forbidden pattern categories detected: ${leaks.join(", ")}`);
      const found = scripts(html, origin); record(checks, `${route.id}.script_origins`, found.rejected === 0, "client scripts are same-origin versioned Next.js assets"); for (const url of found.urls) assets.set(url.href, url);
    } catch { record(checks, `${route.id}.request`, false, `${route.path} failed or exceeded a verification bound`); }
  }
  record(checks, "client_assets.bounded_count", assets.size > 0 && assets.size <= MAX_ASSETS, `client asset set is non-empty and no larger than ${MAX_ASSETS}`);
  if (assets.size <= MAX_ASSETS) for (const [index, url] of [...assets.values()].sort((a, b) => a.href.localeCompare(b.href)).entries()) {
    try { const response = await get(fetchImpl, url, timeoutMs); const body = await readBounded(response, MAX_ASSET); const leaks = forbidden(body); record(checks, `client_asset.${index + 1}`, response.status === 200 && leaks.length === 0, leaks.length === 0 ? "client asset is reachable and contains no forbidden secret pattern" : `client asset contains forbidden pattern categories: ${leaks.join(", ")}`); } catch { record(checks, `client_asset.${index + 1}`, false, "client asset failed or exceeded a verification bound"); }
  }
  const passed = checks.filter((item) => item.status === "pass").length; const failed = checks.length - passed;
  return { schema_version: "1.0", report_kind: "read_only_deployment_verification", verifier_version: DEPLOYMENT_VERIFIER_VERSION, generated_at: options.generatedAt ?? new Date().toISOString(), target_origin: origin, expected_release_sha: expected, observed_release_sha: observed, request_policy: { methods: ["GET"], same_origin_only: true, redirects_followed: false, state_changing_requests: false, response_bodies_retained: false, learner_data_collected: false }, checks, summary: { passed, failed }, status: failed === 0 ? "pass" : "fail" };
}

export function renderDeploymentMarkdown(report: DeploymentVerificationReport): string {
  const rows = report.checks.map((item) => `| ${item.id} | ${item.status.toUpperCase()} | ${item.detail} |`).join("\n");
  return `# FORGE Deployment Verification\n\n- Status: **${report.status.toUpperCase()}**\n- Target origin: \`${report.target_origin}\`\n- Expected release: \`${report.expected_release_sha}\`\n- Observed release: \`${report.observed_release_sha}\`\n- Verifier: \`${report.verifier_version}\`\n- Generated: ${report.generated_at}\n\nThis report contains only bounded, same-origin GET evidence. It never deploys, calls a provider, submits learner data, retains response bodies, or mutates state.\n\n| Check | Status | Evidence |\n| --- | --- | --- |\n${rows}\n`;
}
export async function writeDeploymentReport(report: DeploymentVerificationReport, outputDirectory: string): Promise<void> { await mkdir(outputDirectory, { recursive: true }); await Promise.all([writeFile(resolve(outputDirectory, "deployment-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"), writeFile(resolve(outputDirectory, "deployment-verification.md"), renderDeploymentMarkdown(report), "utf8")]); }
const arg = (name: string): string | undefined => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const args = (name: string): string[] => process.argv.flatMap((value, index) => value === name && process.argv[index + 1] ? [process.argv[index + 1] as string] : []);
async function main() { const baseUrl = arg("--base-url"); const expectedSha = arg("--expected-sha"); if (!baseUrl || !expectedSha) throw new Error("--base-url and --expected-sha are required"); const outputDirectory = resolve(arg("--output-dir") ?? "test-results/release-ops"); const report = await verifyDeployment({ baseUrl, expectedSha, allowedHosts: args("--allowed-host"), allowLocalhost: process.argv.includes("--allow-localhost") }); await writeDeploymentReport(report, outputDirectory); console.log(`deployment verification: ${report.status.toUpperCase()} (${report.summary.passed} passed, ${report.summary.failed} failed)`); console.log(`report: ${resolve(outputDirectory, "deployment-verification.md")}`); if (report.status === "fail") process.exitCode = 1; }
const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) void main().catch((error: unknown) => { console.error(`deployment verification setup failed: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; });
