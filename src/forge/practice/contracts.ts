import { z } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, forgeEventDigestSchema, sha256Digest } from "../events";
import {
  verifyProjectFixtureGrant,
  type ProjectFixtureGrant,
} from "../projects/fixture-authority";

z.config({ jitless: true });

export const PRACTICE_PACKAGE_SCHEMA_VERSION = "practice-package.v1" as const;
export const TARGETED_REPAIR_ROUTE_SCHEMA_VERSION = "targeted-repair-route.v1" as const;
export const PRACTICE_ACTIVITY_MODES = ["retrieve", "compare", "apply", "rehearse", "revise"] as const;

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const codeSchema = z.string().trim().min(1).max(160).regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
const strictTimestampSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  .refine((value) => Number.isFinite(Date.parse(value)), "Use a valid millisecond-precision UTC timestamp.");

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueBy<T extends z.ZodTypeAny>(item: T, key: (entry: z.infer<T>) => string, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((entries, context) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      const identity = key(entry);
      if (seen.has(identity)) context.addIssue({ code: "custom", path: [index], message: `Duplicate identity: ${identity}` });
      seen.add(identity);
    });
  });
}

export const practiceImmutableRefSchema = z.strictObject({
  id: codeSchema,
  version: semverSchema,
  digest: forgeEventDigestSchema,
});
export type PracticeImmutableRefV1 = z.infer<typeof practiceImmutableRefSchema>;

export const practiceCapabilityRefSchema = z.strictObject({
  curriculumNodeId: z.string().trim().max(160).regex(/^curriculum-node\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  capabilityId: z.string().trim().max(160).regex(/^capability\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  capabilityVersion: semverSchema,
});
export type PracticeCapabilityRefV1 = z.infer<typeof practiceCapabilityRefSchema>;

const authoredPracticeTemplateContentSchema = z.strictObject({
  activityMode: z.enum(PRACTICE_ACTIVITY_MODES),
  learnerAction: z.string().trim().min(1).max(1_200),
  accessAlternativeRef: practiceImmutableRefSchema,
  feedbackBoundary: z.strictObject({
    autonomousScore: z.literal(false),
    autonomousMasteryClaim: z.literal(false),
    modelMayDetermineCorrectness: z.literal(false),
  }),
});

export const FIRST_PILOT_PRACTICE_TEMPLATE = deepFreeze({
  id: "practice-template.authored.foundation-rehearsal",
  version: "1.0.0",
  // SHA-256 of canonical `content`; validated again at runtime.
  digest: "sha256:2e391c46140c10b6355e79eb014e9962e66cac1d4673b7c9c300b92c7dee7234",
  practiceId: "practice.authored.foundation-rehearsal",
  content: {
    activityMode: "rehearse",
    learnerAction: "Rehearse the exact prerequisite with one new example, then explain what changed before returning to the project.",
    accessAlternativeRef: {
      id: "practice-alternative.authored.foundation-text",
      version: "1.0.0",
      digest: "sha256:9999999999999999999999999999999999999999999999999999999999999999",
    },
    feedbackBoundary: {
      autonomousScore: false,
      autonomousMasteryClaim: false,
      modelMayDetermineCorrectness: false,
    },
  },
} as const);

const INTERNAL_AUTHORED_PRACTICE_TEMPLATES: Readonly<Record<string, typeof FIRST_PILOT_PRACTICE_TEMPLATE>> = deepFreeze({
  [`${FIRST_PILOT_PRACTICE_TEMPLATE.id}@${FIRST_PILOT_PRACTICE_TEMPLATE.version}@${FIRST_PILOT_PRACTICE_TEMPLATE.digest}`]: FIRST_PILOT_PRACTICE_TEMPLATE,
});

/** Exact immutable manifest lookup; unknown id/version/digest triples have no authored status. */
export function resolveAuthoredPracticeTemplate(ref: { id: string; version: string; digest: string }): typeof FIRST_PILOT_PRACTICE_TEMPLATE | null {
  return INTERNAL_AUTHORED_PRACTICE_TEMPLATES[`${ref.id}@${ref.version}@${ref.digest}`] ?? null;
}

const practiceReviewSchema = z.strictObject({
  reviewedContentDigest: forgeEventDigestSchema,
  reviewerIdentityRef: z.string().trim().max(160).regex(/^identity\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  reviewerGrantMarker: z.string().trim().max(160).regex(/^fixture-grant\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  authorityMode: z.literal("process-local-fixture-only"),
  reviewedAt: strictTimestampSchema,
  expiresAt: strictTimestampSchema,
  scope: z.literal("targeted-practice-content-access"),
}).superRefine((review, context) => {
  if (Date.parse(review.expiresAt) <= Date.parse(review.reviewedAt)) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Practice review expiry must follow review time." });
  }
});

export const practicePackageSchema = z.strictObject({
  schemaVersion: z.literal(PRACTICE_PACKAGE_SCHEMA_VERSION),
  practiceId: z.string().trim().max(160).regex(/^practice\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  version: semverSchema,
  practiceDigest: forgeEventDigestSchema,
  authoredTemplateRef: practiceImmutableRefSchema,
  audience: z.literal("adult"),
  targetCapabilityRefs: uniqueBy(practiceCapabilityRefSchema, (entry) => capabilityKey(entry), 1, 8),
  content: authoredPracticeTemplateContentSchema,
  review: practiceReviewSchema,
});
export type PracticePackageV1 = z.infer<typeof practicePackageSchema>;
export type PracticePackageInput = Omit<PracticePackageV1, "practiceDigest"> & { practiceDigest?: string };

export const targetedRepairRouteSchema = z.strictObject({
  schemaVersion: z.literal(TARGETED_REPAIR_ROUTE_SCHEMA_VERSION),
  repairRouteId: z.string().trim().max(160).regex(/^practice-repair\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  prerequisiteCapabilityRef: practiceCapabilityRefSchema,
  practicePackageRef: practiceImmutableRefSchema,
});
export type TargetedRepairRouteV1 = z.infer<typeof targetedRepairRouteSchema>;

export type PracticeValidationIssue = Readonly<{ code: string; path: string; message: string }>;
export type PracticeValidation = Readonly<{
  practice: Readonly<PracticePackageV1> | null;
  issues: readonly PracticeValidationIssue[];
  reviewAuthority: false;
  runtimeAssignmentAllowed: false;
}>;

function capabilityKey(entry: PracticeCapabilityRefV1): string {
  return `${entry.curriculumNodeId}@${entry.capabilityId}@${entry.capabilityVersion}`;
}

function canonicalPracticeContentPayload(input: PracticePackageInput): object {
  const parsed = practicePackageSchema.parse({ ...input, practiceDigest: `sha256:${"0".repeat(64)}` });
  return {
    schemaVersion: parsed.schemaVersion,
    practiceId: parsed.practiceId,
    version: parsed.version,
    authoredTemplateRef: parsed.authoredTemplateRef,
    audience: parsed.audience,
    targetCapabilityRefs: [...parsed.targetCapabilityRefs].sort((left, right) => compare(capabilityKey(left), capabilityKey(right))),
    content: parsed.content,
  };
}

export async function practiceContentDigest(input: PracticePackageInput): Promise<string> {
  return sha256Digest(canonicalJson(canonicalPracticeContentPayload(input)));
}

export function canonicalPracticePackagePayload(input: PracticePackageInput): object {
  const parsed = practicePackageSchema.parse({ ...input, practiceDigest: `sha256:${"0".repeat(64)}` });
  const { practiceDigest: _digest, ...unsigned } = parsed;
  void _digest;
  return {
    ...unsigned,
    targetCapabilityRefs: [...unsigned.targetCapabilityRefs].sort((left, right) => compare(capabilityKey(left), capabilityKey(right))),
  };
}

export async function practicePackageDigest(input: PracticePackageInput): Promise<string> {
  return sha256Digest(canonicalJson(canonicalPracticePackagePayload(input)));
}

export async function createPracticePackage(input: PracticePackageInput): Promise<Readonly<PracticePackageV1>> {
  const parsed = practicePackageSchema.parse({ ...input, practiceDigest: `sha256:${"0".repeat(64)}` });
  const { practiceDigest: _digest, ...unsigned } = parsed;
  void _digest;
  return deepFreeze(practicePackageSchema.parse({ ...unsigned, practiceDigest: await practicePackageDigest(unsigned) }));
}

function stable(issues: readonly PracticeValidationIssue[]): readonly PracticeValidationIssue[] {
  return deepFreeze([...issues].sort((left, right) =>
    compare(left.code, right.code) || compare(left.path, right.path) || compare(left.message, right.message),
  ));
}

export async function validatePracticePackage(
  value: unknown,
  evaluationAt: string,
  grant: ProjectFixtureGrant | undefined,
): Promise<PracticeValidation> {
  const result = practicePackageSchema.safeParse(value);
  const issues: PracticeValidationIssue[] = [];
  if (!strictTimestampSchema.safeParse(evaluationAt).success) {
    issues.push({ code: "practice.evaluation-time-invalid", path: "evaluationAt", message: "Practice validation requires a strict UTC timestamp." });
  }
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({ code: `practice.schema.${issue.code}`, path: issue.path.map(String).join(".") || "root", message: issue.message });
    }
    return deepFreeze({ practice: null, issues: stable(issues), reviewAuthority: false as const, runtimeAssignmentAllowed: false as const });
  }
  const practice = result.data;
  const { practiceDigest: _digest, ...unsigned } = practice;
  void _digest;
  if (practice.practiceDigest !== await practicePackageDigest(unsigned)) {
    issues.push({ code: "practice.digest-mismatch", path: "practiceDigest", message: "Practice digest must cover the exact package." });
  }
  const manifestDigest = await sha256Digest(canonicalJson(FIRST_PILOT_PRACTICE_TEMPLATE.content));
  const authoredManifest = resolveAuthoredPracticeTemplate(practice.authoredTemplateRef);
  if (
    !authoredManifest
    || practice.practiceId !== FIRST_PILOT_PRACTICE_TEMPLATE.practiceId
    || practice.version !== FIRST_PILOT_PRACTICE_TEMPLATE.version
    || practice.authoredTemplateRef.id !== FIRST_PILOT_PRACTICE_TEMPLATE.id
    || practice.authoredTemplateRef.version !== FIRST_PILOT_PRACTICE_TEMPLATE.version
    || practice.authoredTemplateRef.digest !== FIRST_PILOT_PRACTICE_TEMPLATE.digest
    || manifestDigest !== FIRST_PILOT_PRACTICE_TEMPLATE.digest
    || canonicalJson(practice.content) !== canonicalJson(FIRST_PILOT_PRACTICE_TEMPLATE.content)
  ) {
    issues.push({ code: "practice.authored-template-mismatch", path: "content", message: "Practice must exactly match the immutable authored fixture manifest." });
  }
  const contentDigest = await practiceContentDigest(unsigned);
  if (practice.review.reviewedContentDigest !== contentDigest) {
    issues.push({ code: "practice.review-content-mismatch", path: "review.reviewedContentDigest", message: "Practice review must bind the exact practice content." });
  }
  if (
    !strictTimestampSchema.safeParse(evaluationAt).success
    || Date.parse(practice.review.reviewedAt) > Date.parse(evaluationAt)
    || Date.parse(practice.review.expiresAt) <= Date.parse(evaluationAt)
    || !verifyProjectFixtureGrant(grant, {
      grantMarker: practice.review.reviewerGrantMarker,
      scope: "practice-package-review",
      subjectRef: contentDigest,
      actorRef: practice.review.reviewerIdentityRef,
      evaluationAt,
    })
  ) {
    issues.push({ code: "practice.review-grant-not-current", path: "review", message: "Practice requires the exact current process-local fixture review grant." });
  }
  return deepFreeze({ practice, issues: stable(issues), reviewAuthority: false as const, runtimeAssignmentAllowed: false as const });
}
