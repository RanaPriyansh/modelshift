const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

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
  managed_provider_flags: {
    openai: boolean;
    anthropic: false;
    gemini: false;
    openrouter: false;
  };
  provider_mode: "request_only_byok" | "managed_openai";
};

function validSha(value: string | undefined): string | "unknown" {
  return value && RELEASE_SHA_PATTERN.test(value) ? value.toLowerCase() : "unknown";
}

function validBuildTime(value: string | undefined): string | "unknown" {
  return value && ISO_TIMESTAMP_PATTERN.test(value) ? value : "unknown";
}

export function resolveReleaseSha(environment: ReleaseEnvironment = process.env): string | "unknown" {
  return validSha(environment.FORGE_RELEASE_SHA ?? environment.VERCEL_GIT_COMMIT_SHA);
}

export function buildReleaseHealth(environment: ReleaseEnvironment = process.env): ReleaseHealth {
  const cloudAccountsEnabled = environment.FORGE_CLOUD_ACCOUNTS_ENABLED === "true";
  const cloudAuthConfigured = cloudAccountsEnabled
    && /^https:\/\//i.test(environment.FORGE_SUPABASE_URL ?? "")
    && Boolean(environment.FORGE_SUPABASE_PUBLISHABLE_KEY);
  const managedOpenAI = environment.FORGE_LESSON_STUDIO_OPENAI_ENABLED === "true"
    && Boolean(environment.OPENAI_API_KEY);

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
    device_profiles: cloudAuthConfigured ? "device_plus_optional_cloud" : "device_only",
    learner_evidence_sync: cloudAuthConfigured ? "adult_private_only" : "disabled",
    managed_provider_flags: {
      openai: managedOpenAI,
      anthropic: false,
      gemini: false,
      openrouter: false,
    },
    provider_mode: managedOpenAI ? "managed_openai" : "request_only_byok",
  };
}
