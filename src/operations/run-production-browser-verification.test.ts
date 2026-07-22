import { describe, expect, it } from "vitest";

import { createRequire } from "node:module";

import { appendBoundedServerLog, productionServerInvocation } from "../../scripts/ops/run-production-browser-verification";

describe("production browser server-log buffer", () => {
  it("runs Next directly so terminating the server cannot orphan a package-manager child", () => {
    const invocation = productionServerInvocation(43127);
    expect(invocation.command).toBe(process.execPath);
    expect(invocation.args).toEqual([
      createRequire(import.meta.url).resolve("next/dist/bin/next"),
      "start",
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
});
