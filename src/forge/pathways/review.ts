import type { z } from "zod";

import {
  PATHWAY_ACCESS_REQUIREMENTS,
  PATHWAY_ENTITLEMENT_AREAS,
  PATHWAY_SOURCE_REFS,
  pathwayReviewPacketSchema,
  type PathwayCapability,
  type PathwayCapabilityCatalog,
  type PathwayReviewPacket,
} from "./contracts";
import { CURRENT_FORGE_PATHWAY_CATALOG } from "./catalog";

export const PATHWAY_REVIEW_ISSUE_CODES = [
  "schema.invalid",
  "source.grounding-missing",
  "breadth.entitlement-missing",
  "breadth.entitlement-duplicate",
  "capability.unknown",
  "capability.binding-mismatch",
  "capability.entitlement-area-ineligible",
  "capability.duplicate-reuse",
  "capability.age-mode-ineligible",
  "capability.source-policy-ineligible",
  "capability.underage-open-web-prohibited",
  "foundations.not-documented",
  "agency.position-missing",
  "agency.choice-missing",
  "agency.pause-missing",
  "agency.decline-missing",
  "agency.help-missing",
  "agency.uncertainty-missing",
  "agency.contest-missing",
  "agency.independent-review-missing",
  "access.requirement-missing",
  "access.assistance-separation-missing",
  "access.construct-disclosure-missing",
  "consent.relationship-declaration-missing",
  "consent.guardian-declaration-missing",
  "consent.assent-record-missing",
  "consent.learner-visibility-missing",
  "consent.child-open-web-prohibited",
  "relationships.not-documented",
  "relationships.human-review-missing",
  "protection.open-minor-messaging",
  "protection.mandatory-public-posting",
  "protection.precise-location",
  "protection.reporting-path-missing",
  "portability.not-documented",
  "portability.export-plan-missing",
  "portability.transition-missing",
  "coercion.pause-penalty",
  "coercion.engagement-quota",
  "coercion.guilt-or-urgency",
  "gamification.hidden-signal",
  "evidence.claim-missing",
  "evidence.trusted-receipt-required",
  "evidence.claim-unbound-capability",
  "evidence.event-type-ineligible",
  "evidence.claim-event-mismatch",
  "evidence.source-mismatch",
  "evidence.claim-overreach",
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
    readonly certifiesPathwayQuality: false;
  };
}

function schemaIssues(error: z.ZodError): readonly PathwayReviewIssue[] {
  return error.issues.map((issue) => ({
    code: "schema.invalid",
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function outcome(issues: readonly PathwayReviewIssue[]): PathwayReviewOutcome {
  const complete = issues.length === 0;
  return {
    status: complete ? "evidence-complete-for-independent-review" : "needs-evidence",
    issues,
    claim: {
      level: "C0",
      text: complete
        ? "This packet has the named evidence and limitations needed for independent review; it does not certify learning effects, safety, legal compliance, or pathway quality."
        : "This packet needs additional evidence before independent review; it establishes no learning-effect, safety, legal-compliance, or pathway-quality claim.",
      certifiesLearningEfficacy: false,
      certifiesSafetyOrLegalCompliance: false,
      certifiesPathwayQuality: false,
    },
  };
}

function add(
  issues: PathwayReviewIssue[],
  code: PathwayReviewIssueCode,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function capabilityFor(
  entitlement: Extract<PathwayReviewPacket["entitlements"][number], { state: "published-capability" }>,
  catalog: PathwayCapabilityCatalog,
): PathwayCapability | undefined {
  return catalog.capabilities.find((candidate) => candidate.capabilityId === entitlement.capabilityId);
}

const CLAIM_OVERREACH = /\b(master(?:y|ed)?|certif(?:y|ied|ication)|accredit(?:ed|ation)|legal(?:ly)? compliant|safe(?:ty)? proven|guarantee(?:d)?|ready for enrollment|homeschool[- ]?ready|(?:homeschool|education|school) solutions?|suitab(?:le|ility)|replaces? (?:school|education)|(?:school|education) replacement|replacement for (?:school|education)|universal replacement|lifelong (?:capability|learning)|(?:delayed[- ]?)?retention|(?:broad|far)[- ]?transfer)\b/i;

const CLAIM_KIND_EVENT_TYPES = {
  "participation-recorded": ["world_run.started", "attempt.committed"],
  "deterministic-result-recorded": ["evidence.recorded", "world_run.completed"],
  "open-question-recorded": ["evidence.recorded", "world_run.completed"],
} as const;

function reviewPacket(packet: PathwayReviewPacket, catalog: PathwayCapabilityCatalog): readonly PathwayReviewIssue[] {
  const issues: PathwayReviewIssue[] = [];

  for (const sourceRef of PATHWAY_SOURCE_REFS) {
    if (!packet.sourceRefs.includes(sourceRef)) {
      add(issues, "source.grounding-missing", "sourceRefs", `Missing source grounding: ${sourceRef}.`);
    }
  }

  for (const area of PATHWAY_ENTITLEMENT_AREAS) {
    const records = packet.entitlements.filter((entitlement) => entitlement.area === area);
    if (records.length === 0) add(issues, "breadth.entitlement-missing", "entitlements", `No entitlement record names ${area}.`);
    if (records.length > 1) add(issues, "breadth.entitlement-duplicate", "entitlements", `More than one entitlement record names ${area}.`);
  }

  const publishedCapabilities = new Map<string, PathwayCapability>();
  const entitlementAreasByCapability = new Map<string, PathwayReviewPacket["entitlements"][number]["area"][]>();
  for (const entitlement of packet.entitlements) {
    if (entitlement.state !== "published-capability") continue;
    const capability = capabilityFor(entitlement, catalog);
    if (!capability) {
      add(issues, "capability.unknown", `entitlements.${entitlement.area}.capabilityId`, "The named capability is not in the released current catalog.");
      continue;
    }
    publishedCapabilities.set(capability.capabilityId, capability);
    const assignedAreas = entitlementAreasByCapability.get(capability.capabilityId) ?? [];
    assignedAreas.push(entitlement.area);
    entitlementAreasByCapability.set(capability.capabilityId, assignedAreas);
    if (capability.worldId !== entitlement.worldId || capability.evidenceTier !== entitlement.evidenceTier) {
      add(issues, "capability.binding-mismatch", `entitlements.${entitlement.area}`, "World and evidence tier must match the released capability record.");
    }
    if (!capability.entitlementAreas.includes(entitlement.area)) {
      add(issues, "capability.entitlement-area-ineligible", `entitlements.${entitlement.area}.capabilityId`, "The released capability is not reviewed for this entitlement area.");
    }
    if (!capability.ageModes.includes(packet.ageMode)) {
      add(issues, "capability.age-mode-ineligible", `entitlements.${entitlement.area}.capabilityId`, "The released World does not include this learner age mode.");
    }
    if (capability.sourcePoliciesByAge[packet.ageMode] !== entitlement.sourcePolicy) {
      add(issues, "capability.source-policy-ineligible", `entitlements.${entitlement.area}.sourcePolicy`, "Source policy is not permitted by this released World.");
    }
    if (packet.ageMode !== "18-plus" && entitlement.sourcePolicy === "open_web") {
      add(issues, "capability.underage-open-web-prohibited", `entitlements.${entitlement.area}.sourcePolicy`, "Open-web policy cannot be reviewed for an under-18 packet without verified authority.");
    }
  }
  for (const [capabilityId, areas] of entitlementAreasByCapability) {
    const capability = publishedCapabilities.get(capabilityId);
    if (capability && areas.length > 1 && capability.entitlementAreas.length < 2) {
      add(issues, "capability.duplicate-reuse", "entitlements", "A capability may cover multiple areas only when its catalog record names each reviewed area.");
    }
  }

  if (packet.foundations.status !== "documented-for-review" || !packet.foundations.benchmarkPlanRef) {
    add(issues, "foundations.not-documented", "foundations", "Foundational benchmark limits and a review plan must be explicit.");
  }

  const agency = packet.learnerAgency;
  if (!agency.learnerPositionRecorded) add(issues, "agency.position-missing", "learnerAgency.learnerPositionRecorded", "Learner position is required.");
  if (!agency.canChooseAlternative) add(issues, "agency.choice-missing", "learnerAgency.canChooseAlternative", "A learner needs an alternative path.");
  if (!agency.canPauseWithoutPenalty) add(issues, "agency.pause-missing", "learnerAgency.canPauseWithoutPenalty", "Pausing cannot carry a penalty.");
  if (!agency.canDeclineWithoutPenalty) add(issues, "agency.decline-missing", "learnerAgency.canDeclineWithoutPenalty", "Declining cannot carry a penalty.");
  if (!agency.canRequestHelp) add(issues, "agency.help-missing", "learnerAgency.canRequestHelp", "A learner must be able to request help.");
  if (!agency.canStateUncertainty) add(issues, "agency.uncertainty-missing", "learnerAgency.canStateUncertainty", "A learner must be able to state uncertainty.");
  if (!agency.canContestEvidence) add(issues, "agency.contest-missing", "learnerAgency.canContestEvidence", "A learner must be able to contest evidence.");
  if (!agency.independentReviewPathRef) add(issues, "agency.independent-review-missing", "learnerAgency.independentReviewPathRef", "An independent review path must be named.");

  for (const requirement of PATHWAY_ACCESS_REQUIREMENTS) {
    if (!packet.accessibility.supportedRequirements.includes(requirement)) {
      add(issues, "access.requirement-missing", "accessibility.supportedRequirements", `Missing accessibility route: ${requirement}.`);
    }
  }
  if (!packet.accessibility.assistanceRecordedSeparately) add(issues, "access.assistance-separation-missing", "accessibility.assistanceRecordedSeparately", "Accessibility support must not be treated as cognitive assistance.");
  if (!packet.accessibility.constructChangesDisclosed) add(issues, "access.construct-disclosure-missing", "accessibility.constructChangesDisclosed", "Construct-changing alternatives must be disclosed.");

  const consentRequired = packet.consentAssent.externalAction !== "none" || packet.ageMode === "under-13" && [...publishedCapabilities.values()].some((capability) => capability.guardianManaged);
  if (consentRequired && packet.consentAssent.relationshipEvidence !== "declared-for-review") add(issues, "consent.relationship-declaration-missing", "consentAssent.relationshipEvidence", "A relationship declaration is review evidence only; it is not verified authority.");
  if (consentRequired && packet.ageMode !== "18-plus" && packet.consentAssent.guardianConsent !== "declared-for-review") add(issues, "consent.guardian-declaration-missing", "consentAssent.guardianConsent", "A guardian declaration is required for independent review of this boundary.");
  if (consentRequired && packet.ageMode !== "18-plus" && packet.consentAssent.learnerAssent !== "recorded-for-review") add(issues, "consent.assent-record-missing", "consentAssent.learnerAssent", "Learner assent must be recorded for review.");
  if (consentRequired && !packet.consentAssent.visibilityToLearner) add(issues, "consent.learner-visibility-missing", "consentAssent.visibilityToLearner", "The declared boundary must be visible to the learner.");
  if (packet.ageMode === "under-13" && packet.consentAssent.externalAction === "open-web") add(issues, "consent.child-open-web-prohibited", "consentAssent.externalAction", "Open-web access is not an under-13 pathway policy.");

  if (packet.relationships.status !== "documented-for-review") add(issues, "relationships.not-documented", "relationships.status", "Relationship evidence is not documented.");
  if (!packet.relationships.humanReviewRef) add(issues, "relationships.human-review-missing", "relationships.humanReviewRef", "A human review reference is required; its adequacy remains for independent review.");

  if (!packet.protection.noOpenMinorMessaging) add(issues, "protection.open-minor-messaging", "protection.noOpenMinorMessaging", "Open minor messaging is outside this packet.");
  if (!packet.protection.noMandatoryPublicPosting) add(issues, "protection.mandatory-public-posting", "protection.noMandatoryPublicPosting", "Public posting cannot be mandatory.");
  if (!packet.protection.noPreciseLocation) add(issues, "protection.precise-location", "protection.noPreciseLocation", "Precise location collection is prohibited.");
  if (!packet.protection.accessibleReportingPathRef) add(issues, "protection.reporting-path-missing", "protection.accessibleReportingPathRef", "An accessible reporting path must be named.");

  if (packet.portability.status !== "documented-untested") add(issues, "portability.not-documented", "portability.status", "Portability remains untested until an independent reviewer verifies it.");
  if (!packet.portability.exportPlanRef) add(issues, "portability.export-plan-missing", "portability.exportPlanRef", "An export plan must be named.");
  if (packet.portability.transitionOptionRefs.length === 0) add(issues, "portability.transition-missing", "portability.transitionOptionRefs", "At least one transition option must remain visible.");

  if (!packet.coercion.noPenaltyForPause) add(issues, "coercion.pause-penalty", "coercion.noPenaltyForPause", "The packet signals a pause penalty.");
  if (!packet.coercion.noEngagementQuota) add(issues, "coercion.engagement-quota", "coercion.noEngagementQuota", "The packet signals an engagement quota.");
  if (!packet.coercion.noGuiltOrUrgencyNudges) add(issues, "coercion.guilt-or-urgency", "coercion.noGuiltOrUrgencyNudges", "The packet signals guilt or urgency nudges.");
  if (Object.values(packet.interfaceSignals).some(Boolean)) add(issues, "gamification.hidden-signal", "interfaceSignals", "Points, badges, streaks, ranks, races, and comparable signals are not pathway evidence.");

  for (const entitlement of packet.entitlements) {
    if (entitlement.state !== "published-capability") continue;
    if (!packet.evidenceClaims.some((claim) => claim.capabilityId === entitlement.capabilityId)) {
      add(issues, "evidence.claim-missing", `entitlements.${entitlement.area}`, "A published capability needs an appropriately bounded evidence claim.");
    }
    add(issues, "evidence.trusted-receipt-required", `entitlements.${entitlement.area}`, "Candidate-supplied event references cannot establish a trusted runtime or journal receipt.");
  }
  for (const claim of packet.evidenceClaims) {
    const capability = publishedCapabilities.get(claim.capabilityId);
    if (!capability) {
      add(issues, "evidence.claim-unbound-capability", `evidenceClaims.${claim.id}.capabilityId`, "An evidence claim must bind to a published capability in this packet.");
      continue;
    }
    if (!capability.evidenceEventTypes.includes(claim.eventType)) add(issues, "evidence.event-type-ineligible", `evidenceClaims.${claim.id}.eventType`, "Use only an event type accepted by the released capability contract.");
    if (!CLAIM_KIND_EVENT_TYPES[claim.claimKind].some((eventType) => eventType === claim.eventType)) {
      add(issues, "evidence.claim-event-mismatch", `evidenceClaims.${claim.id}.eventType`, "Claim kind and event type must have a compatible bounded meaning.");
    }
    if (claim.sourceIds.some((sourceId) => !capability.sourceIds.includes(sourceId))) add(issues, "evidence.source-mismatch", `evidenceClaims.${claim.id}.sourceIds`, "Evidence source IDs must come from the released World manifest.");
    if (CLAIM_OVERREACH.test(claim.statement)) add(issues, "evidence.claim-overreach", `evidenceClaims.${claim.id}.statement`, "Event evidence records a bounded observation, not a broad learner or pathway conclusion.");
  }

  return issues;
}

export function evaluatePathwayReviewPacket(
  candidate: unknown,
): PathwayReviewOutcome {
  const parsed = pathwayReviewPacketSchema.safeParse(candidate);
  if (!parsed.success) return outcome(schemaIssues(parsed.error));
  return outcome(reviewPacket(parsed.data, CURRENT_FORGE_PATHWAY_CATALOG));
}
