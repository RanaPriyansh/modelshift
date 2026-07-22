import { describe, expect, it } from "vitest";

import {
  createSourceAuthorityPackage,
  sourceAuthorityPackageSchema,
  sourceReviewDecisionSchema,
  type SourceAuthorityPackageInput,
  type SourceReviewPolicy,
} from "./contracts";
import {
  createSourceAuthorityReplay,
  replaySourceAuthority,
  type SourceAuthorityReplay,
} from "./replay";

const OBSERVED_AT = "2026-07-23T00:00:00.000Z";
const EXPIRES_AT = "2026-12-31T00:00:00.000Z";
const AS_OF = "2026-07-23T12:00:00.000Z";
const SCOPES = [
  "acquisition-authenticity",
  "rights",
  "factual-epistemic",
  "pedagogy",
  "accessibility",
  "age-safety",
  "proof-design",
] as const;

const POLICY: SourceReviewPolicy = {
  schemaVersion: "1.0",
  id: "source-policy.fixture",
  version: "1.0.0",
  requiredScopes: [...SCOPES],
  authorizedHumanReviewers: SCOPES.map((scope) => ({
    id: `reviewer.${scope}`,
    scopes: [scope],
  })),
};

function base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sha256Bytes(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
  return `sha256:${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function packageInput(): Promise<SourceAuthorityPackageInput> {
  const sourceText = "An authored fixture supports one bounded, reviewable claim.";
  const encodedBytes = base64(sourceText);
  const snapshotDigest = await sha256Bytes(sourceText);
  const decisions = await Promise.all(SCOPES.map(async (scope) => ({
    id: `source-review.${scope}`,
    reviewerId: `reviewer.${scope}`,
    actorKind: "accountable-human" as const,
    scope,
    outcome: "accepted" as const,
    sourceItemIds: ["source.fixture.authority"],
    rightsRecordIds: scope === "rights" ? ["source-rights.fixture"] : [],
    claimIds: scope === "factual-epistemic" ? ["source-claim.fixture"] : [],
    evidenceDigest: await sha256Bytes(`review-evidence:${scope}`),
    decidedAt: OBSERVED_AT,
    expiresAt: EXPIRES_AT,
  })));

  return {
    schemaVersion: "1.0",
    id: "source-package.fixture.authority",
    version: "1.0.0",
    policyRef: { id: POLICY.id, version: POLICY.version },
    items: [{
      id: "source.fixture.authority",
      authoredByIdentityId: "author.fixture",
      snapshot: {
        encodedBytes,
        digest: snapshotDigest,
        byteLength: new TextEncoder().encode(sourceText).byteLength,
        mediaType: "text/plain",
        acquisitionMode: "checked-in-authored-fixture",
        observedAt: OBSERVED_AT,
        canonicalLocator: { kind: "reviewed-canonical-reference", reference: "source-canonical.fixture" },
        objectReference: "source-object.fixture",
        publisherLabel: "FORGE fixture",
        versionLabel: "fixture-1",
      },
      locators: [{
        id: "source-locator.fixture.quote",
        sourceItemId: "source.fixture.authority",
        snapshotDigest,
        selector: { kind: "TextQuoteSelector", exact: "bounded, reviewable claim" },
      }],
    }],
    claims: [{
      id: "source-claim.fixture",
      sourceItemId: "source.fixture.authority",
      authoredByIdentityId: "author.fixture",
      statement: "The authored fixture supports a bounded claim for contract replay only.",
      relation: "supports",
      locatorIds: ["source-locator.fixture.quote"],
    }],
    rightsRecords: [{
      id: "source-rights.fixture",
      sourceItemId: "source.fixture.authority",
      authoredByIdentityId: "author.rights",
      permittedProductUses: ["internal-review", "curriculum-authoring"],
      spdxExpression: "CC-BY-4.0",
      productLimitations: ["No publication authority is conveyed by this fixture."],
      attribution: "FORGE source-authority fixture",
      territory: null,
      expiresAt: EXPIRES_AT,
      reviewTrigger: "Review when the immutable fixture changes.",
    }],
    reviewDecisions: decisions,
    interoperability: {
      prov: { standard: "W3C PROV-O", specVersion: "2013-04-30", entityRef: "prov-entity.fixture" },
      webAnnotation: { standard: "W3C Web Annotation Data Model", specVersion: "2017-02-23", selectorAlignment: "snapshot-bound" },
      spdx: { standard: "SPDX", specVersion: "3.0.1" },
      c2pa: {
        standard: "C2PA",
        specVersion: "2.1",
        observation: "recorded-unverified",
        establishesFactualTruth: false,
        establishesRightsClearance: false,
        establishesPublicationAuthority: false,
      },
    },
  };
}

async function packageInputWithSecondItem(): Promise<SourceAuthorityPackageInput> {
  const input = await packageInput();
  const firstItem = input.items[0]!;
  const secondItem = structuredClone(firstItem);
  secondItem.id = "source.fixture.second";
  secondItem.locators[0]!.id = "source-locator.fixture.second";
  secondItem.locators[0]!.sourceItemId = secondItem.id;
  input.items.push(secondItem);

  const secondClaim = structuredClone(input.claims[0]!);
  secondClaim.id = "source-claim.fixture.second";
  secondClaim.sourceItemId = secondItem.id;
  secondClaim.locatorIds = [secondItem.locators[0]!.id];
  input.claims.push(secondClaim);

  const secondRights = structuredClone(input.rightsRecords[0]!);
  secondRights.id = "source-rights.fixture.second";
  secondRights.sourceItemId = secondItem.id;
  input.rightsRecords.push(secondRights);

  input.reviewDecisions.push(...input.reviewDecisions.map((decision) => ({
    ...structuredClone(decision),
    id: `${decision.id}.second`,
    sourceItemIds: [secondItem.id],
    rightsRecordIds: decision.scope === "rights" ? [secondRights.id] : [],
    claimIds: decision.scope === "factual-epistemic" ? [secondClaim.id] : [],
  })));
  return input;
}

async function completeReplay(): Promise<SourceAuthorityReplay> {
  const sourcePackage = await createSourceAuthorityPackage(await packageInput());
  return createSourceAuthorityReplay({
    package: sourcePackage,
    events: [{
      id: "source-event.package-recorded",
      occurredAt: OBSERVED_AT,
      type: "package-recorded",
      packageId: sourcePackage.id,
      packageVersion: sourcePackage.version,
      packageDigest: sourcePackage.packageDigest,
    }],
  });
}

function issueCodes(result: Awaited<ReturnType<typeof replaySourceAuthority>>): readonly string[] {
  return result.issues.map((entry) => entry.code);
}

function validDependentCandidate(replay: SourceAuthorityReplay) {
  return [{
    id: "review-candidate.valid-dependent",
    sourceBindings: [{
      sourcePackageId: replay.package.id,
      sourcePackageVersion: replay.package.version,
      sourcePackageDigest: replay.package.packageDigest,
      sourceItemId: "source.fixture.authority",
      claimIds: ["source-claim.fixture"],
      rightsRecordId: "source-rights.fixture",
      requiredProductUses: ["curriculum-authoring"],
    }],
  }];
}

describe("ADR-007 source authority contract replay", () => {
  it("accepts a deterministic review candidate while retaining no publication, authenticity, durability, or human-identity claim", async () => {
    const replay = await completeReplay();
    const result = await replaySourceAuthority({ replay, reviewPolicy: POLICY, asOf: AS_OF });

    expect(result).toMatchObject({
      status: "review-candidate-complete",
      publicationAuthority: "not-established",
      sourceAuthenticity: "not-established",
      durableStorage: "not-established",
      accountableHumanApproval: "not-established",
      issues: [],
    });
  });

  it("keeps the existing source.* item identity and creates no World namespace", async () => {
    const input = await packageInput();
    expect(input.items[0]!.id).toBe("source.fixture.authority");
    expect(sourceAuthorityPackageSchema.safeParse({ ...input, id: "world.source-package.fixture" }).success).toBe(false);
    expect(sourceAuthorityPackageSchema.safeParse({ ...input, items: [{ ...input.items[0]!, id: "world.fixture" }] }).success).toBe(false);
  });

  it("rejects a digest mismatch, an oversized snapshot, and a locator outside the exact immutable snapshot", async () => {
    const input = await packageInput();
    const digestMismatch = structuredClone(input);
    digestMismatch.items[0]!.snapshot.digest = `sha256:${"a".repeat(64)}`;
    const replay = await createSourceAuthorityReplay({
      package: await createSourceAuthorityPackage(digestMismatch),
      events: [{
        id: "source-event.package-recorded",
        occurredAt: OBSERVED_AT,
        type: "package-recorded",
        packageId: "source-package.fixture.authority",
        packageVersion: "1.0.0",
        packageDigest: (await createSourceAuthorityPackage(digestMismatch)).packageDigest,
      }],
    });
    expect(issueCodes(await replaySourceAuthority({ replay, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("snapshot.digest-mismatch");

    const oversized = structuredClone(input);
    oversized.items[0]!.snapshot.byteLength = 262_145;
    expect(sourceAuthorityPackageSchema.safeParse({ ...oversized, packageDigest: `sha256:${"a".repeat(64)}` }).success).toBe(false);

    const outside = structuredClone(input);
    outside.items[0]!.locators[0]!.selector = { kind: "DataPositionSelector", start: 0, end: 99_999 };
    const outsidePackage = await createSourceAuthorityPackage(outside);
    const outsideReplay = await createSourceAuthorityReplay({
      package: outsidePackage,
      events: [{ id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: outsidePackage.id, packageVersion: outsidePackage.version, packageDigest: outsidePackage.packageDigest }],
    });
    expect(issueCodes(await replaySourceAuthority({ replay: outsideReplay, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("locator.outside-snapshot");
  });

  it("rejects AI fabricated acceptance, a scope impersonator, and self-review", async () => {
    const input = await packageInput();
    const fabricated = structuredClone(input.reviewDecisions[0]!);
    fabricated.actorKind = "ai-worker";
    expect(sourceReviewDecisionSchema.safeParse(fabricated).success).toBe(false);

    const impersonated = structuredClone(input);
    impersonated.reviewDecisions[0]!.reviewerId = "reviewer.rights";
    const impersonatedPackage = await createSourceAuthorityPackage(impersonated);
    const impersonatedReplay = await createSourceAuthorityReplay({
      package: impersonatedPackage,
      events: [{ id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: impersonatedPackage.id, packageVersion: impersonatedPackage.version, packageDigest: impersonatedPackage.packageDigest }],
    });
    expect(issueCodes(await replaySourceAuthority({ replay: impersonatedReplay, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("review.scope-impersonation");

    const selfReviewed = structuredClone(input);
    selfReviewed.items[0]!.authoredByIdentityId = "reviewer.acquisition-authenticity";
    const selfReviewedPackage = await createSourceAuthorityPackage(selfReviewed);
    const selfReviewedReplay = await createSourceAuthorityReplay({
      package: selfReviewedPackage,
      events: [{ id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: selfReviewedPackage.id, packageVersion: selfReviewedPackage.version, packageDigest: selfReviewedPackage.packageDigest }],
    });
    expect(issueCodes(await replaySourceAuthority({ replay: selfReviewedReplay, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("review.self-review");
  });

  it("fails closed on missing or expired rights and incomplete review scope", async () => {
    const input = await packageInput();
    const missingRights = structuredClone(input);
    missingRights.rightsRecords = [];
    const missingRightsPackage = await createSourceAuthorityPackage(missingRights);
    const missingRightsReplay = await createSourceAuthorityReplay({
      package: missingRightsPackage,
      events: [{ id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: missingRightsPackage.id, packageVersion: missingRightsPackage.version, packageDigest: missingRightsPackage.packageDigest }],
    });
    expect(issueCodes(await replaySourceAuthority({ replay: missingRightsReplay, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("rights.missing");

    const expired = structuredClone(input);
    expired.rightsRecords[0]!.expiresAt = "2026-07-01T00:00:00.000Z";
    expired.reviewDecisions.pop();
    const expiredPackage = await createSourceAuthorityPackage(expired);
    const expiredReplay = await createSourceAuthorityReplay({
      package: expiredPackage,
      events: [{ id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: expiredPackage.id, packageVersion: expiredPackage.version, packageDigest: expiredPackage.packageDigest }],
    });
    const codes = issueCodes(await replaySourceAuthority({ replay: expiredReplay, reviewPolicy: POLICY, asOf: AS_OF }));
    expect(codes).toContain("rights.expired");
    expect(codes).toContain("review.incomplete");
  });

  it("invalidates dependent review candidates append-only on correction or withdrawal without mutating a released binding", async () => {
    const sourcePackage = await createSourceAuthorityPackage(await packageInput());
    const replay = await createSourceAuthorityReplay({
      package: sourcePackage,
      events: [
        { id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: sourcePackage.id, packageVersion: sourcePackage.version, packageDigest: sourcePackage.packageDigest },
        {
          id: "source-event.correction",
          occurredAt: "2026-07-23T01:00:00.000Z",
          type: "correction-recorded",
          correctionId: "source-correction.fixture",
          sourceItemId: "source.fixture.authority",
          affectedSnapshotDigest: sourcePackage.items[0]!.snapshot.digest,
          affectedClaimIds: ["source-claim.fixture"],
          replacementSnapshotDigest: `sha256:${"b".repeat(64)}`,
        },
        {
          id: "source-event.withdrawal",
          occurredAt: "2026-07-23T02:00:00.000Z",
          type: "withdrawal-recorded",
          withdrawalId: "source-withdrawal.fixture",
          sourceItemId: "source.fixture.authority",
          snapshotDigest: sourcePackage.items[0]!.snapshot.digest,
          reasonCode: "rights",
        },
      ],
    });
    const result = await replaySourceAuthority({
      replay,
      reviewPolicy: POLICY,
      asOf: AS_OF,
      dependentCandidates: [{
        id: "review-candidate.fixture",
        sourceBindings: [{
          sourcePackageId: sourcePackage.id,
          sourcePackageVersion: sourcePackage.version,
          sourcePackageDigest: sourcePackage.packageDigest,
          sourceItemId: "source.fixture.authority",
          claimIds: ["source-claim.fixture"],
          rightsRecordId: "source-rights.fixture",
          requiredProductUses: ["curriculum-authoring"],
        }],
      }],
    });
    expect(result.invalidatedCandidates).toEqual([{
      candidateId: "review-candidate.fixture",
      reasons: ["source-corrected", "source-withdrawn"],
    }]);

    const rewrite = structuredClone(replay);
    const correction = rewrite.events[1]!;
    if (correction.type !== "correction-recorded") throw new Error("fixture correction missing");
    correction.replacementSnapshotDigest = correction.affectedSnapshotDigest;
    expect(issueCodes(await replaySourceAuthority({ replay: rewrite, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("event.correction-rewrite");
  });

  it("records a matured rights expiry as an append-only fact and rejects a mismatched expiry record", async () => {
    const input = await packageInput();
    input.rightsRecords[0]!.expiresAt = "2026-07-22T00:00:00.000Z";
    const sourcePackage = await createSourceAuthorityPackage(input);
    const replay = await createSourceAuthorityReplay({
      package: sourcePackage,
      events: [
        { id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: sourcePackage.id, packageVersion: sourcePackage.version, packageDigest: sourcePackage.packageDigest },
        { id: "source-event.expiry", occurredAt: "2026-07-22T00:00:01.000Z", type: "rights-expiry-recorded", expiryId: "source-expiry.fixture", sourceItemId: "source.fixture.authority", rightsRecordId: "source-rights.fixture", expiresAt: "2026-07-22T00:00:00.000Z" },
      ],
    });
    const result = await replaySourceAuthority({ replay, reviewPolicy: POLICY, asOf: AS_OF });
    expect(issueCodes(result)).toContain("rights.expired");
    expect(issueCodes(result)).not.toContain("event.rights-expiry-invalid");

    const mutated = structuredClone(replay);
    const expiry = mutated.events[1]!;
    if (expiry.type !== "rights-expiry-recorded") throw new Error("fixture expiry missing");
    expiry.expiresAt = "2026-07-21T00:00:00.000Z";
    expect(issueCodes(await replaySourceAuthority({ replay: mutated, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("event.rights-expiry-invalid");
  });

  it("rejects re-ordered, shortened, or in-place-mutated replay data", async () => {
    const sourcePackage = await createSourceAuthorityPackage(await packageInput());
    const replay = await createSourceAuthorityReplay({
      package: sourcePackage,
      events: [
        { id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: sourcePackage.id, packageVersion: sourcePackage.version, packageDigest: sourcePackage.packageDigest },
        { id: "source-event.withdrawal", occurredAt: "2026-07-23T02:00:00.000Z", type: "withdrawal-recorded", withdrawalId: "source-withdrawal.fixture", sourceItemId: "source.fixture.authority", snapshotDigest: sourcePackage.items[0]!.snapshot.digest, reasonCode: "rights" },
      ],
    });

    const shortened = structuredClone(replay);
    shortened.events.pop();
    expect(issueCodes(await replaySourceAuthority({ replay: shortened, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("event.head-mismatch");

    const reordered = structuredClone(replay);
    reordered.events.reverse();
    expect(issueCodes(await replaySourceAuthority({ replay: reordered, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("event.chain-mismatch");

    const mutated = structuredClone(replay);
    mutated.package.claims[0]!.statement = "A changed source package cannot be rewritten in place.";
    expect(issueCodes(await replaySourceAuthority({ replay: mutated, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("package.digest-mismatch");
  });

  it("invalidates valid dependent candidates for any package, snapshot, or replay-chain authority failure", async () => {
    const replay = await completeReplay();
    const tamperedPackage = structuredClone(replay);
    tamperedPackage.package.claims[0]!.statement = "A package mutation is not an authority update.";
    const tamperedSnapshot = structuredClone(replay);
    tamperedSnapshot.package.items[0]!.snapshot.encodedBytes = base64("An authored fixture supports one bounded, reviewable clai!. ");
    const tamperedReplay = structuredClone(replay);
    tamperedReplay.headDigest = `sha256:${"d".repeat(64)}`;

    for (const candidate of [tamperedPackage, tamperedSnapshot, tamperedReplay]) {
      const result = await replaySourceAuthority({
        replay: candidate,
        reviewPolicy: POLICY,
        asOf: AS_OF,
        dependentCandidates: validDependentCandidate(replay),
      });
      expect(result.invalidatedCandidates).toEqual([{
        candidateId: "review-candidate.valid-dependent",
        reasons: ["source-authority-invalid"],
      }]);
    }
  });

  it("fails closed on locally unverifiable selectors and uses decoded text bounds rather than byte length", async () => {
    const input = await packageInput();
    // The emoji is four UTF-8 bytes but one Unicode code point (and two UTF-16 code units).
    const unicodeText = "🙂";
    input.items[0]!.snapshot.encodedBytes = base64(unicodeText);
    input.items[0]!.snapshot.digest = await sha256Bytes(unicodeText);
    input.items[0]!.snapshot.byteLength = new TextEncoder().encode(unicodeText).byteLength;
    input.items[0]!.locators[0]!.snapshotDigest = input.items[0]!.snapshot.digest;
    input.items[0]!.locators[0]!.selector = { kind: "TextPositionSelector", start: 0, end: 2 };
    const textPositionPackage = await createSourceAuthorityPackage(input);
    const textPositionReplay = await createSourceAuthorityReplay({
      package: textPositionPackage,
      events: [{ id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: textPositionPackage.id, packageVersion: textPositionPackage.version, packageDigest: textPositionPackage.packageDigest }],
    });
    expect(issueCodes(await replaySourceAuthority({ replay: textPositionReplay, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("locator.outside-snapshot");

    for (const selector of [
      { kind: "FragmentSelector", value: "#reviewed" },
      { kind: "SvgSelector", x: 0, y: 0, width: 1, height: 1 },
      { kind: "TimeStateSelector", startMs: 0, endMs: 1 },
      { kind: "AuthoredFixtureFieldSelector", path: "$.claim" },
    ] as const) {
      const unverified = await packageInput();
      unverified.items[0]!.locators[0]!.selector = selector;
      const sourcePackage = await createSourceAuthorityPackage(unverified);
      const replay = await createSourceAuthorityReplay({
        package: sourcePackage,
        events: [{ id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: sourcePackage.id, packageVersion: sourcePackage.version, packageDigest: sourcePackage.packageDigest }],
      });
      expect(issueCodes(await replaySourceAuthority({ replay, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("locator.locally-unverifiable");
    }
  });

  it("binds accepted rights and factual scopes to exact artifacts and invalidates every dependent candidate when authority is blocked", async () => {
    const input = await packageInput();
    const rightsDecision = input.reviewDecisions.find((decision) => decision.scope === "rights");
    const factualDecision = input.reviewDecisions.find((decision) => decision.scope === "factual-epistemic");
    if (!rightsDecision || !factualDecision) throw new Error("fixture decisions missing");
    rightsDecision.rightsRecordIds = [];
    factualDecision.claimIds = [];
    const sourcePackage = await createSourceAuthorityPackage(input);
    const replay = await createSourceAuthorityReplay({
      package: sourcePackage,
      events: [{ id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: sourcePackage.id, packageVersion: sourcePackage.version, packageDigest: sourcePackage.packageDigest }],
    });
    const result = await replaySourceAuthority({
      replay,
      reviewPolicy: POLICY,
      asOf: AS_OF,
      dependentCandidates: [{
        id: "review-candidate.scope-binding",
        sourceBindings: [{
          sourcePackageId: sourcePackage.id,
          sourcePackageVersion: sourcePackage.version,
          sourcePackageDigest: sourcePackage.packageDigest,
          sourceItemId: "source.fixture.authority",
          claimIds: ["source-claim.fixture"],
          rightsRecordId: "source-rights.fixture",
          requiredProductUses: ["internal-review"],
        }],
      }],
    });
    expect(issueCodes(result)).toContain("review.artifact-binding-missing");
    expect(result.invalidatedCandidates).toEqual([{
      candidateId: "review-candidate.scope-binding",
      reasons: ["source-authority-invalid"],
    }]);
  });

  it("rejects extra cross-item review artifacts even when every required local artifact is present", async () => {
    const input = await packageInputWithSecondItem();
    const firstRightsDecision = input.reviewDecisions.find((decision) => decision.scope === "rights" && decision.sourceItemIds[0] === "source.fixture.authority");
    if (!firstRightsDecision) throw new Error("fixture rights decision missing");
    firstRightsDecision.rightsRecordIds = ["source-rights.fixture", "source-rights.fixture.second"];
    const sourcePackage = await createSourceAuthorityPackage(input);
    const replay = await createSourceAuthorityReplay({
      package: sourcePackage,
      events: [{ id: "source-event.package-recorded", occurredAt: OBSERVED_AT, type: "package-recorded", packageId: sourcePackage.id, packageVersion: sourcePackage.version, packageDigest: sourcePackage.packageDigest }],
    });
    expect(issueCodes(await replaySourceAuthority({ replay, reviewPolicy: POLICY, asOf: AS_OF }))).toContain("review.artifact-binding-missing");
  });

  it("rejects invented candidate bindings, cross-item rights, and unpermitted product use", async () => {
    const replay = await completeReplay();
    const result = await replaySourceAuthority({
      replay,
      reviewPolicy: POLICY,
      asOf: AS_OF,
      dependentCandidates: [{
        id: "review-candidate.invalid-binding",
        sourceBindings: [{
          sourcePackageId: replay.package.id,
          sourcePackageVersion: replay.package.version,
          sourcePackageDigest: replay.package.packageDigest,
          sourceItemId: "source.fixture.invented",
          claimIds: ["source-claim.invented"],
          rightsRecordId: "source-rights.fixture",
          requiredProductUses: ["bounded-excerpt"],
        }],
      }],
    });
    expect(issueCodes(result)).toContain("candidate.binding-invalid");
    expect(result.invalidatedCandidates).toEqual([{
      candidateId: "review-candidate.invalid-binding",
      reasons: ["candidate-binding-invalid"],
    }]);
  });

  it("rejects raw learner/model/key fields, duplicate IDs, and unsupported C2PA truth elevation", async () => {
    const input = await packageInput();
    expect(sourceAuthorityPackageSchema.safeParse({ ...input, rawLearnerText: "private" }).success).toBe(false);
    expect(sourceAuthorityPackageSchema.safeParse({ ...input, modelOutput: "private" }).success).toBe(false);
    expect(sourceAuthorityPackageSchema.safeParse({ ...input, apiKey: "private" }).success).toBe(false);
    expect(sourceAuthorityPackageSchema.safeParse({ ...input, claims: [...input.claims, input.claims[0]!], packageDigest: `sha256:${"a".repeat(64)}` }).success).toBe(false);
    expect(sourceAuthorityPackageSchema.safeParse({
      ...input,
      interoperability: {
        ...input.interoperability!,
        c2pa: {
          ...input.interoperability!.c2pa!,
          establishesFactualTruth: true,
        },
      },
      packageDigest: `sha256:${"a".repeat(64)}`,
    }).success).toBe(false);
  });
});
