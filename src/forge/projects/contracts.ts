import { z } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, forgeEventDigestSchema, sha256Digest } from "../events";
import {
  practiceCapabilityRefSchema,
  practiceImmutableRefSchema,
  targetedRepairRouteSchema,
} from "../practice/contracts";

z.config({ jitless: true });

export const PRACTICAL_PROJECT_SCHEMA_VERSION = "practical-project.v1" as const;
export const PRACTICAL_PROJECT_ATTEMPT_SCHEMA_VERSION = "practical-project-attempt.v1" as const;
export const PROJECT_COMPLETION_EVENT_SCHEMA_VERSION = "project-completion-event.v1" as const;
export const DELAYED_RETURN_SCHEDULE_SCHEMA_VERSION = "delayed-return-schedule.v1" as const;
export const DELAYED_RETURN_EVENT_SCHEMA_VERSION = "delayed-return-event.v1" as const;

export const PRACTICAL_PROJECT_MODES = [
  "build", "investigate", "repair", "design", "explain", "perform", "contribute",
] as const;
export const PROJECT_CONTRIBUTION_KINDS = ["learner", "collaborator", "ai", "reused"] as const;
export const PROJECT_HAZARD_CODES = [
  "unknown-material", "electrical", "chemical", "biological", "medical", "food-safety",
  "weapons", "power-tool", "height", "fire", "vehicle", "self-harm",
] as const;
export const PROJECT_MATERIAL_CLASSES = [
  "none", "paper", "writing-instrument", "computer", "common-household",
  "unknown", "electrical", "chemical", "biological", "medical", "food-safety",
  "weapons", "power-tool", "height", "fire", "vehicle", "self-harm",
] as const;

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const codeSchema = z.string().trim().min(1).max(160).regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
const projectIdSchema = z.string().trim().max(160).regex(/^project\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const artifactIdSchema = z.string().trim().max(160).regex(/^artifact\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const milestoneIdSchema = z.string().trim().max(160).regex(/^milestone\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const operationIdSchema = z.string().trim().max(160).regex(/^operation\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const contributionIdSchema = z.string().trim().max(160).regex(/^contribution\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const submissionIdSchema = z.string().trim().max(160).regex(/^submission\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const scheduleIdSchema = z.string().trim().max(160).regex(/^return-schedule\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const identityRefSchema = z.string().trim().max(160).regex(/^identity\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const fixtureGrantMarkerSchema = z.string().trim().max(160).regex(/^fixture-grant\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

export const strictProjectTimestampSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  .refine((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
  }, "Use a valid canonical millisecond-precision UTC timestamp.");

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

function uniqueStrings<T extends z.ZodType<string>>(item: T, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((entries, context) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry)) context.addIssue({ code: "custom", path: [index], message: `Duplicate value: ${entry}` });
      seen.add(entry);
    });
  });
}

const materialSchema = z.strictObject({
  materialId: z.string().trim().max(160).regex(/^material\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  learnerVisibleLabel: z.string().trim().min(1).max(240),
  materialClass: z.enum(PROJECT_MATERIAL_CLASSES),
  hazardCodes: uniqueStrings(z.enum(PROJECT_HAZARD_CODES), 0, PROJECT_HAZARD_CODES.length),
  procurement: z.enum(["already-available", "common-entitlement", "provided", "unknown"]),
  required: z.boolean(),
});

const materialSubstitutionSchema = z.strictObject({
  originalMaterialId: z.string().trim().max(160).regex(/^material\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  substituteLabel: z.string().trim().min(1).max(240),
  substituteMaterialClass: z.enum(PROJECT_MATERIAL_CLASSES),
  substituteHazardCodes: uniqueStrings(z.enum(PROJECT_HAZARD_CODES), 0, PROJECT_HAZARD_CODES.length),
  preservesConstruct: z.literal(true),
});

const artifactRequirementSchema = z.strictObject({
  artifactId: artifactIdSchema,
  learnerVisibleDescription: z.string().trim().min(1).max(1_200),
  acceptedFormats: uniqueStrings(z.enum(["text", "image", "audio", "video", "table", "link", "physical-description"]), 1, 7),
  provenanceFields: z.tuple([
    z.literal("creator"),
    z.literal("created-at"),
    z.literal("contribution-ids"),
    z.literal("source-refs"),
    z.literal("revision-history"),
  ]),
});

const milestoneSchema = z.strictObject({
  milestoneId: milestoneIdSchema,
  sequence: z.number().int().min(1).max(32),
  operationId: operationIdSchema,
  learnerAction: z.string().trim().min(1).max(1_200),
  completionArtifactIds: uniqueStrings(artifactIdSchema, 1, 16),
});

const critiqueRoleSchema = z.strictObject({
  roleId: codeSchema,
  role: z.enum(["self", "peer", "educator", "stakeholder"]),
  operationId: operationIdSchema,
  prompt: z.string().trim().min(1).max(1_200),
  required: z.boolean(),
});

const revisionRuleSchema = z.strictObject({
  ruleId: codeSchema,
  sequence: z.number().int().min(1).max(16),
  operationId: operationIdSchema,
  learnerAction: z.string().trim().min(1).max(1_200),
  requiresRevisionArtifact: z.literal(true),
});

const proofOperationTemplateSchema = z.strictObject({
  operationId: operationIdSchema,
  kind: z.enum(["individual-defence", "unfamiliar-transfer"]),
  learnerInstruction: z.string().trim().min(1).max(1_200),
  collaboratorsPermitted: z.literal(false),
  aiPermitted: z.literal(false),
  reusedWorkPermitted: z.literal(false),
});

const authoredTemplateContentSchema = z.strictObject({
  mode: z.enum(PRACTICAL_PROJECT_MODES),
  mapBindingSemantics: z.strictObject({
    practicalOutcome: z.string().trim().min(1).max(1_200),
    protectedOperationText: z.string().trim().min(1).max(1_200),
  }),
  authenticConsequence: z.strictObject({
    context: z.literal("personal-use"),
    learnerVisibleConsequence: z.string().trim().min(1).max(1_200),
    externalPublication: z.literal(false),
    externalContact: z.literal(false),
  }),
  constraints: z.strictObject({
    lowRiskOnly: z.literal(true),
    externalContactRequired: z.literal(false),
    personalDataRequired: z.literal(false),
    travelRequired: z.literal(false),
  }),
  approvedOperationIds: uniqueStrings(operationIdSchema, 1, 32),
  materials: uniqueBy(materialSchema, (entry) => entry.materialId, 0, 32),
  noCostMaterialAlternative: z.strictObject({
    alternativeRef: practiceImmutableRefSchema,
    mode: z.literal("no-cost-common-entitlement"),
    requiresPurchase: z.literal(false),
    requiresTravel: z.literal(false),
    requiresExternalAccount: z.literal(false),
    substitutions: uniqueBy(materialSubstitutionSchema, (entry) => entry.originalMaterialId, 0, 32),
  }),
  safetyControls: z.strictObject({
    supervisionLevel: z.literal("adult-self-supervised"),
    substitutions: uniqueStrings(codeSchema, 1, 32),
    stopConditions: uniqueStrings(z.string().trim().min(1).max(600), 1, 32),
    incidentResponse: z.strictObject({
      immediateAction: z.string().trim().min(1).max(600),
      recordIncident: z.literal(true),
      resumeRequiresReview: z.literal(true),
      emergencyEscalation: z.literal("follow-local-emergency-guidance"),
    }),
  }),
  milestones: uniqueBy(milestoneSchema, (entry) => entry.milestoneId, 1, 32),
  artifacts: uniqueBy(artifactRequirementSchema, (entry) => entry.artifactId, 1, 32),
  critique: z.strictObject({
    roles: uniqueBy(critiqueRoleSchema, (entry) => entry.roleId, 1, 16),
    revisionRules: uniqueBy(revisionRuleSchema, (entry) => entry.ruleId, 1, 16),
  }),
  proofOperations: uniqueBy(proofOperationTemplateSchema, (entry) => entry.operationId, 2, 2),
});

export const FIRST_PILOT_PROJECT_TEMPLATE = deepFreeze({
  id: "project-template.authored.written-explanation",
  version: "1.0.0",
  // SHA-256 of canonical `content`; independently recomputed by validation.
  digest: "sha256:bc29a41e7e74d78604e437805d63cbeaed79b53e05871a5d57d838bbf20c2869",
  projectId: "project.authored.written-explanation",
  content: {
    mode: "explain",
    mapBindingSemantics: {
      practicalOutcome: "Create and revise a bounded explanation, then defend one decision and transfer the reasoning to an unfamiliar representation.",
      protectedOperationText: "Defend and transfer the explanation without instructional assistance.",
    },
    authenticConsequence: {
      context: "personal-use",
      learnerVisibleConsequence: "Use the revised explanation to make one later evidence decision more legible to yourself.",
      externalPublication: false,
      externalContact: false,
    },
    constraints: {
      lowRiskOnly: true,
      externalContactRequired: false,
      personalDataRequired: false,
      travelRequired: false,
    },
    approvedOperationIds: [
      "operation.authored.draft",
      "operation.authored.revise",
      "operation.authored.defence",
      "operation.authored.transfer",
    ],
    materials: [
      {
        materialId: "material.paper",
        learnerVisibleLabel: "Paper",
        materialClass: "paper",
        hazardCodes: [],
        procurement: "common-entitlement",
        required: true,
      },
      {
        materialId: "material.writing-tool",
        learnerVisibleLabel: "Any writing tool",
        materialClass: "writing-instrument",
        hazardCodes: [],
        procurement: "already-available",
        required: true,
      },
    ],
    noCostMaterialAlternative: {
      alternativeRef: {
        id: "project-alternative.authored.written-explanation",
        version: "1.0.0",
        digest: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      },
      mode: "no-cost-common-entitlement",
      requiresPurchase: false,
      requiresTravel: false,
      requiresExternalAccount: false,
      substitutions: [
        {
          originalMaterialId: "material.paper",
          substituteLabel: "Reused paper",
          substituteMaterialClass: "paper",
          substituteHazardCodes: [],
          preservesConstruct: true,
        },
        {
          originalMaterialId: "material.writing-tool",
          substituteLabel: "Any already available writing tool",
          substituteMaterialClass: "writing-instrument",
          substituteHazardCodes: [],
          preservesConstruct: true,
        },
      ],
    },
    safetyControls: {
      supervisionLevel: "adult-self-supervised",
      substitutions: ["substitution.authored.reused-paper"],
      stopConditions: ["Stop if the activity or materials differ from this authored low-risk package."],
      incidentResponse: {
        immediateAction: "Stop the project and keep the work as an incomplete learning artifact.",
        recordIncident: true,
        resumeRequiresReview: true,
        emergencyEscalation: "follow-local-emergency-guidance",
      },
    },
    milestones: [
      {
        milestoneId: "milestone.authored.draft",
        sequence: 1,
        operationId: "operation.authored.draft",
        learnerAction: "Draft an explanation with explicit evidence labels.",
        completionArtifactIds: ["artifact.authored.draft"],
      },
      {
        milestoneId: "milestone.authored.revise",
        sequence: 2,
        operationId: "operation.authored.revise",
        learnerAction: "Revise the explanation after recording a self-critique.",
        completionArtifactIds: ["artifact.authored.revision"],
      },
    ],
    artifacts: [
      {
        artifactId: "artifact.authored.draft",
        learnerVisibleDescription: "Initial labelled explanation",
        acceptedFormats: ["text"],
        provenanceFields: ["creator", "created-at", "contribution-ids", "source-refs", "revision-history"],
      },
      {
        artifactId: "artifact.authored.revision",
        learnerVisibleDescription: "Revision with a response to critique",
        acceptedFormats: ["text", "table"],
        provenanceFields: ["creator", "created-at", "contribution-ids", "source-refs", "revision-history"],
      },
    ],
    critique: {
      roles: [{
        roleId: "critique-role.authored.self",
        role: "self",
        operationId: "operation.authored.revise",
        prompt: "Name one unsupported link and revise it.",
        required: true,
      }],
      revisionRules: [{
        ruleId: "revision-rule.authored.respond",
        sequence: 1,
        operationId: "operation.authored.revise",
        learnerAction: "Record what changed and why.",
        requiresRevisionArtifact: true,
      }],
    },
    proofOperations: [
      {
        operationId: "operation.authored.defence",
        kind: "individual-defence",
        learnerInstruction: "Defend one decision in your project without instructional help.",
        collaboratorsPermitted: false,
        aiPermitted: false,
        reusedWorkPermitted: false,
      },
      {
        operationId: "operation.authored.transfer",
        kind: "unfamiliar-transfer",
        learnerInstruction: "Apply the same reasoning to an unfamiliar representation without instructional help.",
        collaboratorsPermitted: false,
        aiPermitted: false,
        reusedWorkPermitted: false,
      },
    ],
  },
} as const);

const INTERNAL_AUTHORED_PROJECT_TEMPLATES: Readonly<Record<string, typeof FIRST_PILOT_PROJECT_TEMPLATE>> = deepFreeze({
  [`${FIRST_PILOT_PROJECT_TEMPLATE.id}@${FIRST_PILOT_PROJECT_TEMPLATE.version}@${FIRST_PILOT_PROJECT_TEMPLATE.digest}`]: FIRST_PILOT_PROJECT_TEMPLATE,
});

/** Exact immutable manifest lookup; unknown id/version/digest triples have no authored status. */
export function resolveAuthoredProjectTemplate(ref: { id: string; version: string; digest: string }): typeof FIRST_PILOT_PROJECT_TEMPLATE | null {
  return INTERNAL_AUTHORED_PROJECT_TEMPLATES[`${ref.id}@${ref.version}@${ref.digest}`] ?? null;
}

const mapAssociationSchema = z.strictObject({
  capabilityMapId: z.string().trim().max(160).regex(/^capability-map\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  capabilityMapVersion: semverSchema,
  projectBindingId: z.string().trim().max(160).regex(/^project-binding\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  proofBindingId: z.string().trim().max(160).regex(/^proof-binding\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  requiredRepresentationRefs: uniqueBy(practiceImmutableRefSchema, (entry) => `${entry.id}@${entry.version}@${entry.digest}`, 1, 16),
});

const mapEvidenceBindingSchema = z.strictObject({
  id: codeSchema,
  taskFamilyId: codeSchema,
  taskVersion: semverSchema,
  representation: z.enum(["new-context", "new-representation"]),
});

const projectProofSchema = z.strictObject({
  targetCapabilityRef: practiceCapabilityRefSchema,
  protectedOperationText: z.string().trim().min(1).max(1_200),
  separatingExperienceRef: practiceImmutableRefSchema,
  independentEvidenceBindings: uniqueBy(mapEvidenceBindingSchema, (entry) => entry.id, 2, 2),
  individualDefenceOperationId: operationIdSchema,
  unfamiliarTransferOperationId: operationIdSchema,
});

const currentFixtureReviewSchema = z.strictObject({
  reviewedContentDigest: forgeEventDigestSchema,
  reviewerIdentityRef: identityRefSchema,
  reviewerGrantMarker: fixtureGrantMarkerSchema,
  authorityMode: z.literal("process-local-fixture-only"),
  reviewedAt: strictProjectTimestampSchema,
  expiresAt: strictProjectTimestampSchema,
}).superRefine((review, context) => {
  if (Date.parse(review.expiresAt) <= Date.parse(review.reviewedAt)) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Review expiry must follow review time." });
  }
});

const delayedReturnPolicySchema = z.strictObject({
  policyRef: practiceImmutableRefSchema,
  delayDays: z.number().int().min(1).max(365),
  completionWindowDays: z.number().int().min(1).max(90),
  required: z.literal(true),
  review: currentFixtureReviewSchema.extend({ scope: z.literal("delayed-return-policy") }),
});

export const practicalProjectPackageSchema = z.strictObject({
  schemaVersion: z.literal(PRACTICAL_PROJECT_SCHEMA_VERSION),
  projectId: projectIdSchema,
  version: semverSchema,
  projectDigest: forgeEventDigestSchema,
  authoredTemplateRef: practiceImmutableRefSchema,
  templateContent: authoredTemplateContentSchema,
  audience: z.literal("adult"),
  mapAssociation: mapAssociationSchema,
  targetCapabilityRefs: uniqueBy(practiceCapabilityRefSchema, (entry) => capabilityKey(entry), 1, 16),
  prerequisiteCapabilityRefs: uniqueBy(practiceCapabilityRefSchema, (entry) => capabilityKey(entry), 0, 32),
  prerequisiteRepairRoutes: uniqueBy(targetedRepairRouteSchema, (entry) => capabilityKey(entry.prerequisiteCapabilityRef), 0, 32),
  proof: projectProofSchema,
  delayedReturn: delayedReturnPolicySchema,
  safetyReview: currentFixtureReviewSchema.extend({ scope: z.literal("exact-project-content-low-risk") }),
  compilerBoundary: z.strictObject({
    autonomousScore: z.literal(false),
    autonomousMasteryClaim: z.literal(false),
    runtimeAssignmentAuthority: z.literal(false),
    proofAuthority: z.literal(false),
  }),
});
export type PracticalProjectPackageV1 = z.infer<typeof practicalProjectPackageSchema>;
export type PracticalProjectPackageInput = Omit<PracticalProjectPackageV1, "projectDigest"> & { projectDigest?: string };

const projectContributionSchema = z.strictObject({
  contributionId: contributionIdSchema,
  kind: z.enum(PROJECT_CONTRIBUTION_KINDS),
  actorRef: z.string().trim().min(1).max(160),
  actorGrantMarker: fixtureGrantMarkerSchema.optional(),
  operationIds: uniqueStrings(operationIdSchema, 1, 16),
  artifactIds: uniqueStrings(artifactIdSchema, 0, 32),
  declaration: z.string().trim().min(1).max(1_200),
}).superRefine((contribution, context) => {
  if (contribution.kind === "learner" && !contribution.actorGrantMarker) {
    context.addIssue({ code: "custom", path: ["actorGrantMarker"], message: "Learner contributions require a process-local fixture provenance grant marker." });
  }
  if (contribution.kind !== "learner" && contribution.actorGrantMarker) {
    context.addIssue({ code: "custom", path: ["actorGrantMarker"], message: "Only learner contribution records may carry learner provenance markers." });
  }
});
export type ProjectContributionV1 = z.infer<typeof projectContributionSchema>;

const artifactSubmissionSchema = z.strictObject({
  submissionId: submissionIdSchema,
  artifactId: artifactIdSchema,
  completed: z.boolean(),
  format: z.enum(["text", "image", "audio", "video", "table", "link", "physical-description"]),
  contentDigest: forgeEventDigestSchema,
  provenance: z.strictObject({
    creatorActorRef: z.string().trim().min(1).max(160),
    createdAt: strictProjectTimestampSchema,
    contributionIds: uniqueStrings(contributionIdSchema, 1, 64),
    sourceRefs: uniqueStrings(codeSchema, 0, 64),
    revisionRecordIds: uniqueStrings(codeSchema, 0, 64),
  }),
});

const milestoneRecordSchema = z.strictObject({
  milestoneId: milestoneIdSchema,
  completedAt: strictProjectTimestampSchema,
  contributionIds: uniqueStrings(contributionIdSchema, 1, 64),
  artifactSubmissionIds: uniqueStrings(submissionIdSchema, 1, 32),
});

const critiqueRecordSchema = z.strictObject({
  roleId: codeSchema,
  completedAt: strictProjectTimestampSchema,
  responseDigest: forgeEventDigestSchema,
  contributionIds: uniqueStrings(contributionIdSchema, 1, 64),
});

const revisionRecordSchema = z.strictObject({
  revisionRecordId: codeSchema,
  ruleId: codeSchema,
  completedAt: strictProjectTimestampSchema,
  artifactSubmissionId: submissionIdSchema,
  contributionIds: uniqueStrings(contributionIdSchema, 1, 64),
  beforeContentDigest: forgeEventDigestSchema,
  afterContentDigest: forgeEventDigestSchema,
});

const protectedOperationAttemptSchema = z.strictObject({
  completedAt: strictProjectTimestampSchema,
  responseDigest: forgeEventDigestSchema,
  contributionIds: uniqueStrings(contributionIdSchema, 1, 32),
});

export const practicalProjectAttemptSchema = z.strictObject({
  schemaVersion: z.literal(PRACTICAL_PROJECT_ATTEMPT_SCHEMA_VERSION),
  projectDigest: forgeEventDigestSchema,
  attemptDigest: forgeEventDigestSchema,
  artifactSubmissions: uniqueBy(artifactSubmissionSchema, (entry) => entry.artifactId, 1, 32).superRefine((entries, context) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry.submissionId)) context.addIssue({ code: "custom", path: [index, "submissionId"], message: `Duplicate submission identity: ${entry.submissionId}` });
      seen.add(entry.submissionId);
    });
  }),
  contributions: uniqueBy(projectContributionSchema, (entry) => entry.contributionId, 1, 128),
  milestoneRecords: uniqueBy(milestoneRecordSchema, (entry) => entry.milestoneId, 1, 32),
  critiqueRecords: uniqueBy(critiqueRecordSchema, (entry) => entry.roleId, 1, 16),
  revisionRecords: uniqueBy(revisionRecordSchema, (entry) => entry.ruleId, 1, 16).superRefine((entries, context) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry.revisionRecordId)) context.addIssue({ code: "custom", path: [index, "revisionRecordId"], message: `Duplicate revision identity: ${entry.revisionRecordId}` });
      seen.add(entry.revisionRecordId);
    });
  }),
  individualDefence: protectedOperationAttemptSchema,
  unfamiliarTransfer: protectedOperationAttemptSchema,
});
export type PracticalProjectAttemptV1 = z.infer<typeof practicalProjectAttemptSchema>;
export type PracticalProjectAttemptInput = Omit<PracticalProjectAttemptV1, "attemptDigest"> & { attemptDigest?: string };

export const projectCompletionEventSchema = z.strictObject({
  schemaVersion: z.literal(PROJECT_COMPLETION_EVENT_SCHEMA_VERSION),
  completionEventId: codeSchema,
  eventDigest: forgeEventDigestSchema,
  projectDigest: forgeEventDigestSchema,
  attemptDigest: forgeEventDigestSchema,
  completedAt: strictProjectTimestampSchema,
});
export type ProjectCompletionEventV1 = z.infer<typeof projectCompletionEventSchema>;
export type ProjectCompletionEventInput = Omit<ProjectCompletionEventV1, "eventDigest"> & { eventDigest?: string };

export const delayedReturnScheduleSchema = z.strictObject({
  schemaVersion: z.literal(DELAYED_RETURN_SCHEDULE_SCHEMA_VERSION),
  scheduleId: scheduleIdSchema,
  scheduleDigest: forgeEventDigestSchema,
  projectDigest: forgeEventDigestSchema,
  attemptDigest: forgeEventDigestSchema,
  completionEventId: codeSchema,
  policyRef: practiceImmutableRefSchema,
  completedAt: strictProjectTimestampSchema,
  scheduledFor: strictProjectTimestampSchema,
  completionWindowEndsAt: strictProjectTimestampSchema,
});
export type DelayedReturnScheduleV1 = z.infer<typeof delayedReturnScheduleSchema>;
export type DelayedReturnScheduleInput = Omit<DelayedReturnScheduleV1, "scheduleDigest"> & { scheduleDigest?: string };

export const delayedReturnEventSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    schemaVersion: z.literal(DELAYED_RETURN_EVENT_SCHEMA_VERSION),
    eventId: codeSchema,
    scheduleDigest: forgeEventDigestSchema,
    kind: z.literal("completed"),
    occurredAt: strictProjectTimestampSchema,
    responseDigest: forgeEventDigestSchema,
  }),
  z.strictObject({
    schemaVersion: z.literal(DELAYED_RETURN_EVENT_SCHEMA_VERSION),
    eventId: codeSchema,
    scheduleDigest: forgeEventDigestSchema,
    kind: z.literal("untested"),
    occurredAt: strictProjectTimestampSchema,
    reasonCode: codeSchema,
  }),
]);
export type DelayedReturnEventV1 = z.infer<typeof delayedReturnEventSchema>;

function capabilityKey(entry: z.infer<typeof practiceCapabilityRefSchema>): string {
  return `${entry.curriculumNodeId}@${entry.capabilityId}@${entry.capabilityVersion}`;
}

function sortedStrings(values: readonly string[]): string[] {
  return [...values].sort(compare);
}

function canonicalTargetedRepairRoute(route: z.infer<typeof targetedRepairRouteSchema>) {
  return { ...route };
}

/** Project content excludes its safety review, preventing a review/digest cycle. */
export function canonicalPracticalProjectContentPayload(input: PracticalProjectPackageInput): object {
  const parsed = practicalProjectPackageSchema.parse({ ...input, projectDigest: `sha256:${"0".repeat(64)}` });
  return {
    schemaVersion: parsed.schemaVersion,
    projectId: parsed.projectId,
    version: parsed.version,
    authoredTemplateRef: parsed.authoredTemplateRef,
    templateContent: parsed.templateContent,
    audience: parsed.audience,
    mapAssociation: {
      ...parsed.mapAssociation,
      requiredRepresentationRefs: [...parsed.mapAssociation.requiredRepresentationRefs]
        .sort((left, right) => compare(`${left.id}@${left.version}@${left.digest}`, `${right.id}@${right.version}@${right.digest}`)),
    },
    targetCapabilityRefs: [...parsed.targetCapabilityRefs].sort((left, right) => compare(capabilityKey(left), capabilityKey(right))),
    prerequisiteCapabilityRefs: [...parsed.prerequisiteCapabilityRefs].sort((left, right) => compare(capabilityKey(left), capabilityKey(right))),
    prerequisiteRepairRoutes: [...parsed.prerequisiteRepairRoutes]
      .sort((left, right) => compare(capabilityKey(left.prerequisiteCapabilityRef), capabilityKey(right.prerequisiteCapabilityRef)))
      .map(canonicalTargetedRepairRoute),
    proof: {
      ...parsed.proof,
      independentEvidenceBindings: [...parsed.proof.independentEvidenceBindings].sort((left, right) => compare(left.id, right.id)),
    },
    delayedReturn: parsed.delayedReturn,
    compilerBoundary: parsed.compilerBoundary,
  };
}

export async function practicalProjectContentDigest(input: PracticalProjectPackageInput): Promise<string> {
  return sha256Digest(canonicalJson(canonicalPracticalProjectContentPayload(input)));
}

export function canonicalPracticalProjectPayload(input: PracticalProjectPackageInput): object {
  const parsed = practicalProjectPackageSchema.parse({ ...input, projectDigest: `sha256:${"0".repeat(64)}` });
  return {
    ...canonicalPracticalProjectContentPayload(parsed),
    safetyReview: parsed.safetyReview,
  };
}

export async function practicalProjectDigest(input: PracticalProjectPackageInput): Promise<string> {
  return sha256Digest(canonicalJson(canonicalPracticalProjectPayload(input)));
}

export async function delayedReturnPolicyContentDigest(input: PracticalProjectPackageInput): Promise<string> {
  const parsed = practicalProjectPackageSchema.parse({ ...input, projectDigest: `sha256:${"0".repeat(64)}` });
  return sha256Digest(canonicalJson({
    projectId: parsed.projectId,
    projectVersion: parsed.version,
    proofBindingId: parsed.mapAssociation.proofBindingId,
    policyRef: parsed.delayedReturn.policyRef,
    delayDays: parsed.delayedReturn.delayDays,
    completionWindowDays: parsed.delayedReturn.completionWindowDays,
    required: parsed.delayedReturn.required,
  }));
}

export async function createPracticalProjectPackage(input: PracticalProjectPackageInput): Promise<Readonly<PracticalProjectPackageV1>> {
  const parsed = practicalProjectPackageSchema.parse({ ...input, projectDigest: `sha256:${"0".repeat(64)}` });
  const { projectDigest: _digest, ...unsigned } = parsed;
  void _digest;
  return deepFreeze(practicalProjectPackageSchema.parse({ ...unsigned, projectDigest: await practicalProjectDigest(unsigned) }));
}

function canonicalArtifactSubmission(entry: PracticalProjectAttemptV1["artifactSubmissions"][number]) {
  return {
    ...entry,
    provenance: {
      ...entry.provenance,
      contributionIds: sortedStrings(entry.provenance.contributionIds),
      sourceRefs: sortedStrings(entry.provenance.sourceRefs),
      revisionRecordIds: sortedStrings(entry.provenance.revisionRecordIds),
    },
  };
}

export function canonicalPracticalProjectAttemptPayload(input: PracticalProjectAttemptInput): object {
  const parsed = practicalProjectAttemptSchema.parse({ ...input, attemptDigest: `sha256:${"0".repeat(64)}` });
  return {
    schemaVersion: parsed.schemaVersion,
    projectDigest: parsed.projectDigest,
    artifactSubmissions: [...parsed.artifactSubmissions].sort((left, right) => compare(left.artifactId, right.artifactId)).map(canonicalArtifactSubmission),
    contributions: [...parsed.contributions].sort((left, right) => compare(left.contributionId, right.contributionId)).map((entry) => ({
      ...entry,
      operationIds: sortedStrings(entry.operationIds),
      artifactIds: sortedStrings(entry.artifactIds),
    })),
    milestoneRecords: [...parsed.milestoneRecords].sort((left, right) => compare(left.milestoneId, right.milestoneId)).map((entry) => ({
      ...entry,
      contributionIds: sortedStrings(entry.contributionIds),
      artifactSubmissionIds: sortedStrings(entry.artifactSubmissionIds),
    })),
    critiqueRecords: [...parsed.critiqueRecords].sort((left, right) => compare(left.roleId, right.roleId)).map((entry) => ({
      ...entry,
      contributionIds: sortedStrings(entry.contributionIds),
    })),
    revisionRecords: [...parsed.revisionRecords].sort((left, right) => compare(left.ruleId, right.ruleId)).map((entry) => ({
      ...entry,
      contributionIds: sortedStrings(entry.contributionIds),
    })),
    individualDefence: { ...parsed.individualDefence, contributionIds: sortedStrings(parsed.individualDefence.contributionIds) },
    unfamiliarTransfer: { ...parsed.unfamiliarTransfer, contributionIds: sortedStrings(parsed.unfamiliarTransfer.contributionIds) },
  };
}

export async function practicalProjectAttemptDigest(input: PracticalProjectAttemptInput): Promise<string> {
  return sha256Digest(canonicalJson(canonicalPracticalProjectAttemptPayload(input)));
}

export async function createPracticalProjectAttempt(input: PracticalProjectAttemptInput): Promise<Readonly<PracticalProjectAttemptV1>> {
  const parsed = practicalProjectAttemptSchema.parse({ ...input, attemptDigest: `sha256:${"0".repeat(64)}` });
  const { attemptDigest: _digest, ...unsigned } = parsed;
  void _digest;
  return deepFreeze(practicalProjectAttemptSchema.parse({ ...unsigned, attemptDigest: await practicalProjectAttemptDigest(unsigned) }));
}

export function canonicalDelayedReturnSchedulePayload(input: DelayedReturnScheduleInput): object {
  const parsed = delayedReturnScheduleSchema.parse({ ...input, scheduleDigest: `sha256:${"0".repeat(64)}` });
  const { scheduleDigest: _digest, ...unsigned } = parsed;
  void _digest;
  return unsigned;
}

export async function delayedReturnScheduleDigest(input: DelayedReturnScheduleInput): Promise<string> {
  return sha256Digest(canonicalJson(canonicalDelayedReturnSchedulePayload(input)));
}

export function canonicalProjectCompletionEventPayload(input: ProjectCompletionEventInput): object {
  const parsed = projectCompletionEventSchema.parse({ ...input, eventDigest: `sha256:${"0".repeat(64)}` });
  const { eventDigest: _digest, ...unsigned } = parsed;
  void _digest;
  return unsigned;
}

export async function projectCompletionEventDigest(input: ProjectCompletionEventInput): Promise<string> {
  return sha256Digest(canonicalJson(canonicalProjectCompletionEventPayload(input)));
}

export async function createProjectCompletionEvent(input: ProjectCompletionEventInput): Promise<Readonly<ProjectCompletionEventV1>> {
  const parsed = projectCompletionEventSchema.parse({ ...input, eventDigest: `sha256:${"0".repeat(64)}` });
  const { eventDigest: _digest, ...unsigned } = parsed;
  void _digest;
  return deepFreeze(projectCompletionEventSchema.parse({ ...unsigned, eventDigest: await projectCompletionEventDigest(unsigned) }));
}
