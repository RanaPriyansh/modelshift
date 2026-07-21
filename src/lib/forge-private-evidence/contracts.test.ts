import { describe, expect, it } from "vitest";

import {
  isSameOriginMutation,
  privateEvidenceDeleteRequestSchema,
  privateEvidenceSyncRequestSchema,
  toAdultPrivateEvidenceRows,
} from "./contracts";

const recordedAt = "2026-07-22T10:00:00.000Z";

function entry() {
  return {
    id: "proof.private-1",
    capabilityId: "capability.force-motion.zero-net-force",
    recordedAt,
    source: { kind: "authored_activity" as const, refId: "world.force-motion.v1" },
    proof: {
      conditionId: "transfer.velocity-graph.v1",
      mode: "independent_transfer" as const,
      assistanceAccess: "removed" as const,
      outcome: "proved" as const,
    },
    assistance: [{ kind: "authored_hint" as const, sourceId: "hint.net-force.v1" }],
    sharing: { status: "private" as const, updatedAt: recordedAt },
    returnSchedule: null,
  };
}

describe("adult private evidence contracts", () => {
  it("accepts bounded proof-after-help metadata and binds ownership server-side", () => {
    const parsed = privateEvidenceSyncRequestSchema.parse({ entries: [entry()] });
    expect(toAdultPrivateEvidenceRows("user-from-session", parsed.entries)).toEqual([
      expect.objectContaining({
        learner_user_id: "user-from-session",
        client_evidence_id: "proof.private-1",
        recorded_at: recordedAt,
      }),
    ]);
  });

  it("rejects raw text, client identity, and contaminated independent proof", () => {
    expect(
      privateEvidenceSyncRequestSchema.safeParse({ entries: [{ ...entry(), rawChat: "private text" }] }).success,
    ).toBe(false);
    expect(
      privateEvidenceSyncRequestSchema.safeParse({ entries: [{ ...entry(), learnerUserId: "spoofed" }] }).success,
    ).toBe(false);
    expect(
      privateEvidenceSyncRequestSchema.safeParse({
        entries: [{ ...entry(), proof: { ...entry().proof, assistanceAccess: "available" } }],
      }).success,
    ).toBe(false);
  });

  it("requires an exact deletion scope and a same-origin mutation", () => {
    expect(privateEvidenceDeleteRequestSchema.safeParse({ entryId: "proof.private-1" }).success).toBe(true);
    expect(privateEvidenceDeleteRequestSchema.safeParse({ all: true }).success).toBe(true);
    expect(privateEvidenceDeleteRequestSchema.safeParse({}).success).toBe(false);
    expect(privateEvidenceDeleteRequestSchema.safeParse({ entryId: "proof.private-1", all: true }).success).toBe(false);
    expect(isSameOriginMutation("https://forge.example/api/evidence", "https://forge.example")).toBe(true);
    expect(isSameOriginMutation("https://forge.example/api/evidence", "https://attacker.example")).toBe(false);
    expect(isSameOriginMutation("https://forge.example/api/evidence", null)).toBe(false);
  });
});
