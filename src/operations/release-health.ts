import { readForgeCloudAuthority } from "../lib/forge-auth/cloud-authority";
import { buildReleaseManifest, type ReleaseManifest } from "./release-manifest";

const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/i;
const MIGRATION_IDENTITY_PATTERN = /^(?:not_configured|[A-Za-z0-9._:-]{1,160})$/;

type ReleaseEnvironment = Readonly<Record<string, string | undefined>>;

export type ReleaseHealth = {
  schema_version: "1.0";
  status: "ok";
  service: "forge-learning-os";
  app_name: "FORGE";
  release_sha: string | "unknown";
  build_time: string | "unknown";
  runtime_mode: "fallback_only" | "managed_openai";
  cloud_accounts_enabled: boolean;
  cloud_auth_configured: boolean;
  device_profiles: "device_only" | "device_plus_optional_cloud";
  learner_evidence_sync: "disabled" | "adult_private_only";
  dependency_lock_digest: string | "unknown";
  content_package_manifest_digest: string | "unknown";
  evaluator_baseline_digest: string | "unknown";
  database_migration_identity: string | "unknown";
  managed_surface_flags: {
    // These are configuration-intent indicators: each requires its explicit
    // switch plus a nonempty server-side value. They do not validate a vendor
    // credential or prove that a provider request can succeed.
    lesson_studio: boolean;
    interpretation: boolean;
    planner: boolean;
  };
  managed_provider_flags: {
    openai: boolean;
    anthropic: false;
    gemini: false;
    openrouter: false;
  };
  provider_mode: "disabled" | "managed_openai";
  /** Public-release provenance is never inferred from local build metadata. */
  release_manifest: ReleaseManifest;
};

function validSha(value: string | undefined): string | "unknown" {
  return value && RELEASE_SHA_PATTERN.test(value) ? value.toLowerCase() : "unknown";
}

function validBuildTime(value: string | undefined): string | "unknown" {
  return value && ISO_TIMESTAMP_PATTERN.test(value) ? value : "unknown";
}

function validDigest(value: string | undefined): string | "unknown" {
  return value && DIGEST_PATTERN.test(value) ? value.toLowerCase() : "unknown";
}

function validMigrationIdentity(value: string | undefined): string | "unknown" {
  return value && MIGRATION_IDENTITY_PATTERN.test(value) ? value : "unknown";
}

export function resolveReleaseSha(environment: ReleaseEnvironment = process.env): string | "unknown" {
  // A Vercel Git integration SHA is provider-owned. Prefer it whenever it is
  // available so a caller-supplied diagnostic/local SHA cannot override health
  // during a deployed candidate. Local, unbound artifacts may still expose
  // their explicit build SHA for deterministic local verification.
  if (environment.VERCEL_GIT_COMMIT_SHA !== undefined) return validSha(environment.VERCEL_GIT_COMMIT_SHA);
  return validSha(environment.FORGE_RELEASE_SHA);
}

export function buildReleaseHealth(environment: ReleaseEnvironment = process.env): ReleaseHealth {
  const cloudAuthority = readForgeCloudAuthority(environment);
  const cloudAccountsEnabled = cloudAuthority.cloudAccountsEnabled;
  const cloudAuthConfigured = cloudAuthority.cloudAuthConfigured;
  // Environment intent and secret presence are not runtime authority. Every
  // public provider transport remains structurally fail-closed, so health must
  // not promote a configured switch into an operational managed capability.
  const managedLessonStudio = false;
  const managedInterpretation = false;
  const managedPlanner = false;
  const managedOpenAI = false;

  return {
    schema_version: "1.0",
    status: "ok",
    service: "forge-learning-os",
    app_name: "FORGE",
    release_sha: resolveReleaseSha(environment),
    build_time: validBuildTime(environment.FORGE_BUILD_TIME),
    runtime_mode: managedOpenAI ? "managed_openai" : "fallback_only",
    cloud_accounts_enabled: cloudAccountsEnabled,
    cloud_auth_configured: cloudAuthConfigured,
    device_profiles: cloudAuthority.deviceProfiles,
    learner_evidence_sync: cloudAuthority.learnerEvidenceSync,
    dependency_lock_digest: validDigest(environment.FORGE_LOCKFILE_DIGEST),
    content_package_manifest_digest: validDigest(environment.FORGE_CONTENT_MANIFEST_DIGEST),
    evaluator_baseline_digest: validDigest(environment.FORGE_EVALUATOR_BASELINE_DIGEST),
    database_migration_identity: validMigrationIdentity(environment.FORGE_DATABASE_MIGRATION_IDENTITY ?? "not_configured"),
    managed_surface_flags: {
      lesson_studio: managedLessonStudio,
      interpretation: managedInterpretation,
      planner: managedPlanner,
    },
    managed_provider_flags: {
      openai: managedOpenAI,
      anthropic: false,
      gemini: false,
      openrouter: false,
    },
    provider_mode: managedOpenAI ? "managed_openai" : "disabled",
    release_manifest: buildReleaseManifest(environment),
  };
}
