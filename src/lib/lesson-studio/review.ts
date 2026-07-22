import { z } from "zod";

import {
  immutableVersionRefSchema,
  type LessonDraftPipeline,
} from "./schema";

export const LESSON_REVIEW_STATES = [
  "draft",
  "source-needed",
  "factual-review",
  "pedagogy-review",
  "access-review",
  "proof-review",
  "approved-package",
  "rejected",
  "withdrawn",
] as const;

export type LessonReviewState = (typeof LESSON_REVIEW_STATES)[number];

const reviewerSchema = z.strictObject({
  id: z.string().regex(/^reviewer\.[a-z0-9-]+$/),
  displayName: z.string().trim().min(2).max(120),
  role: z.literal("named-human"),
});

const reviewVersionRefsSchema = z.strictObject({
  generation: immutableVersionRefSchema,
  critique: immutableVersionRefSchema,
  sourcePlan: immutableVersionRefSchema,
  revision: immutableVersionRefSchema,
  sourceBinding: immutableVersionRefSchema.optional(),
});

export const lessonReviewDecisionSchema = z.strictObject({
  decisionId: z.string().uuid(),
  reviewer: reviewerSchema,
  policyVersionRef: immutableVersionRefSchema,
  /** The reviewer must bind the exact immutable candidate they inspected. */
  reviewedVersionRefs: reviewVersionRefsSchema,
  /** Only a named factual/source review may supply an upstream, immutable binding receipt. */
  sourceBindingVersionRef: immutableVersionRefSchema.optional(),
  decision: z.enum(["advance", "reject", "withdraw"]),
  rationale: z.string().trim().min(10).max(1_000),
  decidedAt: z.string().datetime({ offset: true }),
});

export type LessonReviewDecision = z.infer<typeof lessonReviewDecisionSchema>;

export const lessonReviewRecordSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  state: z.enum(LESSON_REVIEW_STATES),
  /** Approval is an authoring result. A separate principal-controlled event publishes Worlds. */
  publication: z.literal("not-published"),
  versionRefs: z.strictObject({
    generation: immutableVersionRefSchema,
    critique: immutableVersionRefSchema,
    sourcePlan: immutableVersionRefSchema,
    revision: immutableVersionRefSchema,
    sourceBinding: immutableVersionRefSchema.optional(),
    policy: immutableVersionRefSchema,
  }),
  decisions: z.array(lessonReviewDecisionSchema).max(8),
});

export type LessonReviewRecord = z.infer<typeof lessonReviewRecordSchema>;

export class LessonReviewTransitionError extends Error {
  constructor(public readonly code: "final-state" | "transition-not-allowed" | "version-ref-mismatch" | "source-binding-required") {
    super(code);
    this.name = "LessonReviewTransitionError";
  }
}

const ADVANCE: Readonly<Partial<Record<LessonReviewState, LessonReviewState>>> = {
  draft: "source-needed",
  "source-needed": "factual-review",
  "factual-review": "pedagogy-review",
  "pedagogy-review": "access-review",
  "access-review": "proof-review",
  "proof-review": "approved-package",
};

export function createLessonReviewRecord(
  pipeline: LessonDraftPipeline,
  policyVersionRef: `sha256:${string}`,
): LessonReviewRecord {
  return {
    schemaVersion: "1.0",
    state: "draft",
    publication: "not-published",
    versionRefs: {
      generation: pipeline.generation.versionRef,
      critique: pipeline.critique.versionRef,
      sourcePlan: pipeline.sourcePlan.versionRef,
      revision: pipeline.revision.versionRef,
      policy: policyVersionRef,
    },
    decisions: [],
  };
}

/** A pure, local/staged transition. It writes nowhere and cannot publish or grade proof. */
export function applyLessonReviewDecision(
  record: LessonReviewRecord,
  candidate: unknown,
): LessonReviewRecord {
  const decision = lessonReviewDecisionSchema.parse(candidate);
  if (["approved-package", "rejected", "withdrawn"].includes(record.state)) {
    throw new LessonReviewTransitionError("final-state");
  }
  const currentRefs = {
    generation: record.versionRefs.generation,
    critique: record.versionRefs.critique,
    sourcePlan: record.versionRefs.sourcePlan,
    revision: record.versionRefs.revision,
    ...(record.versionRefs.sourceBinding ? { sourceBinding: record.versionRefs.sourceBinding } : {}),
  };
  if (
    decision.policyVersionRef !== record.versionRefs.policy
    || JSON.stringify(decision.reviewedVersionRefs) !== JSON.stringify(currentRefs)
  ) {
    throw new LessonReviewTransitionError("version-ref-mismatch");
  }

  let nextState: LessonReviewState;
  if (decision.decision === "reject") nextState = "rejected";
  else if (decision.decision === "withdraw") nextState = "withdrawn";
  else {
    nextState = ADVANCE[record.state] ?? (() => { throw new LessonReviewTransitionError("transition-not-allowed"); })();
  }
  if (record.state === "source-needed" && decision.decision === "advance" && !decision.sourceBindingVersionRef) {
    throw new LessonReviewTransitionError("source-binding-required");
  }
  if (record.state !== "source-needed" && decision.sourceBindingVersionRef) {
    throw new LessonReviewTransitionError("version-ref-mismatch");
  }

  return lessonReviewRecordSchema.parse({
    ...record,
    state: nextState,
    versionRefs: decision.sourceBindingVersionRef
      ? { ...record.versionRefs, sourceBinding: decision.sourceBindingVersionRef }
      : record.versionRefs,
    decisions: [...record.decisions, decision],
  });
}
