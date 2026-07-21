import { describe, expect, it } from "vitest";

import {
  canonicalJson,
  parseForgeEvent,
  sealForgeEvent,
  sha256Digest,
  verifyForgeEventIntegrity,
} from "./events";

const DIGEST_A = `sha256:${"a".repeat(64)}`;

function startedEnvelope() {
  return {
    event_id: "00000000-0000-4000-8000-000000000001",
    event_type: "world_run.started",
    schema_version: 1,
    aggregate: { type: "world_run", id: "run.fixture.001", version: 1 },
    actor: { type: "learner", id: "learner.fixture.001" },
    authority: { policy_version: "policy.2026.07", consent_grant_ids: ["consent.fixture.001"] },
    occurred_at: "2026-07-22T08:00:00.000Z",
    recorded_at: "2026-07-22T08:00:01.000Z",
    correlation_id: "correlation.fixture.001",
    causation_id: null,
    idempotency_key: "idempotency.fixture.0001",
    payload: {
      world_id: "world.force-and-motion",
      world_version: "1.0.0",
      content_version: "1.0.0",
      capability_id: "capability.inertia",
      proof_claim_id: "proof.inertia.transfer",
      validator_id: "validator.inertia.v1",
      validator_version: "1.0.0",
      package_integrity_hash: DIGEST_A,
      assistance_mode: "hints_only",
      source_ids: ["source.newton.first-law"],
      proof_authority: "server_enforced",
    },
  } as const;
}

describe("FORGE event envelope", () => {
  it("seals a strict envelope with a stable SHA-256 digest", async () => {
    const first = { b: [2, { z: false, a: "value" }], a: 1 };
    const reordered = { a: 1, b: [2, { a: "value", z: false }] };

    expect(canonicalJson(first)).toBe(canonicalJson(reordered));
    expect(await sha256Digest(canonicalJson(first))).toBe(await sha256Digest(canonicalJson(reordered)));

    const event = await sealForgeEvent(startedEnvelope());
    expect(event.integrity_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    await expect(verifyForgeEventIntegrity(event)).resolves.toBe(true);
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.payload)).toBe(true);
  });

  it("detects a schema-valid payload mutation", async () => {
    const event = await sealForgeEvent(startedEnvelope());
    const tampered = structuredClone(event);
    if (tampered.event_type !== "world_run.started") throw new Error("fixture type changed");
    tampered.payload.world_version = "2.0.0";

    await expect(verifyForgeEventIntegrity(tampered)).resolves.toBe(false);
  });

  it("rejects raw learner text and unknown envelope fields", async () => {
    const rawText = structuredClone(startedEnvelope()) as Record<string, unknown>;
    rawText.payload = { ...(rawText.payload as object), raw_text: "I think the pod stops." };
    await expect(sealForgeEvent(rawText)).rejects.toThrow();

    const unknownEnvelopeField = { ...startedEnvelope(), model_output: "hidden transcript" };
    await expect(sealForgeEvent(unknownEnvelopeField)).rejects.toThrow();
  });

  it("enforces aggregate ownership and receipt chronology", async () => {
    await expect(
      sealForgeEvent({
        ...startedEnvelope(),
        aggregate: { type: "world_package", id: "package.fixture.001", version: 1 },
      }),
    ).rejects.toThrow(/requires aggregate type world_run/);

    await expect(
      sealForgeEvent({
        ...startedEnvelope(),
        recorded_at: "2026-07-22T07:59:59.000Z",
      }),
    ).rejects.toThrow(/recorded_at cannot precede occurred_at/);
  });

  it("rejects an invalid seal even when its digest field is well formed", async () => {
    const event = await sealForgeEvent(startedEnvelope());
    const malformed = { ...event, actor: { ...event.actor, type: "assistant" } };

    expect(() => parseForgeEvent(malformed)).toThrow();
    await expect(verifyForgeEventIntegrity(malformed)).resolves.toBe(false);
  });
});
