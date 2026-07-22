import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ARGUMENT_EVIDENCE_AUTHORED_FIXTURE,
  type ArgumentEvidenceWorldEvent,
  parseArgumentEvidenceAuthoredFixture,
  createInitialArgumentEvidenceState,
  transitionArgumentEvidenceWorld,
  validateArgumentEvidenceTransfer,
} from ".";

function toProof() {
  const fixture = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE;
  return [
    { type: "COMMIT_INITIAL", ruleId: fixture.compiler.readings[0].id, confidence: 65 },
    { type: "COMMIT_EXPLANATION", text: "A card needs to bear on the claim outcome, not merely mention its topic." },
    { type: "RESPOND_TO_TWO_READINGS", response: "accept" },
    { type: "NAME_DISAGREEMENT" },
    { type: "COMMIT_TEST_PREDICTION", predictionId: fixture.compiler.readings[1].prediction },
    { type: "REVEAL_SEPARATING_COMPARISON" },
    { type: "SET_WORKED_EVIDENCE_ITEM", evidenceItemId: fixture.worked.expected.evidenceItemId },
    { type: "SET_WORKED_RELATION", relationId: fixture.worked.expected.relationId },
    { type: "SUBMIT_WORKED_COMPARISON" },
    { type: "CONTINUE_TO_RECONSTRUCTION" },
    { type: "SUBMIT_RECONSTRUCTION", ruleId: fixture.reconstruction.expectedRuleId, text: "Evidence needs a relation to the exact outcome named by the claim." },
    { type: "ACKNOWLEDGE_WITHDRAWAL" },
  ] as const;
}

describe("Argument & Evidence domain", () => {
  it("parses exactly the canonical fixture bytes, deep-freezes them, and rejects malformed fixture identity", () => {
    const bytes = readFileSync(resolve(process.cwd(), "src/worlds/argument-evidence/fixtures/authored-fixture.json"));
    expect(bytes.byteLength).toBe(5749);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("8ce3d6a8138f49a499202cacf4d38b58e03d7978bf151b3138020bdf24ce9ed9");
    expect(JSON.parse(bytes.toString("utf8"))).toEqual(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE);
    expect(Object.isFrozen(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.items[0])).toBe(true);
    const originalDefault = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.defaults.initialConfidence;
    expect(() => { (ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.defaults as { initialConfidence: number }).initialConfidence = 91; }).toThrow(TypeError);
    expect(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.defaults.initialConfidence).toBe(originalDefault);

    const alternate = structuredClone(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE) as unknown as {
      defaults: { initialConfidence: number; transferConfidence: number };
      worked: {
        selectableItemIds: string[];
        relationChoices: Array<{ id: string }>;
        expected: { evidenceItemId: string; relationId: string };
      };
      transfer: {
        items: Array<{ id: string }>;
        mechanismChoices: Array<{ id: string }>;
        limitationChoices: Array<{ id: string }>;
        expected: { evidenceItemId: string; mechanismId: string; limitationId: string };
      };
    };
    alternate.defaults.initialConfidence = 41;
    alternate.defaults.transferConfidence = 72;
    alternate.worked.expected.evidenceItemId = alternate.worked.selectableItemIds[0]!;
    alternate.worked.expected.relationId = alternate.worked.relationChoices[0]!.id;
    alternate.transfer.expected.evidenceItemId = alternate.transfer.items[0]!.id;
    alternate.transfer.expected.mechanismId = alternate.transfer.mechanismChoices[0]!.id;
    alternate.transfer.expected.limitationId = alternate.transfer.limitationChoices[0]!.id;
    expect(parseArgumentEvidenceAuthoredFixture(alternate)).toMatchObject({
      defaults: { initialConfidence: 41, transferConfidence: 72 },
      worked: { expected: alternate.worked.expected },
      transfer: { expected: alternate.transfer.expected },
    });

    const malformedFixtures: unknown[] = [];
    const worked = structuredClone(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE) as unknown as { worked: { expected: { evidenceItemId: string } } };
    worked.worked.expected.evidenceItemId = "roof.uncontrolled-testimonial";
    malformedFixtures.push(worked);
    const compiler = structuredClone(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE) as unknown as { compiler: { readings: [{ prediction: string }] } };
    compiler.compiler.readings[0].prediction = "forged_prediction";
    malformedFixtures.push(compiler);
    const support = structuredClone(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE) as unknown as { support: [{ level: number }, { level: number }] };
    support.support[1].level = 3;
    malformedFixtures.push(support);
    const transfer = structuredClone(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE) as unknown as { transfer: { expected: { mechanismId: string } } };
    transfer.transfer.expected.mechanismId = "forged_mechanism";
    malformedFixtures.push(transfer);
    const results = structuredClone(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE) as unknown as { results: { remainsUntested: string[] } };
    results.results.remainsUntested.pop();
    malformedFixtures.push(results);
    const defaults = structuredClone(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE) as unknown as { defaults: { transferConfidence: number } };
    defaults.defaults.transferConfidence = 60.5;
    malformedFixtures.push(defaults);
    malformedFixtures.push({ ...structuredClone(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE), unexpected: true });
    for (const malformed of malformedFixtures) {
      expect(() => parseArgumentEvidenceAuthoredFixture(malformed)).toThrow();
    }
  });

  it("rejects hostile event shapes for every event family without mutating state", () => {
    const initial = createInitialArgumentEvidenceState();
    const hostileEvents: unknown[] = [
      null,
      [],
      { type: "UNKNOWN" },
      { type: "RESET", extra: true },
      { type: "COMMIT_INITIAL", ruleId: "forged", confidence: 60 },
      { type: "COMMIT_INITIAL", ruleId: ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings[0].id, confidence: Number.NaN },
      { type: "COMMIT_INITIAL", ruleId: ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings[0].id, confidence: 60.5 },
      { type: "COMMIT_INITIAL", ruleId: ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings[0].id, confidence: "60" },
      { type: "COMMIT_EXPLANATION", text: 7 },
      { type: "RESPOND_TO_TWO_READINGS", response: "accept", correction: "not allowed" },
      { type: "RESPOND_TO_TWO_READINGS", response: "correct" },
      { type: "RESPOND_TO_TWO_READINGS", response: "forged" },
      { type: "NAME_DISAGREEMENT", extra: true },
      { type: "COMMIT_TEST_PREDICTION", predictionId: "forged" },
      { type: "REVEAL_SEPARATING_COMPARISON", extra: true },
      { type: "SET_WORKED_EVIDENCE_ITEM", evidenceItemId: "forged" },
      { type: "SET_WORKED_RELATION", relationId: "forged" },
      { type: "SUBMIT_WORKED_COMPARISON", extra: true },
      { type: "CONSUME_AUTHORED_SUPPORT", level: 4 },
      { type: "CONTINUE_TO_RECONSTRUCTION", extra: true },
      { type: "SUBMIT_RECONSTRUCTION", ruleId: "forged", text: "A sufficiently long forged rule." },
      { type: "ACKNOWLEDGE_WITHDRAWAL", extra: true },
      { type: "SET_TRANSFER_EVIDENCE_ITEM", evidenceItemId: "forged" },
      { type: "SET_TRANSFER_MECHANISM", mechanismId: "forged" },
      { type: "SET_TRANSFER_LIMITATION", limitationId: "forged" },
      { type: "SET_TRANSFER_CONFIDENCE", confidence: Number.NaN },
      { type: "SUBMIT_TRANSFER", extra: true },
    ];
    for (const hostile of hostileEvents) {
      const result = transitionArgumentEvidenceWorld(initial, hostile as ArgumentEvidenceWorldEvent);
      expect(result).toMatchObject({ accepted: false, reason: "invalid_event_shape" });
      expect(result.state).toBe(initial);
    }
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
    const expected = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.expected;
    for (const event of [
      { type: "SET_TRANSFER_EVIDENCE_ITEM", evidenceItemId: expected.evidenceItemId },
      { type: "SET_TRANSFER_MECHANISM", mechanismId: expected.mechanismId },
      { type: "SET_TRANSFER_LIMITATION", limitationId: expected.limitationId },
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
    const fixture = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE;
    const evidence = fixture.transfer.items.map((item) => item.id);
    const mechanisms = fixture.transfer.mechanismChoices.map((choice) => choice.id);
    const limitations = fixture.transfer.limitationChoices.map((choice) => choice.id);
    const expected = fixture.transfer.expected;
    for (const evidenceItemId of evidence) for (const mechanismId of mechanisms) for (const limitationId of limitations) {
      const result = validateArgumentEvidenceTransfer({ taskId: fixture.transfer.taskId, evidenceItemId, mechanismId, limitationId });
      const evidencePass = evidenceItemId === expected.evidenceItemId;
      const mechanismPass = mechanismId === expected.mechanismId;
      const limitationPass = limitationId === expected.limitationId;
      const passed = evidencePass && mechanismPass && limitationPass;
      expect(result).toEqual({
        inputStatus: "valid", passed, score: passed ? 1 : 0,
        code: passed ? "transfer.demonstrated" : "transfer.not-demonstrated",
        evidence: [`task:${fixture.transfer.taskId}`, `criterion:evidence_item:${evidencePass ? "pass" : "fail"}`, `criterion:mechanism:${mechanismPass ? "pass" : "fail"}`, `criterion:limitation:${limitationPass ? "pass" : "fail"}`],
      });
    }
    expect(validateArgumentEvidenceTransfer({ taskId: fixture.transfer.taskId, ...expected, confidence: 85 })).toEqual({ inputStatus: "invalid", passed: false, score: 0, code: "invalid.transfer-input", evidence: [] });
  });
});
