import { describe, expect, it } from "vitest";

import { appendBoundedServerLog } from "../../scripts/ops/run-production-browser-verification";

describe("production browser server-log buffer", () => {
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
