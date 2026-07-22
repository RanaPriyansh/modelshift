import { z } from "zod";

import {
  immutableVersionRefSchema,
  type LessonDraftPipeline,
} from "./schema";
import { sourceBindingReceiptSchema, type SourceBindingReceipt } from "./source-binding";

/** ADR-002's `safety_review` is represented locally as `safety-review`. */
export const LESSON_REVIEW_STATES = [
  "draft",
  "source-needed",
  "factual-review",
  "pedagogy-review",
  "access-review",
  "safety-review",
  "proof-review",
  "approved-package",
  "rejected",
  "withdrawn",
] as const;

export type LessonReviewState = (typeof LESSON_REVIEW_STATES)[number];

const reviewerRoleSchema = z.enum([
  "source-reviewer",
  "factual-reviewer",
  "pedagogy-reviewer",
  "access-reviewer",
  "safety-reviewer",
  "proof-reviewer",
  "review-coordinator",
]);

const reviewScopeSchema = z.enum(["source", "factual", "pedagogy", "access", "safety", "proof", "coordination"]);

const reviewerSchema = z.strictObject({
  id: z.string().regex(/^reviewer\.[a-z0-9-]+$/),
  displayName: z.string().trim().min(2).max(120),
  role: reviewerRoleSchema,
  scope: reviewScopeSchema,
});

const reviewVersionRefsSchema = z.strictObject({
  generation: immutableVersionRefSchema,
  critique: immutableVersionRefSchema,
  sourcePlan: immutableVersionRefSchema,
  revision: immutableVersionRefSchema,
  sourceBinding: immutableVersionRefSchema.optional(),
  policy: immutableVersionRefSchema,
});

const draftSeedVersionRefsSchema = reviewVersionRefsSchema.omit({ sourceBinding: true });
const sourceNeedIdsSchema = z.array(z.string().regex(/^source-need-[a-f0-9]{12}$/)).min(1).max(6).superRefine((value, context) => {
  if (new Set(value).size !== value.length) {
    context.addIssue({ code: "custom", message: "Source-need IDs must be unique." });
  }
});

const reviewDraftSeedSchema = z.strictObject({
  /** Immutable package references before any source-binding transition. */
  versionRefs: draftSeedVersionRefsSchema,
  /** Exact unresolved source-plan IDs frozen with the immutable candidate. */
  sourceNeedIds: sourceNeedIdsSchema,
});

const reviewedVersionRefsSchema = reviewVersionRefsSchema.omit({ policy: true });

const reviewMetadataSchema = z.strictObject({
  conflicts: z.strictObject({
    declared: z.boolean(),
    disclosure: z.string().trim().min(2).max(1_000).nullable(),
  }).superRefine((value, context) => {
    if (value.declared !== (value.disclosure !== null)) {
      context.addIssue({ code: "custom", message: "Conflict disclosure must match its declared state." });
    }
  }),
  dissent: z.strictObject({
    recorded: z.boolean(),
    summary: z.string().trim().min(2).max(1_000).nullable(),
  }).superRefine((value, context) => {
    if (value.recorded !== (value.summary !== null)) {
      context.addIssue({ code: "custom", message: "Dissent summary must match its recorded state." });
    }
  }),
  /** This append-only local machine records no replacement decisions; must be explicit null. */
  supersedesDecisionId: z.string().uuid().nullable(),
  /** The current source-review decision binds this exact package receipt digest. */
  sourceBindingReceiptDigest: immutableVersionRefSchema.nullable(),
});

export const lessonReviewDecisionSchema = z.strictObject({
  decisionId: z.string().uuid(),
  reviewer: reviewerSchema,
  policyVersionRef: immutableVersionRefSchema,
  /** The complete, immutable candidate inspected by this reviewer. */
  reviewedVersionRefs: reviewedVersionRefsSchema,
  /** Declared states are checked against the live replay state and policy transition. */
  fromState: z.enum(LESSON_REVIEW_STATES),
  toState: z.enum(LESSON_REVIEW_STATES),
  /** Required only while resolving `source-needed`; a digest alone is never a receipt. */
  sourceBindingReceipt: sourceBindingReceiptSchema.optional(),
  decision: z.enum(["advance", "reject", "withdraw"]),
  rationale: z.string().trim().min(10).max(1_000),
  decidedAt: z.string().datetime({ offset: true }),
  metadata: reviewMetadataSchema,
});

export type LessonReviewDecision = z.infer<typeof lessonReviewDecisionSchema>;

const lessonReviewRecordShapeSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  /** Derived only by replaying decisions from draftSeed. */
  state: z.enum(LESSON_REVIEW_STATES),
  /** Approval is an authoring result. A separate principal-controlled event publishes Worlds. */
  publication: z.literal("not-published"),
  draftSeed: reviewDraftSeedSchema,
  /** Materialized replay refs; cannot diverge from draftSeed + decisions. */
  versionRefs: reviewVersionRefsSchema,
  sourceBindingReceipt: sourceBindingReceiptSchema.optional(),
  decisions: z.array(lessonReviewDecisionSchema).max(16),
});

export type LessonReviewRecord = z.infer<typeof lessonReviewRecordShapeSchema>;

export class LessonReviewTransitionError extends Error {
  constructor(public readonly code:
    | "final-state"
    | "transition-not-allowed"
    | "version-ref-mismatch"
    | "source-binding-required"
    | "source-binding-invalid"
    | "reviewer-authority-mismatch"
    | "duplicate-decision"
    | "invalid-supersession") {
    super(code);
    this.name = "LessonReviewTransitionError";
  }
}

const ADVANCE: Readonly<Partial<Record<LessonReviewState, LessonReviewState>>> = {
  draft: "source-needed",
  "source-needed": "factual-review",
  "factual-review": "pedagogy-review",
  "pedagogy-review": "access-review",
  "access-review": "safety-review",
  "safety-review": "proof-review",
  "proof-review": "approved-package",
};

const REQUIRED_AUTHORITY: Readonly<Partial<Record<LessonReviewState, { role: z.infer<typeof reviewerRoleSchema>; scope: z.infer<typeof reviewScopeSchema> }>>> = {
  draft: { role: "review-coordinator", scope: "coordination" },
  "source-needed": { role: "source-reviewer", scope: "source" },
  "factual-review": { role: "factual-reviewer", scope: "factual" },
  "pedagogy-review": { role: "pedagogy-reviewer", scope: "pedagogy" },
  "access-review": { role: "access-reviewer", scope: "access" },
  "safety-review": { role: "safety-reviewer", scope: "safety" },
  "proof-review": { role: "proof-reviewer", scope: "proof" },
};

function refsMatch(left: z.infer<typeof reviewVersionRefsSchema>, right: z.infer<typeof reviewVersionRefsSchema>): boolean {
  return left.generation === right.generation
    && left.critique === right.critique
    && left.sourcePlan === right.sourcePlan
    && left.revision === right.revision
    && left.sourceBinding === right.sourceBinding
    && left.policy === right.policy;
}

function receiptMatches(left: SourceBindingReceipt | undefined, right: SourceBindingReceipt | undefined): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function expectedToState(record: LessonReviewRecord, decision: LessonReviewDecision): LessonReviewState {
  if (decision.decision === "reject") return "rejected";
  if (decision.decision === "withdraw") return "withdrawn";
  const next = ADVANCE[record.state];
  if (!next) throw new LessonReviewTransitionError("transition-not-allowed");
  return next;
}

function validateAuthority(record: LessonReviewRecord, decision: LessonReviewDecision) {
  const required = REQUIRED_AUTHORITY[record.state];
  if (!required || decision.reviewer.role !== required.role || decision.reviewer.scope !== required.scope) {
    throw new LessonReviewTransitionError("reviewer-authority-mismatch");
  }
}

function validateSourceBinding(record: LessonReviewRecord, decision: LessonReviewDecision): SourceBindingReceipt | undefined {
  if (record.state !== "source-needed") {
    if (decision.sourceBindingReceipt || decision.metadata.sourceBindingReceiptDigest) throw new LessonReviewTransitionError("source-binding-invalid");
    return undefined;
  }
  if (decision.decision !== "advance") {
    if (decision.sourceBindingReceipt || decision.metadata.sourceBindingReceiptDigest) throw new LessonReviewTransitionError("source-binding-invalid");
    return undefined;
  }
  if (!decision.sourceBindingReceipt) throw new LessonReviewTransitionError("source-binding-required");
  const receipt = sourceBindingReceiptSchema.parse(decision.sourceBindingReceipt);
  const resolvedSourceNeedIds = receipt.sourceBindings.flatMap((binding) => binding.sourceNeedIds);
  const exactPlan = new Set(record.draftSeed.sourceNeedIds);
  if (receipt.candidateReviewVersionRef !== record.draftSeed.versionRefs.revision
    || decision.metadata.sourceBindingReceiptDigest !== receipt.receiptDigest
    || resolvedSourceNeedIds.length !== exactPlan.size
    || new Set(resolvedSourceNeedIds).size !== resolvedSourceNeedIds.length
    || resolvedSourceNeedIds.some((id) => !exactPlan.has(id))) {
    throw new LessonReviewTransitionError("source-binding-invalid");
  }
  return receipt;
}

/**
 * Applies one already-parsed decision to an already-validated replay state.
 * It intentionally does not call the public record schema so record replay is
 * acyclic and can itself be used as the schema invariant.
 */
function applyParsedLessonReviewDecision(record: LessonReviewRecord, decision: LessonReviewDecision): LessonReviewRecord {
  if (["approved-package", "rejected", "withdrawn"].includes(record.state)) {
    throw new LessonReviewTransitionError("final-state");
  }
  if (record.decisions.some((existing) => existing.decisionId === decision.decisionId)) {
    throw new LessonReviewTransitionError("duplicate-decision");
  }
  // Local decisions are append-only. A replacement requires a future explicit
  // new-version contract, so arbitrary same- or cross-scope supersession fails.
  if (decision.metadata.supersedesDecisionId !== null) {
    throw new LessonReviewTransitionError("invalid-supersession");
  }
  if (decision.policyVersionRef !== record.versionRefs.policy || !refsMatch({ ...decision.reviewedVersionRefs, policy: decision.policyVersionRef }, record.versionRefs)) {
    throw new LessonReviewTransitionError("version-ref-mismatch");
  }
  const toState = expectedToState(record, decision);
  if (decision.fromState !== record.state || decision.toState !== toState) {
    throw new LessonReviewTransitionError("transition-not-allowed");
  }
  validateAuthority(record, decision);
  const sourceBindingReceipt = validateSourceBinding(record, decision);

  return {
    ...record,
    state: toState,
    versionRefs: sourceBindingReceipt
      ? { ...record.versionRefs, sourceBinding: sourceBindingReceipt.receiptDigest }
      : record.versionRefs,
    ...(sourceBindingReceipt ? { sourceBindingReceipt } : {}),
    decisions: [...record.decisions, decision],
  };
}

function replayReviewRecord(record: LessonReviewRecord): LessonReviewRecord {
  let replay: LessonReviewRecord = {
    schemaVersion: "1.0",
    state: "draft",
    publication: "not-published",
    draftSeed: record.draftSeed,
    versionRefs: record.draftSeed.versionRefs,
    decisions: [],
  };
  for (const decision of record.decisions) {
    replay = applyParsedLessonReviewDecision(replay, decision);
  }
  return replay;
}

/**
 * Ensures a persisted projection is exactly the deterministic result of its
 * immutable draft seed and ordered decisions. It validates local completeness
 * only; no source authenticity, durability, or publication authority exists.
 */
export const lessonReviewRecordSchema = lessonReviewRecordShapeSchema.superRefine((record, context) => {
  try {
    const replayed = replayReviewRecord(record);
    if (record.state !== replayed.state) {
      context.addIssue({ code: "custom", path: ["state"], message: "State must equal deterministic decision replay." });
    }
    if (record.publication !== replayed.publication) {
      context.addIssue({ code: "custom", path: ["publication"], message: "Publication must equal deterministic decision replay." });
    }
    if (!refsMatch(record.versionRefs, replayed.versionRefs)) {
      context.addIssue({ code: "custom", path: ["versionRefs"], message: "Version refs must equal deterministic decision replay." });
    }
    if (!receiptMatches(record.sourceBindingReceipt, replayed.sourceBindingReceipt)) {
      context.addIssue({ code: "custom", path: ["sourceBindingReceipt"], message: "Source binding receipt must equal deterministic decision replay." });
    }
  } catch (error) {
    const reason = error instanceof LessonReviewTransitionError ? error.code : "invalid-decision-history";
    context.addIssue({ code: "custom", path: ["decisions"], message: `Decision history cannot replay: ${reason}.` });
  }
});

export function createLessonReviewRecord(
  pipeline: LessonDraftPipeline,
  policyVersionRef: `sha256:${string}`,
): LessonReviewRecord {
  const draftSeed = {
    versionRefs: {
      generation: pipeline.generation.versionRef,
      critique: pipeline.critique.versionRef,
      sourcePlan: pipeline.sourcePlan.versionRef,
      revision: pipeline.revision.versionRef,
      policy: policyVersionRef,
    },
    sourceNeedIds: pipeline.sourcePlan.items.map((item) => item.id),
  };
  return lessonReviewRecordSchema.parse({
    schemaVersion: "1.0",
    state: "draft",
    publication: "not-published",
    draftSeed,
    versionRefs: draftSeed.versionRefs,
    decisions: [],
  });
}

/** A pure, local/staged transition. It writes nowhere and cannot publish or grade proof. */
export function applyLessonReviewDecision(
  recordCandidate: unknown,
  decisionCandidate: unknown,
): LessonReviewRecord {
  // Parse the persisted candidate through deterministic replay before accepting a new transition.
  const record = lessonReviewRecordSchema.parse(recordCandidate);
  const decision = lessonReviewDecisionSchema.parse(decisionCandidate);
  return lessonReviewRecordSchema.parse(applyParsedLessonReviewDecision(record, decision));
}
