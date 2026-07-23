import { isIP } from "node:net";

import { matchesImmutableDeploymentTarget, resolveDeploymentTarget } from "./deployment-target-policy";

const SHA = /^[0-9a-f]{40}$/i;
const DIGEST = /^[0-9a-f]{64}$/i;
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]{20,64}$/;
const PROJECT_ID = /^prj_[A-Za-z0-9]{20,64}$/;
const CURRENT_TARGET = resolveDeploymentTarget("forge_learning_os_project");

type ReleaseEnvironment = Readonly<Record<string, string | undefined>>;
type RecordValue = Record<string, unknown>;

export const RELEASE_MANIFEST_ERROR_CODES = [
  "candidate_state",
  "source_sha",
  "source_drift",
  "dependency_lock_digest",
  "public_asset_digest",
  "immutable_deployment",
  "deployment_project",
  "public_alias",
] as const;

export type ReleaseManifestErrorCode = (typeof RELEASE_MANIFEST_ERROR_CODES)[number];

type ProviderReceiptRequiredPublicAsset = {
  status: "provider_receipt_required";
  gate: "provider_observed_asset_digest_required_before_promotion";
};

export type BoundReleaseManifest = {
  schema_version: "1.0";
  binding_status: "bound";
  candidate_state: "DEPLOYED_CANDIDATE";
  source_sha: string;
  dependency_lock_digest: string;
  /**
   * A deployment cannot know Vercel's emitted static asset tree until after
   * its build has run. Health therefore declares the required post-build
   * receipt rather than self-reporting a build-time digest.
   */
  public_asset: ProviderReceiptRequiredPublicAsset;
  immutable_deployment: { id: string; url: string; project_id: string };
  public_alias: { url: string };
};

export type UnboundReleaseManifest = {
  schema_version: "1.0";
  binding_status: "unbound";
  candidate_state: "unknown";
  source_sha: "unknown";
  dependency_lock_digest: "unknown";
  public_asset: { status: "unknown" };
  immutable_deployment: { status: "unknown" };
  public_alias: { status: "unknown" };
  reason_codes: readonly ReleaseManifestErrorCode[];
};

export type ReleaseManifest = BoundReleaseManifest | UnboundReleaseManifest;

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

function canonicalHttpsOrigin(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (url.protocol !== "https:" || !url.hostname || isIP(hostname) !== 0 || hostname === "localhost" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isCanonicalHttpsOrigin(value: unknown): value is string {
  return typeof value === "string" && canonicalHttpsOrigin(value) === value;
}

function canonicalVercelDeploymentOrigin(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return canonicalHttpsOrigin(value.includes("://") ? value : `https://${value}`);
}

function validDeploymentId(value: unknown): value is string {
  return typeof value === "string" && DEPLOYMENT_ID.test(value);
}

function validProjectId(value: unknown): value is string {
  return typeof value === "string" && PROJECT_ID.test(value);
}

function unbound(reasonCodes: readonly ReleaseManifestErrorCode[]): UnboundReleaseManifest {
  return {
    schema_version: "1.0",
    binding_status: "unbound",
    candidate_state: "unknown",
    source_sha: "unknown",
    dependency_lock_digest: "unknown",
    public_asset: { status: "unknown" },
    immutable_deployment: { status: "unknown" },
    public_alias: { status: "unknown" },
    reason_codes: [...new Set(reasonCodes)].sort() as ReleaseManifestErrorCode[],
  };
}

/**
 * Resolves the only health payload that may describe a public candidate. This
 * uses Vercel-owned system variables for deployment identity and never treats
 * local build metadata as public provenance: a candidate is an exact
 * all-or-nothing tuple.
 */
export function buildReleaseManifest(environment: ReleaseEnvironment = process.env): ReleaseManifest {
  const requestedState = environment.FORGE_RELEASE_CANDIDATE_STATE;
  const deploymentInputsPresent = [
    environment.VERCEL_DEPLOYMENT_ID,
    environment.VERCEL_URL,
    environment.VERCEL_PROJECT_ID,
    environment.FORGE_PUBLIC_ASSET_DIGEST,
    environment.FORGE_PUBLIC_ASSET_DIGEST_STATUS,
    environment.FORGE_PUBLIC_ASSET_DIGEST_GATE,
  ].some((value) => value !== undefined && value !== "");

  // Local builds commonly provide source, build time, and retained digests.
  // Those facts are useful build diagnostics but are not public provenance.
  if (requestedState === undefined || requestedState === "") {
    return unbound(deploymentInputsPresent ? ["candidate_state"] : []);
  }

  const failures: ReleaseManifestErrorCode[] = [];
  if (requestedState !== "DEPLOYED_CANDIDATE") failures.push("candidate_state");

  const sourceSha = canonicalSha(environment.FORGE_RELEASE_SHA);
  if (!sourceSha) failures.push("source_sha");
  const platformSha = canonicalSha(environment.VERCEL_GIT_COMMIT_SHA);
  if (!platformSha || !sourceSha || platformSha !== sourceSha) failures.push("source_drift");

  const lockDigest = canonicalDigest(environment.FORGE_LOCKFILE_DIGEST);
  if (!lockDigest) failures.push("dependency_lock_digest");

  // A local .next/static digest is useful as a build diagnostic, but Vercel's
  // emitted output is deployment-specific. Do not let a caller bake either a
  // digest or a pre-deployment absence receipt into health.
  if (environment.FORGE_PUBLIC_ASSET_DIGEST !== undefined
    || environment.FORGE_PUBLIC_ASSET_DIGEST_STATUS !== undefined
    || environment.FORGE_PUBLIC_ASSET_DIGEST_GATE !== undefined) failures.push("public_asset_digest");

  const deploymentId = environment.VERCEL_DEPLOYMENT_ID;
  const deploymentUrl = canonicalVercelDeploymentOrigin(environment.VERCEL_URL);
  const projectId = environment.VERCEL_PROJECT_ID;
  const callerDeploymentId = environment.FORGE_RELEASE_DEPLOYMENT_ID;
  const callerDeploymentUrl = environment.FORGE_RELEASE_IMMUTABLE_URL === undefined
    ? undefined
    : canonicalHttpsOrigin(environment.FORGE_RELEASE_IMMUTABLE_URL);
  const platformDeployment = deploymentUrl && validDeploymentId(deploymentId) && validProjectId(projectId)
    ? { id: deploymentId, url: deploymentUrl, project_id: projectId }
    : null;
  if (!platformDeployment || !matchesImmutableDeploymentTarget(platformDeployment, CURRENT_TARGET.origin, CURRENT_TARGET)) failures.push("immutable_deployment");
  if (!validProjectId(projectId) || projectId !== CURRENT_TARGET.project_id) failures.push("deployment_project");
  if ((callerDeploymentId !== undefined && callerDeploymentId !== deploymentId) || (environment.FORGE_RELEASE_IMMUTABLE_URL !== undefined && callerDeploymentUrl !== deploymentUrl)) {
    failures.push("immutable_deployment");
  }
  const aliasUrl = new URL(CURRENT_TARGET.origin).toString();
  if (environment.FORGE_RELEASE_ALIAS_URL !== undefined || environment.FORGE_RELEASE_ALIAS_RESOLVED_AT !== undefined) failures.push("public_alias");

  if (failures.length > 0 || !sourceSha || !lockDigest || !platformDeployment) {
    return unbound(failures);
  }

  return {
    schema_version: "1.0",
    binding_status: "bound",
    candidate_state: "DEPLOYED_CANDIDATE",
    source_sha: sourceSha,
    dependency_lock_digest: lockDigest,
    public_asset: {
      status: "provider_receipt_required",
      gate: "provider_observed_asset_digest_required_before_promotion",
    },
    immutable_deployment: platformDeployment,
    public_alias: { url: aliasUrl },
  };
}

export function validateReleaseManifest(value: unknown): ReleaseManifestErrorCode[] {
  if (!isRecord(value) || value.schema_version !== "1.0") return ["candidate_state"];
  if (value.binding_status === "bound") {
    const keys = ["schema_version", "binding_status", "candidate_state", "source_sha", "dependency_lock_digest", "public_asset", "immutable_deployment", "public_alias"];
    const publicAsset = isRecord(value.public_asset) ? value.public_asset : null;
    const validAsset = Boolean(publicAsset
      && hasExactKeys(publicAsset, ["status", "gate"])
      && publicAsset.status === "provider_receipt_required"
      && publicAsset.gate === "provider_observed_asset_digest_required_before_promotion");
    const deployment = isRecord(value.immutable_deployment) ? value.immutable_deployment : null;
    const alias = isRecord(value.public_alias) ? value.public_alias : null;
    const failures: ReleaseManifestErrorCode[] = [];
    if (!hasExactKeys(value, keys) || value.candidate_state !== "DEPLOYED_CANDIDATE") failures.push("candidate_state");
    if (!canonicalSha(value.source_sha)) failures.push("source_sha");
    if (!canonicalDigest(value.dependency_lock_digest)) failures.push("dependency_lock_digest");
    if (!validAsset) failures.push("public_asset_digest");
    if (!deployment || !hasExactKeys(deployment, ["id", "url", "project_id"]) || !validDeploymentId(deployment.id) || !isCanonicalHttpsOrigin(deployment.url) || !validProjectId(deployment.project_id)) failures.push("immutable_deployment");
    if (!alias || !hasExactKeys(alias, ["url"]) || !isCanonicalHttpsOrigin(alias.url)) failures.push("public_alias");
    return [...new Set(failures)];
  }

  const keys = ["schema_version", "binding_status", "candidate_state", "source_sha", "dependency_lock_digest", "public_asset", "immutable_deployment", "public_alias", "reason_codes"];
  const reasonCodes = Array.isArray(value.reason_codes) ? value.reason_codes : [];
  const validReasons = reasonCodes.every((code) => typeof code === "string" && RELEASE_MANIFEST_ERROR_CODES.includes(code as ReleaseManifestErrorCode))
    && new Set(reasonCodes).size === reasonCodes.length
    && [...reasonCodes].every((code, index) => index === 0 || reasonCodes[index - 1]! < code);
  return hasExactKeys(value, keys)
    && value.binding_status === "unbound"
    && value.candidate_state === "unknown"
    && value.source_sha === "unknown"
    && value.dependency_lock_digest === "unknown"
    && hasExactKeys(value.public_asset, ["status"]) && value.public_asset.status === "unknown"
    && hasExactKeys(value.immutable_deployment, ["status"]) && value.immutable_deployment.status === "unknown"
    && hasExactKeys(value.public_alias, ["status"]) && value.public_alias.status === "unknown"
    && validReasons
    ? []
    : ["candidate_state"];
}

export function isBoundReleaseManifest(value: unknown): value is BoundReleaseManifest {
  return validateReleaseManifest(value).length === 0 && isRecord(value) && value.binding_status === "bound";
}
