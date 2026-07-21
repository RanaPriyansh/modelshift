import { isIP } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DEPLOYMENT_VERIFIER_VERSION = "1.0.0";

const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const MAX_HTML_BYTES = 1_500_000;
const MAX_HEALTH_BYTES = 16_000;
const MAX_CLIENT_ASSET_BYTES = 2_000_000;
const MAX_CLIENT_ASSETS = 24;

const ROUTES = [
  { id: "home", path: "/", marker: /FORGE|What do you want to understand/i },
  { id: "force_world", path: "/learn/force-and-motion", marker: /The engine is off|Force & motion/i },
] as const;

const FORBIDDEN_CLIENT_PATTERNS = [
  { id: "openai_secret_name", pattern: /OPENAI_API_KEY/i },
  { id: "database_credential_name", pattern: /DATABASE_URL/i },
  { id: "service_role_credential_name", pattern: /SUPABASE_SERVICE_ROLE_KEY/i },
  { id: "private_key_material", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { id: "credential_like_token", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
] as const;

type FetchLike = typeof fetch;

export type VerificationCheck = {
  id: string;
  status: "pass" | "fail";
  detail: string;
};

export type DeploymentVerificationReport = {
  schema_version: "1.0";
  report_kind: "read_only_deployment_verification";
  verifier_version: string;
  generated_at: string;
  target_origin: string;
  expected_release_sha: string;
  observed_release_sha: string | "unknown";
  request_policy: {
    methods: ["GET"];
    same_origin_only: true;
    redirects_followed: false;
    state_changing_requests: false;
    response_bodies_retained: false;
    learner_data_collected: false;
  };
  checks: VerificationCheck[];
  summary: {
    passed: number;
    failed: number;
  };
  status: "pass" | "fail";
};

export type VerifyDeploymentOptions = {
  baseUrl: string;
  expectedSha: string;
  allowedHosts?: readonly string[];
  allowLocalhost?: boolean;
  fetchImpl?: FetchLike;
  generatedAt?: string;
  timeoutMs?: number;
};

function normalizeExpectedSha(value: string): string {
  if (!RELEASE_SHA_PATTERN.test(value)) throw new Error("expected release SHA must be a full 40-character Git SHA");
  return value.toLowerCase();
}

export function validateTargetUrl(
  rawBaseUrl: string,
  allowedHosts: readonly string[] = [],
  allowLocalhost = false,
): URL {
  let target: URL;
  try {
    target = new URL(rawBaseUrl);
  } catch {
    throw new Error("base URL must be an absolute URL");
  }

  if (target.username || target.password) throw new Error("base URL must not contain credentials");
  if (target.search || target.hash) throw new Error("base URL must not contain a query or fragment");
  if (target.pathname !== "/" && target.pathname !== "") throw new Error("base URL must use the origin root");

  const local = LOCAL_HOSTS.has(target.hostname);
  if (local) {
    if (!allowLocalhost) throw new Error("localhost targets require --allow-localhost");
    if (!new Set(["http:", "https:"]).has(target.protocol)) throw new Error("localhost target must use HTTP or HTTPS");
  } else {
    if (target.protocol !== "https:") throw new Error("remote deployment verification requires HTTPS");
    if (target.port && target.port !== "443") throw new Error("remote deployment verification requires the default HTTPS port");
    if (isIP(target.hostname) !== 0) throw new Error("remote deployment verification does not allow IP-literal targets");
    if (!allowedHosts.includes(target.hostname)) throw new Error("remote deployment host is not allowlisted");
  }

  target.pathname = "/";
  return target;
}

async function readBoundedBody(response: Response, maximumBytes: number): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new Error("response exceeded the bounded verification size");
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

function record(checks: VerificationCheck[], id: string, passed: boolean, detail: string): void {
  checks.push({ id, status: passed ? "pass" : "fail", detail: passed ? detail : `FAILED: ${detail}` });
}

function headerChecks(checks: VerificationCheck[], response: Response, prefix: string): void {
  const csp = response.headers.get("content-security-policy") ?? "";
  const requiredCsp = ["default-src 'self'", "base-uri 'self'", "frame-ancestors 'none'", "object-src 'none'"];
  record(checks, `${prefix}.csp`, requiredCsp.every((directive) => csp.includes(directive)), "required CSP directives are present");
  record(
    checks,
    `${prefix}.nosniff`,
    response.headers.get("x-content-type-options")?.toLowerCase() === "nosniff",
    "X-Content-Type-Options is nosniff",
  );
  record(
    checks,
    `${prefix}.frame_protection`,
    response.headers.get("x-frame-options")?.toUpperCase() === "DENY",
    "X-Frame-Options is DENY",
  );
  record(
    checks,
    `${prefix}.referrer_policy`,
    response.headers.get("referrer-policy") === "strict-origin-when-cross-origin",
    "Referrer-Policy is strict-origin-when-cross-origin",
  );
  const permissions = response.headers.get("permissions-policy") ?? "";
  record(
    checks,
    `${prefix}.permissions_policy`,
    permissions.includes("camera=()") && permissions.includes("microphone=()") && permissions.includes("geolocation=()"),
    "sensitive browser capabilities are disabled",
  );
}

function forbiddenPatterns(text: string): string[] {
  return FORBIDDEN_CLIENT_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ id }) => id);
}

function scriptSources(html: string, origin: string): { urls: URL[]; rejected: number } {
  const sources = new Set<string>();
  let rejected = 0;
  const expression = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(expression)) {
    const value = match[1];
    if (!value) continue;
    try {
      const url = new URL(value, origin);
      if (url.origin !== origin || !url.pathname.startsWith("/_next/static/")) {
        rejected += 1;
      } else {
        sources.add(url.href);
      }
    } catch {
      rejected += 1;
    }
  }

  return { urls: [...sources].map((source) => new URL(source)), rejected };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function boundedGet(fetchImpl: FetchLike, url: URL, timeoutMs: number): Promise<Response> {
  return fetchImpl(url, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: "text/html,application/json;q=0.9,*/*;q=0.1",
      "User-Agent": `FORGE-deployment-verifier/${DEPLOYMENT_VERIFIER_VERSION}`,
    },
  });
}

export async function verifyDeployment(options: VerifyDeploymentOptions): Promise<DeploymentVerificationReport> {
  const expectedSha = normalizeExpectedSha(options.expectedSha);
  const target = validateTargetUrl(options.baseUrl, options.allowedHosts, options.allowLocalhost);
  const origin = target.origin;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const checks: VerificationCheck[] = [];
  let observedReleaseSha: string | "unknown" = "unknown";
  const clientAssets = new Map<string, URL>();

  try {
    const healthResponse = await boundedGet(fetchImpl, new URL("/api/health", origin), timeoutMs);
    record(checks, "health.status", healthResponse.status === 200, "health endpoint returns 200");
    record(
      checks,
      "health.content_type",
      healthResponse.headers.get("content-type")?.toLowerCase().includes("application/json") === true,
      "health endpoint returns JSON",
    );
    record(
      checks,
      "health.cache_control",
      healthResponse.headers.get("cache-control")?.toLowerCase().includes("no-store") === true,
      "health response is not cached",
    );

    const healthText = await readBoundedBody(healthResponse, MAX_HEALTH_BYTES);
    let healthPayload: unknown;
    try {
      healthPayload = JSON.parse(healthText);
    } catch {
      healthPayload = null;
    }

    const expectedKeys = ["release_sha", "schema_version", "service", "status"];
    const exactShape = isRecord(healthPayload)
      && Object.keys(healthPayload).sort().join(",") === expectedKeys.join(",")
      && healthPayload.schema_version === "1.0"
      && healthPayload.status === "ok"
      && healthPayload.service === "forge-learning-os"
      && typeof healthPayload.release_sha === "string";
    record(checks, "health.schema", exactShape, "health payload uses the minimal allowlisted schema");

    if (exactShape && isRecord(healthPayload) && typeof healthPayload.release_sha === "string") {
      observedReleaseSha = RELEASE_SHA_PATTERN.test(healthPayload.release_sha)
        ? healthPayload.release_sha.toLowerCase()
        : "unknown";
    }
    record(checks, "release.identity", observedReleaseSha === expectedSha, "observed release SHA matches the expected immutable SHA");
    record(
      checks,
      "release.header_consistency",
      healthResponse.headers.get("x-forge-release-sha")?.toLowerCase() === observedReleaseSha,
      "release header matches the health payload",
    );
  } catch {
    record(checks, "health.request", false, "health request failed or exceeded a verification bound");
    record(checks, "release.identity", false, "release identity could not be verified");
  }

  for (const route of ROUTES) {
    try {
      const response = await boundedGet(fetchImpl, new URL(route.path, origin), timeoutMs);
      record(checks, `${route.id}.status`, response.status === 200, `${route.path} returns 200 without a redirect or access challenge`);
      record(
        checks,
        `${route.id}.content_type`,
        response.headers.get("content-type")?.toLowerCase().includes("text/html") === true,
        `${route.path} returns HTML`,
      );
      headerChecks(checks, response, route.id);

      const html = await readBoundedBody(response, MAX_HTML_BYTES);
      record(checks, `${route.id}.marker`, route.marker.test(html), `${route.path} contains the expected public application marker`);
      const leaks = forbiddenPatterns(html);
      record(checks, `${route.id}.secret_scan`, leaks.length === 0, leaks.length === 0
        ? "no forbidden secret pattern appears in HTML"
        : `forbidden pattern categories detected: ${leaks.join(", ")}`);

      const scripts = scriptSources(html, origin);
      record(checks, `${route.id}.script_origins`, scripts.rejected === 0, "client scripts are same-origin versioned Next.js assets");
      for (const url of scripts.urls) clientAssets.set(url.href, url);
    } catch {
      record(checks, `${route.id}.request`, false, `${route.path} failed or exceeded a verification bound`);
    }
  }

  record(
    checks,
    "client_assets.bounded_count",
    clientAssets.size > 0 && clientAssets.size <= MAX_CLIENT_ASSETS,
    `client asset set is non-empty and no larger than ${MAX_CLIENT_ASSETS}`,
  );

  if (clientAssets.size <= MAX_CLIENT_ASSETS) {
    for (const [assetIndex, [assetId, assetUrl]] of [...clientAssets.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .entries()) {
      try {
        const response = await boundedGet(fetchImpl, assetUrl, timeoutMs);
        const body = await readBoundedBody(response, MAX_CLIENT_ASSET_BYTES);
        const leaks = forbiddenPatterns(body);
        const shortId = new URL(assetId).pathname.split("/").pop() ?? "asset";
        record(checks, `client_asset.${assetIndex + 1}.${shortId}`, response.status === 200 && leaks.length === 0, leaks.length === 0
          ? "client asset is reachable and contains no forbidden secret pattern"
          : `client asset contains forbidden pattern categories: ${leaks.join(", ")}`);
      } catch {
        record(checks, "client_asset.request", false, "a client asset failed or exceeded a verification bound");
      }
    }
  }

  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.length - passed;
  return {
    schema_version: "1.0",
    report_kind: "read_only_deployment_verification",
    verifier_version: DEPLOYMENT_VERIFIER_VERSION,
    generated_at: options.generatedAt ?? new Date().toISOString(),
    target_origin: origin,
    expected_release_sha: expectedSha,
    observed_release_sha: observedReleaseSha,
    request_policy: {
      methods: ["GET"],
      same_origin_only: true,
      redirects_followed: false,
      state_changing_requests: false,
      response_bodies_retained: false,
      learner_data_collected: false,
    },
    checks,
    summary: { passed, failed },
    status: failed === 0 ? "pass" : "fail",
  };
}

export function renderDeploymentMarkdown(report: DeploymentVerificationReport): string {
  const rows = report.checks
    .map((check) => `| ${check.id} | ${check.status.toUpperCase()} | ${check.detail} |`)
    .join("\n");
  return `# FORGE Deployment Verification

- Status: **${report.status.toUpperCase()}**
- Target origin: \`${report.target_origin}\`
- Expected release: \`${report.expected_release_sha}\`
- Observed release: \`${report.observed_release_sha}\`
- Verifier: \`${report.verifier_version}\`
- Generated: ${report.generated_at}

The verifier issued bounded, same-origin GET requests only. It did not deploy, call the model endpoint, submit learner data, retain response bodies, or mutate application state.

| Check | Status | Evidence |
| --- | --- | --- |
${rows}
`;
}

export async function writeDeploymentReport(report: DeploymentVerificationReport, outputDirectory: string): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(resolve(outputDirectory, "deployment-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(resolve(outputDirectory, "deployment-verification.md"), renderDeploymentMarkdown(report), "utf8"),
  ]);
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function argumentValues(name: string): string[] {
  return process.argv.flatMap((argument, index) => argument === name && process.argv[index + 1]
    ? [process.argv[index + 1] as string]
    : []);
}

async function main() {
  const baseUrl = argumentValue("--base-url");
  const expectedSha = argumentValue("--expected-sha");
  if (!baseUrl || !expectedSha) throw new Error("--base-url and --expected-sha are required");

  const outputDirectory = resolve(argumentValue("--output-dir") ?? "test-results/release-ops");
  const report = await verifyDeployment({
    baseUrl,
    expectedSha,
    allowedHosts: argumentValues("--allowed-host"),
    allowLocalhost: process.argv.includes("--allow-localhost"),
  });
  await writeDeploymentReport(report, outputDirectory);
  console.log(`deployment verification: ${report.status.toUpperCase()} (${report.summary.passed} passed, ${report.summary.failed} failed)`);
  console.log(`report: ${resolve(outputDirectory, "deployment-verification.md")}`);
  if (report.status === "fail") process.exitCode = 1;
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) {
  void main().catch((error: unknown) => {
    console.error(`deployment verification setup failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  });
}
