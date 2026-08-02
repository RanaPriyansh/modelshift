import { describe, expect, it } from "vitest";

import { createRequire } from "node:module";

import {
  appendBoundedServerLog,
  assertCanonicalProductionBrowserArguments,
  assertProductionServerIdentity,
  PRODUCTION_BROWSER_SPECS,
  productionBrowserInvocation,
  productionServerEnvironment,
  productionServerInvocation,
} from "../../scripts/ops/run-production-browser-verification";

describe("production browser command selection", () => {
  it("runs the canonical production browser contract", () => {
    expect(productionBrowserInvocation("linux")).toEqual({
      command: "pnpm",
      args: ["exec", "playwright", "test", ...PRODUCTION_BROWSER_SPECS],
    });
  });

  it("uses the platform package-manager command for the canonical contract", () => {
    expect(productionBrowserInvocation("win32")).toEqual({
      command: "pnpm.cmd",
      args: ["exec", "playwright", "test", ...PRODUCTION_BROWSER_SPECS],
    });
  });

  it("uses the canonical Semester Desk v2 spec only", () => {
    expect(PRODUCTION_BROWSER_SPECS).toEqual([
      "tests/e2e/semester-desk-v2-canonical.spec.ts",
    ]);
  });

  it("rejects focused production spec selection", () => {
    expect(() => assertCanonicalProductionBrowserArguments([
      "--spec",
      "tests/e2e/another.spec.ts",
    ])).toThrow("always runs the Semester Desk v2 canonical spec");
    expect(() => assertCanonicalProductionBrowserArguments([
      "--spec=tests/e2e/another.spec.ts",
    ])).toThrow("always runs the Semester Desk v2 canonical spec");
    expect(() => assertCanonicalProductionBrowserArguments([
      "--expected-sha",
      "a".repeat(40),
    ])).not.toThrow();
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

  it("does not inherit retired fixture configuration", () => {
    const environment = productionServerEnvironment("A".repeat(40), {
      NODE_ENV: "test",
      FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE: "untrusted-override",
    });
    expect(environment.FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE).toBeUndefined();
    expect(environment.FORGE_RELEASE_SHA).toBe("a".repeat(40));
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
