import { z } from "zod";

import { learnerOwnedGoalSchema } from "../continuity";
import { deepFreeze } from "../deep-freeze";
import { forgeEventDigestSchema } from "../events";

z.config({ jitless: true });

export const COURSE_SOURCE_REVISION_SCHEMA_VERSION = "course-source-revision.v1" as const;
export const COURSE_SOURCE_CANDIDATE_SCHEMA_VERSION = "course-source-candidate.v1" as const;
export const COURSE_SOURCE_DECISION_SCHEMA_VERSION = "course-source-decision.v1" as const;
export const COURSE_SOURCE_RECONCILIATION_SCHEMA_VERSION = "course-source-reconciliation.v1" as const;
export const COURSE_SOURCE_GOAL_CONTEXT_SCHEMA_VERSION = "course-source-goal-context.v1" as const;

const COURSE_SOURCE_INPUT_KIND_LITERALS = ["manual", "ics"] as const;
const COURSE_SOURCE_SCOPE_LITERALS = ["course_commitments", "deadlines", "assessment_policies"] as const;
const COURSE_SOURCE_COVERAGE_LITERALS = ["unknown", "partial", "declared_complete_for_source"] as const;
const COURSE_SOURCE_RETENTION_LITERALS = ["learner_device_only", "derived_fields_only"] as const;
const COURSE_SOURCE_FACT_KIND_LITERALS = [
  "course_commitment",
  "deadline",
  "assessment_assistance_policy",
] as const;

function frozenVocabulary<const T extends readonly string[]>(values: T): Readonly<T> {
  return Object.freeze([...values]) as unknown as Readonly<T>;
}

export const COURSE_SOURCE_INPUT_KINDS = frozenVocabulary(COURSE_SOURCE_INPUT_KIND_LITERALS);
export const COURSE_SOURCE_SCOPES = frozenVocabulary(COURSE_SOURCE_SCOPE_LITERALS);
export const COURSE_SOURCE_COVERAGE_STATES = frozenVocabulary(COURSE_SOURCE_COVERAGE_LITERALS);
export const COURSE_SOURCE_RETENTION_CLASSES = frozenVocabulary(COURSE_SOURCE_RETENTION_LITERALS);
export const COURSE_SOURCE_FACT_KINDS = frozenVocabulary(COURSE_SOURCE_FACT_KIND_LITERALS);

const timestampSchema = z.string().datetime({ offset: true });
const uuidSchema = z.string().uuid();
const termIdSchema = z.string().trim().max(160).regex(/^term\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const courseIdSchema = z.string().trim().max(160).regex(/^course\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const revisionIdSchema = z.string().trim().max(180).regex(/^course-source-revision\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const candidateIdSchema = z.string().trim().max(180).regex(/^course-source-candidate\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const decisionIdSchema = z.string().trim().max(180).regex(/^course-source-decision\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const claimKeySchema = z.string().trim().max(180).regex(/^course-claim\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const boundedCodeSchema = z.string().trim().max(160).regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);
const boundedTextSchema = z.string().trim().min(1).max(600);

function uniqueStrings<T extends z.ZodTypeAny>(schema: T, minimum: number, maximum: number) {
  return z.array(schema).min(minimum).max(maximum).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const key = String(value);
      if (seen.has(key)) {
        context.addIssue({ code: "custom", path: [index], message: `Duplicate value: ${key}` });
      }
      seen.add(key);
    });
  });
}

function uniqueById<T extends z.ZodTypeAny>(
  schema: T,
  id: (value: z.infer<T>) => string,
  maximum: number,
) {
  return z.array(schema).max(maximum).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const key = id(value);
      if (seen.has(key)) {
        context.addIssue({ code: "custom", path: [index], message: `Duplicate identifier: ${key}` });
      }
      seen.add(key);
    });
  });
}

export const courseSourceScopeSchema = z.strictObject({
  ownerUserId: uuidSchema,
  tenantId: uuidSchema,
  termId: termIdSchema,
  courseId: courseIdSchema,
});
export type CourseSourceScopeV1 = z.infer<typeof courseSourceScopeSchema>;

const coverageWindowSchema = z.strictObject({
  startsAt: timestampSchema,
  endsAt: timestampSchema,
}).superRefine((window, context) => {
  if (Date.parse(window.endsAt) < Date.parse(window.startsAt)) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "Coverage must not end before it starts." });
  }
});

export const courseSourceCoverageDeclarationSchema = z.strictObject({
  status: z.enum(COURSE_SOURCE_COVERAGE_LITERALS),
  window: coverageWindowSchema,
  inspectedScopes: uniqueStrings(z.enum(COURSE_SOURCE_SCOPE_LITERALS), 0, COURSE_SOURCE_SCOPE_LITERALS.length),
  unknownOrOmittedScopes: uniqueStrings(z.enum(COURSE_SOURCE_SCOPE_LITERALS), 0, COURSE_SOURCE_SCOPE_LITERALS.length),
}).superRefine((coverage, context) => {
  const inspected = new Set(coverage.inspectedScopes);
  coverage.unknownOrOmittedScopes.forEach((scope, index) => {
    if (inspected.has(scope)) {
      context.addIssue({
        code: "custom",
        path: ["unknownOrOmittedScopes", index],
        message: "A scope cannot be both inspected and unknown or omitted.",
      });
    }
  });
  if (coverage.status === "declared_complete_for_source" && coverage.unknownOrOmittedScopes.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "A source with omitted scopes cannot be declared complete for that source.",
    });
  }
  if (coverage.status === "declared_complete_for_source" && coverage.inspectedScopes.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["inspectedScopes"],
      message: "Declared source coverage must include an inspected scope.",
    });
  }
  if (
    coverage.status === "partial"
    && (coverage.inspectedScopes.length === 0 || coverage.unknownOrOmittedScopes.length === 0)
  ) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "Partial coverage requires both an inspected scope and an unknown or omitted scope.",
    });
  }
  if (coverage.status === "unknown" && coverage.unknownOrOmittedScopes.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["unknownOrOmittedScopes"],
      message: "Unknown coverage must name at least one unknown or omitted scope.",
    });
  }
});
export type CourseSourceCoverageDeclarationV1 = z.infer<typeof courseSourceCoverageDeclarationSchema>;

export const courseSourceRevisionSchema = z.strictObject({
  schemaVersion: z.literal(COURSE_SOURCE_REVISION_SCHEMA_VERSION),
  revisionId: revisionIdSchema,
  scope: courseSourceScopeSchema,
  inputKind: z.enum(COURSE_SOURCE_INPUT_KIND_LITERALS),
  sourceLabel: z.string().trim().min(1).max(240),
  sourceDigest: forgeEventDigestSchema,
  observedAt: timestampSchema,
  freshnessReviewDueAt: timestampSchema.nullable(),
  coverage: courseSourceCoverageDeclarationSchema,
  privacy: z.strictObject({
    visibility: z.literal("private_to_owner"),
    retentionClass: z.enum(COURSE_SOURCE_RETENTION_LITERALS),
    originalBytesRetained: z.literal(false),
    redistributionAllowed: z.literal(false),
  }),
}).superRefine((revision, context) => {
  if (
    revision.freshnessReviewDueAt !== null
    && Date.parse(revision.freshnessReviewDueAt) <= Date.parse(revision.observedAt)
  ) {
    context.addIssue({
      code: "custom",
      path: ["freshnessReviewDueAt"],
      message: "A freshness review must be due after the source was observed.",
    });
  }
});
export type CourseSourceRevisionV1 = z.infer<typeof courseSourceRevisionSchema>;

export const courseSourceLocatorSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("manual_field"),
    fieldKey: boundedCodeSchema,
  }),
  z.strictObject({
    kind: z.literal("ics_component"),
    uid: z.string().trim().min(1).max(320),
    propertyName: z.enum(["DTSTART", "DTEND", "DUE", "SUMMARY", "DESCRIPTION"]),
  }),
]);
export type CourseSourceLocatorV1 = z.infer<typeof courseSourceLocatorSchema>;

const courseCommitmentFactSchema = z.strictObject({
  kind: z.literal("course_commitment"),
  title: boundedTextSchema,
  startsAt: timestampSchema,
  endsAt: timestampSchema,
  timeZone: z.string().trim().min(1).max(120),
  commitmentClass: z.enum(["class", "lab", "seminar", "office_hours", "other"]),
}).superRefine((fact, context) => {
  if (Date.parse(fact.endsAt) <= Date.parse(fact.startsAt)) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "A commitment must end after it starts." });
  }
});

const deadlineFactSchema = z.strictObject({
  kind: z.literal("deadline"),
  title: boundedTextSchema,
  dueAt: timestampSchema,
  timeZone: z.string().trim().min(1).max(120),
  consequenceClass: z.enum(["routine", "consequential", "unknown"]),
});

const assessmentPolicyFactSchema = z.strictObject({
  kind: z.literal("assessment_assistance_policy"),
  assessmentRef: boundedCodeSchema,
  statementSummary: boundedTextSchema,
  assertedAssistance: z.enum(["allowed", "ask_instructor", "practice_only", "forbidden", "unknown"]),
});

export const courseSourceFactSchema = z.discriminatedUnion("kind", [
  courseCommitmentFactSchema,
  deadlineFactSchema,
  assessmentPolicyFactSchema,
]);
export type CourseSourceFactV1 = z.infer<typeof courseSourceFactSchema>;

export const courseSourceCandidateSchema = z.strictObject({
  schemaVersion: z.literal(COURSE_SOURCE_CANDIDATE_SCHEMA_VERSION),
  candidateId: candidateIdSchema,
  scope: courseSourceScopeSchema,
  sourceRevisionId: revisionIdSchema,
  claimKey: claimKeySchema,
  locator: courseSourceLocatorSchema,
  extractedBy: z.enum(["learner_manual", "deterministic_ics_parser"]),
  fact: courseSourceFactSchema,
  createdAt: timestampSchema,
});
export type CourseSourceCandidateV1 = z.infer<typeof courseSourceCandidateSchema>;

const courseSourceDecisionBase = {
  schemaVersion: z.literal(COURSE_SOURCE_DECISION_SCHEMA_VERSION),
  decisionId: decisionIdSchema,
  candidateId: candidateIdSchema,
  scope: courseSourceScopeSchema,
  actor: z.literal("learner"),
  decidedAt: timestampSchema,
} as const;

export const courseSourceDecisionSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...courseSourceDecisionBase,
    kind: z.literal("accept"),
    extractionMatch: z.literal("learner_confirmed"),
  }),
  z.strictObject({
    ...courseSourceDecisionBase,
    kind: z.literal("correct"),
    extractionMatch: z.literal("learner_corrected"),
    correctedFact: courseSourceFactSchema,
    correctionReasonCode: boundedCodeSchema,
  }),
  z.strictObject({
    ...courseSourceDecisionBase,
    kind: z.literal("reject"),
    extractionMatch: z.literal("learner_rejected"),
    rejectionReasonCode: boundedCodeSchema.optional(),
  }),
]);
export type CourseSourceDecisionV1 = z.infer<typeof courseSourceDecisionSchema>;

export const courseSourceReconciliationRequestSchema = z.strictObject({
  schemaVersion: z.literal(COURSE_SOURCE_RECONCILIATION_SCHEMA_VERSION),
  scope: courseSourceScopeSchema,
  asOf: timestampSchema,
  sourceRevisions: uniqueById(courseSourceRevisionSchema, (revision) => revision.revisionId, 32).min(1),
  candidates: uniqueById(courseSourceCandidateSchema, (candidate) => candidate.candidateId, 512),
  decisions: uniqueById(courseSourceDecisionSchema, (decision) => decision.decisionId, 512),
});
export type CourseSourceReconciliationRequestV1 = z.infer<typeof courseSourceReconciliationRequestSchema>;

/**
 * Reuse the existing continuity identity and storage vocabulary without
 * accepting learner words or private notes at this boundary.
 */
export const courseSourceGoalRefSchema = learnerOwnedGoalSchema.pick({
  schemaVersion: true,
  goalId: true,
  storageClass: true,
});
export type CourseSourceGoalRefV1 = z.infer<typeof courseSourceGoalRefSchema>;

export function parseCourseSourceRevision(value: unknown): Readonly<CourseSourceRevisionV1> {
  return deepFreeze(courseSourceRevisionSchema.parse(value));
}

export function parseCourseSourceCandidate(value: unknown): Readonly<CourseSourceCandidateV1> {
  return deepFreeze(courseSourceCandidateSchema.parse(value));
}

export function parseCourseSourceDecision(value: unknown): Readonly<CourseSourceDecisionV1> {
  return deepFreeze(courseSourceDecisionSchema.parse(value));
}

export function parseCourseSourceReconciliationRequest(
  value: unknown,
): Readonly<CourseSourceReconciliationRequestV1> {
  return deepFreeze(courseSourceReconciliationRequestSchema.parse(value));
}
