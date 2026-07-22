export const RELEASE_CANDIDATE_STATES = [
  "BUILT_LOCAL",
  "PUSHED",
  "DEPLOYMENT_BLOCKED",
  "DEPLOYED_CANDIDATE",
  "PRODUCTION_VERIFIED",
  "ROLLED_BACK",
] as const;

export type ReleaseCandidateState = (typeof RELEASE_CANDIDATE_STATES)[number];

export type ReleaseIdentityTuple = {
  source_sha: string | "unknown";
  tested_sha: string | "unknown";
  retained_artifact_ids: string[];
  immutable_deployment: { id: string; url: string } | { status: "not_evaluated" };
  public_alias: { url: string; resolved_at: string } | { status: "not_evaluated" };
  build_runtime_mode: string;
  cloud_provider_flags: Record<string, boolean | string>;
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
  };
};

export type ReleaseIdentityOptions = {
  sourceSha: string | "unknown";
  testedSha: string | "unknown";
  generatedAt: string;
  candidateState: ReleaseCandidateState;
  buildRuntimeMode: string;
  cloudProviderFlags: Record<string, boolean | string>;
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
};

export type ReleaseIdentityValidationOptions = {
  liveEvaluationStatus?: "not_evaluated" | "pass" | "fail";
  liveEvaluationArtifactId?: string;
  rollbackRehearsalArtifactId?: string;
};

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export function validateReleaseIdentity(identity: ReleaseIdentityTuple & { candidate_state: string }, options: ReleaseIdentityValidationOptions = {}): string[] {
  const failures: string[] = [];
  try {
  if (!identity || typeof identity !== "object") return ["identity"];
  if (!RELEASE_CANDIDATE_STATES.includes(identity.candidate_state as ReleaseCandidateState)) failures.push("candidate_state");
  if (!SHA_PATTERN.test(identity.source_sha) || !SHA_PATTERN.test(identity.tested_sha) || identity.source_sha.toLowerCase() !== identity.tested_sha.toLowerCase()) failures.push("source_tested_sha");
  if (identity.retained_artifact_ids.length === 0 || identity.retained_artifact_ids.some((id) => !/^[A-Za-z0-9._/-]{1,200}$/.test(id))) failures.push("retained_artifact_ids");
  if (!("status" in identity.immutable_deployment) && (!identity.immutable_deployment.id || !/^https:\/\//.test(identity.immutable_deployment.url))) failures.push("immutable_deployment");
  if (!("status" in identity.public_alias) && (!/^https:\/\//.test(identity.public_alias.url) || !ISO_PATTERN.test(identity.public_alias.resolved_at))) failures.push("public_alias");
  if (!identity.build_runtime_mode) failures.push("build_runtime_mode");
  if (!identity.cloud_provider_flags || Object.keys(identity.cloud_provider_flags).length === 0) failures.push("cloud_provider_flags");
  if (!("status" in identity.database) && (!identity.database.project || !identity.database.migration)) failures.push("database");
  if (!["pass", "fail", "not_evaluated"].includes(identity.critical_verification.browser) || !["pass", "fail", "not_evaluated"].includes(identity.critical_verification.csp) || !["pass", "fail", "not_evaluated"].includes(identity.critical_verification.console) || !["pass", "fail", "not_evaluated"].includes(identity.critical_verification.network)) failures.push("critical_verification");
  if (!identity.rollback.deployment_id || !identity.rollback.sha || !["pass", "fail", "not_evaluated"].includes(identity.rollback.rehearsal)) failures.push("rollback");
  if (!identity.named_release_decision.name || !ISO_PATTERN.test(identity.named_release_decision.decided_at)) failures.push("named_release_decision");
  const state = identity.candidate_state as ReleaseCandidateState;
  const hasDeployment = !("status" in identity.immutable_deployment);
  const hasAlias = !("status" in identity.public_alias);
  const critical = identity.critical_verification;
  if (state === "DEPLOYED_CANDIDATE" && (!hasDeployment || critical.browser === "not_evaluated" || critical.csp === "not_evaluated" || critical.network === "not_evaluated")) failures.push("deployed_candidate_evidence");
  if (state === "PRODUCTION_VERIFIED") {
    const explicitDecision = identity.named_release_decision.name !== "Packet D worker handoff; promotion not authorized";
    const validRollbackSha = SHA_PATTERN.test(identity.rollback.sha);
    const validLiveArtifact = Boolean(options.liveEvaluationArtifactId && /^[A-Za-z0-9._/-]{1,200}$/.test(options.liveEvaluationArtifactId) && identity.retained_artifact_ids.includes(options.liveEvaluationArtifactId));
    if (!hasDeployment || !hasAlias || critical.browser !== "pass" || critical.csp !== "pass" || critical.console !== "pass" || critical.network !== "pass" || !SHA_PATTERN.test(identity.source_sha) || !validRollbackSha || identity.rollback.rehearsal !== "pass" || options.liveEvaluationStatus !== "pass" || !validLiveArtifact || !explicitDecision) failures.push("production_verified_evidence");
  }
  if (state === "ROLLED_BACK") {
    const rollbackTarget = hasDeployment && hasAlias && "url" in identity.public_alias && "url" in identity.immutable_deployment && identity.public_alias.url === identity.immutable_deployment.url;
    const rollbackArtifact = Boolean(options.rollbackRehearsalArtifactId && /^[A-Za-z0-9._/-]{1,200}$/.test(options.rollbackRehearsalArtifactId) && identity.retained_artifact_ids.includes(options.rollbackRehearsalArtifactId));
    if (!rollbackTarget || critical.browser !== "pass" || critical.csp !== "pass" || critical.console !== "pass" || critical.network !== "pass" || !SHA_PATTERN.test(identity.rollback.sha) || identity.rollback.rehearsal !== "pass" || !rollbackArtifact) failures.push("rolled_back_evidence");
  }
  if (state === "PUSHED" && (hasDeployment || hasAlias || critical.browser !== "not_evaluated" || critical.csp !== "not_evaluated" || critical.console !== "not_evaluated" || critical.network !== "not_evaluated")) failures.push("pushed_evidence_scope");
  } catch { failures.push("missing_fields"); }
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
      ? { id: options.deploymentId, url: options.deploymentUrl }
      : { status: "not_evaluated" },
    public_alias: options.aliasUrl && options.aliasResolvedAt
      ? { url: options.aliasUrl, resolved_at: options.aliasResolvedAt }
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
    },
  };
}
