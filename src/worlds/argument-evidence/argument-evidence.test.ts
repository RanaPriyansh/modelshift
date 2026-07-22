import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ARGUMENT_EVIDENCE_AUTHORED_FIXTURE,
  parseArgumentEvidenceAuthoredFixture,
  createInitialArgumentEvidenceState,
  transitionArgumentEvidenceWorld,
  validateArgumentEvidenceTransfer,
} from ".";

function toProof() {
  return [
    { type: "COMMIT_INITIAL", ruleId: "same_topic_counts", confidence: 65 },
    { type: "COMMIT_EXPLANATION", text: "A card needs to bear on the claim outcome, not merely mention its topic." },
    { type: "RESPOND_TO_TWO_READINGS", response: "accept" },
    { type: "NAME_DISAGREEMENT" },
    { type: "COMMIT_TEST_PREDICTION", predictionId: "outcome_linked_changes_credibility" },
    { type: "REVEAL_SEPARATING_COMPARISON" },
    { type: "SET_WORKED_EVIDENCE_ITEM", evidenceItemId: "roof.outcome-linked" },
    { type: "SET_WORKED_RELATION", relationId: "supports_with_limit" },
    { type: "SUBMIT_WORKED_COMPARISON" },
    { type: "CONTINUE_TO_RECONSTRUCTION" },
    { type: "SUBMIT_RECONSTRUCTION", ruleId: "outcome_relation", text: "Evidence needs a relation to the exact outcome named by the claim." },
    { type: "ACKNOWLEDGE_WITHDRAWAL" },
  ] as const;
}

describe("Argument & Evidence domain", () => {
  it("parses exactly the canonical fixture bytes, deep-freezes them, and rejects malformed fixture identity", () => {
    const bytes = readFileSync(resolve(process.cwd(), "public/worlds/argument-evidence/authored-fixture.json"));
    expect(bytes.byteLength).toBe(3303);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("6bf7415e768322edf3f1e9db957849292438b1cacfb0d8911e9fcabe190735f9");
    expect(JSON.parse(bytes.toString("utf8"))).toEqual(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE);
    expect(Object.isFrozen(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.items[0])).toBe(true);
    expect(() => parseArgumentEvidenceAuthoredFixture({ ...ARGUMENT_EVIDENCE_AUTHORED_FIXTURE, transfer: { ...ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer, taskId: "wrong" } })).toThrow();
  });

  it("accepts only ordered stage transitions, permits local worked retries, and seals one transfer", () => {
    const initial = createInitialArgumentEvidenceState();
    expect(transitionArgumentEvidenceWorld(initial, { type: "SUBMIT_TRANSFER" })).toMatchObject({ accepted: false, reason: "invalid_event_for_stage", state: initial });
    let state = initial;
    for (const event of toProof()) {
      const result = transitionArgumentEvidenceWorld(state, event);
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      state = result.state;
    }
    expect(state.stage).toBe("COLD_TRANSFER");
    for (const event of [
      { type: "SET_TRANSFER_EVIDENCE_ITEM", evidenceItemId: "bus.outcome-linked" },
      { type: "SET_TRANSFER_MECHANISM", mechanismId: "compares_named_outcome" },
      { type: "SET_TRANSFER_LIMITATION", limitationId: "other_changes_not_ruled_out" },
      { type: "SET_TRANSFER_CONFIDENCE", confidence: 84 },
      { type: "SUBMIT_TRANSFER" },
    ] as const) {
      const result = transitionArgumentEvidenceWorld(state, event);
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      state = result.state;
    }
    expect(state).toMatchObject({ stage: "RESULT", transferSubmitted: true, transferEvaluation: { passed: true, score: 1 } });
    expect(JSON.stringify(state.proof)).not.toContain("A card needs to bear");
    expect(transitionArgumentEvidenceWorld(state, { type: "SUBMIT_TRANSFER" })).toMatchObject({ accepted: false, reason: "invalid_event_for_stage" });
    expect(transitionArgumentEvidenceWorld(state, { type: "RESET" })).toMatchObject({ accepted: true, state: { stage: "MYSTERY", proof: null } });
  });

  it("returns exact binary ordered validation criteria for every valid selection combination and rejects invalid input", () => {
    const evidence = ["bus.same-topic", "bus.outcome-linked", "bus.confounded"] as const;
    const mechanisms = ["same_subject", "compares_named_outcome", "personal_reaction"] as const;
    const limitations = ["none", "other_changes_not_ruled_out", "colour_not_measured"] as const;
    for (const evidenceItemId of evidence) for (const mechanismId of mechanisms) for (const limitationId of limitations) {
      const result = validateArgumentEvidenceTransfer({ taskId: "bus_route_late_arrivals_table", evidenceItemId, mechanismId, limitationId });
      const passed = evidenceItemId === "bus.outcome-linked" && mechanismId === "compares_named_outcome" && limitationId === "other_changes_not_ruled_out";
      expect(result).toEqual({
        inputStatus: "valid", passed, score: passed ? 1 : 0,
        code: passed ? "transfer.demonstrated" : "transfer.not-demonstrated",
        evidence: ["task:bus_route_late_arrivals_table", `criterion:evidence_item:${evidenceItemId === "bus.outcome-linked" ? "pass" : "fail"}`, `criterion:mechanism:${mechanismId === "compares_named_outcome" ? "pass" : "fail"}`, `criterion:limitation:${limitationId === "other_changes_not_ruled_out" ? "pass" : "fail"}`],
      });
    }
    expect(validateArgumentEvidenceTransfer({ taskId: "bus_route_late_arrivals_table", evidenceItemId: "bus.outcome-linked", mechanismId: "compares_named_outcome", limitationId: "other_changes_not_ruled_out", confidence: 85 })).toEqual({ inputStatus: "invalid", passed: false, score: 0, code: "invalid.transfer-input", evidence: [] });
  });
});
