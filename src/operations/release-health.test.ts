import { describe, expect, it } from "vitest";

import { buildReleaseHealth, resolveReleaseSha } from "./release-health";

const SHA = "0123456789abcdef0123456789abcdef01234567";
describe("release health", () => {
  it("normalizes an explicit release SHA and safe build identity", () => {
    const health = buildReleaseHealth({ FORGE_RELEASE_SHA: SHA.toUpperCase(), FORGE_BUILD_TIME: "2026-07-22T00:00:00.000Z" });
    expect(health.release_sha).toBe(SHA);
    expect(health.app_name).toBe("FORGE");
    expect(health.build_time).toBe("2026-07-22T00:00:00.000Z");
    expect(health.runtime_mode).toBe("fallback_only");
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
});
