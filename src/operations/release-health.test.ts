import { describe, expect, it } from "vitest";

import { buildReleaseHealth, resolveReleaseSha } from "./release-health";

const SHA = "0123456789abcdef0123456789abcdef01234567";

describe("release health", () => {
  it("prefers an explicit, normalized release SHA", () => {
    expect(resolveReleaseSha({ FORGE_RELEASE_SHA: SHA.toUpperCase(), VERCEL_GIT_COMMIT_SHA: "f".repeat(40) })).toBe(SHA);
  });

  it("uses the platform commit only when it is a full Git SHA", () => {
    expect(resolveReleaseSha({ VERCEL_GIT_COMMIT_SHA: SHA })).toBe(SHA);
    expect(resolveReleaseSha({ VERCEL_GIT_COMMIT_SHA: "preview-latest" })).toBe("unknown");
  });

  it("exposes only bounded release metadata", () => {
    const health = buildReleaseHealth({
      FORGE_RELEASE_SHA: SHA,
      OPENAI_API_KEY: "must-not-appear",
      DATABASE_URL: "must-not-appear",
    });

    expect(health).toEqual({
      schema_version: "1.0",
      status: "ok",
      service: "forge-learning-os",
      release_sha: SHA,
    });
    expect(JSON.stringify(health)).not.toContain("must-not-appear");
  });
});
