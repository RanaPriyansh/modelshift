import { isIP, type LookupFunction } from "node:net";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildReleaseIdentity,
  RELEASE_CANDIDATE_STATES,
  type ReleaseCandidateState,
  type ReleaseIdentityTuple,
  validateReleaseIdentity,
} from "../../src/operations/release-identity";
import {
  isBoundReleaseManifest,
  validateReleaseManifest,
  type BoundReleaseManifest,
} from "../../src/operations/release-manifest";
import {
  matchesImmutableDeploymentTarget,
  resolveDeploymentTarget,
  type DeploymentTarget,
} from "./deployment-target-policy";

export const DEPLOYMENT_VERIFIER_VERSION = "2.2.0";
export const WORKER_CANDIDATE_STATES = ["BUILT_LOCAL", "PUSHED", "DEPLOYMENT_BLOCKED", "DEPLOYED_CANDIDATE"] as const;
const SHA = /^[0-9a-f]{40}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
export const CANONICAL_DEPLOYMENT_ROUTES = [
  { id: "home", path: "/", marker: /FORGE|What do you want to understand/i },
  { id: "world_force_motion", path: "/learn/force-and-motion", marker: /Force & motion|force-and-motion/i },
  { id: "world_ai_learning", path: "/learn/ai-and-learning", marker: /AI & learning|ai-and-learning/i },
  { id: "world_proportional_reasoning", path: "/learn/proportional-reasoning", marker: /Proportional|proportional-reasoning/i },
  { id: "world_primary_source_reasoning", path: "/learn/primary-source-reasoning", marker: /Primary source|primary-source-reasoning/i },
  { id: "source_corroboration_path", path: "/paths/source-corroboration", marker: /Verify before you trust|source-corroboration/i },
  { id: "pathway_availability", path: "/pathways", marker: /What FORGE can(?:—|&mdash;|&#x2014;)and cannot(?:—|&mdash;|&#x2014;)offer today|Availability map only/i },
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
/**
 * Hard cap for the distinct, same-origin Next.js scripts referenced by the
 * initial HTML of every canonical route. Wave 4 currently emits 25 such
 * chunks across the ten inspected routes; 32 leaves seven deliberate slots
 * for reviewed top-level product growth while keeping the read-only scan
 * bounded. This does not enumerate hydration-only chunks.
 *
 * Raise this only with a new observed-count measurement, this boundary-test
 * update, and a release-operations contract review. The verifier must still
 * fetch and secret-scan every admitted initial asset.
 */
export const INITIAL_HTML_CLIENT_ASSET_BUDGET = 32;
const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata", "metadata.google.internal", "instance-data.ec2.internal"]);
const DIGEST = /^[0-9a-f]{64}$/i;
type FetchLike = typeof fetch;

export type VerificationCheck = { id: string; status: "pass" | "fail"; detail: string };
export type DeploymentVerificationReport = {
  schema_version: "1.0";
  report_kind: "read_only_deployment_verification";
  verifier_version: string;
  generated_at: string;
  alias_verified_at: string | "not_verified";
  target_origin: string;
  expected_release_sha: string;
  observed_release_sha: string | "unknown";
  release_identity: ReleaseIdentityTuple & { candidate_state: ReleaseCandidateState };
  request_policy: { methods: ["GET"]; same_origin_only: true; redirects_followed: false; state_changing_requests: false; response_bodies_retained: false; learner_data_collected: false };
  checks: VerificationCheck[];
  summary: { passed: number; failed: number };
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
  candidateState?: ReleaseCandidateState;
  retainedArtifactIds?: readonly string[];
  databaseProject?: string;
  databaseMigration?: string;
  rollbackDeploymentId?: string;
  rollbackSha?: string;
  rollbackRehearsal?: "pass" | "fail" | "not_evaluated";
  decisionName?: string;
  consoleVerification?: "pass" | "fail" | "not_evaluated";
  expectedLockfileDigest?: string;
  /** A caller-retained emitted-asset digest; health cannot attest this itself. */
  expectedPublicAssetDigest?: string;
  expectedContentManifestDigest?: string;
  expectedEvaluatorBaselineDigest?: string;
  expectedDatabaseMigrationIdentity?: string;
  liveEvaluationStatus?: "not_evaluated" | "pass" | "fail";
  liveEvaluationArtifactId?: string;
  resolveHostname?: (hostname: string) => Promise<readonly string[]>;
  /** Supplied only by the checked-in target policy (or focused test fixtures). */
  deploymentTarget?: DeploymentTarget;
};

// IANA IPv4/IPv6 Special-Purpose Address Registries, last updated 2025-10-09.
// IANA IPv6 Global Unicast Address Space, last updated 2025-10-10.
// The verifier is intentionally more conservative than "Globally Reachable":
// every currently registered special-purpose range is denied, including rows
// whose registry bit is true, because this read-only worker has no reason to
// contact a protocol-specific anycast, translation, or infrastructure range.
// Sources: https://www.iana.org/assignments/iana-ipv4-special-registry/,
// https://www.iana.org/assignments/iana-ipv6-special-registry/, and
// https://www.iana.org/assignments/ipv6-unicast-address-assignments/.
export const IANA_SPECIAL_PURPOSE_POLICY_VERSION = "2025-10-09";
export const IANA_IPV6_GLOBAL_UNICAST_POLICY_VERSION = "2025-10-10";
const IANA_IPV4_SPECIAL_PURPOSE_CIDRS = [
  "0.0.0.0/8", "0.0.0.0/32", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12",
  "192.0.0.0/24", "192.0.0.0/29", "192.0.0.8/32", "192.0.0.9/32", "192.0.0.10/32", "192.0.0.170/32", "192.0.0.171/32",
  "192.0.2.0/24", "192.31.196.0/24", "192.52.193.0/24", "192.88.99.0/24", "192.88.99.2/32", "192.168.0.0/16", "192.175.48.0/24",
  "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "240.0.0.0/4", "255.255.255.255/32",
  // IPv4 multicast is not a remote unicast target and is denied alongside the registry.
  "224.0.0.0/4",
] as const;
const IANA_IPV6_SPECIAL_PURPOSE_CIDRS = [
  "::1/128", "::/128", "::ffff:0:0/96", "64:ff9b::/96", "64:ff9b:1::/48", "100::/64", "100:0:0:1::/64",
  "2001::/23", "2001::/32", "2001:1::1/128", "2001:1::2/128", "2001:1::3/128", "2001:2::/48", "2001:3::/32", "2001:4:112::/48",
  "2001:10::/28", "2001:20::/28", "2001:30::/28", "2001:db8::/32", "2002::/16", "2620:4f:8000::/48", "3fff::/20", "5f00::/16", "fc00::/7", "fe80::/10",
] as const;
const IANA_IPV6_GLOBAL_UNICAST_ALLOCATED_CIDRS = [
  "2001::/23", "2001:200::/23", "2001:400::/23", "2001:600::/23", "2001:800::/22", "2001:c00::/23", "2001:e00::/23",
  "2001:1200::/23", "2001:1400::/22", "2001:1800::/23", "2001:1a00::/23", "2001:1c00::/22", "2001:2000::/19", "2001:4000::/23",
  "2001:4200::/23", "2001:4400::/23", "2001:4600::/23", "2001:4800::/23", "2001:4a00::/23", "2001:4c00::/23", "2001:5000::/20",
  "2001:8000::/19", "2001:a000::/20", "2001:b000::/20", "2002::/16", "2003::/18", "2400::/12", "2410::/12", "2600::/12",
  "2610::/23", "2620::/23", "2630::/12", "2800::/12", "2a00::/12", "2a10::/12", "2c00::/12",
] as const;

function matchesCidr(words: readonly number[], network: readonly number[], prefixLength: number, wordBits: number): boolean {
  if (words.length !== network.length || prefixLength < 0 || prefixLength > words.length * wordBits) return false;
  let remaining = prefixLength;
  for (let index = 0; index < words.length && remaining > 0; index += 1) {
    const maskBits = Math.min(wordBits, remaining);
    const mask = maskBits === wordBits ? (1 << wordBits) - 1 : ((1 << maskBits) - 1) << (wordBits - maskBits);
    if (((words[index] ?? 0) & mask) !== ((network[index] ?? 0) & mask)) return false;
    remaining -= maskBits;
  }
  return true;
}

function matchesIPv4Cidr(parts: readonly number[], cidr: string): boolean {
  const [networkText, prefixText] = cidr.split("/");
  const prefixLength = Number(prefixText);
  const network = networkText?.split(".").map(Number) ?? [];
  return Number.isInteger(prefixLength) && network.length === 4 && network.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) && matchesCidr(parts, network, prefixLength, 8);
}

function isBlockedIPv4(parts: readonly number[]): boolean {
  if (parts.length !== 4 || parts.some((part) => part < 0 || part > 255 || !Number.isInteger(part))) return true;
  return IANA_IPV4_SPECIAL_PURPOSE_CIDRS.some((cidr) => matchesIPv4Cidr(parts, cidr));
}

function parseIPv6Words(value: string): number[] | null {
  if (value.includes("%") || value.split("::").length > 2) return null;
  const [left = "", right = ""] = value.split("::");
  const parseSide = (side: string): string[] => side ? side.split(":") : [];
  const pieces = [...parseSide(left), ...parseSide(right)];
  const words: number[] = [];
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index] ?? "";
    if (piece.includes(".")) {
      if (index !== pieces.length - 1 || isIP(piece) !== 4) return null;
      const ipv4 = piece.split(".").map(Number);
      if (ipv4.length !== 4 || ipv4.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
      words.push((ipv4[0]! << 8) | ipv4[1]!, (ipv4[2]! << 8) | ipv4[3]!);
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/i.test(piece)) return null;
    words.push(Number.parseInt(piece, 16));
  }
  if (value.includes("::")) {
    if (words.length >= 8) return null;
    const leftCount = parseSide(left).reduce((count, piece) => count + (piece.includes(".") ? 2 : 1), 0);
    words.splice(leftCount, 0, ...Array.from({ length: 8 - words.length }, () => 0));
  }
  return words.length === 8 ? words : null;
}

function matchesIPv6Cidr(words: readonly number[], cidr: string): boolean {
  const [networkText, prefixText] = cidr.split("/");
  const prefixLength = Number(prefixText);
  const network = networkText ? parseIPv6Words(networkText) : null;
  return Number.isInteger(prefixLength) && network !== null && matchesCidr(words, network, prefixLength, 16);
}

/** Only globally routable DNS answers may reach the pinned transport. */
function isNonGlobalOrSpecialAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(normalized) === 4) return isBlockedIPv4(normalized.split(".").map(Number));
  if (isIP(normalized) !== 6) return true;
  const words = parseIPv6Words(normalized);
  if (!words) return true;
  const allocatedGlobalUnicast = IANA_IPV6_GLOBAL_UNICAST_ALLOCATED_CIDRS.some((cidr) => matchesIPv6Cidr(words, cidr));
  return !allocatedGlobalUnicast || IANA_IPV6_SPECIAL_PURPOSE_CIDRS.some((cidr) => matchesIPv6Cidr(words, cidr));
}

async function defaultResolveHostname(hostname: string): Promise<readonly string[]> {
  return (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address);
}

async function safeResolvedAddresses(hostname: string, resolver: (hostname: string) => Promise<readonly string[]>): Promise<readonly string[]> {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(normalized) || normalized.endsWith(".local") || normalized.endsWith(".internal")) throw new Error("target hostname is reserved or private");
  const addresses = await resolver(hostname);
  if (addresses.length === 0 || addresses.some((address) => isNonGlobalOrSpecialAddress(address))) throw new Error("target DNS resolves to a private, special-purpose, link-local, metadata, or otherwise blocked address");
  return [...new Set(addresses)].sort();
}

function normalizeSha(value: string): string { if (!SHA.test(value)) throw new Error("expected release SHA must be a full 40-character Git SHA"); return value.toLowerCase(); }
function normalizeExpectedDigest(value: string | undefined): string | undefined { return value && DIGEST.test(value) ? value.toLowerCase() : undefined; }
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
/**
 * Return only the DNS answer already checked by safeResolvedAddresses. Node
 * enables connection auto-selection by asking custom lookups for `all: true`,
 * which requires the DNS lookup callback's array result shape.
 */
export function createPinnedLookup(address: string): LookupFunction {
  const family = isIP(address);
  if (family === 0) throw new Error("pinned target address must be an IP address");
  return (_hostname, options, callback) => {
    const requestedFamily = options.family === "IPv4" ? 4 : options.family === "IPv6" ? 6 : options.family ?? 0;
    if (requestedFamily !== 0 && requestedFamily !== family) {
      const error = Object.assign(new Error("pinned target address does not satisfy the requested address family"), { code: "ENOTFOUND" }) as NodeJS.ErrnoException;
      callback(error, options.all ? [] : "", family);
      return;
    }
    if (options.all) callback(null, [{ address, family }]);
    else callback(null, address, family);
  };
}
async function pinnedRequest(url: URL, timeoutMs: number, addresses: readonly string[], maximum: number): Promise<Response> {
  const address = addresses[0];
  if (!address) throw new Error("no validated target address");
  const requestFunction = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolveResponse, reject) => {
    const request = requestFunction({ hostname: url.hostname, port: url.port || (url.protocol === "https:" ? 443 : 80), path: `${url.pathname}${url.search}`, method: "GET", headers: { Accept: "text/html,application/json;q=0.9,*/*;q=0.1", "User-Agent": `FORGE-deployment-verifier/${DEPLOYMENT_VERIFIER_VERSION}` }, lookup: createPinnedLookup(address), servername: url.hostname, rejectUnauthorized: true });
    const chunks: Buffer[] = []; let bytes = 0;
    request.setTimeout(timeoutMs, () => request.destroy(new Error("verification request timed out")));
    request.on("error", reject);
    request.on("response", (response) => {
      response.on("data", (chunk: Buffer) => { bytes += chunk.byteLength; if (bytes <= maximum) chunks.push(chunk); else response.destroy(new Error("response exceeded the bounded verification size")); });
      response.on("error", reject);
      response.on("end", () => { if (bytes <= maximum) { const headers = new Headers(); for (const [key, value] of Object.entries(response.headers)) if (typeof value === "string") headers.set(key, value); resolveResponse(new Response(Buffer.concat(chunks), { status: response.statusCode ?? 0, headers })); } });
    });
    request.end();
  });
}
async function get(fetchImpl: FetchLike, url: URL, timeoutMs: number, expectedAddresses?: readonly string[], resolver: (hostname: string) => Promise<readonly string[]> = defaultResolveHostname, usePinnedTransport = false, maximum = MAX_HTML): Promise<Response> {
  if (expectedAddresses) {
    const currentAddresses = await safeResolvedAddresses(url.hostname, resolver);
    if (currentAddresses.join(",") !== expectedAddresses.join(",")) throw new Error("target DNS resolution changed during verification");
  }
  if (usePinnedTransport && expectedAddresses) return pinnedRequest(url, timeoutMs, expectedAddresses, maximum);
  const response = await fetchImpl(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(timeoutMs), headers: { Accept: "text/html,application/json;q=0.9,*/*;q=0.1", "User-Agent": `FORGE-deployment-verifier/${DEPLOYMENT_VERIFIER_VERSION}` } });
  if (response.url) {
    try { if (new URL(response.url).origin !== url.origin) throw new Error("redirect crossed origins"); } catch (error) { if (error instanceof Error && error.message === "redirect crossed origins") throw error; }
  }
  return response;
}
function headerChecks(checks: VerificationCheck[], response: Response, prefix: string, html: string, origin: string): void {
  const csp = response.headers.get("content-security-policy") ?? "";
  const canonical: Record<string, readonly string[]> = {
    "default-src": ["'self'"], "base-uri": ["'self'"], "form-action": ["'self'"], "frame-ancestors": ["'none'"], "object-src": ["'none'"],
    "img-src": ["'self'", "data:", "blob:"], "font-src": ["'self'", "data:"], "style-src": ["'self'", "'unsafe-inline'"], "script-src": [],
    "connect-src": ["'self'"], "media-src": ["'self'", "blob:"], "worker-src": ["'self'", "blob:"], "manifest-src": ["'self'"], "upgrade-insecure-requests": [],
  };
  const parsed: string[][] = csp.split(";").map((part) => part.trim().split(/\s+/)).filter((parts) => parts[0]);
  const directives = new Map<string, string[]>();
  let duplicate = false;
  for (const parts of parsed) { const name = parts[0]?.toLowerCase(); if (!name) continue; if (directives.has(name)) duplicate = true; directives.set(name, parts.slice(1)); }
  const sameTokens = (actual: readonly string[] | undefined, expected: readonly string[]): boolean => { if (!actual || actual.length !== expected.length) return false; const sortedExpected = [...expected].sort(); return [...actual].sort().every((value, index) => value === sortedExpected[index]); };
  const scriptSource = directives.get("script-src");
  const scriptContract = scriptSource !== undefined && scriptSource.length === 3 && scriptSource.includes("'self'") && scriptSource.includes("'strict-dynamic'") && scriptSource.some((value) => /^'nonce-[^']+'$/.test(value));
  record(checks, `${prefix}.csp.script_src_contract`, scriptContract, "script-src explicitly requires self, strict-dynamic, and a nonce without unsafe inline/eval");
  const scriptElementContract = !directives.has("script-src-elem");
  record(checks, `${prefix}.csp.script_src_elem_contract`, scriptElementContract, "script-src-elem is absent so it cannot override the canonical script policy");
  const formAction = directives.get("form-action") ?? [];
  record(checks, `${prefix}.csp.form_action`, sameTokens(formAction, canonical["form-action"] ?? []), "form-action permits only same-origin submissions");
  const connectSource = directives.get("connect-src") ?? [];
  record(checks, `${prefix}.csp.connect_src`, sameTokens(connectSource, canonical["connect-src"] ?? []), "connect-src permits only same-origin browser egress");
  const canonicalNames = Object.keys(canonical).sort();
  const exactCanonical = !duplicate && [...directives.keys()].sort().join(",") === canonicalNames.join(",") && Object.entries(canonical).every(([name, values]) => name === "script-src" ? scriptContract : sameTokens(directives.get(name), values));
  record(checks, `${prefix}.csp.contract`, exactCanonical, "production CSP exactly matches the app security-header directive contract");
  const nonces = [...csp.matchAll(/nonce-([^' ;]+)/g)].map((match) => match[1]);
  const htmlNonces = [...html.matchAll(/<script\b[^>]*\bnonce=["']([^"']+)["']/gi)].map((match) => match[1]);
  record(checks, `${prefix}.csp.nonce`, nonces.length > 0 && htmlNonces.length > 0 && htmlNonces.every((nonce) => nonces.includes(nonce)), "CSP nonce is present and matches framework script nonces");
  const scriptElements = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  const executable = scriptElements.filter(([, attributes]) => !/\btype=["'](?:application\/(?:ld\+json|json)|importmap)["']/i.test(attributes ?? ""));
  const scriptElementsSafe = executable.every(([, attributes]) => {
    const attrs = attributes ?? "";
    const nonce = attrs.match(/\bnonce=["']([^"']+)["']/i)?.[1];
    const src = attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (nonce && nonces.includes(nonce)) return true;
    if (!src) return false;
    try { const url = new URL(src, origin); return url.origin === origin && url.pathname.startsWith("/_next/static/") && (scriptSource ?? []).includes("'self'"); } catch { return false; }
  });
  record(checks, `${prefix}.csp.script_elements`, scriptElementsSafe, "every executable script element obeys the nonce or same-origin versioned-source policy");
  record(checks, `${prefix}.nosniff`, response.headers.get("x-content-type-options")?.toLowerCase() === "nosniff", "X-Content-Type-Options is nosniff");
  record(checks, `${prefix}.frame_protection`, response.headers.get("x-frame-options")?.toUpperCase() === "DENY", "X-Frame-Options is DENY");
  record(checks, `${prefix}.referrer_policy`, response.headers.get("referrer-policy") === "strict-origin-when-cross-origin", "Referrer-Policy is strict-origin-when-cross-origin");
  const permissions = response.headers.get("permissions-policy") ?? "";
  record(checks, `${prefix}.permissions_policy`, ["camera=()", "microphone=()", "geolocation=()"].every((value) => permissions.includes(value)), "sensitive browser capabilities are disabled");
}

export async function verifyDeployment(options: VerifyDeploymentOptions): Promise<DeploymentVerificationReport> {
  if (options.candidateState && !WORKER_CANDIDATE_STATES.includes(options.candidateState as (typeof WORKER_CANDIDATE_STATES)[number])) throw new Error("worker verifier cannot emit terminal ADR-006 states");
  if (options.liveEvaluationStatus && options.liveEvaluationStatus !== "not_evaluated") throw new Error("worker verifier cannot consume live evaluation proof; use the separately approved eval:live gate");
  const expected = normalizeSha(options.expectedSha); const target = validateTargetUrl(options.baseUrl, options.allowedHosts, options.allowLocalhost); const origin = target.origin; const targetOrigin = target.toString(); const expectedPublicAssetDigest = normalizeExpectedDigest(options.expectedPublicAssetDigest); const fetchImpl = options.fetchImpl ?? fetch; const timeoutMs = options.timeoutMs ?? 10_000; const checks: VerificationCheck[] = []; let observed: string | "unknown" = "unknown"; let runtimeMode = "unknown"; let cloudProviderFlags: Record<string, boolean | string> = { cloud_accounts_enabled: "not_evaluated", cloud_auth_configured: "not_evaluated", provider_mode: "not_evaluated" }; const assets = new Map<string, URL>();
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const resolver = options.resolveHostname ?? defaultResolveHostname;
  let targetAddresses: readonly string[] | undefined;
  if (LOCAL_HOSTS.has(target.hostname)) {
    record(checks, "target.dns_policy", true, "explicit localhost verification is enabled only for the local artifact runner");
  } else {
    try {
      targetAddresses = await safeResolvedAddresses(target.hostname, resolver);
      record(checks, "target.dns_policy", true, "target DNS resolves only to an allowed public address set");
    } catch {
      record(checks, "target.dns_policy", false, "target DNS is private, reserved, unavailable, or changed during verification");
      const failed = checks.length;
      const releaseIdentity = buildReleaseIdentity({ sourceSha: expected, testedSha: expected, generatedAt, candidateState: "DEPLOYMENT_BLOCKED", buildRuntimeMode: "unknown", cloudProviderFlags, retainedArtifactIds: options.retainedArtifactIds ?? ["deployment-verification.json", "deployment-verification.md"], databaseProject: options.databaseProject, databaseMigration: options.databaseMigration, rollbackDeploymentId: options.rollbackDeploymentId, rollbackSha: options.rollbackSha, rollbackRehearsal: options.rollbackRehearsal, decisionName: options.decisionName });
      return { schema_version: "1.0", report_kind: "read_only_deployment_verification", verifier_version: DEPLOYMENT_VERIFIER_VERSION, generated_at: generatedAt, alias_verified_at: "not_verified", target_origin: origin, expected_release_sha: expected, observed_release_sha: "unknown", release_identity: releaseIdentity, request_policy: { methods: ["GET"], same_origin_only: true, redirects_followed: false, state_changing_requests: false, response_bodies_retained: false, learner_data_collected: false }, checks, summary: { passed: 0, failed }, status: "fail" };
    }
  }
  let releaseManifest: BoundReleaseManifest | null = null;
  let aliasVerifiedAt: string | "not_verified" = "not_verified";
  try {
    const response = await get(fetchImpl, new URL("/api/health", origin), timeoutMs, targetAddresses, resolver, fetchImpl === fetch, MAX_HEALTH);
    record(checks, "health.status", response.status === 200, "health endpoint returns 200");
    record(checks, "health.content_type", response.headers.get("content-type")?.toLowerCase().includes("application/json") === true, "health endpoint returns JSON");
    record(checks, "health.cache_control", response.headers.get("cache-control")?.toLowerCase().includes("no-store") === true, "health response is not cached");
    const text = await readBounded(response, MAX_HEALTH); let payload: unknown; try { payload = JSON.parse(text); } catch { payload = null; }
    if (!LOCAL_HOSTS.has(target.hostname)) aliasVerifiedAt = new Date().toISOString();
    const expectedKeys = ["app_name", "build_time", "cloud_accounts_enabled", "cloud_auth_configured", "content_package_manifest_digest", "database_migration_identity", "dependency_lock_digest", "device_profiles", "evaluator_baseline_digest", "learner_evidence_sync", "managed_provider_flags", "managed_surface_flags", "provider_mode", "release_manifest", "release_sha", "runtime_mode", "schema_version", "service", "status"];
    const shape = isRecord(payload) && Object.keys(payload).sort().join(",") === expectedKeys.join(",") && payload.schema_version === "1.0" && payload.status === "ok" && payload.service === "forge-learning-os" && payload.app_name === "FORGE";
    record(checks, "health.schema", shape, "health payload uses the allowlisted release schema");
    if (shape && isRecord(payload)) {
      observed = typeof payload.release_sha === "string" && SHA.test(payload.release_sha) ? payload.release_sha.toLowerCase() : "unknown";
      runtimeMode = typeof payload.runtime_mode === "string" ? payload.runtime_mode : "unknown";
      const managedFlags = isRecord(payload.managed_provider_flags) ? payload.managed_provider_flags : {};
      const surfaceFlags = isRecord(payload.managed_surface_flags) ? payload.managed_surface_flags : {};
      cloudProviderFlags = {
        cloud_accounts_enabled: typeof payload.cloud_accounts_enabled === "boolean" ? payload.cloud_accounts_enabled : "not_evaluated",
        cloud_auth_configured: typeof payload.cloud_auth_configured === "boolean" ? payload.cloud_auth_configured : "not_evaluated",
        provider_mode: typeof payload.provider_mode === "string" ? payload.provider_mode : "not_evaluated",
        managed_openai: managedFlags.openai === true,
        managed_anthropic: managedFlags.anthropic === true,
        managed_gemini: managedFlags.gemini === true,
        managed_openrouter: managedFlags.openrouter === true,
        managed_lesson_studio: surfaceFlags.lesson_studio === true,
        managed_interpretation: surfaceFlags.interpretation === true,
        managed_planner: surfaceFlags.planner === true,
      };
      record(checks, "health.build_time", typeof payload.build_time === "string" && ISO.test(payload.build_time), "release candidate exposes an ISO build time");
      record(checks, "health.disabled_cloud", payload.cloud_accounts_enabled === false && payload.cloud_auth_configured === false && payload.device_profiles === "device_only" && payload.learner_evidence_sync === "disabled", "cloud identity and learner evidence sync are disabled");
      const flags = payload.managed_provider_flags;
      const surfaces = payload.managed_surface_flags;
      record(checks, "health.disabled_providers", payload.runtime_mode === "fallback_only" && payload.provider_mode === "request_only_byok" && isRecord(flags) && flags.openai === false && flags.anthropic === false && flags.gemini === false && flags.openrouter === false && isRecord(surfaces) && surfaces.lesson_studio === false && surfaces.interpretation === false && surfaces.planner === false, "all managed provider surfaces are disabled; request-only BYOK remains the explicit boundary");
      record(checks, "health.digest_shape", typeof payload.dependency_lock_digest === "string" && DIGEST.test(payload.dependency_lock_digest) && typeof payload.content_package_manifest_digest === "string" && DIGEST.test(payload.content_package_manifest_digest) && typeof payload.evaluator_baseline_digest === "string" && DIGEST.test(payload.evaluator_baseline_digest) && typeof payload.database_migration_identity === "string" && /^(?:not_configured|[A-Za-z0-9._:-]{1,160})$/.test(payload.database_migration_identity), "release metadata digests and migration identity are well formed");
      record(checks, "health.digest_lockfile", payload.dependency_lock_digest === options.expectedLockfileDigest, "dependency lock digest matches the checked-in source");
      record(checks, "health.digest_content_manifest", payload.content_package_manifest_digest === options.expectedContentManifestDigest, "content package manifest digest matches the checked-in source");
      record(checks, "health.digest_evaluator_baseline", payload.evaluator_baseline_digest === options.expectedEvaluatorBaselineDigest, "evaluator baseline digest matches the checked-in source");
      record(checks, "health.database_migration_identity", payload.database_migration_identity === options.expectedDatabaseMigrationIdentity, "database migration identity matches the explicit configured/not-configured state");
      const manifestFailures = validateReleaseManifest(payload.release_manifest);
      record(checks, "health.release_manifest.schema", manifestFailures.length === 0, manifestFailures.length === 0 ? "release manifest uses the exact allowlisted candidate schema" : `release manifest is malformed: ${manifestFailures.join(", ")}`);
      if (isBoundReleaseManifest(payload.release_manifest)) {
        const candidateManifest = payload.release_manifest;
        const matchesHealth = payload.release_sha === candidateManifest.source_sha
          && payload.build_time === candidateManifest.build_time
          && payload.dependency_lock_digest === candidateManifest.dependency_lock_digest;
        const matchesExpectedSource = candidateManifest.source_sha === expected;
        const aliasMatchesTarget = candidateManifest.public_alias.url === targetOrigin;
        const immutableMatchesPolicy = matchesImmutableDeploymentTarget(
          candidateManifest.immutable_deployment,
          candidateManifest.public_alias.url,
          options.deploymentTarget,
        );
        const publicAssetMatchesAuthority = candidateManifest.public_asset.status === "recorded"
          && expectedPublicAssetDigest !== undefined
          && candidateManifest.public_asset.digest === expectedPublicAssetDigest;
        const buildPrecedesAliasVerification = aliasVerifiedAt !== "not_verified"
          && new Date(candidateManifest.build_time).getTime() <= new Date(aliasVerifiedAt).getTime();
        record(checks, "health.release_manifest.alias_target", aliasMatchesTarget, "manifest public alias exactly matches the normalized verified target origin");
        record(checks, "health.release_manifest.build_time_order", buildPrecedesAliasVerification, "manifest build time is no later than the verifier's post-fetch alias receipt timestamp");
        record(checks, "health.release_manifest.immutable_target", immutableMatchesPolicy, "immutable deployment uses the checked-in FORGE Vercel hostname and non-placeholder deployment-ID policy");
        record(checks, "health.release_manifest.public_asset_authority", publicAssetMatchesAuthority, "recorded public asset digest matches the caller-retained expected digest");
        const boundCandidate = matchesHealth && matchesExpectedSource && aliasMatchesTarget && buildPrecedesAliasVerification && immutableMatchesPolicy && publicAssetMatchesAuthority;
        if (boundCandidate) releaseManifest = candidateManifest;
        record(checks, "health.release_manifest.binding", boundCandidate, "bound candidate tuple matches health, verified alias target and receipt time, source SHA, immutable-target policy, and retained public asset digest");
      } else {
        const localUnbound = LOCAL_HOSTS.has(target.hostname)
          && isRecord(payload.release_manifest)
          && payload.release_manifest.binding_status === "unbound";
        record(checks, "health.release_manifest.binding", localUnbound, localUnbound ? "local artifact correctly reports release provenance as unbound" : "public candidate provenance is missing or unbound");
      }
    }
    record(checks, "release.identity", observed === expected, "observed release SHA matches the expected immutable SHA");
    record(checks, "release.header_consistency", response.headers.get("x-forge-release-sha")?.toLowerCase() === observed, "release header matches the health payload");
  } catch { record(checks, "health.request", false, "health request failed or exceeded a verification bound"); record(checks, "release.identity", false, "release identity could not be verified"); }

  for (const route of CANONICAL_DEPLOYMENT_ROUTES) {
    try {
      const response = await get(fetchImpl, new URL(route.path, origin), timeoutMs, targetAddresses, resolver, fetchImpl === fetch, MAX_HTML);
      record(checks, `${route.id}.status`, response.status === 200, `${route.path} returns 200 without a redirect or access challenge`);
      record(checks, `${route.id}.content_type`, response.headers.get("content-type")?.toLowerCase().includes("text/html") === true, `${route.path} returns HTML`);
      const html = await readBounded(response, MAX_HTML);
      headerChecks(checks, response, route.id, html, origin);
      record(checks, `${route.id}.marker`, route.marker.test(html), `${route.path} contains its allowlisted application marker`);
      const leaks = forbidden(html); record(checks, `${route.id}.secret_scan`, leaks.length === 0, leaks.length === 0 ? "no forbidden secret pattern appears in HTML" : `forbidden pattern categories detected: ${leaks.join(", ")}`);
      const found = scripts(html, origin); record(checks, `${route.id}.script_origins`, found.rejected === 0, "client scripts are same-origin versioned Next.js assets"); for (const url of found.urls) assets.set(url.href, url);
    } catch { record(checks, `${route.id}.request`, false, `${route.path} failed or exceeded a verification bound`); }
  }
  record(checks, "client_assets.bounded_count", assets.size > 0 && assets.size <= INITIAL_HTML_CLIENT_ASSET_BUDGET, `initial HTML client asset set contains ${assets.size} distinct assets and is non-empty and no larger than ${INITIAL_HTML_CLIENT_ASSET_BUDGET}`);
  if (assets.size <= INITIAL_HTML_CLIENT_ASSET_BUDGET) for (const [index, url] of [...assets.values()].sort((a, b) => a.href.localeCompare(b.href)).entries()) {
    try { const response = await get(fetchImpl, url, timeoutMs, targetAddresses, resolver, fetchImpl === fetch, MAX_ASSET); const body = await readBounded(response, MAX_ASSET); const leaks = forbidden(body); record(checks, `client_asset.${index + 1}`, response.status === 200 && leaks.length === 0, leaks.length === 0 ? "client asset is reachable and contains no forbidden secret pattern" : `client asset contains forbidden pattern categories: ${leaks.join(", ")}`); } catch { record(checks, `client_asset.${index + 1}`, false, "client asset failed or exceeded a verification bound"); }
  }
  let passed = checks.filter((item) => item.status === "pass").length; let failed = checks.length - passed;
  const cspChecks = checks.filter((item) => item.id.includes(".csp."));
  const networkChecks = checks.filter((item) => item.id.startsWith("client_asset.") || item.id === "client_assets.bounded_count");
  const candidateState = LOCAL_HOSTS.has(target.hostname)
    ? "BUILT_LOCAL"
    : releaseManifest
      ? "DEPLOYED_CANDIDATE"
      : "DEPLOYMENT_BLOCKED";
  if (!RELEASE_CANDIDATE_STATES.includes(candidateState)) throw new Error("candidate state is not an ADR-006 state");
  const releaseIdentity = buildReleaseIdentity({
    sourceSha: expected,
    testedSha: expected,
    generatedAt,
    candidateState,
    buildRuntimeMode: runtimeMode,
    cloudProviderFlags,
    retainedArtifactIds: options.retainedArtifactIds ?? ["evaluation-regression.json", "evaluation-regression.md", "deployment-verification.json", "deployment-verification.md"],
    deploymentId: releaseManifest?.immutable_deployment.id,
    deploymentUrl: releaseManifest?.immutable_deployment.url,
    aliasUrl: releaseManifest?.public_alias.url,
    aliasResolvedAt: releaseManifest && aliasVerifiedAt !== "not_verified" ? aliasVerifiedAt : undefined,
    databaseProject: options.databaseProject,
    databaseMigration: options.databaseMigration,
    browser: failed === 0 ? "pass" : "fail",
    csp: cspChecks.length > 0 && cspChecks.every((item) => item.status === "pass") ? "pass" : "fail",
    console: options.consoleVerification ?? "not_evaluated",
    network: networkChecks.length > 0 && networkChecks.every((item) => item.status === "pass") ? "pass" : "fail",
    rollbackDeploymentId: options.rollbackDeploymentId,
    rollbackSha: options.rollbackSha,
    rollbackRehearsal: options.rollbackRehearsal,
    decisionName: options.decisionName,
  });
  const identityFailures = validateReleaseIdentity(releaseIdentity);
  record(checks, "release_identity.contract", identityFailures.length === 0, identityFailures.length === 0 ? "ADR-006 identity tuple is complete and internally consistent" : `ADR-006 identity tuple fields are invalid: ${identityFailures.join(", ")}`);
  record(checks, "release_identity.state_bound", candidateState !== "DEPLOYMENT_BLOCKED", candidateState === "DEPLOYMENT_BLOCKED" ? "immutable deployment metadata is missing; candidate remains blocked" : `candidate state is ${candidateState}`);
  passed = checks.filter((item) => item.status === "pass").length; failed = checks.length - passed;
  return { schema_version: "1.0", report_kind: "read_only_deployment_verification", verifier_version: DEPLOYMENT_VERIFIER_VERSION, generated_at: generatedAt, alias_verified_at: aliasVerifiedAt, target_origin: origin, expected_release_sha: expected, observed_release_sha: observed, release_identity: releaseIdentity, request_policy: { methods: ["GET"], same_origin_only: true, redirects_followed: false, state_changing_requests: false, response_bodies_retained: false, learner_data_collected: false }, checks, summary: { passed, failed }, status: failed === 0 ? "pass" : "fail" };
}

export function renderDeploymentMarkdown(report: DeploymentVerificationReport): string {
  const rows = report.checks.map((item) => `| ${item.id} | ${item.status.toUpperCase()} | ${item.detail} |`).join("\n");
  return `# FORGE Deployment Verification\n\n- Status: **${report.status.toUpperCase()}**\n- Target origin: \`${report.target_origin}\`\n- Expected release: \`${report.expected_release_sha}\`\n- Observed release: \`${report.observed_release_sha}\`\n- Alias verified at: ${report.alias_verified_at}\n- Candidate state: \`${report.release_identity.candidate_state}\`\n- Verifier: \`${report.verifier_version}\`\n- Generated: ${report.generated_at}\n\nThis report contains only bounded, same-origin GET evidence. It never deploys, calls a provider, submits learner data, retains response bodies, or mutates state. Initial HTML script references are checked; runtime-loaded chunks discovered only after hydration are not exhaustively enumerated by this read-only verifier.\n\n| Check | Status | Evidence |\n| --- | --- | --- |\n${rows}\n\n## ADR-006 release identity tuple\n\n\`\`\`json\n${JSON.stringify(report.release_identity, null, 2)}\n\`\`\`\n`;
}
export async function writeDeploymentReport(report: DeploymentVerificationReport, outputDirectory: string): Promise<void> { await mkdir(outputDirectory, { recursive: true }); await Promise.all([writeFile(resolve(outputDirectory, "deployment-verification.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"), writeFile(resolve(outputDirectory, "deployment-verification.md"), renderDeploymentMarkdown(report), "utf8")]); }
const arg = (name: string): string | undefined => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const args = (name: string): string[] => process.argv.flatMap((value, index) => value === name && process.argv[index + 1] ? [process.argv[index + 1] as string] : []);
async function main() {
  const targetId = arg("--target-id"); const approvedTarget = targetId ? resolveDeploymentTarget(targetId) : undefined;
  const baseUrl = approvedTarget?.origin ?? arg("--base-url"); const expectedSha = arg("--expected-sha");
  if (!baseUrl || !expectedSha) throw new Error("--target-id (checked-in) or --base-url, plus --expected-sha, are required");
  if (targetId && arg("--base-url")) throw new Error("--target-id cannot be combined with a caller-provided base URL");
  if (!approvedTarget) {
    let localBase = false;
    try { localBase = LOCAL_HOSTS.has(new URL(baseUrl).hostname); } catch { /* validateTargetUrl emits the canonical setup error below. */ }
    if (!process.argv.includes("--allow-localhost") || !localBase) throw new Error("remote verification requires a checked-in --target-id; --base-url is reserved for the explicit local artifact runner");
  }
  if (["--deployment-id", "--deployment-url", "--alias-url", "--alias-resolved-at"].some((name) => arg(name) !== undefined)) {
    throw new Error("deployment and alias identity are accepted only from the bound public health manifest");
  }
  const expectedPublicAssetDigest = arg("--expected-public-asset-digest");
  if (approvedTarget && (!expectedPublicAssetDigest || !DIGEST.test(expectedPublicAssetDigest))) {
    throw new Error("--expected-public-asset-digest must be a caller-retained lowercase SHA-256 digest for a checked-in remote target");
  }
  const outputDirectory = resolve(arg("--output-dir") ?? "test-results/release-ops");
  const requestedState = arg("--candidate-state");
  const candidateState = requestedState && WORKER_CANDIDATE_STATES.includes(requestedState as (typeof WORKER_CANDIDATE_STATES)[number]) ? requestedState as ReleaseCandidateState : undefined;
  if (requestedState && !candidateState) throw new Error("--candidate-state must be a nonterminal worker ADR-006 state");
  const liveEvaluationStatus = arg("--live-evaluation-status");
  if (liveEvaluationStatus && liveEvaluationStatus !== "not_evaluated") throw new Error("worker CLI cannot consume live evaluation proof");
  if (arg("--decision-outcome")) throw new Error("worker CLI cannot accept a release decision outcome");
  const report = await verifyDeployment({
    baseUrl,
    expectedSha,
    allowedHosts: approvedTarget ? [approvedTarget.hostname] : args("--allowed-host"),
    allowLocalhost: process.argv.includes("--allow-localhost"),
    candidateState,
    retainedArtifactIds: args("--artifact-id"),
    databaseProject: arg("--database-project"),
    databaseMigration: arg("--database-migration"),
    rollbackDeploymentId: arg("--rollback-deployment-id"),
    rollbackSha: arg("--rollback-sha"),
    rollbackRehearsal: arg("--rollback-rehearsal") as "pass" | "fail" | "not_evaluated" | undefined,
    decisionName: arg("--decision-name"),
    consoleVerification: arg("--console-verification") as "pass" | "fail" | "not_evaluated" | undefined,
    expectedLockfileDigest: arg("--expected-lockfile-digest"),
    expectedPublicAssetDigest,
    expectedContentManifestDigest: arg("--expected-content-manifest-digest"),
    expectedEvaluatorBaselineDigest: arg("--expected-evaluator-baseline-digest"),
    expectedDatabaseMigrationIdentity: arg("--expected-database-migration-identity"),
    liveEvaluationStatus: liveEvaluationStatus as "not_evaluated" | undefined,
    liveEvaluationArtifactId: arg("--live-evaluation-artifact-id"),
    deploymentTarget: approvedTarget,
  });
  await writeDeploymentReport(report, outputDirectory);
  console.log(`deployment verification: ${report.status.toUpperCase()} (${report.summary.passed} passed, ${report.summary.failed} failed)`);
  console.log(`candidate state: ${report.release_identity.candidate_state}`);
  console.log(`report: ${resolve(outputDirectory, "deployment-verification.md")}`);
  if (report.status === "fail") process.exitCode = 1;
}
const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) void main().catch((error: unknown) => { console.error(`deployment verification setup failed: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; });
