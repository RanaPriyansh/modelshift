import { describe, expect, it } from "vitest";

import { canonicalJson, sha256Digest } from "../events";
import {
  compileAdultPilotExperience,
  createAdultPilotExperienceState,
  reduceAdultPilotExperience,
  replayAdultPilotExperience,
  type AdultPilotExperienceAction,
  type AdultPilotExperienceState,
  type ReviewedFixtureRefs,
} from "./controller";

const fixture = (): ReviewedFixtureRefs => ({
  schemaVersion: "adult-pilot-experience.v1",
  audience: "adult-fixture",
  journeyId: "journey.fixture.ratio",
  startedAt: "2026-07-23T12:00:00.000Z",
  authorityRef: "authority.fixture.reviewed",
  capabilityMapRef: "capability-map.fixture.ratio",
  resourceRef: "resource.fixture.reviewed-ratio",
  representationRef: "representation.fixture.ratio-table",
  projectRef: "project.fixture.individual-explanation",
  practiceRef: "practice.fixture.ratio-rehearsal",
  worldRuntimeRef: "world-runtime.fixture.ratio",
  evidenceContractRef: "evidence-contract.fixture.this-attempt",
  reviewedRouteRef: "route.fixture.ratio-reviewed",
  activeCheckpointRef: "checkpoint.fixture.ratio-compare",
  separatingOperationRef: "operation.fixture.compare-two-ratios",
  coldTransferRef: "transfer.fixture.unfamiliar-ratio",
});

function actions(secret = "LEARNER EXACT WORDING: I will compare equal quantities before I decide."): AdultPilotExperienceAction[] {
  return [
    { type: "CAPTURE_INTENT", actionId: "action.intent", intentWording: secret, practicalOutcomeWording: "Make a proportion choice for a practical mixture." },
    { type: "INSPECT_CANDIDATE_MAP", actionId: "action.inspect", mapRef: fixture().capabilityMapRef, provenance: "model-proposal", gapVisibility: "visible" },
    { type: "DECIDE_MAP_PROPOSAL", actionId: "action.map-decision", decision: "accept", learnerWording: "Keep the gap visible and retain the reviewed route.", consequence: "route-retained" },
    { type: "COMMIT_INITIAL_MODEL", actionId: "action.initial-model", modelKind: "strategy", learnerWording: "I will scale both quantities by the same amount." },
    { type: "PRESENT_TWO_UNCERTAIN_READINGS", actionId: "action.readings", proposer: "ai-proposal", readings: [
      { id: "reading.fixture.scale-both", wording: "The learner may scale both parts consistently." },
      { id: "reading.fixture.change-one", wording: "The learner may change only one part." },
    ], pointOfDisagreement: "Whether both quantities change together." },
    { type: "RESPOND_TO_READING", actionId: "action.reading-one", readingId: "reading.fixture.scale-both", response: "correct", correctedWording: "I think both quantities must change by the same factor." },
    { type: "RESPOND_TO_READING", actionId: "action.reading-two", readingId: "reading.fixture.change-one", response: "reject" },
    { type: "SELECT_SEPARATING_OPERATION", actionId: "action.separate", selectedOperationRef: fixture().separatingOperationRef, selectedBy: "learner" },
    { type: "ACTIVATE_REVIEWED_ROUTE", actionId: "action.route", routeRef: fixture().reviewedRouteRef, resourceRef: fixture().resourceRef, activeCheckpointRef: fixture().activeCheckpointRef },
    { type: "COMMIT_RECONSTRUCTION", actionId: "action.reconstruct", learnerWording: "I can reconstruct the comparison without the worked route." },
    { type: "COMMIT_PRACTICE", actionId: "action.practice", learnerWording: "I rehearsed a different ratio without an upgrade claim." },
    { type: "COMMIT_PROJECT", actionId: "action.project", learnerWording: "I made an individual practical explanation." },
    { type: "COMMIT_CRITIQUE", actionId: "action.critique", learnerWording: "I revised one stated limitation." },
    { type: "COMMIT_INDIVIDUAL_DEFENCE", actionId: "action.defence", learnerWording: "I can defend the individual decision before proof." },
    { type: "WITHDRAW_INSTRUCTIONAL_SUPPORT", actionId: "action.withdraw", withdrawal: "explicit" },
    { type: "RECORD_ACCESSIBILITY_CONTROL", actionId: "action.access", control: "screen-reader" },
    { type: "SUBMIT_COLD_TRANSFER", actionId: "action.transfer", transferRef: fixture().coldTransferRef, learnerWording: "On this unfamiliar case I compare the multiplier first." },
    { type: "RECORD_BOUNDED_RESULT", actionId: "action.result", source: "reviewed-fixture-validator", result: "demonstrated_this_attempt", conditionsRef: fixture().evidenceContractRef },
    { type: "SCHEDULE_DELAYED_RETURN", actionId: "action.schedule", scheduledAt: "2026-07-23T12:01:00.000Z", dueAt: "2026-07-30T12:01:00.000Z", delayDays: 7, dueAttemptId: "attempt.fixture.delayed-one" },
    { type: "RECORD_DELAYED_RETURN", actionId: "action.delayed-result", dueAttemptId: "attempt.fixture.delayed-one", attemptedAt: "2026-07-30T12:01:00.000Z", result: "untested" },
  ];
}

function initial(): AdultPilotExperienceState {
  const created = createAdultPilotExperienceState(fixture());
  if (!created.ok) throw new Error(`Expected a valid fixture state, got ${created.reason}`);
  return created.state;
}

function through(count: number): AdultPilotExperienceState {
  let state = initial();
  for (const action of actions().slice(0, count)) {
    const transition = reduceAdultPilotExperience(state, action);
    if (!transition.accepted) throw new Error(`Expected ${action.type} to transition, got ${transition.reason}`);
    state = transition.state;
  }
  return state;
}

function recursivelyContains(value: unknown, fragment: string): boolean {
  if (typeof value === "string") return value.includes(fragment);
  if (value === null || typeof value !== "object") return false;
  return Reflect.ownKeys(value).some((key) => recursivelyContains(Object.getOwnPropertyDescriptor(value, key)?.value, fragment));
}

function recursivelyHasKey(value: unknown, target: string): boolean {
  if (value === null || typeof value !== "object") return false;
  return Reflect.ownKeys(value).some((key) => String(key) === target || recursivelyHasKey(Object.getOwnPropertyDescriptor(value, key)?.value, target));
}

function serializedWithOwnPollutionKey(value: object, key: "__proto__" | "constructor" | "prototype"): unknown {
  const serialized = JSON.stringify(value);
  return JSON.parse(`{"${key}":{"polluted":true},${serialized.slice(1)}`) as unknown;
}

describe("W6-F adult pilot experience controller", () => {
  it("replays the complete fixture journey byte-for-byte with a bounded delayed return", async () => {
    const first = await compileAdultPilotExperience(fixture(), actions());
    const second = await compileAdultPilotExperience(fixture(), actions());
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(first.state.stage).toBe("completed");
    expect(first.state.workspace).toBeNull();
    expect(first.state.proofBoundary).toMatchObject({ instructionalSupport: "unmounted", solutionBearingState: "invalidated", accessibilityControls: ["screen-reader"] });
    expect(first.state.boundedResult).toEqual({ result: "demonstrated_this_attempt", claimScope: "this-attempt-under-stated-conditions", evidenceUpgrade: false, capabilityUpgrade: false });
    expect(first.state.delayedReturn).toMatchObject({ dueAttemptId: "attempt.fixture.delayed-one", result: "untested" });
    expect(canonicalJson(first.receipt)).toBe(canonicalJson(second.receipt));
    expect(first.events.map((event) => event.eventDigest)).toEqual(second.events.map((event) => event.eventDigest));

    const replayed = await replayAdultPilotExperience(fixture(), structuredClone(first.events), first.replayHandle);
    expect(replayed.ok).toBe(true);
    if (!replayed.ok) return;
    expect(canonicalJson(replayed.receipt)).toBe(canonicalJson(first.receipt));
    expect(replayed.state).toMatchObject({ stage: "completed", workspace: null });
  });

  it("has a closed action and stage vocabulary, rejecting duplicate, reordered, unknown, and media-completion events without mutation", () => {
    const state = initial();
    const all = actions();
    for (const candidate of all.slice(1)) {
      const rejected = reduceAdultPilotExperience(state, candidate);
      expect(rejected.accepted).toBe(false);
      if (!rejected.accepted) expect(rejected.state).toBe(state);
    }

    const captured = reduceAdultPilotExperience(state, all[0]);
    expect(captured.accepted).toBe(true);
    if (!captured.accepted) return;
    const reordered = reduceAdultPilotExperience(captured.state, all[3]);
    const duplicate = reduceAdultPilotExperience(captured.state, all[0]);
    const unknown = reduceAdultPilotExperience(captured.state, { type: "RECORD_MEDIA_COMPLETION", actionId: "action.media", completed: true });
    expect(reordered).toMatchObject({ accepted: false, reason: "stage-mismatch" });
    expect(duplicate).toMatchObject({ accepted: false, reason: "duplicate-action" });
    expect(unknown).toMatchObject({ accepted: false, reason: "invalid-action" });
    if (!reordered.accepted) expect(reordered.state).toBe(captured.state);
    if (!duplicate.accepted) expect(duplicate.state).toBe(captured.state);
    if (!unknown.accepted) expect(unknown.state).toBe(captured.state);
  });

  it("rejects every other closed action vocabulary member at each sealed journey step without mutating state", () => {
    let state = initial();
    const sequence = actions();
    for (const valid of sequence) {
      const allowed = (() => {
        if (state.stage === "readings") return state.workspace?.readings.length ? ["RESPOND_TO_READING"] : ["PRESENT_TWO_UNCERTAIN_READINGS"];
        if (state.stage === "proof") return ["RECORD_ACCESSIBILITY_CONTROL", "SUBMIT_COLD_TRANSFER"];
        if (state.stage === "delayed-return") return state.delayedReturn ? ["RECORD_DELAYED_RETURN"] : ["SCHEDULE_DELAYED_RETURN"];
        return [valid.type];
      })();
      for (const [index, candidate] of sequence.entries()) {
        if (allowed.includes(candidate.type)) continue;
        const rejected = reduceAdultPilotExperience(state, { ...candidate, actionId: `action.illegal.${valid.actionId}.${index}` });
        expect(rejected.accepted).toBe(false);
        if (!rejected.accepted) expect(rejected.state).toBe(state);
      }
      const transition = reduceAdultPilotExperience(state, valid);
      expect(transition.accepted).toBe(true);
      if (!transition.accepted) return;
      state = transition.state;
    }
    expect(state.stage).toBe("completed");
  });

  it("rejects cloned state, extra fields, getters, throwing proxies, minor modes, and self-attested adulthood", () => {
    const state = initial();
    expect(reduceAdultPilotExperience(structuredClone(state), actions()[0])).toMatchObject({ accepted: false, reason: "untrusted-state" });
    expect(reduceAdultPilotExperience(state, { ...actions()[0], extra: "forged" })).toMatchObject({ accepted: false, reason: "invalid-action" });

    const getterAction = { type: "CAPTURE_INTENT", actionId: "action.getter", practicalOutcomeWording: "Outcome" };
    Object.defineProperty(getterAction, "intentWording", { enumerable: true, get: () => "getter must not run" });
    expect(reduceAdultPilotExperience(state, getterAction)).toMatchObject({ accepted: false, reason: "invalid-action" });
    const throwingProxy = new Proxy({}, { getPrototypeOf: () => { throw new Error("trap"); } });
    expect(reduceAdultPilotExperience(state, throwingProxy)).toMatchObject({ accepted: false, reason: "invalid-action" });

    expect(createAdultPilotExperienceState({ ...fixture(), audience: "under-18" })).toMatchObject({ ok: false, reason: "adult-fixture-required" });
    expect(createAdultPilotExperienceState({ ...fixture(), selfAttestedAdult: true })).toMatchObject({ ok: false, reason: "invalid-fixture-input" });
    expect(createAdultPilotExperienceState(new Proxy(fixture(), { ownKeys: () => { throw new Error("trap"); } }))).toMatchObject({ ok: false, reason: "invalid-fixture-input" });
  });

  it("rejects serialized own prototype-pollution keys in fixture and action records", () => {
    const state = initial();
    for (const key of ["__proto__", "constructor", "prototype"] as const) {
      const poisonedFixture = serializedWithOwnPollutionKey(fixture(), key);
      const poisonedAction = serializedWithOwnPollutionKey(actions()[0]!, key);
      expect(Reflect.ownKeys(poisonedFixture as object)).toContain(key);
      expect(createAdultPilotExperienceState(poisonedFixture)).toMatchObject({ ok: false, reason: "invalid-fixture-input" });
      expect(reduceAdultPilotExperience(state, poisonedAction)).toMatchObject({ accepted: false, reason: "invalid-action" });
    }
  });

  it("requires exactly two distinct uncertain readings and a response to each before a learner-selected separating operation", () => {
    const state = through(4);
    const presentation = actions()[4]!;
    if (presentation.type !== "PRESENT_TWO_UNCERTAIN_READINGS") throw new Error("Fixture action order changed.");
    const oneReading = { ...presentation, readings: [presentation.readings[0]] };
    const duplicateReading = { ...presentation, readings: [presentation.readings[0], { ...presentation.readings[0], wording: "A different phrase" }] };
    expect(reduceAdultPilotExperience(state, oneReading)).toMatchObject({ accepted: false, reason: "invalid-action" });
    expect(reduceAdultPilotExperience(state, duplicateReading)).toMatchObject({ accepted: false, reason: "invalid-action" });

    const presented = reduceAdultPilotExperience(state, actions()[4]);
    expect(presented.accepted).toBe(true);
    if (!presented.accepted) return;
    expect(reduceAdultPilotExperience(presented.state, actions()[7])).toMatchObject({ accepted: false, reason: "stage-mismatch" });
    const firstResponse = reduceAdultPilotExperience(presented.state, actions()[5]);
    expect(firstResponse.accepted).toBe(true);
    if (!firstResponse.accepted) return;
    expect(reduceAdultPilotExperience(firstResponse.state, actions()[5])).toMatchObject({ accepted: false, reason: "duplicate-action" });
    const secondResponse = reduceAdultPilotExperience(firstResponse.state, actions()[6]);
    expect(secondResponse.accepted).toBe(true);
    if (!secondResponse.accepted) return;
    expect(secondResponse.state.stage).toBe("separating-operation");
    expect(reduceAdultPilotExperience(secondResponse.state, { ...actions()[7], selectedOperationRef: "operation.fixture.ai-selected" })).toMatchObject({ accepted: false, reason: "reference-mismatch" });
  });

  it("binds each map decision to its one closed consequence pair and routes decline or edit to terminal fixture stages", async () => {
    const decisionState = through(2);
    const consequences = ["route-retained", "route-declined", "route-requires-review"] as const;
    const expected = { accept: "route-retained", reject: "route-declined", edit: "route-requires-review" } as const;
    const expectedStage = { accept: "initial-model", reject: "route-declined", edit: "route-review-required" } as const;
    for (const decision of ["accept", "reject", "edit"] as const) {
      for (const consequence of consequences) {
        const transition = reduceAdultPilotExperience(decisionState, { ...actions()[2], actionId: `action.map-pair.${decision}.${consequence}`, decision, consequence });
        if (consequence === expected[decision]) {
          expect(transition).toMatchObject({ accepted: true, state: { stage: expectedStage[decision] } });
        } else {
          expect(transition).toMatchObject({ accepted: false, reason: "invalid-action" });
          if (!transition.accepted) expect(transition.state).toBe(decisionState);
        }
      }
    }

    for (const decision of ["reject", "edit"] as const) {
      const terminal = reduceAdultPilotExperience(decisionState, {
        ...actions()[2],
        actionId: `action.map-terminal.${decision}`,
        decision,
        consequence: expected[decision],
      });
      expect(terminal).toMatchObject({ accepted: true, state: { stage: expectedStage[decision], workspace: null, boundedResult: null } });
      if (!terminal.accepted) return;

      for (const candidate of actions().slice(3)) {
        const rejected = reduceAdultPilotExperience(terminal.state, { ...candidate, actionId: `action.terminal.${decision}.${candidate.actionId}` });
        expect(rejected).toMatchObject({ accepted: false, reason: "stage-mismatch" });
        if (!rejected.accepted) expect(rejected.state).toBe(terminal.state);
      }

      const compiled = await compileAdultPilotExperience(fixture(), [actions()[0]!, actions()[1]!, {
        ...actions()[2],
        actionId: `action.map-terminal.compile.${decision}`,
        decision,
        consequence: expected[decision],
      }]);
      expect(compiled).toMatchObject({ ok: true, state: { stage: expectedStage[decision], workspace: null, boundedResult: null }, receipt: { stage: expectedStage[decision], capabilityUpgrade: false, evidenceUpgrade: false } });
    }
  });

  it("invalidates solution-bearing state at proof and permits accessibility without restoring cognitive help", () => {
    const proof = through(15);
    expect(proof.stage).toBe("proof");
    expect(proof.workspace).toBeNull();
    expect(proof.proofBoundary).toMatchObject({ instructionalSupport: "unmounted", solutionBearingState: "invalidated" });

    for (const stale of [actions()[4], actions()[8], actions()[9], { type: "REQUEST_AI_HELP", actionId: "action.help" }, { type: "OPEN_RESOURCE", actionId: "action.resource" }]) {
      const rejected = reduceAdultPilotExperience(proof, stale);
      expect(rejected.accepted).toBe(false);
      if (!rejected.accepted) expect(rejected.state).toBe(proof);
    }
    const access = reduceAdultPilotExperience(proof, actions()[15]);
    expect(access.accepted).toBe(true);
    if (!access.accepted) return;
    expect(access.state.workspace).toBeNull();
    expect(access.state.proofBoundary.accessibilityControls).toEqual(["screen-reader"]);
    expect(reduceAdultPilotExperience(access.state, { ...actions()[8], actionId: "action.stale-route" })).toMatchObject({ accepted: false, reason: "proof-help-forbidden" });
  });

  it("keeps watched media, group artifacts, AI grading, and practice completion from becoming capability evidence", () => {
    const route = through(9);
    expect(reduceAdultPilotExperience(route, { type: "RECORD_MEDIA_COMPLETION", actionId: "action.watched", completed: true })).toMatchObject({ accepted: false, reason: "invalid-action" });
    const project = through(11);
    expect(reduceAdultPilotExperience(project, { ...actions()[11], actionId: "action.group-project", groupArtifact: "artifact.group" })).toMatchObject({ accepted: false, reason: "invalid-action" });
    const proof = through(15);
    const afterTransfer = reduceAdultPilotExperience(proof, actions()[16]);
    expect(afterTransfer.accepted).toBe(true);
    if (!afterTransfer.accepted) return;
    expect(reduceAdultPilotExperience(afterTransfer.state, { ...actions()[17], source: "model" })).toMatchObject({ accepted: false, reason: "invalid-action" });
    const result = reduceAdultPilotExperience(afterTransfer.state, actions()[17]);
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.state.boundedResult).toMatchObject({ capabilityUpgrade: false, evidenceUpgrade: false, claimScope: "this-attempt-under-stated-conditions" });
  });

  it("requires exact non-operative reviewed references and never treats them as authority", () => {
    const afterIntent = through(1);
    expect(reduceAdultPilotExperience(afterIntent, { ...actions()[1], mapRef: "capability-map.stale" })).toMatchObject({ accepted: false, reason: "reference-mismatch" });
    const separating = through(7);
    expect(reduceAdultPilotExperience(separating, { ...actions()[7], selectedOperationRef: "operation.fixture.stale" })).toMatchObject({ accepted: false, reason: "reference-mismatch" });
    const route = through(8);
    expect(reduceAdultPilotExperience(route, { ...actions()[8], resourceRef: "resource.fixture.stale" })).toMatchObject({ accepted: false, reason: "reference-mismatch" });
    const proof = through(15);
    expect(reduceAdultPilotExperience(proof, { ...actions()[16], transferRef: "transfer.fixture.stale" })).toMatchObject({ accepted: false, reason: "reference-mismatch" });
    const result = through(17);
    expect(reduceAdultPilotExperience(result, { ...actions()[17], actionId: "action.wrong-result", conditionsRef: "evidence-contract.fixture.stale" })).toMatchObject({ accepted: false, reason: "invalid-bounded-result" });
  });

  it("keeps raw learner prose, URLs, prompts, credentials, identity evidence, and model payloads out of receipts", async () => {
    const sensitive = "https://example.invalid/?credential=TOP-SECRET provider_payload=<prompt> identity-evidence=private";
    const compiled = await compileAdultPilotExperience(fixture(), actions(sensitive));
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    const receiptJson = JSON.stringify(compiled.receipt);
    const eventReceiptJson = JSON.stringify(compiled.events.map(({ receipt, eventDigest, stateDigest }) => ({ receipt, eventDigest, stateDigest })));
    for (const value of [sensitive, "TOP-SECRET", "provider_payload", "identity-evidence", "<prompt>"]) {
      expect(receiptJson).not.toContain(value);
      expect(eventReceiptJson).not.toContain(value);
    }
    expect(receiptJson).toContain("fixture-only-non-authorizing-this-attempt");
  });

  it("refuses a delayed-return result without the exact due attempt at or after the due instant", () => {
    const scheduled = through(19);
    expect(scheduled.stage).toBe("delayed-return");
    expect(reduceAdultPilotExperience(scheduled, { ...actions()[19], dueAttemptId: "attempt.fixture.wrong" })).toMatchObject({ accepted: false, reason: "invalid-delayed-return" });
    expect(reduceAdultPilotExperience(scheduled, { ...actions()[19], actionId: "action.early-return", attemptedAt: "2026-07-29T12:01:00.000Z" })).toMatchObject({ accepted: false, reason: "invalid-delayed-return" });
    const retainedWithoutAttempt = { type: "RECORD_RETAINED", actionId: "action.retained", result: "retained" };
    expect(reduceAdultPilotExperience(scheduled, retainedWithoutAttempt)).toMatchObject({ accepted: false, reason: "invalid-action" });
    const valid = reduceAdultPilotExperience(scheduled, actions()[19]);
    expect(valid).toMatchObject({ accepted: true, state: { stage: "completed", delayedReturn: { result: "untested" } } });
  });

  it("requires delayDays to equal the exact whole UTC-day interval, including the 365-day boundary", () => {
    const awaitingSchedule = through(18);
    const exact365 = { ...actions()[18], actionId: "action.schedule.365", scheduledAt: "2026-07-23T12:01:00.000Z", dueAt: "2027-07-23T12:01:00.000Z", delayDays: 365 };
    expect(reduceAdultPilotExperience(awaitingSchedule, exact365)).toMatchObject({ accepted: true });
    const oneMillisecondPast365 = { ...exact365, actionId: "action.schedule.365-plus-ms", dueAt: "2027-07-23T12:01:00.001Z" };
    const nonWholeDay = { ...actions()[18], actionId: "action.schedule.non-whole", scheduledAt: "2026-07-23T12:01:00.000Z", dueAt: "2026-07-24T12:00:59.999Z", delayDays: 1 };
    const wrongDayCount = { ...actions()[18], actionId: "action.schedule.wrong-count", scheduledAt: "2026-07-23T12:01:00.000Z", dueAt: "2026-07-30T12:01:00.000Z", delayDays: 6 };
    for (const malformed of [oneMillisecondPast365, nonWholeDay, wrongDayCount]) {
      const transition = reduceAdultPilotExperience(awaitingSchedule, malformed);
      expect(transition).toMatchObject({ accepted: false, reason: "invalid-delayed-return" });
      if (!transition.accepted) expect(transition.state).toBe(awaitingSchedule);
    }
  });

  it("keeps every public compilation/event/receipt projection free of learner prose and makes replay handle data inaccessible", async () => {
    const secret = "RAW-LEARNER-PROSE https://example.invalid/?credential=TOP-SECRET";
    const compiled = await compileAdultPilotExperience(fixture(), actions(secret));
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    const publicValues = [compiled, compiled.state, compiled.events, compiled.receipt];
    for (const value of publicValues) {
      expect(JSON.stringify(value)).not.toContain(secret);
      expect(JSON.stringify(value)).not.toContain("TOP-SECRET");
      expect(recursivelyContains(value, secret)).toBe(false);
      expect(recursivelyContains(value, "TOP-SECRET")).toBe(false);
      expect(recursivelyHasKey(value, "readings")).toBe(false);
    }
    expect(Reflect.ownKeys(compiled.replayHandle)).toEqual([]);
    expect(JSON.stringify(compiled.replayHandle)).toBe("{}");
    expect(Object.isFrozen(compiled.replayHandle)).toBe(true);
    expect(compiled.events.every((event) => !Object.keys(event).includes("replayAction"))).toBe(true);

    const partial = await compileAdultPilotExperience(fixture(), actions(secret).slice(0, 1));
    expect(partial.ok).toBe(true);
    if (partial.ok) {
      expect(JSON.stringify(partial)).not.toContain(secret);
      expect(recursivelyContains(partial, secret)).toBe(false);
    }

    let proofState = initial();
    for (const action of actions(secret).slice(0, 15)) {
      const transition = reduceAdultPilotExperience(proofState, action);
      if (!transition.accepted) throw new Error(`Expected ${action.type} to enter proof.`);
      proofState = transition.state;
    }
    const postWithdrawal = reduceAdultPilotExperience(proofState, actions(secret)[16]);
    expect(postWithdrawal.accepted).toBe(true);
    expect(JSON.stringify(postWithdrawal)).not.toContain(secret);
    expect(recursivelyContains(postWithdrawal, secret)).toBe(false);
  });

  it("replays only the matching branded handle and rejects forged self-rehashed receipts before digest or state acceptance", async () => {
    const compiled = await compileAdultPilotExperience(fixture(), actions());
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;

    expect(await replayAdultPilotExperience(fixture(), structuredClone(compiled.events), compiled.replayHandle)).toMatchObject({ ok: true, state: { stage: "completed" } });
    expect(await replayAdultPilotExperience(fixture(), compiled.events, structuredClone(compiled.replayHandle))).toMatchObject({ ok: false, index: -1, reason: "invalid-replay-handle" });
    expect(await replayAdultPilotExperience(fixture(), compiled.events.slice(1), compiled.replayHandle)).toMatchObject({ ok: false, index: -1, reason: "replay-handle-mismatch" });

    const other = await compileAdultPilotExperience(fixture(), actions("different private learner wording"));
    expect(other.ok).toBe(true);
    if (other.ok) {
      expect(await replayAdultPilotExperience(fixture(), compiled.events, other.replayHandle)).toMatchObject({ ok: false, index: 0, reason: "event-receipt-mismatch" });
    }

    const reordered = [...structuredClone(compiled.events)];
    [reordered[0], reordered[1]] = [reordered[1]!, reordered[0]!];
    expect(await replayAdultPilotExperience(fixture(), reordered, compiled.replayHandle)).toMatchObject({ ok: false, index: 0, reason: "replay-handle-mismatch" });

    const identityMismatch = structuredClone(compiled.events).map((event, index) => index === 0 ? { ...event, actionId: "action.forged-identity" } : event);
    expect(await replayAdultPilotExperience(fixture(), identityMismatch, compiled.replayHandle)).toMatchObject({ ok: false, index: 0, reason: "replay-handle-mismatch" });

    const forged = structuredClone(compiled.events).map((event, index) => index === 0 ? {
      ...event,
      receipt: { ...event.receipt, intentWordingDigest: `sha256:${"0".repeat(64)}` },
    } : event);
    const first = forged[0]!;
    forged[0] = {
      ...first,
      eventDigest: await sha256Digest(canonicalJson({ schemaVersion: first.schemaVersion, sequence: first.sequence, actionId: first.actionId, eventType: first.eventType, receipt: first.receipt, stateDigest: first.stateDigest })),
    };
    expect(await replayAdultPilotExperience(fixture(), forged, compiled.replayHandle)).toMatchObject({ ok: false, index: 0, reason: "event-receipt-mismatch" });
  });

  it("rejects serialized own __proto__ keys in public replay events and receipts", async () => {
    const compiled = await compileAdultPilotExperience(fixture(), actions());
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;

    const poisonedEvent = serializedWithOwnPollutionKey(compiled.events[0]!, "__proto__");
    expect(await replayAdultPilotExperience(fixture(), [poisonedEvent, ...compiled.events.slice(1)], compiled.replayHandle)).toMatchObject({ ok: false, index: 0, reason: "invalid-event" });

    const poisonedReceipt = serializedWithOwnPollutionKey(compiled.events[0]!.receipt, "__proto__");
    const eventWithPoisonedReceipt = { ...compiled.events[0]!, receipt: poisonedReceipt };
    expect(await replayAdultPilotExperience(fixture(), [eventWithPoisonedReceipt, ...compiled.events.slice(1)], compiled.replayHandle)).toMatchObject({ ok: false, index: 0, reason: "invalid-event" });
  });
});
