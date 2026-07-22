export const RELEASE_CANDIDATE_STATES = [
  "BUILT_LOCAL",
  "PUSHED",
  "DEPLOYMENT_BLOCKED",
  "DEPLOYED_CANDIDATE",
  "PRODUCTION_VERIFIED",
  "ROLLED_BACK",
] as const;

export type ReleaseCandidateState = (typeof RELEASE_CANDIDATE_STATES)[number];

/**
 * A release-decision name is deliberately descriptive. Terminal authority is
 * carried only by this bounded, typed outcome, never inferred from prose.
 */
export const RELEASE_DECISION_OUTCOMES = ["not_authorized", "promote", "rollback"] as const;
export type ReleaseDecisionOutcome = (typeof RELEASE_DECISION_OUTCOMES)[number];

/** The flattened, secret-free projection of `ReleaseHealth` used by ADR-006. */
export const RELEASE_HEALTH_CLOUD_PROVIDER_FLAG_KEYS = [
  "cloud_accounts_enabled",
  "cloud_auth_configured",
  "provider_mode",
  "managed_openai",
  "managed_anthropic",
  "managed_gemini",
  "managed_openrouter",
  "managed_lesson_studio",
  "managed_interpretation",
  "managed_planner",
] as const;

export type ReleaseHealthCloudProviderFlags = {
  cloud_accounts_enabled: boolean;
  cloud_auth_configured: boolean;
  provider_mode: "request_only_byok" | "managed_openai";
  managed_openai: boolean;
  managed_anthropic: boolean;
  managed_gemini: boolean;
  managed_openrouter: boolean;
  managed_lesson_studio: boolean;
  managed_interpretation: boolean;
  managed_planner: boolean;
};

export type ReleaseIdentityTuple = {
  source_sha: string | "unknown";
  tested_sha: string | "unknown";
  retained_artifact_ids: string[];
  immutable_deployment: { id: string; url: string } | { status: "not_evaluated" };
  public_alias: { url: string; resolved_at: string } | { status: "not_evaluated" };
  build_runtime_mode: string;
  cloud_provider_flags: Record<string, unknown>;
  database: { status: "not_configured" } | { project: string; migration: string };
  critical_verification: {
    browser: "pass" | "fail" | "not_evaluated";
    csp: "pass" | "fail" | "not_evaluated";
    console: "pass" | "fail" | "not_evaluated";
    network: "pass" | "fail" | "not_evaluated";
    packet_artifact_ids: string[];
  };
  rollback: {
    deployment_id: string;
    sha: string;
    rehearsal: "pass" | "fail" | "not_evaluated";
  };
  named_release_decision: {
    name: string;
    decided_at: string;
    outcome: ReleaseDecisionOutcome;
  };
};

export type ReleaseIdentityOptions = {
  sourceSha: string | "unknown";
  testedSha: string | "unknown";
  generatedAt: string;
  candidateState: ReleaseCandidateState;
  buildRuntimeMode: string;
  cloudProviderFlags: Record<string, unknown>;
  retainedArtifactIds?: readonly string[];
  deploymentId?: string;
  deploymentUrl?: string;
  aliasUrl?: string;
  aliasResolvedAt?: string;
  databaseProject?: string;
  databaseMigration?: string;
  browser?: "pass" | "fail" | "not_evaluated";
  csp?: "pass" | "fail" | "not_evaluated";
  console?: "pass" | "fail" | "not_evaluated";
  network?: "pass" | "fail" | "not_evaluated";
  rollbackDeploymentId?: string;
  rollbackSha?: string;
  rollbackRehearsal?: "pass" | "fail" | "not_evaluated";
  decisionName?: string;
  decisionOutcome?: ReleaseDecisionOutcome;
};

/**
 * Terminal authority is intentionally separate from the serialised tuple. A
 * principal-controlled release service must derive it from retained evidence;
 * a report/CLI string is not evidence of a release decision.
 */
export type ReleaseIdentityVerificationAuthority = {
  immutable_deployment: { id: string; url: string };
  public_alias: { url: string; resolved_at: string; resolved_deployment_id: string };
  production_verification_artifact_id: string;
  live_evaluation: { status: "pass"; artifact_id: string };
  rollback_rehearsal: { deployment_id: string; sha: string; artifact_id: string };
  named_release_decision: { name: string; decided_at: string; outcome: ReleaseDecisionOutcome };
};

export type ReleaseIdentityValidationOptions = {
  verificationAuthority?: ReleaseIdentityVerificationAuthority;
};

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const ARTIFACT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const DEPLOYMENT_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{2,127}$/;
const DECISION_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._;:-]{2,159}$/;
const DATABASE_IDENTITY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const VERIFICATION_STATUSES = new Set(["pass", "fail", "not_evaluated"]);
const TERMINAL_STATES = new Set<ReleaseCandidateState>(["PRODUCTION_VERIFIED", "ROLLED_BACK"]);
const SECRET_LIKE = /(?:api[_-]?key|secret|token|password|authorization|bearer|^sk-[A-Za-z0-9_-]{8,}$)/i;
type RecordValue = Record<string, unknown>;
type Deployment = { id: string; url: string };
type Alias = { url: string; resolved_at: string };
const IDENTITY_KEYS = ["candidate_state", "source_sha", "tested_sha", "retained_artifact_ids", "immutable_deployment", "public_alias", "build_runtime_mode", "cloud_provider_flags", "database", "critical_verification", "rollback", "named_release_decision"] as const;
const CRITICAL_VERIFICATION_KEYS = ["browser", "csp", "console", "network", "packet_artifact_ids"] as const;
const ROLLBACK_KEYS = ["deployment_id", "sha", "rehearsal"] as const;
const DECISION_KEYS = ["name", "decided_at", "outcome"] as const;
const AUTHORITY_KEYS = ["immutable_deployment", "public_alias", "production_verification_artifact_id", "live_evaluation", "rollback_rehearsal", "named_release_decision"] as const;
const AUTHORITY_ALIAS_KEYS = ["url", "resolved_at", "resolved_deployment_id"] as const;
const LIVE_EVALUATION_KEYS = ["status", "artifact_id"] as const;
const ROLLBACK_REHEARSAL_KEYS = ["deployment_id", "sha", "artifact_id"] as const;

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is RecordValue {
  return isRecord(value) && Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const timestamp = new Date(value);
  return !Number.isNaN(timestamp.getTime()) && timestamp.toISOString() === value;
}

function canonicalHttpsOrigin(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_048 || SECRET_LIKE.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function canonicalOrOriginal(value: string | undefined): string | undefined {
  if (!value) return value;
  return canonicalHttpsOrigin(value) ?? value;
}

function validArtifactId(value: unknown): value is string {
  return typeof value === "string" && ARTIFACT_ID_PATTERN.test(value) && !value.includes("//") && !value.split("/").includes("..") && !SECRET_LIKE.test(value);
}

function validDeploymentId(value: unknown): value is string {
  return typeof value === "string" && DEPLOYMENT_ID_PATTERN.test(value) && !SECRET_LIKE.test(value) && value !== "not_evaluated";
}

function validDecisionName(value: unknown): value is string {
  return typeof value === "string" && DECISION_NAME_PATTERN.test(value) && !SECRET_LIKE.test(value) && !["unknown", "not_evaluated"].includes(value.toLowerCase());
}

function validDecisionOutcome(value: unknown): value is ReleaseDecisionOutcome {
  return typeof value === "string" && RELEASE_DECISION_OUTCOMES.includes(value as ReleaseDecisionOutcome);
}

function requiredDecisionOutcome(state: ReleaseCandidateState): ReleaseDecisionOutcome {
  if (state === "PRODUCTION_VERIFIED") return "promote";
  if (state === "ROLLED_BACK") return "rollback";
  return "not_authorized";
}

function validVerificationStatus(value: unknown): value is "pass" | "fail" | "not_evaluated" {
  return typeof value === "string" && VERIFICATION_STATUSES.has(value);
}

function isNotEvaluated(value: unknown): value is { status: "not_evaluated" } {
  return hasExactKeys(value, ["status"]) && value.status === "not_evaluated";
}

function isNotConfigured(value: unknown): value is { status: "not_configured" } {
  return hasExactKeys(value, ["status"]) && value.status === "not_configured";
}

function parseDeployment(value: unknown): Deployment | null {
  if (!hasExactKeys(value, ["id", "url"]) || !validDeploymentId(value.id)) return null;
  const url = canonicalHttpsOrigin(value.url);
  return url ? { id: value.id, url } : null;
}

function parseAlias(value: unknown): Alias | null {
  if (!hasExactKeys(value, ["url", "resolved_at"]) || !isCanonicalTimestamp(value.resolved_at)) return null;
  const url = canonicalHttpsOrigin(value.url);
  return url ? { url, resolved_at: value.resolved_at } : null;
}

function sameDeployment(left: Deployment | null, right: Deployment | null): boolean {
  return Boolean(left && right && left.id === right.id && left.url === right.url);
}

function sameAlias(left: Alias | null, right: Alias | null): boolean {
  return Boolean(left && right && left.url === right.url && left.resolved_at === right.resolved_at);
}

function flagsAreExactProjection(value: unknown): value is ReleaseHealthCloudProviderFlags {
  if (!isRecord(value) || Object.keys(value).sort().join(",") !== [...RELEASE_HEALTH_CLOUD_PROVIDER_FLAG_KEYS].sort().join(",")) return false;
  if (Object.keys(value).some((key) => SECRET_LIKE.test(key))) return false;
  const booleans = RELEASE_HEALTH_CLOUD_PROVIDER_FLAG_KEYS.filter((key) => key !== "provider_mode");
  if (booleans.some((key) => typeof value[key] !== "boolean")) return false;
  if (value.provider_mode !== "request_only_byok" && value.provider_mode !== "managed_openai") return false;
  const managedOpenAi = value.managed_openai === true;
  const hasManagedSurface = value.managed_lesson_studio === true || value.managed_interpretation === true || value.managed_planner === true;
  return managedOpenAi === hasManagedSurface
    && value.provider_mode === (managedOpenAi ? "managed_openai" : "request_only_byok")
    && value.managed_anthropic === false
    && value.managed_gemini === false
    && value.managed_openrouter === false
    && value.cloud_accounts_enabled === false
    && value.cloud_auth_configured === false;
}

function validProductionRuntime(value: unknown, flags: ReleaseHealthCloudProviderFlags | null): boolean {
  return Boolean(flags && (value === "fallback_only" || value === "managed_openai") && value === (flags.managed_openai ? "managed_openai" : "fallback_only"));
}

function retained(identity: RecordValue, artifactId: unknown): artifactId is string {
  return validArtifactId(artifactId)
    && Array.isArray(identity.retained_artifact_ids)
    && identity.retained_artifact_ids.includes(artifactId);
}

function parseAuthorityAlias(value: unknown): { alias: Alias; resolved_deployment_id: string } | null {
  if (!hasExactKeys(value, AUTHORITY_ALIAS_KEYS) || !validDeploymentId(value.resolved_deployment_id)) return null;
  const alias = parseAlias({ url: value.url, resolved_at: value.resolved_at });
  return alias ? { alias, resolved_deployment_id: value.resolved_deployment_id } : null;
}

function terminalAuthorityValid(authority: unknown): authority is ReleaseIdentityVerificationAuthority {
  if (!hasExactKeys(authority, AUTHORITY_KEYS)) return false;
  const deployment = parseDeployment(authority.immutable_deployment);
  const alias = parseAuthorityAlias(authority.public_alias);
  const rollback = hasExactKeys(authority.rollback_rehearsal, ROLLBACK_REHEARSAL_KEYS) ? authority.rollback_rehearsal : null;
  const decision = hasExactKeys(authority.named_release_decision, DECISION_KEYS) ? authority.named_release_decision : null;
  const live = hasExactKeys(authority.live_evaluation, LIVE_EVALUATION_KEYS) ? authority.live_evaluation : null;
  return Boolean(deployment && alias && validArtifactId(authority.production_verification_artifact_id)
    && live?.status === "pass" && validArtifactId(live.artifact_id)
    && rollback && validDeploymentId(rollback.deployment_id) && typeof rollback.sha === "string" && SHA_PATTERN.test(rollback.sha) && validArtifactId(rollback.artifact_id)
    && decision && validDecisionName(decision.name) && validDecisionOutcome(decision.outcome) && isCanonicalTimestamp(decision.decided_at));
}

function terminalEvidenceMatches(identity: RecordValue, authority: ReleaseIdentityVerificationAuthority, state: ReleaseCandidateState): boolean {
  const deployment = parseDeployment(identity.immutable_deployment);
  const alias = parseAlias(identity.public_alias);
  const authorityDeployment = parseDeployment(authority.immutable_deployment);
  const authorityAlias = parseAuthorityAlias(authority.public_alias);
  const critical = hasExactKeys(identity.critical_verification, CRITICAL_VERIFICATION_KEYS) ? identity.critical_verification : null;
  const rollback = hasExactKeys(identity.rollback, ROLLBACK_KEYS) ? identity.rollback : null;
  const decision = hasExactKeys(identity.named_release_decision, DECISION_KEYS) ? identity.named_release_decision : null;
  const isRolledBack = state === "ROLLED_BACK";
  const expectedOutcome: ReleaseDecisionOutcome = isRolledBack ? "rollback" : "promote";
  const aliasTarget = isRolledBack ? rollback?.deployment_id : deployment?.id;
  if (!deployment || !alias || !authorityDeployment || !authorityAlias || !critical || !rollback || !decision || !Array.isArray(critical.packet_artifact_ids) || typeof rollback.sha !== "string") return false;
  return sameDeployment(deployment, authorityDeployment)
    && sameAlias(alias, authorityAlias.alias)
    && authorityAlias.resolved_deployment_id === aliasTarget
    && critical.browser === "pass"
    && critical.csp === "pass"
    && critical.console === "pass"
    && critical.network === "pass"
    && retained(identity, authority.production_verification_artifact_id)
    && critical.packet_artifact_ids.includes(authority.production_verification_artifact_id)
    && authority.live_evaluation.status === "pass"
    && retained(identity, authority.live_evaluation.artifact_id)
    && validDeploymentId(rollback.deployment_id)
    && SHA_PATTERN.test(rollback.sha)
    && rollback.rehearsal === "pass"
    && rollback.deployment_id === authority.rollback_rehearsal.deployment_id
    && rollback.sha.toLowerCase() === authority.rollback_rehearsal.sha.toLowerCase()
    && retained(identity, authority.rollback_rehearsal.artifact_id)
    && validDecisionName(decision.name)
    && decision.outcome === expectedOutcome
    && decision.name === authority.named_release_decision.name
    && decision.decided_at === authority.named_release_decision.decided_at
    && decision.outcome === authority.named_release_decision.outcome
    && authority.named_release_decision.outcome === expectedOutcome
    && (!isRolledBack || (deployment.id === rollback.deployment_id && deployment.url === authorityDeployment.url));
}

export function validateReleaseIdentity(identity: unknown, options: ReleaseIdentityValidationOptions = {}): string[] {
  const failures: string[] = [];
  if (!isRecord(identity)) return ["identity"];
  if (!hasExactKeys(identity, IDENTITY_KEYS)) failures.push("identity_schema");
  const state = typeof identity.candidate_state === "string" && RELEASE_CANDIDATE_STATES.includes(identity.candidate_state as ReleaseCandidateState)
    ? identity.candidate_state as ReleaseCandidateState
    : null;
  if (!state) failures.push("candidate_state");
  const sourceSha = typeof identity.source_sha === "string" ? identity.source_sha : null;
  const testedSha = typeof identity.tested_sha === "string" ? identity.tested_sha : null;
  if (!sourceSha || !testedSha || !SHA_PATTERN.test(sourceSha) || !SHA_PATTERN.test(testedSha) || sourceSha.toLowerCase() !== testedSha.toLowerCase()) failures.push("source_tested_sha");
  const artifactIds = Array.isArray(identity.retained_artifact_ids) ? identity.retained_artifact_ids : null;
  if (!artifactIds || artifactIds.length === 0 || artifactIds.some((id) => !validArtifactId(id)) || new Set(artifactIds).size !== artifactIds.length) failures.push("retained_artifact_ids");

  const deployment = parseDeployment(identity.immutable_deployment);
  const hasDeployment = deployment !== null;
  if (!hasDeployment && !isNotEvaluated(identity.immutable_deployment)) failures.push("immutable_deployment");
  const alias = parseAlias(identity.public_alias);
  const hasAlias = alias !== null;
  if (!hasAlias && !isNotEvaluated(identity.public_alias)) failures.push("public_alias");
  if (typeof identity.build_runtime_mode !== "string" || identity.build_runtime_mode.length === 0 || identity.build_runtime_mode.length > 80 || SECRET_LIKE.test(identity.build_runtime_mode)) failures.push("build_runtime_mode");
  const flags = flagsAreExactProjection(identity.cloud_provider_flags) ? identity.cloud_provider_flags : null;
  if (!flags) failures.push("cloud_provider_flags");
  if (!isNotConfigured(identity.database) && (!hasExactKeys(identity.database, ["project", "migration"]) || typeof identity.database.project !== "string" || typeof identity.database.migration !== "string" || !DATABASE_IDENTITY_PATTERN.test(identity.database.project) || !DATABASE_IDENTITY_PATTERN.test(identity.database.migration))) failures.push("database");
  const critical = hasExactKeys(identity.critical_verification, CRITICAL_VERIFICATION_KEYS) ? identity.critical_verification : null;
  if (!critical || !validVerificationStatus(critical.browser) || !validVerificationStatus(critical.csp) || !validVerificationStatus(critical.console) || !validVerificationStatus(critical.network) || !Array.isArray(critical.packet_artifact_ids) || critical.packet_artifact_ids.some((id) => !retained(identity, id))) failures.push("critical_verification");
  const rollback = hasExactKeys(identity.rollback, ROLLBACK_KEYS) ? identity.rollback : null;
  if (!rollback || !validVerificationStatus(rollback.rehearsal) || !((rollback.deployment_id === "not_evaluated") || validDeploymentId(rollback.deployment_id)) || !((rollback.sha === "not_evaluated") || (typeof rollback.sha === "string" && SHA_PATTERN.test(rollback.sha)))) failures.push("rollback");
  const decision = hasExactKeys(identity.named_release_decision, DECISION_KEYS) ? identity.named_release_decision : null;
  if (!decision || !validDecisionName(decision.name) || !validDecisionOutcome(decision.outcome) || !isCanonicalTimestamp(decision.decided_at)) failures.push("named_release_decision");
  if (state && (!decision || decision.outcome !== requiredDecisionOutcome(state))) failures.push("candidate_decision_outcome");

  if (state === "DEPLOYED_CANDIDATE" && (!hasDeployment || critical?.browser === "not_evaluated" || critical?.csp === "not_evaluated" || critical?.network === "not_evaluated" || !critical)) failures.push("deployed_candidate_evidence");
  if (state && TERMINAL_STATES.has(state)) {
    if (!validProductionRuntime(identity.build_runtime_mode, flags)) failures.push("terminal_runtime_mode");
    if (!terminalAuthorityValid(options.verificationAuthority) || !terminalEvidenceMatches(identity, options.verificationAuthority, state)) failures.push(state === "PRODUCTION_VERIFIED" ? "production_verified_evidence" : "rolled_back_evidence");
  }
  if (state === "PUSHED" && (hasDeployment || hasAlias || !critical || critical.browser !== "not_evaluated" || critical.csp !== "not_evaluated" || critical.console !== "not_evaluated" || critical.network !== "not_evaluated")) failures.push("pushed_evidence_scope");
  return [...new Set(failures)];
}

export function buildReleaseIdentity(options: ReleaseIdentityOptions): ReleaseIdentityTuple & { candidate_state: ReleaseCandidateState } {
  const artifacts = [...(options.retainedArtifactIds ?? [])];
  return {
    candidate_state: options.candidateState,
    source_sha: options.sourceSha,
    tested_sha: options.testedSha,
    retained_artifact_ids: artifacts,
    immutable_deployment: options.deploymentId && options.deploymentUrl
      ? { id: options.deploymentId, url: canonicalOrOriginal(options.deploymentUrl) ?? options.deploymentUrl }
      : { status: "not_evaluated" },
    public_alias: options.aliasUrl && options.aliasResolvedAt
      ? { url: canonicalOrOriginal(options.aliasUrl) ?? options.aliasUrl, resolved_at: options.aliasResolvedAt }
      : { status: "not_evaluated" },
    build_runtime_mode: options.buildRuntimeMode,
    cloud_provider_flags: { ...options.cloudProviderFlags },
    database: options.databaseProject && options.databaseMigration
      ? { project: options.databaseProject, migration: options.databaseMigration }
      : { status: "not_configured" },
    critical_verification: {
      browser: options.browser ?? "not_evaluated",
      csp: options.csp ?? "not_evaluated",
      console: options.console ?? "not_evaluated",
      network: options.network ?? "not_evaluated",
      packet_artifact_ids: artifacts,
    },
    rollback: {
      deployment_id: options.rollbackDeploymentId ?? "not_evaluated",
      sha: options.rollbackSha ?? "not_evaluated",
      rehearsal: options.rollbackRehearsal ?? "not_evaluated",
    },
    named_release_decision: {
      name: options.decisionName ?? "Packet D worker handoff; promotion not authorized",
      decided_at: options.generatedAt,
      outcome: options.decisionOutcome ?? "not_authorized",
    },
  };
}
