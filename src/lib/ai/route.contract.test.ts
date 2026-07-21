import { describe, expect, it } from "vitest";

import { POST } from "../../../app/api/interpret/route";

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
  it("returns the frozen fallback shape for an unavailable model", async () => {
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      source: "fallback",
      fallback_reason: "missing_key",
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

    const invalidStage = await POST(request({ ...body, stage: "COLD_TRANSFER" }));
    expect(invalidStage.status).toBe(400);
    const oversized = await POST(request({ ...body, explanation: "x".repeat(601) }));
    expect(oversized.status).toBe(400);
  });
});
