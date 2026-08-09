import { describe, expect, it } from "vitest";

import { createCloudAuthAttemptLimiter } from "./abuse-controls.server";

describe("cloud credential abuse backstop", () => {
  it("limits normalized-email attempts and releases only after its short window", () => {
    let currentTime = 0;
    const limiter = createCloudAuthAttemptLimiter(() => currentTime, 1_000, 2);

    expect(limiter.consume("Adult@example.test")).toBe(true);
    expect(limiter.consume(" adult@example.test ")).toBe(true);
    expect(limiter.consume("adult@example.test")).toBe(false);
    expect(limiter.consume("other@example.test")).toBe(true);

    currentTime = 1_000;
    expect(limiter.consume("adult@example.test")).toBe(true);
  });

  it("fails closed at its bucket ceiling and prunes expired buckets", () => {
    let currentTime = 0;
    const limiter = createCloudAuthAttemptLimiter(
      () => currentTime,
      1_000,
      2,
      2,
    );

    expect(limiter.consume("first@example.test")).toBe(true);
    expect(limiter.consume("second@example.test")).toBe(true);
    expect(limiter.consume("third@example.test")).toBe(false);
    expect(limiter.consume("first@example.test")).toBe(true);
    expect(limiter.consume("first@example.test")).toBe(false);

    currentTime = 1_000;
    expect(limiter.consume("third@example.test")).toBe(true);
  });

  it("rejects invalid limits, clocks, and unbounded identifiers", () => {
    expect(() => createCloudAuthAttemptLimiter(Date.now, 0)).toThrow(TypeError);
    expect(() => createCloudAuthAttemptLimiter(Date.now, 1_000, 0)).toThrow(TypeError);
    expect(() => createCloudAuthAttemptLimiter(Date.now, 1_000, 1, 0)).toThrow(TypeError);

    const invalidClock = createCloudAuthAttemptLimiter(() => Number.NaN);
    expect(invalidClock.consume("adult@example.test")).toBe(false);

    const limiter = createCloudAuthAttemptLimiter();
    expect(limiter.consume("")).toBe(false);
    expect(limiter.consume(`${"a".repeat(255)}@example.test`)).toBe(false);
  });
});
