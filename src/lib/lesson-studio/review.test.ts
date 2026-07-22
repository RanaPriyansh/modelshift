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
import { createSourceBindingReceipt, sourceBindingReceiptSchema } from "./source-binding";

const policyVersionRef = `sha256:${"a".repeat(64)}` as const;
const draft = lessonDraftSchema.parse(fixture.draft);

const NEXT = {
  draft: "source-needed",
  "source-needed": "factual-review",
  "factual-review": "pedagogy-review",
  "pedagogy-review": "access-review",
  "access-review": "safety-review",
  "safety-review": "proof-review",
  "proof-review": "approved-package",
} as const;

const AUTHORITY = {
  draft: { role: "review-coordinator", scope: "coordination" },
  "source-needed": { role: "source-reviewer", scope: "source" },
  "factual-review": { role: "factual-reviewer", scope: "factual" },
  "pedagogy-review": { role: "pedagogy-reviewer", scope: "pedagogy" },
  "access-review": { role: "access-reviewer", scope: "access" },
  "safety-review": { role: "safety-reviewer", scope: "safety" },
  "proof-review": { role: "proof-reviewer", scope: "proof" },
} as const;

function decisionId(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function sourceBindingsFor(sourceNeedIds: readonly string[]) {
  return sourceNeedIds.map((sourceNeedId, index) => ({
    sourceNeedIds: [sourceNeedId],
    sourcePackageId: `archive-collection-${index + 1}`,
    sourcePackageVersion: "v1",
    sourceItemId: `item-${index + 1}`,
    sourceSnapshotDigest: `sha256:${String(index + 2).repeat(64)}`,
    locatorIds: [`locator-${index + 1}`],
    claimIds: [`claim-${index + 1}`],
    rightsRecordId: `rights-${index + 1}`,
    reviewDecisionIds: [`upstream-review.source-rights-${index + 1}`],
  }));
}

function sourceReceipt(
  record: ReturnType<typeof createLessonReviewRecord>,
  sourceBindings = sourceBindingsFor(record.sourceNeedIds),
) {
  return createSourceBindingReceipt({
    receiptVersion: "1.0",
    candidateReviewVersionRef: record.versionRefs.revision,
    sourceBindings,
  });
}

function recordWithTwoSourceNeeds() {
  const pipeline = compileLessonDraftPipeline(draft);
  return createLessonReviewRecord({
    ...pipeline,
    sourcePlan: {
      ...pipeline.sourcePlan,
      items: [
        ...pipeline.sourcePlan.items,
        {
          id: "source-need-abcdef123456",
          claim: "A second exact source requirement must remain unresolved until the package covers it.",
          requiredSourceType: "Independent rights-reviewed archive item",
          disposition: "unresolved",
        },
      ],
    },
  }, policyVersionRef);
}

function decision(
  record: ReturnType<typeof createLessonReviewRecord>,
  index: number,
  action: "advance" | "reject" | "withdraw" = "advance",
) {
  const id = decisionId(index);
  const authority = AUTHORITY[record.state as keyof typeof AUTHORITY];
  const toState = action === "advance" ? NEXT[record.state as keyof typeof NEXT] : action === "reject" ? "rejected" : "withdrawn";
  const sourceBindingReceipt = record.state === "source-needed" && action === "advance" ? sourceReceipt(record) : undefined;
  return {
    decisionId: id,
    reviewer: {
      id: `reviewer.person-${index}`,
      displayName: `Reviewer ${index}`,
      ...authority,
    },
    policyVersionRef,
    reviewedVersionRefs: {
      generation: record.versionRefs.generation,
      critique: record.versionRefs.critique,
      sourcePlan: record.versionRefs.sourcePlan,
      revision: record.versionRefs.revision,
      ...(record.versionRefs.sourceBinding ? { sourceBinding: record.versionRefs.sourceBinding } : {}),
    },
    fromState: record.state,
    toState,
    ...(sourceBindingReceipt ? { sourceBindingReceipt } : {}),
    decision: action,
    rationale: "The named reviewer inspected this immutable candidate within the assigned review scope and recorded a bounded decision.",
    decidedAt: "2026-07-22T00:00:00.000Z",
    metadata: {
      conflicts: { declared: false, disclosure: null },
      dissent: { recorded: false, summary: null },
      supersedesDecisionId: null,
      sourceBindingReceiptDigest: sourceBindingReceipt?.receiptDigest ?? null,
    },
  };
}

describe("local lesson review machine", () => {
  it("requires every ADR-002 stage, including safety review, and never publishes", () => {
    let record = createLessonReviewRecord(compileLessonDraftPipeline(draft), policyVersionRef);
    for (let index = 1; index <= 7; index += 1) record = applyLessonReviewDecision(record, decision(record, index));

    expect(record.state).toBe("approved-package");
    expect(record.publication).toBe("not-published");
    expect(record.decisions.map((item) => item.reviewer.role)).toEqual([
      "review-coordinator",
      "source-reviewer",
      "factual-reviewer",
      "pedagogy-reviewer",
      "access-reviewer",
      "safety-reviewer",
      "proof-reviewer",
    ]);
    expect(() => applyLessonReviewDecision(record, record.decisions.at(-1))).toThrow("final-state");
  });

  it("binds each reviewer role and scope to the current transition instead of allowing a generic reviewer", () => {
    let record = createLessonReviewRecord(compileLessonDraftPipeline(draft), policyVersionRef);
    const coordinatorDecision = decision(record, 1);
    record = applyLessonReviewDecision(record, coordinatorDecision);
    const wrongAuthority = {
      ...decision(record, 2),
      reviewer: { ...coordinatorDecision.reviewer, id: "reviewer.person-2" },
    };
    expect(() => applyLessonReviewDecision(record, wrongAuthority)).toThrow("reviewer-authority-mismatch");
    expect(() => applyLessonReviewDecision(record, {
      ...decision(record, 3),
      toState: "proof-review",
    })).toThrow("transition-not-allowed");
  });

  it("requires exact refs, unique decisions, policy, conflict/dissent metadata, and runtime record parsing", () => {
    const record = createLessonReviewRecord(compileLessonDraftPipeline(draft), policyVersionRef);
    const first = decision(record, 1);
    const advanced = applyLessonReviewDecision(record, first);
    expect(() => applyLessonReviewDecision(advanced, decision(record, 1))).toThrow("duplicate-decision");
    expect(() => applyLessonReviewDecision(record, {
      ...first,
      policyVersionRef: `sha256:${"c".repeat(64)}`,
    })).toThrow("version-ref-mismatch");
    expect(() => applyLessonReviewDecision({ ...record, publication: "published" } as unknown, first)).toThrow();
    expect(lessonReviewDecisionSchema.safeParse({ ...first, grade: "A" }).success).toBe(false);
    expect(lessonReviewRecordSchema.safeParse({ ...record, publication: "published" }).success).toBe(false);
  });

  it("allows rejection or withdrawal only through the reviewer currently responsible for that stage", () => {
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

  it("requires a complete package that covers the exact frozen source plan and keeps upstream reviews distinct", () => {
    let record = createLessonReviewRecord(compileLessonDraftPipeline(draft), policyVersionRef);
    record = applyLessonReviewDecision(record, decision(record, 1));
    const valid = decision(record, 2);
    expect(() => applyLessonReviewDecision(record, { ...valid, sourceBindingReceipt: undefined })).toThrow("source-binding-required");
    expect(() => applyLessonReviewDecision(record, {
      ...valid,
      metadata: { ...valid.metadata, sourceBindingReceiptDigest: null },
    })).toThrow("source-binding-invalid");
    expect(sourceBindingReceiptSchema.safeParse({
      ...valid.sourceBindingReceipt,
      receiptDigest: `sha256:${"0".repeat(64)}`,
    }).success).toBe(false);
    expect(sourceBindingReceiptSchema.safeParse({
      ...valid.sourceBindingReceipt,
      sourceBindings: [{ ...valid.sourceBindingReceipt?.sourceBindings[0], rightsRecordId: "" }],
    }).success).toBe(false);
    expect(sourceBindingReceiptSchema.safeParse({
      ...valid.sourceBindingReceipt,
      sourceBindings: [{ ...valid.sourceBindingReceipt?.sourceBindings[0], claimIds: [] }],
    }).success).toBe(false);
    expect(sourceBindingReceiptSchema.safeParse({
      ...valid.sourceBindingReceipt,
      sourceBindings: [{ ...valid.sourceBindingReceipt?.sourceBindings[0], reviewDecisionIds: [] }],
    }).success).toBe(false);
    expect(sourceBindingReceiptSchema.safeParse({
      ...valid.sourceBindingReceipt,
      sourceBindings: [{ ...valid.sourceBindingReceipt?.sourceBindings[0], reviewDecisionIds: [valid.decisionId] }],
    }).success).toBe(false);
    expect(() => applyLessonReviewDecision(record, {
      ...valid,
      sourceBindingReceipt: {
        ...valid.sourceBindingReceipt,
        receiptDigest: `sha256:${"0".repeat(64)}`,
      },
    })).toThrow();
  });

  it("requires every source need exactly once across multi-item receipt bindings", () => {
    let record = recordWithTwoSourceNeeds();
    record = applyLessonReviewDecision(record, decision(record, 1));
    const valid = decision(record, 2);
    expect(valid.sourceBindingReceipt?.sourceBindings).toHaveLength(2);
    expect(applyLessonReviewDecision(record, valid).sourceBindingReceipt?.receiptDigest).toBe(valid.sourceBindingReceipt?.receiptDigest);

    const missing = sourceReceipt(record, sourceBindingsFor(record.sourceNeedIds.slice(0, 1)));
    expect(() => applyLessonReviewDecision(record, {
      ...valid,
      sourceBindingReceipt: missing,
      metadata: { ...valid.metadata, sourceBindingReceiptDigest: missing.receiptDigest },
    })).toThrow("source-binding-invalid");

    const invented = sourceReceipt(record, sourceBindingsFor([...record.sourceNeedIds, "source-need-ffffffffffff"]));
    expect(() => applyLessonReviewDecision(record, {
      ...valid,
      sourceBindingReceipt: invented,
      metadata: { ...valid.metadata, sourceBindingReceiptDigest: invented.receiptDigest },
    })).toThrow("source-binding-invalid");

    const duplicate = sourceReceipt(record, [
      ...sourceBindingsFor(record.sourceNeedIds),
      ...sourceBindingsFor([record.sourceNeedIds[0]]),
    ]);
    expect(() => applyLessonReviewDecision(record, {
      ...valid,
      sourceBindingReceipt: duplicate,
      metadata: { ...valid.metadata, sourceBindingReceiptDigest: duplicate.receiptDigest },
    })).toThrow("source-binding-invalid");
  });
});
