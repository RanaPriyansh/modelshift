import { afterEach, describe, expect, it, vi } from "vitest";

import { createForgePlanPost, MAX_FORGE_PLAN_REQUEST_BYTES, POST } from "../../../app/api/forge/plan/route";
import { planForgeLearning } from "./planner";

const body = {
  question: "How do force, velocity, and motion relate after a push ends?",
  ageMode: "teen",
  depth: "standard",
  startingPoint: "I know how to read a basic graph.",
  successShape: "Predict a new graph without help.",
  guardianManaged: false,
  sourceMode: "curated",
};

function request(value: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/forge/plan", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      ...headers,
    },
    body: JSON.stringify(value),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/forge/plan", () => {
  it("returns a no-store grounded contract without logging raw learner input", async () => {
    vi.stubEnv("OPENAI_FORGE_PLANNER_DISABLED", "true");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(request(body));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    await expect(response.json()).resolves.toMatchObject({
      contractKind: "grounded_learning",
      schemaVersion: "1.1",
      route: {
        topicId: "force_motion",
        worldId: "world.force-and-motion",
        worldVersion: "1.0.1",
        worldRoute: "/learn/force-and-motion",
      },
      model: { fallbackReason: "disabled" },
    });
    expect(log).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("accepts the browser origin that matches the actual Host header even when the framework URL is normalized", async () => {
    vi.stubEnv("OPENAI_FORGE_PLANNER_DISABLED", "true");
    const response = await POST(
      request(body, {
        host: "127.0.0.1:3000",
        origin: "http://127.0.0.1:3000",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ contractKind: "grounded_learning" });
  });

  it("returns a typed 403 refusal for under-13 requests without guardian management", async () => {
    vi.stubEnv("OPENAI_FORGE_PLANNER_DISABLED", "true");
    const response = await POST(request({ ...body, ageMode: "child", guardianManaged: false }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      contractKind: "refusal",
      reason: "guardian_required",
      worldId: null,
      sourceIds: [],
    });
  });

  it("rejects cross-origin, non-JSON, oversized, malformed, and extra-field requests", async () => {
    const crossOrigin = await POST(request(body, { origin: "https://attacker.example" }));
    expect(crossOrigin.status).toBe(400);

    const spoofedOrigin = await POST(request(body, { host: "forge.example", origin: "https://forge.example" }));
    expect(spoofedOrigin.status).toBe(400);

    const nonJson = await POST(
      new Request("http://localhost:3000/api/forge/plan", {
        method: "POST",
        headers: { "content-type": "text/plain", origin: "http://localhost:3000" },
        body: JSON.stringify(body),
      }),
    );
    expect(nonJson.status).toBe(400);

    const jsonLookalike = await POST(request(body, { "content-type": "application/jsonp" }));
    expect(jsonLookalike.status).toBe(400);

    const oversized = await POST(
      new Request("http://localhost:3000/api/forge/plan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "content-length": String(MAX_FORGE_PLAN_REQUEST_BYTES + 1),
        },
        body: JSON.stringify(body),
      }),
    );
    expect(oversized.status).toBe(400);

    const malformed = await POST(
      new Request("http://localhost:3000/api/forge/plan", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: "{not-json",
      }),
    );
    expect(malformed.status).toBe(400);

    const extraField = await POST(request({ ...body, debug: true }));
    expect(extraField.status).toBe(400);
    await expect(extraField.json()).resolves.toEqual({
      schemaVersion: "1.0",
      error: { code: "invalid_request", message: "The planning request is invalid." },
    });
  });

  it("denies direct planning transport before a provider request even when an adult claim and flags are present", async () => {
    vi.stubEnv("OPENAI_FORGE_PLANNER_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "transport-key-is-not-authority");
    const parse = vi.fn();
    const handler = createForgePlanPost({
      plan: (input) => planForgeLearning(input, {
        apiKey: "transport-key-is-not-authority",
        client: { responses: { parse } } as never,
      }),
    });

    const direct = await handler(request({ ...body, ageMode: "adult" }));
    expect(direct.status).toBe(200);
    await expect(direct.json()).resolves.toMatchObject({
      contractKind: "grounded_learning",
      model: { contribution: "not_used", fallbackReason: "disabled" },
    });
    expect(parse).not.toHaveBeenCalled();

    const selfAttested = await handler(request({ ...body, ageMode: "adult", selfAttestedAdult: true }));
    expect(selfAttested.status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });
});
