import { describe, expect, it } from "vitest";

import { createRequire } from "node:module";

import {
  appendBoundedServerLog,
  assertProductionServerIdentity,
  PRODUCTION_BROWSER_SPECS,
  productionBrowserInvocation,
  productionBrowserSpec,
  productionServerEnvironment,
  productionServerInvocation,
} from "../../scripts/ops/run-production-browser-verification";

describe("production browser command selection", () => {
  it("runs the production allowlist when no focused spec is requested", () => {
    expect(productionBrowserInvocation(undefined, "linux")).toEqual({
      command: "pnpm",
      args: ["exec", "playwright", "test", ...PRODUCTION_BROWSER_SPECS],
    });
  });

  it("uses the platform package-manager command for the production allowlist", () => {
    expect(productionBrowserInvocation(undefined, "win32")).toEqual({
      command: "pnpm.cmd",
      args: ["exec", "playwright", "test", ...PRODUCTION_BROWSER_SPECS],
    });
  });

  it("preserves the direct Playwright command for a focused spec", () => {
    const spec = "tests/e2e/university-semester-desk-production.spec.ts";
    expect(productionBrowserInvocation(spec, "linux")).toEqual({
      command: "pnpm",
      args: ["exec", "playwright", "test", spec],
    });
  });
});

describe("production browser server-log buffer", () => {
  it("runs Next directly so terminating the server cannot orphan a package-manager child", () => {
    const invocation = productionServerInvocation(43127, "/tmp/verified-build");
    expect(invocation.command).toBe(process.execPath);
    expect(invocation.args).toEqual([
      createRequire(import.meta.url).resolve("next/dist/bin/next"),
      "start",
      "/tmp/verified-build",
      "--hostname",
      "127.0.0.1",
      "--port",
      "43127",
    ]);
  });

  it("keeps only a bounded rolling tail across oversized and repeated chunks", () => {
    let log: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    log = appendBoundedServerLog(log, Buffer.from("0123456789"), 8);
    expect(log.toString()).toBe("23456789");
    log = appendBoundedServerLog(log, Buffer.from("abcdef"), 8);
    expect(log.toString()).toBe("89abcdef");
    log = appendBoundedServerLog(log, Buffer.from("uvwxyz"), 8);
    expect(log.toString()).toBe("efuvwxyz");
    expect(log.length).toBeLessThanOrEqual(8);
  });

  it("starts production with the exact Semester Desk denial fixture token", () => {
    const environment = productionServerEnvironment("A".repeat(40), {
      NODE_ENV: "test",
      FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE: "untrusted-override",
    });
    expect(environment.FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE).toBe(
      "forge-university-semester-desk.v1",
    );
    expect(environment.FORGE_RELEASE_SHA).toBe("a".repeat(40));
  });

  it("accepts only bounded repository-relative Playwright spec paths", () => {
    expect(productionBrowserSpec(
      "tests/e2e/university-research-readiness-production.spec.ts",
    )).toBe("tests/e2e/university-research-readiness-production.spec.ts");
    expect(productionBrowserSpec(undefined)).toBeUndefined();
    for (const value of [
      "../tests/e2e/production.spec.ts",
      "tests/e2e/../../secret.spec.ts",
      "/tests/e2e/production.spec.ts",
      "tests\\e2e\\production.spec.ts",
      "src/production.spec.ts",
    ]) {
      expect(() => productionBrowserSpec(value)).toThrow(
        "--spec must be a repository-relative Playwright spec under tests/e2e",
      );
    }
  });

  it("binds both runtime and compiled build identity around browser execution", async () => {
    const sha = "a".repeat(40);
    const response = Response.json({
      release_sha: sha,
      build_source_sha: sha,
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Forge-Release-Sha": sha,
        "X-Forge-Build-Source-Sha": sha,
      },
    });
    await expect(assertProductionServerIdentity(
      "http://127.0.0.1:43127",
      sha,
      async () => response,
    )).resolves.toBeUndefined();

    const spoofed = Response.json({
      release_sha: sha,
      build_source_sha: "b".repeat(40),
    }, {
      headers: {
        "Cache-Control": "no-store",
        "X-Forge-Release-Sha": sha,
        "X-Forge-Build-Source-Sha": "b".repeat(40),
      },
    });
    await expect(assertProductionServerIdentity(
      "http://127.0.0.1:43127",
      sha,
      async () => spoofed,
    )).rejects.toThrow("did not bind");
  });
});
