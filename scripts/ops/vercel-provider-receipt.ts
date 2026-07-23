import { isIP } from "node:net";

import {
  isPlausibleVercelDeploymentId,
  matchesImmutableDeploymentTarget,
  type DeploymentTarget,
} from "../../src/operations/deployment-target-policy";

const SHA = /^[0-9a-f]{40}$/i;
const DIGEST = /^[0-9a-f]{64}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_PROVIDER_RESPONSE_BYTES = 4_000_000;
// Emitted by scripts/ops/verify-public-build-boundary.ts after Vercel has
// produced .next/static. The collector reads this provider-owned build-log
// observation; it never asks health to attest the deployment-specific digest.
const BUILD_DIGEST_MARKER = /^Public build boundary verified across [1-9][0-9]* static assets; public asset digest ([0-9a-f]{64})\.$/im;
type RecordValue = Record<string, unknown>;
type FetchLike = typeof fetch;

export const VERCEL_PROVIDER_RECEIPT_VERSION = "1.0";
export const VERCEL_PROVIDER_RECEIPT_KIND = "vercel_authenticated_build_log";
export type ProviderReceiptAuthority = "authenticated_vercel_api" | "external_evidence";

export type VercelProviderReceipt = {
  schema_version: "1.0";
  receipt_kind: "vercel_authenticated_build_log";
  provider: "vercel";
  collected_at: string;
  deployment: {
    id: string;
    project_id: string;
    source_sha: string;
    immutable_url: string;
    ready_state: "READY";
    created_at: string;
  };
  public_asset: {
    algorithm: "sha256";
    digest: string;
    source: "vercel_build_log_marker";
    event_id: string;
    observed_at: string;
  };
};

export type ProviderReceiptInput = Readonly<{
  authority: ProviderReceiptAuthority;
  receipt: unknown;
}>;

type VercelApiDeployment = RecordValue;
type VercelApiEvent = RecordValue;

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is RecordValue {
  return isRecord(value) && Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}

function canonicalSha(value: unknown): string | null {
  return typeof value === "string" && SHA.test(value) ? value.toLowerCase() : null;
}

function canonicalDigest(value: unknown): string | null {
  return typeof value === "string" && DIGEST.test(value) ? value.toLowerCase() : null;
}

function canonicalTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !ISO.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value ? null : value;
}

function canonicalTimestampFromProvider(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return new Date(value).toISOString();
  }
  return canonicalTimestamp(value);
}

function canonicalImmutableUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (url.protocol !== "https:" || !url.hostname || isIP(hostname) !== 0 || hostname === "localhost" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isCanonicalImmutableUrl(value: unknown): value is string {
  return typeof value === "string" && canonicalImmutableUrl(value) === value;
}

function canonicalTextId(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,256}$/.test(value) ? value : null;
}

/** Strictly validate the portable, sanitized receipt schema before use. */
export function validateVercelProviderReceipt(value: unknown): string[] {
  if (!hasExactKeys(value, ["schema_version", "receipt_kind", "provider", "collected_at", "deployment", "public_asset"])) return ["schema"];
  const deployment = value.deployment;
  const publicAsset = value.public_asset;
  const failures: string[] = [];
  if (value.schema_version !== VERCEL_PROVIDER_RECEIPT_VERSION || value.receipt_kind !== VERCEL_PROVIDER_RECEIPT_KIND || value.provider !== "vercel") failures.push("schema");
  if (!canonicalTimestamp(value.collected_at)) failures.push("collected_at");
  if (!hasExactKeys(deployment, ["id", "project_id", "source_sha", "immutable_url", "ready_state", "created_at"])
    || !isPlausibleVercelDeploymentId(deployment.id)
    || !canonicalTextId(deployment.project_id)
    || !canonicalSha(deployment.source_sha)
    || !isCanonicalImmutableUrl(deployment.immutable_url)
    || deployment.ready_state !== "READY"
    || !canonicalTimestamp(deployment.created_at)) failures.push("deployment");
  if (!hasExactKeys(publicAsset, ["algorithm", "digest", "source", "event_id", "observed_at"])
    || publicAsset.algorithm !== "sha256"
    || !canonicalDigest(publicAsset.digest)
    || publicAsset.source !== "vercel_build_log_marker"
    || !canonicalTextId(publicAsset.event_id)
    || !canonicalTimestamp(publicAsset.observed_at)) failures.push("public_asset");
  const collectedAt = typeof value.collected_at === "string" ? value.collected_at : "";
  const createdAt = isRecord(deployment) && typeof deployment.created_at === "string" ? deployment.created_at : "";
  const observedAt = isRecord(publicAsset) && typeof publicAsset.observed_at === "string" ? publicAsset.observed_at : "";
  if (failures.length === 0 && new Date(createdAt).getTime() > new Date(observedAt).getTime()) failures.push("deployment_after_observation");
  if (failures.length === 0 && new Date(collectedAt).getTime() < new Date(observedAt).getTime()) failures.push("collected_before_observation");
  return failures;
}

export function isVercelProviderReceipt(value: unknown): value is VercelProviderReceipt {
  return validateVercelProviderReceipt(value).length === 0;
}

function readSourceSha(deployment: VercelApiDeployment): string | null {
  const metadata = isRecord(deployment.meta) ? deployment.meta : {};
  const gitSource = isRecord(deployment.gitSource) ? deployment.gitSource : {};
  return canonicalSha(metadata.githubCommitSha) ?? canonicalSha(gitSource.sha);
}

function readDeploymentId(deployment: VercelApiDeployment): string | null {
  const id = typeof deployment.id === "string" ? deployment.id : deployment.uid;
  return isPlausibleVercelDeploymentId(id) ? id : null;
}

function readEvents(value: unknown): VercelApiEvent[] | null {
  if (Array.isArray(value) && value.every(isRecord)) return value;
  return isRecord(value) && Array.isArray(value.events) && value.events.every(isRecord) ? value.events : null;
}

function buildReceiptFromVercelResponses(
  deploymentPayload: unknown,
  eventsPayload: unknown,
  target: DeploymentTarget,
  collectedAt: string,
): VercelProviderReceipt {
  if (!isRecord(deploymentPayload)) throw new Error("Vercel deployment response is malformed");
  const id = readDeploymentId(deploymentPayload);
  const projectId = canonicalTextId(deploymentPayload.projectId);
  const sourceSha = readSourceSha(deploymentPayload);
  const immutableUrl = canonicalImmutableUrl(deploymentPayload.url);
  const createdAt = canonicalTimestampFromProvider(deploymentPayload.createdAt);
  if (!id || !projectId || !sourceSha || !immutableUrl || deploymentPayload.readyState !== "READY" || !createdAt) {
    throw new Error("Vercel deployment response is missing a READY deployment identity, source SHA, or creation time");
  }
  const deploymentIdentity = { id, project_id: projectId, url: immutableUrl };
  if (!matchesImmutableDeploymentTarget(deploymentIdentity, target.origin, target)) {
    throw new Error("Vercel deployment response does not satisfy the checked-in FORGE target policy");
  }
  const events = readEvents(eventsPayload);
  if (!events) throw new Error("Vercel deployment events response is malformed");
  const digestEvents = events.flatMap((event) => {
    const text = typeof event.text === "string" ? event.text : "";
    const match = text.match(BUILD_DIGEST_MARKER);
    const eventId = canonicalTextId(event.id);
    const observedAt = canonicalTimestampFromProvider(event.created);
    const digest = canonicalDigest(match?.[1]);
    return eventId && observedAt && digest ? [{ event_id: eventId, observed_at: observedAt, digest }] : [];
  });
  if (digestEvents.length !== 1) throw new Error("Vercel deployment build logs must contain exactly one canonical public-asset digest marker");
  const event = digestEvents[0]!;
  const receipt: VercelProviderReceipt = {
    schema_version: "1.0",
    receipt_kind: "vercel_authenticated_build_log",
    provider: "vercel",
    collected_at: collectedAt,
    deployment: { id, project_id: projectId, source_sha: sourceSha, immutable_url: immutableUrl, ready_state: "READY", created_at: createdAt },
    public_asset: { algorithm: "sha256", digest: event.digest, source: "vercel_build_log_marker", event_id: event.event_id, observed_at: event.observed_at },
  };
  const failures = validateVercelProviderReceipt(receipt);
  if (failures.length > 0) throw new Error(`normalized Vercel receipt is malformed: ${failures.join(", ")}`);
  return receipt;
}

async function readProviderJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`Vercel provider API returned ${response.status}`);
  const length = Number(response.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length < 0 || length > MAX_PROVIDER_RESPONSE_BYTES) throw new Error("Vercel provider response exceeded the bounded collector size");
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_PROVIDER_RESPONSE_BYTES) throw new Error("Vercel provider response exceeded the bounded collector size");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Vercel provider response is not JSON");
  }
}

/**
 * Read only the Vercel deployment metadata and build-event log through the
 * authenticated provider API. It never calls the app, deploys, promotes, or
 * writes provider state. The returned object is an in-process authority input;
 * persisting/reloading its JSON alone downgrades it to external evidence.
 */
export async function collectVercelProviderReceipt(options: Readonly<{
  deploymentId: string;
  token: string;
  target: DeploymentTarget;
  fetchImpl?: FetchLike;
  collectedAt?: string;
}>): Promise<VercelProviderReceipt> {
  if (!isPlausibleVercelDeploymentId(options.deploymentId)) throw new Error("--vercel-deployment-id must be a non-placeholder Vercel deployment ID");
  if (!options.token || options.token.trim().length < 8) throw new Error("Vercel receipt collection requires a non-empty read-only API token");
  const collectedAt = canonicalTimestamp(options.collectedAt ?? new Date().toISOString());
  if (!collectedAt) throw new Error("collector time must be a canonical ISO timestamp");
  const apiBase = "https://api.vercel.com";
  const deploymentQuery = new URLSearchParams({ teamId: options.target.team_id }).toString();
  // Read backward from completion so the terminal public-build-boundary line
  // is included without retaining an unbounded build-log history.
  const eventsQuery = new URLSearchParams({ teamId: options.target.team_id, direction: "backward", errorsOnly: "false", limit: "500" }).toString();
  const headers = { Authorization: `Bearer ${options.token}`, Accept: "application/json" };
  const fetchImpl = options.fetchImpl ?? fetch;
  const deploymentResponse = await fetchImpl(`${apiBase}/v13/deployments/${encodeURIComponent(options.deploymentId)}?${deploymentQuery}`, { method: "GET", redirect: "error", headers, signal: AbortSignal.timeout(15_000) });
  const deployment = await readProviderJson(deploymentResponse);
  const eventsResponse = await fetchImpl(`${apiBase}/v2/deployments/${encodeURIComponent(options.deploymentId)}/events?${eventsQuery}`, { method: "GET", redirect: "error", headers, signal: AbortSignal.timeout(15_000) });
  const events = await readProviderJson(eventsResponse);
  return buildReceiptFromVercelResponses(deployment, events, options.target, collectedAt);
}

export const __test__ = { buildReceiptFromVercelResponses };
