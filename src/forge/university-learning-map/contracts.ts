import { z } from "zod";

z.config({ jitless: true });

export const UNIVERSITY_LEARNING_MAP_REQUEST_VERSION =
  "university-learning-map-request.v2" as const;
export const UNIVERSITY_LEARNING_MAP_PROJECTION_VERSION =
  "university-learning-map-projection.v2" as const;
export const UNIVERSITY_LEARNING_MAP_STATUSES = Object.freeze([
  "invalid",
  "review_required",
  "ready_for_inspection",
] as const);

export const UNIVERSITY_LEARNING_MAP_UNKNOWN_KINDS = Object.freeze([
  "outcome_coverage_unknown",
  "prerequisite_unknown",
  "attempt_disposition_unknown",
  "evidence_authority_unknown",
  "help_effect_unknown",
  "delayed_return_completion_unknown",
  "source_completeness_unknown",
] as const);

export const UNIVERSITY_LEARNING_MAP_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "ids.duplicate",
  "references.missing",
  "prerequisites.cycle",
  "outcomes.unmapped",
  "attempts.evidence_missing",
  "delayed_returns.order_invalid",
  "unknowns.explicit",
] as const);

const ref = (prefix: string) => z.string().min(3).max(120).regex(
  new RegExp(`^${prefix}\\.[a-z0-9]+(?:[._-][a-z0-9]+)*$`),
);
function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day <= daysInMonth[month - 1]!;
}

const date = z.string().refine(isCalendarDate, {
  message: "Expected a valid YYYY-MM-DD calendar date.",
});

const outcomeSchema = z.strictObject({
  outcomeRef: ref("outcome"),
  declaration: z.literal("learner_declared_unverified"),
});
const conceptSchema = z.strictObject({
  conceptRef: ref("concept"),
  outcomeRefs: z.array(ref("outcome")).min(1).max(16),
  prerequisiteConceptRefs: z.array(ref("concept")).max(16),
  prerequisiteKnowledge: z.enum(["declared", "unknown"]),
});
const evidenceSchema = z.strictObject({
  evidenceRef: ref("evidence"),
  kind: z.enum([
    "attempt_receipt",
    "learner_note_reference",
    "review_reference",
    "source_reference",
  ]),
  authority: z.literal("bounded_reference_only"),
  contentCaptured: z.literal(false),
});
const helpUseSchema = z.strictObject({
  helpRef: ref("help"),
  kind: z.enum(["ai", "human", "peer", "resource", "other"]),
  provenanceEvidenceRef: ref("evidence"),
  effect: z.literal("unknown"),
});
const attemptSchema = z.strictObject({
  attemptRef: ref("attempt"),
  conceptRefs: z.array(ref("concept")).min(1).max(16),
  attemptedOn: date,
  disposition: z.enum(["completed", "incomplete", "blocked", "unknown"]),
  evidenceRefs: z.array(ref("evidence")).max(16),
  helpUsed: z.array(helpUseSchema).max(16),
});
const delayedReturnSchema = z.strictObject({
  returnRef: ref("return"),
  sourceAttemptRef: ref("attempt"),
  conceptRefs: z.array(ref("concept")).min(1).max(16),
  dueOn: date,
  completion: z.enum(["scheduled", "due", "unknown"]),
});
const unknownSchema = z.strictObject({
  unknownRef: ref("unknown"),
  scopeRef: z.string().min(3).max(120).regex(
    /^(course|outcome|concept|attempt|evidence|help|return)\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
  ),
  kind: z.enum(UNIVERSITY_LEARNING_MAP_UNKNOWN_KINDS),
  state: z.literal("explicit"),
});

export const universityLearningMapRequestSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_LEARNING_MAP_REQUEST_VERSION),
  course: z.strictObject({
    courseRef: ref("course"),
    ownershipDeclaration: z.literal("learner_self_attested"),
    sourceAuthority: z.literal("learner_declared_unverified"),
  }),
  outcomes: z.array(outcomeSchema).min(1).max(32),
  concepts: z.array(conceptSchema).min(1).max(96),
  evidence: z.array(evidenceSchema).max(128),
  attempts: z.array(attemptSchema).max(128),
  delayedReturns: z.array(delayedReturnSchema).max(128),
  unknowns: z.array(unknownSchema).max(128),
});

export type UniversityLearningMapRequestV2 = z.infer<
  typeof universityLearningMapRequestSchema
>;
export type UniversityLearningMapStatus =
  (typeof UNIVERSITY_LEARNING_MAP_STATUSES)[number];
export type UniversityLearningMapIssueCode =
  (typeof UNIVERSITY_LEARNING_MAP_ISSUE_CODES)[number];

export interface UniversityLearningMapIssue {
  readonly code: UniversityLearningMapIssueCode;
  readonly path: string;
}

export interface UniversityLearningMapProjectionV2 {
  readonly schemaVersion: typeof UNIVERSITY_LEARNING_MAP_PROJECTION_VERSION;
  readonly status: UniversityLearningMapStatus;
  readonly map: {
    readonly course: UniversityLearningMapRequestV2["course"];
    readonly outcomes: readonly UniversityLearningMapRequestV2["outcomes"][number][];
    readonly concepts: readonly UniversityLearningMapRequestV2["concepts"][number][];
    readonly evidence: readonly UniversityLearningMapRequestV2["evidence"][number][];
    readonly attempts: readonly UniversityLearningMapRequestV2["attempts"][number][];
    readonly delayedReturns: readonly UniversityLearningMapRequestV2["delayedReturns"][number][];
    readonly unknowns: readonly UniversityLearningMapRequestV2["unknowns"][number][];
  } | null;
  readonly review: {
    readonly unmappedOutcomeRefs: readonly string[];
    readonly cyclicConceptRefs: readonly string[];
    readonly explicitUnknownCount: number;
  } | null;
  readonly authority: {
    readonly projectionClass: "learner_declared_learning_map_inspection";
    readonly masteryEstablished: false;
    readonly abilityScored: false;
    readonly diagnosisAllowed: false;
    readonly recommendationAllowed: false;
    readonly answerGenerationAllowed: false;
    readonly persistenceAllowed: false;
    readonly networkAllowed: false;
    readonly eventEmissionAllowed: false;
    readonly personalDataAllowed: false;
  };
  readonly issues: readonly UniversityLearningMapIssue[];
}
