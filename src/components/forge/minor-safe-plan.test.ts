import { describe, expect, it } from "vitest";

import type { ForgePlanRequest } from "@/src/lib/forge-planner";
import {
  MINOR_PLANNER_PRACTICAL_OUTCOME,
  MINOR_PLANNER_STARTING_POINT,
  MINOR_PLANNER_SUCCESS_SHAPE,
} from "@/src/lib/forge-planner";

import {
  canonicalMinorTopicQuestion,
  localMinorExploratoryPlan,
  minorSafePlannerRequest,
} from "./minor-safe-plan";

const teenRequest: ForgePlanRequest = {
  question: "My private wording about velocity and friction",
  ageMode: "teen",
  depth: "standard",
  startingPoint: "This is private current knowledge.",
  successShape: "This is a private success description.",
  currentKnowledge: "This is private prior knowledge.",
  practicalOutcome: "This is a private desired outcome.",
  timeAvailable: "45_min",
  modalityNeeds: ["text", "visual"],
  constraints: "This is a private access note.",
  guardianManaged: false,
  sourceMode: "curated",
};

describe("minor-safe path planning", () => {
  it.each([
    ["Why does friction change motion?", "force and motion"],
    ["How can I compare equivalent ratios?", "equivalent ratios"],
    ["How should I learn with generative AI?", "learning with ai"],
    ["How do I reason from a primary source?", "primary source reasoning"],
  ])("maps one reviewed topic on-device: %s", (learnerWords, expected) => {
    expect(canonicalMinorTopicQuestion(learnerWords)).toBe(expected);
  });

  it("refuses ambiguous or unmatched wording instead of guessing a reviewed World", () => {
    expect(canonicalMinorTopicQuestion("Compare force and ratios")).toBeNull();
    expect(canonicalMinorTopicQuestion("Teach me pottery glazing")).toBeNull();
    expect(canonicalMinorTopicQuestion("   ")).toBeNull();
  });

  it("sends only a fixed topic token and routing enums for a minor", () => {
    const outbound = minorSafePlannerRequest(teenRequest, "force and motion");

    expect(outbound).toEqual({
      ...teenRequest,
      question: "force and motion",
      startingPoint: MINOR_PLANNER_STARTING_POINT,
      successShape: MINOR_PLANNER_SUCCESS_SHAPE,
      currentKnowledge: "",
      practicalOutcome: MINOR_PLANNER_PRACTICAL_OUTCOME,
      constraints: "",
      sourceMode: "authored_only",
    });
    const serialized = JSON.stringify(outbound);
    expect(serialized).not.toContain(teenRequest.question);
    expect(serialized).not.toContain(teenRequest.startingPoint);
    expect(serialized).not.toContain(teenRequest.successShape);
    expect(serialized).not.toContain(teenRequest.currentKnowledge);
    expect(serialized).not.toContain(teenRequest.practicalOutcome);
    expect(serialized).not.toContain(teenRequest.constraints);
  });

  it("keeps an unmatched minor request local and makes no lesson or model claim", () => {
    const plan = localMinorExploratoryPlan(teenRequest);

    expect(plan).toMatchObject({
      contractKind: "exploratory_source_plan",
      request: {
        ageMode: "teen",
        currentKnowledge: "",
        practicalOutcome: "",
        constraints: "",
        sourceMode: "authored_only",
      },
      route: { topicId: null, worldId: null, confidence: "no_authored_match" },
      grounding: { status: "unverified_exploratory", sourceIds: [] },
      model: { contribution: "not_used", fallbackReason: "disabled" },
    });
    expect(JSON.stringify(plan)).not.toContain(teenRequest.question);
    expect(JSON.stringify(plan)).not.toContain(teenRequest.currentKnowledge);
  });
});
