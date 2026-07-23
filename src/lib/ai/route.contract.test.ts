import { afterEach, describe, expect, it, vi } from "vitest";

import { createInterpretPost, MAX_INTERPRET_REQUEST_BYTES, POST } from "../../../app/api/interpret/route";
import { interpretExplanation } from "./interpret";

const body = {
  scenario_id: "mystery_force_cutoff",
  prediction_id: "stops_immediately",
  confidence: 60,
  explanation: "It stops because there is no push.",
  stage: "INTERPRET",
};

function request(bodyValue: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/interpret", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      host: "localhost:3000",
      ...headers,
    },
    body: JSON.stringify(bodyValue),
  });
}

describe("POST /api/interpret boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the frozen fallback shape for an unavailable model", async () => {
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      source: "fallback",
      fallback_reason: "disabled",
      recommended_probe_id: "neutral_core_probe",
      recommended_level_1_question_id: "neutral_observation_prompt",
    });
  });

  it("rejects cross-origin, non-JSON, invalid-stage, and oversized requests without raw errors", async () => {
    const crossOrigin = await POST(request(body, { origin: "https://attacker.example" }));
    expect(crossOrigin.status).toBe(400);
    await expect(crossOrigin.json()).resolves.toMatchObject({ source: "fallback", fallback_reason: "ambiguous_input" });

    const nonJson = await POST(
      new Request("http://localhost:3000/api/interpret", { method: "POST", headers: { origin: "http://localhost:3000", host: "localhost:3000" } }),
    );
    expect(nonJson.status).toBe(400);

    const jsonLookalike = await POST(request(body, { "content-type": "application/jsonp" }));
    expect(jsonLookalike.status).toBe(400);

    const invalidStage = await POST(request({ ...body, stage: "COLD_TRANSFER" }));
    expect(invalidStage.status).toBe(400);
    const oversized = await POST(request({ ...body, explanation: "x".repeat(601) }));
    expect(oversized.status).toBe(400);

    const declaredOversized = await POST(
      request(body, { "content-length": String(MAX_INTERPRET_REQUEST_BYTES + 1) }),
    );
    expect(declaredOversized.status).toBe(400);
  });

  it("accepts the browser origin matching the actual Host when the framework URL is normalized", async () => {
    const response = await POST(request(body, { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" }));
    expect(response.status).toBe(200);
  });

  it("denies a direct route attempt before an injected provider transport despite flags, keys, and client claims", async () => {
    vi.stubEnv("OPENAI_INTERPRETATION_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "transport-key-is-not-authority");
    const parse = vi.fn();
    const handler = createInterpretPost({
      interpret: (input) => interpretExplanation(input, {
        apiKey: "transport-key-is-not-authority",
        client: { responses: { parse } } as never,
      }),
    });

    const direct = await handler(request(body));
    expect(direct.status).toBe(200);
    await expect(direct.json()).resolves.toMatchObject({ source: "fallback", fallback_reason: "disabled" });
    expect(parse).not.toHaveBeenCalled();

    const selfAttested = await handler(request({ ...body, selfAttestedAdult: true }));
    expect(selfAttested.status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });
});
