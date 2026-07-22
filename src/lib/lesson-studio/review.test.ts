import fixture from "../../../tests/fixtures/lesson-draft-response.json";
import { describe, expect, it } from "vitest";

import { compileLessonDraftPipeline } from "./pipeline.server";
import {
  applyLessonReviewDecision,
  createLessonReviewRecord,
  lessonReviewDecisionSchema,
  lessonReviewRecordSchema,
} from "./review";
import { lessonDraftSchema } from "./schema";

const policyVersionRef = `sha256:${"a".repeat(64)}` as const;
const draft = lessonDraftSchema.parse(fixture.draft);

function decision(
  record: ReturnType<typeof createLessonReviewRecord>,
  index: number,
  action: "advance" | "reject" | "withdraw" = "advance",
  sourceBindingVersionRef?: `sha256:${string}`,
) {
  return {
    decisionId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    reviewer: { id: `reviewer.person-${index}`, displayName: `Reviewer ${index}`, role: "named-human" as const },
    policyVersionRef,
    reviewedVersionRefs: {
      generation: record.versionRefs.generation,
      critique: record.versionRefs.critique,
      sourcePlan: record.versionRefs.sourcePlan,
      revision: record.versionRefs.revision,
      ...(record.versionRefs.sourceBinding ? { sourceBinding: record.versionRefs.sourceBinding } : {}),
    },
    ...(sourceBindingVersionRef ? { sourceBindingVersionRef } : {}),
    decision: action,
    rationale: "Named human reviewer recorded a bounded decision after inspecting the immutable package references.",
    decidedAt: "2026-07-22T00:00:00.000Z",
  };
}

describe("local lesson review machine", () => {
  it("requires the ordered named-human review sequence and never publishes", () => {
    let record = createLessonReviewRecord(compileLessonDraftPipeline(draft), policyVersionRef);
    record = applyLessonReviewDecision(record, decision(record, 1));
    record = applyLessonReviewDecision(record, decision(record, 2, "advance", `sha256:${"b".repeat(64)}`));
    for (let index = 3; index <= 6; index += 1) record = applyLessonReviewDecision(record, decision(record, index));

    expect(record.state).toBe("approved-package");
    expect(record.publication).toBe("not-published");
    expect(record.decisions).toHaveLength(6);
    expect(() => applyLessonReviewDecision(record, decision(record, 7))).toThrow("final-state");
  });

  it("rejects model actors, invented publication state, and proof-grading fields", () => {
    const record = createLessonReviewRecord(compileLessonDraftPipeline(draft), policyVersionRef);
    expect(lessonReviewDecisionSchema.safeParse({
      ...decision(record, 1),
      reviewer: { id: "model.provider", displayName: "Model", role: "named-human" },
    }).success).toBe(false);
    expect(lessonReviewDecisionSchema.safeParse({ ...decision(record, 1), grade: "A" }).success).toBe(false);
    expect(lessonReviewRecordSchema.safeParse({ ...record, publication: "published" }).success).toBe(false);
  });

  it("allows rejection or withdrawal from a staged review without an authority leak", () => {
    const record = createLessonReviewRecord(compileLessonDraftPipeline(draft), policyVersionRef);
    expect(applyLessonReviewDecision(record, decision(record, 1, "reject"))).toMatchObject({
      state: "rejected",
      publication: "not-published",
    });
    expect(applyLessonReviewDecision(record, decision(record, 2, "withdraw"))).toMatchObject({
      state: "withdrawn",
      publication: "not-published",
    });
  });

  it("cannot pass source-needed without a named upstream source-binding receipt", () => {
    let record = createLessonReviewRecord(compileLessonDraftPipeline(draft), policyVersionRef);
    record = applyLessonReviewDecision(record, decision(record, 1));
    expect(() => applyLessonReviewDecision(record, decision(record, 2))).toThrow("source-binding-required");
    expect(() => applyLessonReviewDecision(record, {
      ...decision(record, 3),
      policyVersionRef: `sha256:${"c".repeat(64)}`,
    })).toThrow("version-ref-mismatch");
  });
});
