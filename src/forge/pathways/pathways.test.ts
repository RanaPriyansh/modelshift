import { describe, expect, it } from "vitest";

import {
  ACCESS_REQUIREMENTS,
  ENTITLEMENT_AREAS,
  PATHWAY_AGE_BANDS,
  PATHWAY_NON_GOALS,
  RIGHTS_QUALITY_TESTS,
  type AuthorityGrant,
  type HomeschoolPathwayArchitecture,
  type PathwayAction,
  type PathwayAgeBand,
  type PathwayReviewPacket,
} from "./contracts";
import {
  FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE,
  validateHomeschoolPathwayArchitecture,
} from "./architecture";
import { evaluatePathwayReviewPacket } from "./review";

const REVIEWED_AT = "2026-07-22T12:00:00.000Z";

function grantFor(purpose: PathwayAction, index: number): AuthorityGrant {
  return {
    id: `grant.fixture.${index}`,
    purpose,
    state: "granted" as const,
    relationshipRef: "relationship.guardian.fixture",
    relationshipVerified: true,
    learnerAssent: "granted" as const,
    validFrom: "2026-07-01T00:00:00.000Z",
    expiresAt: "2026-08-01T00:00:00.000Z",
    visibleToLearner: true,
    visibilityScopes: ["capability-summary", "consent-history"],
  };
}

function completePacket(
  ageBand: PathwayAgeBand = "middle-secondary-13-15",
  plannedActions: readonly PathwayAction[] = ageBand === "adult-18-plus" ? [] : ["persist-learner-evidence"],
): PathwayReviewPacket {
  return {
    schemaVersion: "1.0",
    id: `packet.fixture.${ageBand}`,
    architecture: {
      id: "forge.homeschool-pathways",
      version: FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE.version,
    },
    ageBand,
    reviewedAt: REVIEWED_AT,
    learnerAgency: {
      objectiveRef: "objective.learner-owned.fixture",
      objectiveAuthorship: "learner-authored",
      learnerPositionRecorded: true,
      canPauseWithoutPenalty: true,
      canRequestHelp: true,
      canSayIDontKnow: true,
      canContestEvidence: true,
      contestPathRef: "path.contest.fixture",
      externalAdviserRef: "adviser.external.fixture",
      transitionOptionRefs: ["transition.reentry.fixture"],
      guardianActionsVisibleToLearner: true,
      responsibleAdultPresent: ageBand === "early-childhood-3-6",
    },
    entitlementCoverage: ENTITLEMENT_AREAS.map((area) => ({
      area,
      opportunityRef: `opportunity.${area}`,
      learnerPosition: "accepted-shared-entitlement" as const,
    })),
    accessibility: {
      supportedRequirements: [...ACCESS_REQUIREMENTS],
      plans: ENTITLEMENT_AREAS.map((area) => ({
        area,
        planRef: `access.${area}`,
        noMaterialOrTravelAlternativeRef: `alternative.${area}`,
        constructImpact: "unchanged" as const,
      })),
      cognitiveAssistanceRecordedSeparately: true,
      noMandatoryCameraOrVoice: true,
    },
    plannedActions: [...plannedActions],
    authorityGrants:
      ageBand === "adult-18-plus" ? [] : plannedActions.map((purpose, index) => grantFor(purpose, index)),
    rightsEvidence: FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE.rightsQualityTests.flatMap((test) =>
      test.criteria.map((criterion, index) => ({
        id: `evidence.${test.id}.${index}`,
        testId: test.id,
        criterionId: criterion.id,
        status: "documented" as const,
        evidenceRefs: [`record.${test.id}.${index}`],
        limitations: ["The fixture documents packet structure only and makes no pathway-quality or efficacy claim."],
      })),
    ),
  };
}

function issueCodes(candidate: unknown): readonly string[] {
  return evaluatePathwayReviewPacket(candidate).issues.map((issue) => issue.code);
}

describe("FORGE homeschool pathway architecture", () => {
  it("validates the built-in source-grounded architecture", () => {
    const result = validateHomeschoolPathwayArchitecture(FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE);
    expect(result.ok).toBe(true);
  });

  it("covers every age band, entitlement area, rights test, access baseline, and anti-LMS non-goal", () => {
    const architecture = FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE;
    expect(architecture.ageBandPolicies.map((policy) => policy.ageBand).sort()).toEqual([...PATHWAY_AGE_BANDS].sort());
    expect(architecture.entitlements.map((entitlement) => entitlement.area).sort()).toEqual([...ENTITLEMENT_AREAS].sort());
    expect(architecture.rightsQualityTests.map((test) => test.id).sort()).toEqual([...RIGHTS_QUALITY_TESTS].sort());
    expect([...architecture.accessRequirements].sort()).toEqual([...ACCESS_REQUIREMENTS].sort());
    expect([...architecture.nonGoals].sort()).toEqual([...PATHWAY_NON_GOALS].sort());
  });

  it("fails when a policy cites an unknown governing source", () => {
    const architecture = structuredClone(FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE) as HomeschoolPathwayArchitecture;
    architecture.ageBandPolicies[0].sourceRefs = ["source.unknown.fixture"];
    const result = validateHomeschoolPathwayArchitecture(architecture);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((issue) => issue.code)).toContain("source.reference-missing");
  });

  it("rejects ungoverned course and gamification fields through a strict contract", () => {
    const architecture = structuredClone(FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE) as HomeschoolPathwayArchitecture & {
      points?: number;
    };
    architecture.points = 100;
    const result = validateHomeschoolPathwayArchitecture(architecture);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((issue) => issue.code)).toContain("schema.invalid");
  });

  it("pins early-childhood and adult authority boundaries", () => {
    const early = structuredClone(FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE) as HomeschoolPathwayArchitecture;
    const earlyPolicy = early.ageBandPolicies.find((policy) => policy.ageBand === "early-childhood-3-6");
    if (!earlyPolicy) throw new Error("Fixture missing early-childhood policy.");
    earlyPolicy.aiBoundary = "curated-bounded-ai";
    expect(validateHomeschoolPathwayArchitecture(early)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "early-childhood.ai-boundary-invalid" })]),
    });

    const adult = structuredClone(FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE) as HomeschoolPathwayArchitecture;
    const adultPolicy = adult.ageBandPolicies.find((policy) => policy.ageBand === "adult-18-plus");
    if (!adultPolicy) throw new Error("Fixture missing adult policy.");
    adultPolicy.guardianConsentPurposes = ["persist-learner-evidence"];
    expect(validateHomeschoolPathwayArchitecture(adult)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "adult.guardian-boundary-invalid" })]),
    });
  });

  it("does not let an architecture revision silently relax minor consent, privacy, or source boundaries", () => {
    const architecture = structuredClone(FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE) as HomeschoolPathwayArchitecture;
    const upperPrimary = architecture.ageBandPolicies.find((policy) => policy.ageBand === "upper-primary-10-12");
    if (!upperPrimary) throw new Error("Fixture missing upper-primary policy.");
    upperPrimary.guardianConsentPurposes = upperPrimary.guardianConsentPurposes.filter(
      (purpose) => purpose !== "share-externally",
    );
    upperPrimary.privateByDefault = upperPrimary.privateByDefault.filter((field) => field !== "private-notebook");
    upperPrimary.sourceAccess = "risk-gated";

    expect(validateHomeschoolPathwayArchitecture(architecture)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "minor.guardian-boundary-invalid" }),
        expect.objectContaining({ code: "guardian.private-boundary-invalid" }),
        expect.objectContaining({ code: "age-band.source-boundary-invalid" }),
      ]),
    });
  });
});

describe("pathway review packet", () => {
  it("refuses to evaluate against a structurally relaxed architecture", () => {
    const architecture = structuredClone(FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE) as HomeschoolPathwayArchitecture;
    const middle = architecture.ageBandPolicies.find((policy) => policy.ageBand === "middle-secondary-13-15");
    if (!middle) throw new Error("Fixture missing middle-secondary policy.");
    middle.guardianConsentPurposes = [];

    const result = evaluatePathwayReviewPacket(completePacket(), architecture);
    expect(result.status).toBe("needs-evidence");
    expect(result.issues.map((issue) => issue.code)).toContain("architecture.invalid");
  });

  it.each(PATHWAY_AGE_BANDS)("can represent a complete review packet for %s without scoring the learner", (ageBand) => {
    const result = evaluatePathwayReviewPacket(completePacket(ageBand));
    expect(result.status).toBe("evidence-complete-for-independent-review");
    expect(result.issues).toEqual([]);
    expect(result.claim).toMatchObject({
      level: "C0",
      certifiesLearningEfficacy: false,
      certifiesSafetyOrLegalCompliance: false,
      certifiesHomeschoolQuality: false,
    });
    expect(result.claim.text).toContain("does not certify");
  });

  it("requires every subject-area opportunity and matching access plan", () => {
    const packet = completePacket();
    packet.entitlementCoverage = packet.entitlementCoverage.filter(
      (coverage) => coverage.area !== "arts-and-culture",
    );
    packet.accessibility.plans = packet.accessibility.plans.filter((plan) => plan.area !== "arts-and-culture");

    expect(issueCodes(packet)).toEqual(
      expect.arrayContaining(["entitlement.coverage-missing", "access.plan-missing"]),
    );
  });

  it("preserves deferral as learner choice but requires a future review point", () => {
    const packet = completePacket();
    packet.entitlementCoverage[0] = {
      ...packet.entitlementCoverage[0],
      learnerPosition: "deferred-with-review",
      reviewAt: "2026-07-22T11:59:59.000Z",
    };
    expect(issueCodes(packet)).toContain("entitlement.deferred-review-not-future");

    packet.entitlementCoverage[0].reviewAt = "2026-08-22T12:00:00.000Z";
    expect(issueCodes(packet)).not.toContain("entitlement.deferred-review-not-future");
  });

  it("keeps accessibility support distinct from cognitive assistance", () => {
    const packet = completePacket();
    packet.accessibility.supportedRequirements = packet.accessibility.supportedRequirements.filter(
      (requirement) => requirement !== "no-material-or-travel-equivalent",
    );
    packet.accessibility.cognitiveAssistanceRecordedSeparately = false;
    packet.accessibility.noMandatoryCameraOrVoice = false;

    expect(issueCodes(packet)).toEqual(
      expect.arrayContaining([
        "access.requirement-missing",
        "access.assistance-separation-required",
        "access.no-camera-voice-required",
      ]),
    );
  });

  it("fails closed when a minor action lacks a current, verified, visible, assented grant", () => {
    const missing = completePacket();
    missing.authorityGrants = [];
    expect(issueCodes(missing)).toContain("authority.grant-missing");

    const invalid = completePacket();
    invalid.authorityGrants[0] = {
      ...invalid.authorityGrants[0],
      state: "revoked",
      relationshipVerified: false,
      learnerAssent: "declined",
      visibleToLearner: false,
      expiresAt: "2026-07-22T11:59:59.000Z",
    };
    expect(issueCodes(invalid)).toEqual(
      expect.arrayContaining([
        "authority.relationship-unverified",
        "authority.grant-inactive",
        "authority.grant-not-current",
        "authority.assent-missing",
        "authority.grant-hidden-from-learner",
      ]),
    );
  });

  it("does not let guardian consent broaden a younger learner to open-web sources", () => {
    const packet = completePacket("upper-primary-10-12", [
      "persist-learner-evidence",
      "use-open-web-sources",
    ]);
    expect(issueCodes(packet)).toContain("authority.action-prohibited");
  });

  it("requires adult presence for early childhood and rejects guardian grants for adults", () => {
    const early = completePacket("early-childhood-3-6");
    early.learnerAgency.responsibleAdultPresent = false;
    expect(issueCodes(early)).toContain("authority.adult-presence-required");

    const adult = completePacket("adult-18-plus");
    adult.authorityGrants = [grantFor("persist-learner-evidence", 0)];
    expect(issueCodes(adult)).toContain("authority.adult-grant-not-applicable");
  });

  it("requires learner voice, challenge, help, pause, and uncertainty rights", () => {
    const packet = completePacket();
    packet.learnerAgency.learnerPositionRecorded = false;
    packet.learnerAgency.canPauseWithoutPenalty = false;
    packet.learnerAgency.canRequestHelp = false;
    packet.learnerAgency.canSayIDontKnow = false;
    packet.learnerAgency.canContestEvidence = false;
    packet.learnerAgency.externalAdviserRef = undefined;
    packet.learnerAgency.transitionOptionRefs = [];
    packet.learnerAgency.guardianActionsVisibleToLearner = false;

    expect(issueCodes(packet)).toEqual(
      expect.arrayContaining([
        "agency.learner-position-required",
        "agency.pause-required",
        "agency.help-required",
        "agency.uncertainty-required",
        "agency.contest-required",
        "agency.adviser-required",
        "agency.transition-required",
        "agency.guardian-visibility-required",
      ]),
    );
  });

  it("keeps unavailable or unsupported rights evidence incomplete and bounded", () => {
    const packet = completePacket();
    packet.rightsEvidence[0] = {
      ...packet.rightsEvidence[0],
      status: "unavailable",
      evidenceRefs: [],
    };
    const result = evaluatePathwayReviewPacket(packet);
    expect(result.status).toBe("needs-evidence");
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["rights.evidence-not-documented", "rights.evidence-reference-missing"]),
    );
    expect(result.claim.certifiesHomeschoolQuality).toBe(false);
  });

  it("rejects extra LMS/gamification state in a review packet", () => {
    const packet = completePacket() as PathwayReviewPacket & { streak?: number; courseSequence?: string[] };
    packet.streak = 12;
    packet.courseSequence = ["course.one", "course.two"];
    expect(issueCodes(packet)).toContain("schema.invalid");
  });
});
