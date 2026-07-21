import type { z } from "zod";

import {
  FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE,
  validateHomeschoolPathwayArchitecture,
} from "./architecture";
import {
  ACCESS_REQUIREMENTS,
  ENTITLEMENT_AREAS,
  pathwayReviewPacketSchema,
  type HomeschoolPathwayArchitecture,
  type PathwayReviewPacket,
} from "./contracts";

export const PATHWAY_REVIEW_ISSUE_CODES = [
  "schema.invalid",
  "architecture.invalid",
  "architecture.version-mismatch",
  "entitlement.coverage-missing",
  "entitlement.coverage-duplicate",
  "entitlement.deferred-review-not-future",
  "agency.learner-position-required",
  "agency.pause-required",
  "agency.help-required",
  "agency.uncertainty-required",
  "agency.contest-required",
  "agency.adviser-required",
  "agency.transition-required",
  "agency.guardian-visibility-required",
  "access.requirement-missing",
  "access.plan-missing",
  "access.plan-duplicate",
  "access.assistance-separation-required",
  "access.no-camera-voice-required",
  "authority.adult-presence-required",
  "authority.action-prohibited",
  "authority.grant-missing",
  "authority.grant-duplicate",
  "authority.relationship-unverified",
  "authority.grant-inactive",
  "authority.grant-not-current",
  "authority.assent-missing",
  "authority.grant-hidden-from-learner",
  "authority.adult-grant-not-applicable",
  "rights.criterion-missing",
  "rights.criterion-duplicate",
  "rights.criterion-unknown",
  "rights.evidence-not-documented",
  "rights.evidence-reference-missing",
] as const;

export type PathwayReviewIssueCode = (typeof PATHWAY_REVIEW_ISSUE_CODES)[number];

export interface PathwayReviewIssue {
  readonly code: PathwayReviewIssueCode;
  readonly path: string;
  readonly message: string;
}

export type PathwayReviewStatus = "needs-evidence" | "evidence-complete-for-independent-review";

export interface PathwayReviewOutcome {
  readonly status: PathwayReviewStatus;
  readonly issues: readonly PathwayReviewIssue[];
  readonly claim: {
    readonly level: "C0";
    readonly text: string;
    readonly certifiesLearningEfficacy: false;
    readonly certifiesSafetyOrLegalCompliance: false;
    readonly certifiesHomeschoolQuality: false;
    readonly sourceRefs: readonly string[];
  };
}

function schemaIssues(error: z.ZodError): readonly PathwayReviewIssue[] {
  return error.issues.map((issue) => ({
    code: "schema.invalid",
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function boundedOutcome(issues: readonly PathwayReviewIssue[]): PathwayReviewOutcome {
  const complete = issues.length === 0;
  return {
    status: complete ? "evidence-complete-for-independent-review" : "needs-evidence",
    issues,
    claim: {
      level: "C0",
      text: complete
        ? "This pathway packet is evidence complete for independent review. It does not certify learning efficacy, safety, legal compliance, homeschool quality, or external recognition."
        : "This pathway packet needs additional evidence before independent review. No learning, safety, legal, homeschool-quality, or recognition claim is established.",
      certifiesLearningEfficacy: false,
      certifiesSafetyOrLegalCompliance: false,
      certifiesHomeschoolQuality: false,
      sourceRefs: [
        "source.forge.product.homeschool-rights",
        "source.forge.research.homeschool",
        "source.forge.delivery.pathway",
      ],
    },
  };
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function reviewPacket(
  packet: PathwayReviewPacket,
  architecture: HomeschoolPathwayArchitecture,
): readonly PathwayReviewIssue[] {
  const issues: PathwayReviewIssue[] = [];
  const reviewedAt = Date.parse(packet.reviewedAt);

  if (packet.architecture.version !== architecture.version) {
    issues.push({
      code: "architecture.version-mismatch",
      path: "architecture.version",
      message: `Packet targets ${packet.architecture.version}; current architecture is ${architecture.version}.`,
    });
  }

  const coverageAreas = packet.entitlementCoverage.map((coverage) => coverage.area);
  for (const area of ENTITLEMENT_AREAS) {
    if (!coverageAreas.includes(area)) {
      issues.push({
        code: "entitlement.coverage-missing",
        path: "entitlementCoverage",
        message: `The broad entitlement has no visible opportunity for ${area}.`,
      });
    }
  }
  for (const area of duplicateValues(coverageAreas)) {
    issues.push({
      code: "entitlement.coverage-duplicate",
      path: "entitlementCoverage",
      message: `Entitlement area ${area} must have one review-level coverage record.`,
    });
  }
  for (const coverage of packet.entitlementCoverage) {
    if (
      coverage.learnerPosition === "deferred-with-review" &&
      coverage.reviewAt &&
      Date.parse(coverage.reviewAt) <= reviewedAt
    ) {
      issues.push({
        code: "entitlement.deferred-review-not-future",
        path: `entitlementCoverage.${coverage.area}.reviewAt`,
        message: `Deferred entitlement ${coverage.area} needs a review time after the packet review.`,
      });
    }
  }

  const agency = packet.learnerAgency;
  if (!agency.learnerPositionRecorded) {
    issues.push({
      code: "agency.learner-position-required",
      path: "learnerAgency.learnerPositionRecorded",
      message: "A pathway review must preserve the learner's stated position.",
    });
  }
  if (!agency.canPauseWithoutPenalty) {
    issues.push({ code: "agency.pause-required", path: "learnerAgency.canPauseWithoutPenalty", message: "Pausing cannot be penalized." });
  }
  if (!agency.canRequestHelp) {
    issues.push({ code: "agency.help-required", path: "learnerAgency.canRequestHelp", message: "The learner must be able to request help." });
  }
  if (!agency.canSayIDontKnow) {
    issues.push({
      code: "agency.uncertainty-required",
      path: "learnerAgency.canSayIDontKnow",
      message: "The learner must be able to state uncertainty without punishment.",
    });
  }
  if (!agency.canContestEvidence) {
    issues.push({
      code: "agency.contest-required",
      path: "learnerAgency.canContestEvidence",
      message: "The learner must be able to contest an evidence statement.",
    });
  }
  if (!agency.externalAdviserRef) {
    issues.push({
      code: "agency.adviser-required",
      path: "learnerAgency.externalAdviserRef",
      message: "An external adviser or independent review path is required.",
    });
  }
  if (agency.transitionOptionRefs.length === 0) {
    issues.push({
      code: "agency.transition-required",
      path: "learnerAgency.transitionOptionRefs",
      message: "At least one re-entry, further-study, apprenticeship, or work transition option must remain visible.",
    });
  }
  if (!agency.guardianActionsVisibleToLearner) {
    issues.push({
      code: "agency.guardian-visibility-required",
      path: "learnerAgency.guardianActionsVisibleToLearner",
      message: "Guardian actions and views must remain visible to the learner.",
    });
  }

  for (const requirement of ACCESS_REQUIREMENTS) {
    if (!packet.accessibility.supportedRequirements.includes(requirement)) {
      issues.push({
        code: "access.requirement-missing",
        path: "accessibility.supportedRequirements",
        message: `Missing accessibility requirement: ${requirement}.`,
      });
    }
  }
  const accessPlanAreas = packet.accessibility.plans.map((plan) => plan.area);
  for (const area of ENTITLEMENT_AREAS) {
    if (!accessPlanAreas.includes(area)) {
      issues.push({
        code: "access.plan-missing",
        path: "accessibility.plans",
        message: `Entitlement ${area} has no access and no-material/no-travel alternative plan.`,
      });
    }
  }
  for (const area of duplicateValues(accessPlanAreas)) {
    issues.push({
      code: "access.plan-duplicate",
      path: "accessibility.plans",
      message: `Entitlement ${area} must have one review-level access plan.`,
    });
  }
  if (!packet.accessibility.cognitiveAssistanceRecordedSeparately) {
    issues.push({
      code: "access.assistance-separation-required",
      path: "accessibility.cognitiveAssistanceRecordedSeparately",
      message: "Accessibility support cannot be counted as cognitive assistance.",
    });
  }
  if (!packet.accessibility.noMandatoryCameraOrVoice) {
    issues.push({
      code: "access.no-camera-voice-required",
      path: "accessibility.noMandatoryCameraOrVoice",
      message: "The pathway must include a complete no-camera/no-voice route.",
    });
  }

  const agePolicy = architecture.ageBandPolicies.find((policy) => policy.ageBand === packet.ageBand);
  if (!agePolicy) {
    throw new Error(`Validated architecture is missing age policy ${packet.ageBand}.`);
  }
  if (agePolicy.adultPresenceRequired && !agency.responsibleAdultPresent) {
    issues.push({
      code: "authority.adult-presence-required",
      path: "learnerAgency.responsibleAdultPresent",
      message: `${packet.ageBand} requires a responsible adult to remain present.`,
    });
  }

  if (agePolicy.relationshipMode === "learner-primary-authority" && packet.authorityGrants.length > 0) {
    issues.push({
      code: "authority.adult-grant-not-applicable",
      path: "authorityGrants",
      message: "Adults are the primary authority; guardian grants are not applicable.",
    });
  }

  if (
    packet.plannedActions.includes("use-open-web-sources") &&
    (agePolicy.sourceAccess === "none" || agePolicy.sourceAccess === "curated-only")
  ) {
    issues.push({
      code: "authority.action-prohibited",
      path: "plannedActions",
      message: `${packet.ageBand} does not permit open-web source access, even with a guardian grant.`,
    });
  }

  for (const purpose of packet.plannedActions) {
    if (!agePolicy.guardianConsentPurposes.includes(purpose)) continue;
    const grants = packet.authorityGrants.filter((grant) => grant.purpose === purpose);
    if (grants.length === 0) {
      issues.push({
        code: "authority.grant-missing",
        path: "authorityGrants",
        message: `Planned action ${purpose} requires a purpose-scoped guardian grant for ${packet.ageBand}.`,
      });
      continue;
    }
    if (grants.length > 1) {
      issues.push({
        code: "authority.grant-duplicate",
        path: "authorityGrants",
        message: `Planned action ${purpose} has multiple review-level grants.`,
      });
    }

    const grant = grants[0];
    if (!grant.relationshipVerified) {
      issues.push({
        code: "authority.relationship-unverified",
        path: `authorityGrants.${grant.id}.relationshipVerified`,
        message: `Grant ${grant.id} does not have a verified guardian relationship.`,
      });
    }
    if (grant.state !== "granted") {
      issues.push({
        code: "authority.grant-inactive",
        path: `authorityGrants.${grant.id}.state`,
        message: `Grant ${grant.id} is ${grant.state}, not granted.`,
      });
    }
    if (Date.parse(grant.validFrom) > reviewedAt || Date.parse(grant.expiresAt) <= reviewedAt) {
      issues.push({
        code: "authority.grant-not-current",
        path: `authorityGrants.${grant.id}`,
        message: `Grant ${grant.id} is not current at the packet review time.`,
      });
    }
    if (agePolicy.learnerAssentPurposes.includes(purpose) && grant.learnerAssent !== "granted") {
      issues.push({
        code: "authority.assent-missing",
        path: `authorityGrants.${grant.id}.learnerAssent`,
        message: `Planned action ${purpose} requires recorded learner assent.`,
      });
    }
    if (!grant.visibleToLearner) {
      issues.push({
        code: "authority.grant-hidden-from-learner",
        path: `authorityGrants.${grant.id}.visibleToLearner`,
        message: `Grant ${grant.id} must be visible to the learner.`,
      });
    }
  }

  const knownCriteria = new Map(
    architecture.rightsQualityTests.flatMap((test) =>
      test.criteria.map((criterion) => [criterion.id, test.id] as const),
    ),
  );
  for (const evidence of packet.rightsEvidence) {
    const expectedTest = knownCriteria.get(evidence.criterionId);
    if (!expectedTest || expectedTest !== evidence.testId) {
      issues.push({
        code: "rights.criterion-unknown",
        path: `rightsEvidence.${evidence.id}.criterionId`,
        message: `Criterion ${evidence.criterionId} does not belong to rights test ${evidence.testId}.`,
      });
    }
  }

  for (const test of architecture.rightsQualityTests) {
    for (const criterion of test.criteria) {
      const evidenceRecords = packet.rightsEvidence.filter(
        (evidence) => evidence.testId === test.id && evidence.criterionId === criterion.id,
      );
      if (evidenceRecords.length === 0) {
        issues.push({
          code: "rights.criterion-missing",
          path: "rightsEvidence",
          message: `Missing evidence record for ${criterion.id}.`,
        });
        continue;
      }
      if (evidenceRecords.length > 1) {
        issues.push({
          code: "rights.criterion-duplicate",
          path: "rightsEvidence",
          message: `Criterion ${criterion.id} has multiple review-level evidence records.`,
        });
      }
      const evidence = evidenceRecords[0];
      if (evidence.status !== "documented") {
        issues.push({
          code: "rights.evidence-not-documented",
          path: `rightsEvidence.${evidence.id}.status`,
          message: `Criterion ${criterion.id} is ${evidence.status}; limitations are preserved and the packet stays incomplete.`,
        });
      }
      if (evidence.evidenceRefs.length === 0) {
        issues.push({
          code: "rights.evidence-reference-missing",
          path: `rightsEvidence.${evidence.id}.evidenceRefs`,
          message: `Criterion ${criterion.id} requires at least one inspectable evidence reference.`,
        });
      }
    }
  }

  return issues;
}

export function evaluatePathwayReviewPacket(
  candidate: unknown,
  architecture: unknown = FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE,
): PathwayReviewOutcome {
  const architectureResult = validateHomeschoolPathwayArchitecture(architecture);
  if (!architectureResult.ok) {
    return boundedOutcome(
      architectureResult.issues.map((issue) => ({
        code: "architecture.invalid",
        path: issue.path,
        message: `${issue.code}: ${issue.message}`,
      })),
    );
  }

  const parsed = pathwayReviewPacketSchema.safeParse(candidate);
  if (!parsed.success) return boundedOutcome(schemaIssues(parsed.error));
  return boundedOutcome(reviewPacket(parsed.data, architectureResult.value));
}
