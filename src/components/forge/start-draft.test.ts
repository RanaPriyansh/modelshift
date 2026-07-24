// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import {
  FORGE_START_DRAFT_KEY,
  MAX_FORGE_START_DRAFT_RAW_BYTES,
  readStartDraft,
  writeStartDraft,
} from "./start-draft";

afterEach(() => {
  window.sessionStorage.clear();
});

describe("tab-local start draft", () => {
  it("round-trips only the bounded goal and outcome fields", () => {
    expect(writeStartDraft({
      goal: "Understand equivalent ratios",
      desiredOutcome: "Resize a recipe",
    })).toBe(true);
    expect(readStartDraft()).toEqual({
      goal: "Understand equivalent ratios",
      desiredOutcome: "Resize a recipe",
    });
  });

  it("rejects oversized raw storage without rewriting learner-owned bytes", () => {
    const raw = "x".repeat(MAX_FORGE_START_DRAFT_RAW_BYTES + 1);
    window.sessionStorage.setItem(FORGE_START_DRAFT_KEY, raw);

    expect(readStartDraft()).toBeNull();
    expect(window.sessionStorage.getItem(FORGE_START_DRAFT_KEY)).toBe(raw);
  });
});
