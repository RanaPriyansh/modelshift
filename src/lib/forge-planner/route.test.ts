import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "../../../app/api/forge/plan/route";
import {
  createForgePlanPost,
  MAX_FORGE_PLAN_REQUEST_BYTES,
} from "./route-handler.server";
import { planForgeLearning } from "./planner";
import {
  MINOR_PLANNER_PRACTICAL_OUTCOME,
  MINOR_PLANNER_STARTING_POINT,
  MINOR_PLANNER_SUCCESS_SHAPE,
} from "./schema";

const body = {
  question: "How do force, velocity, and motion relate after a push ends?",
  ageMode: "adult",
  depth: "standard",
  startingPoint: "I know how to read a basic graph.",
  successShape: "Predict a new graph without help.",
  guardianManaged: false,
  sourceMode: "curated",
};

function minorBody(
  ageMode: "child" | "teen",
  question: "force and motion" | "equivalent ratios" = "force and motion",
) {
  return {
    ...body,
    question,
    ageMode,
    startingPoint: MINOR_PLANNER_STARTING_POINT,
    successShape: MINOR_PLANNER_SUCCESS_SHAPE,
    currentKnowledge: "",
    practicalOutcome: MINOR_PLANNER_PRACTICAL_OUTCOME,
    constraints: "",
    guardianManaged: ageMode === "child",
    sourceMode: "authored_only",
  };
}

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
        worldVersion: "1.0.2",
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
    const response = await POST(request({
      ...minorBody("child", "equivalent ratios"),
      guardianManaged: false,
    }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      contractKind: "refusal",
      reason: "guardian_required",
      worldId: null,
      sourceIds: [],
    });
  });

  it.each([
    ["teen", "question", "My private wording about force and motion"],
    ["teen", "startingPoint", "My private starting point"],
    ["teen", "successShape", "My private definition of success"],
    ["teen", "currentKnowledge", "My private current knowledge"],
    ["teen", "practicalOutcome", "My private desired outcome"],
    ["teen", "constraints", "My private access or family context"],
    ["teen", "sourceMode", "curated"],
    ["teen", "guardianManaged", true],
    ["child", "question", "My child wrote a private ratio question"],
    ["child", "startingPoint", "My child wrote a private starting point"],
  ] as const)(
    "rejects a direct %s request containing arbitrary %s before planner execution",
    async (ageMode, field, value) => {
      const plan = vi.fn();
      const handler = createForgePlanPost({ plan });
      const response = await handler(request({
        ...minorBody(ageMode, ageMode === "child" ? "equivalent ratios" : "force and motion"),
        [field]: value,
      }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        schemaVersion: "1.0",
        error: { code: "invalid_request", message: "The planning request is invalid." },
      });
      expect(plan).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["teen", "force and motion", "world.force-and-motion"],
    ["child", "equivalent ratios", "world.proportional-reasoning"],
  ] as const)(
    "accepts a direct %s request made only of fixed topic and routing tokens",
    async (ageMode, question, worldId) => {
      vi.stubEnv("OPENAI_FORGE_PLANNER_DISABLED", "true");
      const response = await POST(request(minorBody(ageMode, question)));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        contractKind: "grounded_learning",
        route: { worldId },
        request: {
          ageMode,
          startingPoint: MINOR_PLANNER_STARTING_POINT,
          successShape: MINOR_PLANNER_SUCCESS_SHAPE,
          currentKnowledge: "",
          practicalOutcome: MINOR_PLANNER_PRACTICAL_OUTCOME,
          constraints: "",
          sourceMode: "authored_only",
        },
      });
    },
  );

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
