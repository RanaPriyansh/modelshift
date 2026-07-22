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
});
