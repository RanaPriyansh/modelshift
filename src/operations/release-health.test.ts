import { describe, expect, it } from "vitest";

import { buildReleaseHealth, resolveReleaseSha } from "./release-health";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const DIGEST = "a".repeat(64);
describe("release health", () => {
  it("normalizes an explicit release SHA and safe build identity", () => {
    const health = buildReleaseHealth({ FORGE_RELEASE_SHA: SHA.toUpperCase(), FORGE_BUILD_TIME: "2026-07-22T00:00:00.000Z", FORGE_LOCKFILE_DIGEST: DIGEST, FORGE_CONTENT_MANIFEST_DIGEST: DIGEST, FORGE_EVALUATOR_BASELINE_DIGEST: DIGEST });
    expect(health.release_sha).toBe(SHA);
    expect(health.app_name).toBe("FORGE");
    expect(health.build_time).toBe("2026-07-22T00:00:00.000Z");
    expect(health.runtime_mode).toBe("fallback_only");
    expect(health.managed_surface_flags).toEqual({ lesson_studio: false, interpretation: false, planner: false });
  });
  it("uses a platform SHA only when it is full length", () => {
    expect(resolveReleaseSha({ VERCEL_GIT_COMMIT_SHA: SHA })).toBe(SHA);
    expect(resolveReleaseSha({ VERCEL_GIT_COMMIT_SHA: "preview-latest" })).toBe("unknown");
  });
  it("keeps cloud and managed provider state explicit without exposing values", () => {
    const health = buildReleaseHealth({ FORGE_CLOUD_ACCOUNTS_ENABLED: "true", FORGE_SUPABASE_URL: "https://example.supabase.co", FORGE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key", FORGE_LESSON_STUDIO_OPENAI_ENABLED: "true", OPENAI_API_KEY: "must-not-appear" });
    expect(health.cloud_auth_configured).toBe(true);
    expect(health.managed_provider_flags).toEqual({ openai: true, anthropic: false, gemini: false, openrouter: false });
    expect(JSON.stringify(health)).not.toContain("must-not-appear");
  });
  it.each([
    ["studio", { FORGE_LESSON_STUDIO_OPENAI_ENABLED: "true" }, { lesson_studio: true, interpretation: false, planner: false }],
    ["interpretation", { OPENAI_INTERPRETATION_ENABLED: "true" }, { lesson_studio: false, interpretation: true, planner: false }],
    ["planner", { OPENAI_FORGE_PLANNER_ENABLED: "true" }, { lesson_studio: false, interpretation: false, planner: true }],
  ])("reports managed %s independently when a key is present", (_name, flags, expected) => {
    const health = buildReleaseHealth({ OPENAI_API_KEY: "key-is-present", ...flags });
    expect(health.managed_surface_flags).toEqual(expected);
    expect(health.managed_provider_flags.openai).toBe(true);
    expect(health.runtime_mode).toBe("managed_openai");
  });
  it.each([
    { OPENAI_INTERPRETATION_ENABLED: "true", OPENAI_INTERPRETATION_DISABLED: "true", OPENAI_API_KEY: "key-is-present" },
    { OPENAI_FORGE_PLANNER_ENABLED: "true", OPENAI_FORGE_PLANNER_DISABLED: "true", OPENAI_API_KEY: "key-is-present" },
    { FORGE_LESSON_STUDIO_OPENAI_ENABLED: "true" },
  ])("fails closed when a managed surface is enabled but its effective key/configuration is absent or disabled", (flags) => {
    const health = buildReleaseHealth(flags);
    expect(health.managed_surface_flags).toEqual({ lesson_studio: false, interpretation: false, planner: false });
    expect(health.managed_provider_flags.openai).toBe(false);
    expect(health.runtime_mode).toBe("fallback_only");
  });
  it("marks malformed release metadata unknown", () => {
    const health = buildReleaseHealth({ FORGE_LOCKFILE_DIGEST: "short", FORGE_CONTENT_MANIFEST_DIGEST: "not-a-digest", FORGE_EVALUATOR_BASELINE_DIGEST: "", FORGE_DATABASE_MIGRATION_IDENTITY: "bad value" });
    expect(health.dependency_lock_digest).toBe("unknown");
    expect(health.content_package_manifest_digest).toBe("unknown");
    expect(health.evaluator_baseline_digest).toBe("unknown");
    expect(health.database_migration_identity).toBe("unknown");
  });
});
