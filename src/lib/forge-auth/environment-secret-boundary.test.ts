import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

function isIgnored(path: string): boolean {
  const result = spawnSync(
    "git",
    ["check-ignore", "--no-index", "-q", "--", path],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(result.stderr || "git check-ignore failed");
  }
  return result.status === 0;
}

describe("environment secret boundary", () => {
  it("ignores local environment files across deployment modes", () => {
    for (const path of [
      ".env",
      ".env.local",
      ".env.production",
      ".env.development",
      ".env.test",
      ".env.preview",
      "nested/.env.production.local",
    ]) {
      expect(isIgnored(path), path).toBe(true);
    }
  });

  it("keeps the reviewed empty environment template visible", () => {
    expect(isIgnored(".env.example")).toBe(false);
  });
});
