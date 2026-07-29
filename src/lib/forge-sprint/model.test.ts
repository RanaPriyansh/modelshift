import { describe, expect, it } from "vitest";

import {
  FORGE_SPRINT_STORAGE_KEY,
  addEvidenceLink,
  addSprintToStore,
  completeCurrentSprintDay,
  createEmptyForgeSprintStore,
  createForgeSprint,
  parseForgeSprintStore,
  serializeForgeSprintStore,
  updateForgeSprint,
  validateDayCompletion,
  validateSprintSetup,
  type CreateForgeSprintInput,
  type ForgeSprint,
} from "./model";
import {
  readForgeSprintStore,
  writeForgeSprintStore,
  type ForgeSprintStorageLike,
} from "./storage";

const NOW = new Date("2026-07-29T12:00:00.000Z");

const VALID_SETUP: CreateForgeSprintInput = {
  title: "Library seat finder",
  audience: "Students looking for a quiet study space",
  finishLine: "A student can find an available study seat on one library floor.",
  startingPoint: "A floor plan and a small web app starter.",
  dailyMinutes: 60,
  templateId: "campus-tool",
};

class FakeStorage implements ForgeSprintStorageLike {
  readonly values = new Map<string, string>();
  writes = 0;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes += 1;
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function sprint(id = "sprint-test"): ForgeSprint {
  return createForgeSprint(VALID_SETUP, { id, now: NOW });
}

function fillCurrentDay(current: ForgeSprint): ForgeSprint {
  const days = current.days.map((day) =>
    day.day === current.currentDay
      ? {
          ...day,
          workNotes: "Day " + day.day + ": I tested the smallest useful version with a real case.",
          change: "Day " + day.day + ": I changed the core path after observing the result.",
        }
      : day,
  );
  return updateForgeSprint(current, { days }, NOW);
}

function completeThroughDayFive(): ForgeSprint {
  let current = sprint();
  for (let day = 1; day <= 5; day += 1) {
    current = fillCurrentDay(current);
    const completed = completeCurrentSprintDay(current, NOW);
    expect(completed.result).toEqual({ ok: true, errors: [] });
    current = completed.sprint;
  }
  return current;
}

function fillProofLab(current: ForgeSprint, aiUse: ForgeSprint["proofLab"]["aiUse"]): ForgeSprint {
  const withDaySix = fillCurrentDay(current);
  const linked = addEvidenceLink(
    withDaySix,
    6,
    { label: "Recorded seat-search run", url: "https://example.test/proof" },
    NOW,
  );
  expect(linked.error).toBeNull();

  return updateForgeSprint(linked.sprint, {
    proofLab: {
      explainWithoutNotes: "The app filters a floor map and gives students one available seat choice.",
      changeWithoutAi: "I removed the misleading full-floor availability label after the test exposed confusion.",
      realityCheck: "I compared the result with the current floor occupancy list.",
      coreOutcomeShown: true,
      evidenceIsInspectable: true,
      canExplainScope: true,
      aiUse,
      status: "not_started",
    },
  }, NOW);
}

describe("Forge sprint setup and ordered completion", () => {
  it("requires a bounded project setup before a sprint is created", () => {
    const invalid = validateSprintSetup({
      title: " x ",
      audience: "group",
      finishLine: "ship it",
      startingPoint: " ",
      dailyMinutes: 15 as CreateForgeSprintInput["dailyMinutes"],
      templateId: "not-a-template" as CreateForgeSprintInput["templateId"],
    });

    expect(invalid.ok).toBe(false);
    expect(invalid.errors).toEqual([
      "Name the project in at least 3 characters.",
      "Name one specific person or group this is for.",
      "Make the Day 7 finish line concrete and testable.",
      "Record what you already have, even if it is only an idea.",
      "Choose a valid daily time budget.",
      "Choose a valid starting pattern.",
    ]);
    expect(validateSprintSetup(VALID_SETUP)).toEqual({ ok: true, errors: [] });
  });

  it("allows only the current day to complete and advances one day at a time", () => {
    const initial = sprint();

    expect(validateDayCompletion(initial, 2)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining(["Complete the current day before moving the sprint forward."]),
    });

    const blocked = completeCurrentSprintDay(initial, NOW);
    expect(blocked.result.ok).toBe(false);
    expect(blocked.sprint).toBe(initial);

    const first = completeCurrentSprintDay(fillCurrentDay(initial), NOW);
    expect(first.result).toEqual({ ok: true, errors: [] });
    expect(first.sprint.currentDay).toBe(2);
    expect(first.sprint.status).toBe("active");
    expect(first.sprint.days[0]?.completedAt).toBe(NOW.toISOString());
  });
});

describe("Forge Sprint Day 6 Proof Lab", () => {
  it("requires a learner no-AI declaration and all inspectable-proof requirements", () => {
    const atProofLab = completeThroughDayFive();
    expect(atProofLab.currentDay).toBe(6);

    const assistedOrUncertain = fillProofLab(atProofLab, "ai_used_or_unsure");
    const validation = validateDayCompletion(assistedOrUncertain);
    expect(validation).toMatchObject({
      ok: false,
      errors: expect.arrayContaining(["Declare whether AI was absent from the protected Proof Lab work."]),
    });
    expect(completeCurrentSprintDay(assistedOrUncertain, NOW).sprint).toBe(assistedOrUncertain);

    const declared = fillProofLab(atProofLab, "learner_declares_no_ai");
    const completed = completeCurrentSprintDay(declared, NOW);
    expect(completed.result).toEqual({ ok: true, errors: [] });
    expect(completed.sprint.currentDay).toBe(7);
    expect(completed.sprint.proofLab.status).toBe("self_declared");
    expect(completed.sprint.days[5]?.completedAt).toBe(NOW.toISOString());
  });
});

describe("Forge Sprint Day 7", () => {
  it("requires shipped work, reflection, and an open question before completing the sprint", () => {
    const afterProofLab = completeCurrentSprintDay(
      fillProofLab(completeThroughDayFive(), "learner_declares_no_ai"),
      NOW,
    ).sprint;
    const missingSummary = validateDayCompletion(fillCurrentDay(afterProofLab));
    expect(missingSummary).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        "List at least one inspectable thing that shipped.",
        "Reflect on what changed and what you would test next.",
        "Name at least one thing that remains open.",
      ]),
    });

    const ready = updateForgeSprint(fillCurrentDay(afterProofLab), {
      whatShipped: ["A working seat-search flow"],
      reflection: "The user test narrowed the project to a single reliable library-floor flow.",
      openQuestions: ["Will occupancy data stay current during busy periods?"],
    }, NOW);
    const completed = completeCurrentSprintDay(ready, NOW);

    expect(completed.result).toEqual({ ok: true, errors: [] });
    expect(completed.sprint.status).toBe("completed");
    expect(completed.sprint.currentDay).toBe(7);
    expect(completed.sprint.days[6]?.completedAt).toBe(NOW.toISOString());
  });
});

describe("Forge Sprint browser-local serialization", () => {
  it("round-trips a multi-sprint store without changing its persisted shape", () => {
    const first = sprint("sprint-one");
    const second = sprint("sprint-two");
    const store = addSprintToStore(addSprintToStore(createEmptyForgeSprintStore(), first), second);

    expect(parseForgeSprintStore(serializeForgeSprintStore(store))).toEqual({ store, issues: [] });
  });

  it("fails closed for malformed data while retaining any valid sibling sprint", () => {
    const valid = sprint("valid-sprint");
    const malformed = { ...sprint("bad-sprint"), title: "" };
    const parsed = parseForgeSprintStore(JSON.stringify({
      version: 1,
      revision: 9,
      sprints: [valid, malformed],
    }));

    expect(parsed.store).toMatchObject({ version: 1, revision: 9, sprints: [{ id: "valid-sprint" }] });
    expect(parsed.issues).toEqual(["One malformed local sprint was skipped."]);
    expect(parseForgeSprintStore("{ malformed json")).toMatchObject({
      store: createEmptyForgeSprintStore(),
      issues: ["Local sprint data is not valid JSON. No stored data was changed."],
    });
    expect(parseForgeSprintStore(JSON.stringify({ version: 99, revision: 0, sprints: [] }))).toMatchObject({
      store: createEmptyForgeSprintStore(),
      issues: ["This local sprint format is not supported. No stored data was changed."],
    });
  });

  it("rejects stale writes and preserves corrupt stored bytes during a read", () => {
    const storage = new FakeStorage();
    const current = addSprintToStore(createEmptyForgeSprintStore(), sprint("stored"));
    storage.values.set(FORGE_SPRINT_STORAGE_KEY, serializeForgeSprintStore(current));

    const stale = addSprintToStore(current, sprint("stale"));
    expect(() => writeForgeSprintStore(storage, stale, 0)).toThrow("stale_revision");
    expect(storage.values.get(FORGE_SPRINT_STORAGE_KEY)).toBe(serializeForgeSprintStore(current));
    expect(storage.writes).toBe(0);

    const corrupt = "{ unreadable sprint bytes";
    storage.values.set(FORGE_SPRINT_STORAGE_KEY, corrupt);
    const read = readForgeSprintStore(storage);
    expect(read.store).toEqual(createEmptyForgeSprintStore());
    expect(read.issues).toEqual(["Local sprint data is not valid JSON. No stored data was changed."]);
    expect(storage.values.get(FORGE_SPRINT_STORAGE_KEY)).toBe(corrupt);
    expect(storage.writes).toBe(0);
  });
});
