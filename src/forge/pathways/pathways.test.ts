import { describe, expect, it } from "vitest";

import {
  PATHWAY_ACCESS_REQUIREMENTS,
  PATHWAY_ENTITLEMENT_AREAS,
  PATHWAY_SOURCE_REFS,
  type PathwayReviewPacket,
} from "./contracts";
import { CURRENT_FORGE_PATHWAY_CATALOG } from "./catalog";
import { evaluatePathwayReviewPacket } from "./review";

const REVIEWED_AT = "2026-07-22T12:00:00.000Z";

function packetFor(ageMode: PathwayReviewPacket["ageMode"] = "13-17"): PathwayReviewPacket {
  const eligible = CURRENT_FORGE_PATHWAY_CATALOG.capabilities.filter((capability) => capability.ageModes.includes(ageMode));
  const byArea: ReadonlyMap<string, (typeof eligible)[number] | undefined> = new Map([
    ["mathematics", eligible.find((capability) => capability.capabilityId === "capability.proportional-reasoning.compare-and-scale")],
    ["science", eligible.find((capability) => capability.capabilityId === "capability.force-motion.zero-net-force")],
    ["computing-ai", eligible.find((capability) => capability.capabilityId === "capability.ai-literacy.source-corroboration")],
    ["history-source-reasoning", eligible.find((capability) => capability.worldId === "world.primary-source-reasoning")],
  ]);
  const published = [...byArea.entries()].filter(
    (entry): entry is [string, (typeof eligible)[number]] => entry[1] !== undefined,
  );
  const requiresGuardianDeclaration = ageMode === "under-13" && published.some(([, capability]) => capability.guardianManaged);

  return {
    schemaVersion: "1.0",
    id: `packet.fixture.${ageMode.replace("-", ".")}`,
    reviewedAt: REVIEWED_AT,
    ageMode,
    sourceRefs: [...PATHWAY_SOURCE_REFS],
    entitlements: PATHWAY_ENTITLEMENT_AREAS.map((area) => {
      const capability = byArea.get(area);
      if (!capability) {
        return {
          area,
          state: "identified-gap" as const,
          learnerPosition: "shared" as const,
          limitationRef: `limit.${area}.not-published`,
        };
      }
      return {
        area,
        state: "published-capability" as const,
        capabilityId: capability.capabilityId,
        worldId: capability.worldId,
        evidenceTier: capability.evidenceTier,
        sourcePolicy: capability.sourcePolicies[0],
        learnerPosition: "chosen" as const,
      };
    }),
    evidenceClaims: published.map(([, capability]) => ({
      id: `claim.${capability.capabilityId.split(".").at(-1)}`,
      capabilityId: capability.capabilityId,
      eventType: "evidence.recorded" as const,
      eventRef: `event.fixture.${capability.worldId}`,
      claimKind: "deterministic-result-recorded" as const,
      statement: "A named Forge event records a bounded observed result for independent review.",
      sourceIds: [...capability.sourceIds],
    })),
    foundations: {
      status: "documented-for-review",
      benchmarkPlanRef: "plan.foundation.external-review",
      limitationRef: "limit.foundation.current-worlds-only",
    },
    learnerAgency: {
      learnerPositionRecorded: true,
      canChooseAlternative: true,
      canPauseWithoutPenalty: true,
      canDeclineWithoutPenalty: true,
      canRequestHelp: true,
      canStateUncertainty: true,
      canContestEvidence: true,
      independentReviewPathRef: "path.independent-review",
    },
    accessibility: {
      supportedRequirements: [...PATHWAY_ACCESS_REQUIREMENTS],
      assistanceRecordedSeparately: true,
      constructChangesDisclosed: true,
    },
    consentAssent: {
      externalAction: "none",
      relationshipEvidence: requiresGuardianDeclaration ? "declared-for-review" : "not-needed",
      guardianConsent: requiresGuardianDeclaration ? "declared-for-review" : "not-needed",
      learnerAssent: requiresGuardianDeclaration ? "recorded-for-review" : "not-needed",
      visibilityToLearner: true,
    },
    relationships: {
      status: "documented-for-review",
      humanReviewRef: "reviewer.independent.fixture",
      limitationRef: "limit.relationships.require-human-judgment",
    },
    protection: {
      noOpenMinorMessaging: true,
      noMandatoryPublicPosting: true,
      noPreciseLocation: true,
      accessibleReportingPathRef: "path.accessible-reporting",
      limitationRef: "limit.protection.no-safety-claim",
    },
    portability: {
      status: "documented-untested",
      exportPlanRef: "plan.portable-export",
      transitionOptionRefs: ["transition.further-study"],
      limitationRef: "limit.portability.requires-external-review",
    },
    coercion: {
      noPenaltyForPause: true,
      noEngagementQuota: true,
      noGuiltOrUrgencyNudges: true,
    },
    interfaceSignals: {
      hasPoints: false,
      hasBadges: false,
      hasStreaks: false,
      hasLeaderboards: false,
      hasComparativeRank: false,
      hasCompletionRace: false,
    },
  };
}

function issueCodes(candidate: unknown): readonly string[] {
  return evaluatePathwayReviewPacket(candidate).issues.map((issue) => issue.code);
}

describe("FORGE Packet C pathway review", () => {
  it("projects only capability IDs currently released by World manifests", () => {
    expect(CURRENT_FORGE_PATHWAY_CATALOG.capabilities.map((capability) => capability.capabilityId).sort()).toEqual([
      "capability.ai-literacy.source-corroboration",
      "capability.force-motion.zero-net-force",
      "capability.proportional-reasoning.compare-and-scale",
      "capability.historical-literacy.observation-inference",
    ].sort());
    expect(CURRENT_FORGE_PATHWAY_CATALOG.capabilities.every((capability) => capability.evidenceEventTypes.includes("evidence.recorded"))).toBe(true);
  });

  it.each(["under-13", "13-17", "18-plus"] as const)("allows a bounded review packet for %s", (ageMode) => {
    const result = evaluatePathwayReviewPacket(packetFor(ageMode));
    expect(result.status).toBe("evidence-complete-for-independent-review");
    expect(result.issues).toEqual([]);
    expect(result.claim).toMatchObject({
      level: "C0",
      certifiesLearningEfficacy: false,
      certifiesSafetyOrLegalCompliance: false,
      certifiesPathwayQuality: false,
    });
  });

  it.each([
    ["breadth", (packet: PathwayReviewPacket) => { packet.entitlements = packet.entitlements.filter((entry) => entry.area !== "arts-design"); }, "breadth.entitlement-missing"],
    ["agency", (packet: PathwayReviewPacket) => { packet.learnerAgency.canPauseWithoutPenalty = false; }, "agency.pause-missing"],
    ["access", (packet: PathwayReviewPacket) => { packet.accessibility.supportedRequirements = packet.accessibility.supportedRequirements.filter((entry) => entry !== "reduced-motion"); }, "access.requirement-missing"],
    ["consent and assent", (packet: PathwayReviewPacket) => { packet.ageMode = "under-13"; packet.consentAssent = { ...packet.consentAssent, externalAction: "external-sharing", relationshipEvidence: "not-documented", guardianConsent: "not-documented", learnerAssent: "not-documented", visibilityToLearner: false }; }, "consent.guardian-declaration-missing"],
    ["relationships", (packet: PathwayReviewPacket) => { packet.relationships = { ...packet.relationships, status: "not-documented", humanReviewRef: undefined }; }, "relationships.not-documented"],
    ["protection", (packet: PathwayReviewPacket) => { packet.protection = { ...packet.protection, noOpenMinorMessaging: false, accessibleReportingPathRef: undefined }; }, "protection.open-minor-messaging"],
    ["portability", (packet: PathwayReviewPacket) => { packet.portability = { ...packet.portability, status: "not-documented", exportPlanRef: undefined, transitionOptionRefs: [] }; }, "portability.not-documented"],
    ["foundations", (packet: PathwayReviewPacket) => { packet.foundations = { ...packet.foundations, status: "not-documented", benchmarkPlanRef: undefined }; }, "foundations.not-documented"],
    ["coercion", (packet: PathwayReviewPacket) => { packet.coercion = { ...packet.coercion, noPenaltyForPause: false }; }, "coercion.pause-penalty"],
    ["hidden gamification", (packet: PathwayReviewPacket) => { packet.interfaceSignals = { ...packet.interfaceSignals, hasStreaks: true }; }, "gamification.hidden-signal"],
    ["invalid evidence claim", (packet: PathwayReviewPacket) => { packet.evidenceClaims[0] = { ...packet.evidenceClaims[0], statement: "This certifies the learner's mastery in every setting." }; }, "evidence.claim-overreach"],
  ])("returns needs-evidence for %s fixture", (_name, mutate, expectedCode) => {
    const packet = structuredClone(packetFor());
    mutate(packet);
    const result = evaluatePathwayReviewPacket(packet);
    expect(result.status).toBe("needs-evidence");
    expect(result.issues.map((issue) => issue.code)).toContain(expectedCode);
  });

  it("does not let a declared guardian boundary broaden under-13 sources to open web", () => {
    const packet = packetFor("under-13");
    packet.consentAssent = {
      externalAction: "open-web",
      relationshipEvidence: "declared-for-review",
      guardianConsent: "declared-for-review",
      learnerAssent: "recorded-for-review",
      visibilityToLearner: true,
    };
    expect(issueCodes(packet)).toContain("consent.child-open-web-prohibited");
  });

  it("rejects an invented capability binding and unsupported source claim", () => {
    const packet = packetFor();
    const published = packet.entitlements.find((entry) => entry.state === "published-capability");
    if (!published || published.state !== "published-capability") throw new Error("Fixture needs a published capability.");
    published.capabilityId = "capability.invented.fixture";
    packet.evidenceClaims[0] = { ...packet.evidenceClaims[0], sourceIds: ["source.invented.fixture"] };
    expect(issueCodes(packet)).toEqual(expect.arrayContaining(["capability.unknown", "evidence.source-mismatch"]));
  });

  it("fails closed on undeclared LMS state through the strict packet schema", () => {
    const packet = packetFor() as PathwayReviewPacket & { streak?: number };
    packet.streak = 3;
    expect(issueCodes(packet)).toContain("schema.invalid");
  });

  it("fails closed when a caller supplies a malformed capability catalog", () => {
    const result = evaluatePathwayReviewPacket(packetFor(), { schemaVersion: "1.0", generatedFrom: "released-world-packs", capabilities: [] });
    expect(result.status).toBe("needs-evidence");
    expect(result.issues.map((issue) => issue.code)).toContain("schema.invalid");
  });
});
