import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createFixtureOnlyYouTubeClickToLoadPolicy,
  createFixtureOnlyYouTubeDiscoveryQuery,
  createYouTubeProviderFailure,
  evaluateYouTubeFixtureAvailability,
  evaluateYouTubeMetadataFreshness,
  mapYouTubeVideoFixtureToResourceObservation,
  planYouTubeEmbedRequest,
  YOUTUBE_ISO_3166_ALPHA_2_COUNTRY_CODES,
  youtubeCapabilityDiscoveryQuerySchema,
  youtubeClickToLoadPolicySchema,
  youtubeVideoMetadataFixtureSchema,
} from "../index";
import {
  YOUTUBE_MADE_FOR_KIDS_FIXTURE,
  YOUTUBE_NO_CAPTIONS_FIXTURE,
  YOUTUBE_NOT_EMBEDDABLE_FIXTURE,
  YOUTUBE_UNAVAILABLE_FIXTURE,
  YOUTUBE_VIDEO_FIXTURE,
} from "../__fixtures__/youtube-video-fixtures";

const MODULE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function productionSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : productionSourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("W6-C disabled YouTube discovery adapter", () => {
  it("accepts only closed capability-bound fixture discovery input and rejects prose, PII, URL, credential, and public-key fields", () => {
    const query = createFixtureOnlyYouTubeDiscoveryQuery({
      schemaVersion: "youtube-capability-query.v1",
      fixtureOnly: true,
      audience: "adult",
      curriculumNodeId: "curriculum-node.physics.force-motion",
      capabilityId: "capability.physics.force-motion",
      capabilityVersion: "1.0.0",
      purpose: "demonstration",
      language: "en",
      countryCode: "IN",
      accessTokens: ["captions", "transcript"],
      materialClasses: ["computer"],
    });
    expect(query).toMatchObject({ fixtureOnly: true, purpose: "demonstration" });
    expect(Object.isFrozen(query)).toBe(true);
    expect(Object.isFrozen(query.accessTokens)).toBe(true);
    expect(youtubeCapabilityDiscoveryQuerySchema.safeParse({ ...query, learnerWords: "my private learning story" }).success).toBe(false);
    expect(youtubeCapabilityDiscoveryQuerySchema.safeParse({ ...query, query: "how does this work" }).success).toBe(false);
    expect(youtubeCapabilityDiscoveryQuerySchema.safeParse({ ...query, email: "learner@example.test" }).success).toBe(false);
    expect(youtubeCapabilityDiscoveryQuerySchema.safeParse({ ...query, url: "https://example.test" }).success).toBe(false);
    expect(youtubeCapabilityDiscoveryQuerySchema.safeParse({ ...query, apiKey: "not-accepted" }).success).toBe(false);
    expect(youtubeCapabilityDiscoveryQuerySchema.safeParse({ ...query, NEXT_PUBLIC_TOKEN: "not-accepted" }).success).toBe(false);
    expect(YOUTUBE_ISO_3166_ALPHA_2_COUNTRY_CODES).toHaveLength(249);
    expect(youtubeCapabilityDiscoveryQuerySchema.safeParse({ ...query, countryCode: "ZZ" }).success).toBe(false);
    expect(youtubeCapabilityDiscoveryQuerySchema.safeParse({ ...query, countryCode: "in" }).success).toBe(false);
    expect(youtubeCapabilityDiscoveryQuerySchema.safeParse({ ...query, countryCode: "USA" }).success).toBe(false);
  });

  it("maps documented video metadata into a provider-neutral, 30-day TTL observation while keeping assignment and network authority off", async () => {
    const result = await mapYouTubeVideoFixtureToResourceObservation(YOUTUBE_VIDEO_FIXTURE);
    expect(result).toMatchObject({ fixtureOnly: true, runtimeAssignmentAllowed: false, providerNetworkAuthority: "absent" });
    expect(result.observation).toMatchObject({
      authorityKind: "external-provider-metadata",
      provider: "youtube",
      externalId: "aB3dE5fG7h_",
      providerMetadataVersion: "fixture-etag-force-basics-v1",
      refreshOrDeleteAt: "2026-07-31T12:00:00.000Z",
      captions: { presence: "unknown", languages: [] },
      rightsSignals: { status: "unknown" },
    });
    expect(result.policySignals).toMatchObject({ captions: "provider-declared-available-language-unverified", embed: "allowed", reviewRequired: true });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.observation)).toBe(true);
    expect(Object.isFrozen(result.observation.captions)).toBe(true);
    expect(Object.isFrozen(result.policySignals.providerControlledSurfaces)).toBe(true);
    expect(evaluateYouTubeMetadataFreshness(result, "2026-07-30T23:59:59.999Z")).toMatchObject({ state: "fresh", runtimeAssignmentAllowed: false });
    expect(evaluateYouTubeMetadataFreshness(result, "2026-07-31T12:00:00.000Z")).toMatchObject({ state: "stale", runtimeAssignmentAllowed: false });
    expect(youtubeVideoMetadataFixtureSchema.safeParse({ ...YOUTUBE_VIDEO_FIXTURE, credential: "not-accepted" }).success).toBe(false);
    expect(youtubeVideoMetadataFixtureSchema.safeParse({ ...YOUTUBE_VIDEO_FIXTURE, learnerWords: "not-accepted" }).success).toBe(false);
    expect(youtubeVideoMetadataFixtureSchema.safeParse({ ...YOUTUBE_VIDEO_FIXTURE, observedAt: "2026-07-01T17:30:00.000+05:30" }).success).toBe(false);
    expect(() => evaluateYouTubeMetadataFreshness(result, "2026-07-31T17:30:00.000+05:30")).toThrow();
  });

  it("uses UTC calendar-day retention across a DST season and rejects offset timestamps", async () => {
    const result = await mapYouTubeVideoFixtureToResourceObservation({
      ...YOUTUBE_VIDEO_FIXTURE,
      fixtureId: "youtube-fixture.dst-crossing",
      resourceId: "resource.youtube.dst-crossing",
      observedAt: "2026-03-07T08:30:00.000Z",
    });
    if (result.observation.authorityKind !== "external-provider-metadata") throw new Error("Expected an external metadata observation.");
    expect(result.observation.refreshOrDeleteAt).toBe("2026-04-06T08:30:00.000Z");
    expect(evaluateYouTubeMetadataFreshness(result, "2026-04-06T08:29:59.999Z").state).toBe("fresh");
    expect(evaluateYouTubeMetadataFreshness(result, "2026-04-06T08:30:00.000Z").state).toBe("stale");
    await expect(mapYouTubeVideoFixtureToResourceObservation({
      ...YOUTUBE_VIDEO_FIXTURE,
      observedAt: "2026-03-07T00:30:00.000-08:00",
    })).rejects.toThrow();
  });

  it("fails closed for missing critical audience/caption metadata and models unavailable, region, caption, and embed failures", async () => {
    const missingMadeForKids = structuredClone(YOUTUBE_VIDEO_FIXTURE) as Record<string, unknown>;
    delete ((missingMadeForKids.video as { status: Record<string, unknown> }).status.madeForKids);
    expect(youtubeVideoMetadataFixtureSchema.safeParse(missingMadeForKids).success).toBe(false);
    const missingCaption = structuredClone(YOUTUBE_VIDEO_FIXTURE) as Record<string, unknown>;
    delete ((missingCaption.video as { contentDetails: Record<string, unknown> }).contentDetails.caption);
    expect(youtubeVideoMetadataFixtureSchema.safeParse(missingCaption).success).toBe(false);
    const missingRating = structuredClone(YOUTUBE_VIDEO_FIXTURE) as Record<string, unknown>;
    delete ((missingRating.video as { contentDetails: Record<string, unknown> }).contentDetails.contentRating);
    expect(youtubeVideoMetadataFixtureSchema.safeParse(missingRating).success).toBe(false);

    const unavailable = await mapYouTubeVideoFixtureToResourceObservation(YOUTUBE_UNAVAILABLE_FIXTURE);
    const noCaptions = await mapYouTubeVideoFixtureToResourceObservation(YOUTUBE_NO_CAPTIONS_FIXTURE);
    const notEmbeddable = await mapYouTubeVideoFixtureToResourceObservation(YOUTUBE_NOT_EMBEDDABLE_FIXTURE);
    const regionBlocked = await mapYouTubeVideoFixtureToResourceObservation(YOUTUBE_VIDEO_FIXTURE);
    expect(unavailable).toMatchObject({ policySignals: { availability: "unavailable", embed: "not-allowed" }, observation: { linkOut: { status: "unavailable" } } });
    expect(noCaptions.policySignals.captions).toBe("provider-declared-unavailable");
    expect(notEmbeddable.policySignals.embed).toBe("not-allowed");
    expect(evaluateYouTubeFixtureAvailability(regionBlocked, "KP")).toEqual({
      inputState: "validated",
      availability: "region-blocked",
      runtimeAssignmentAllowed: false,
    });
    expect(evaluateYouTubeFixtureAvailability(regionBlocked, "IN")).toEqual({
      inputState: "validated",
      availability: "available",
      runtimeAssignmentAllowed: false,
    });
    for (const invalidCountryCode of ["ZZ", "in", "I", "USA", ""]) {
      expect(evaluateYouTubeFixtureAvailability(regionBlocked, invalidCountryCode)).toEqual({
        inputState: "invalid-input",
        availability: "unavailable",
        reason: "invalid-country-code",
        runtimeAssignmentAllowed: false,
      });
    }
    expect(youtubeVideoMetadataFixtureSchema.safeParse({
      ...YOUTUBE_VIDEO_FIXTURE,
      video: {
        ...YOUTUBE_VIDEO_FIXTURE.video,
        contentDetails: {
          ...YOUTUBE_VIDEO_FIXTURE.video.contentDetails,
          regionRestriction: { blocked: ["ZZ"] },
        },
      },
    }).success).toBe(false);
  });

  it("binds the metadata ETag into the generic review-signal digest so fixture drift invalidates a prior review", async () => {
    const original = await mapYouTubeVideoFixtureToResourceObservation(YOUTUBE_VIDEO_FIXTURE);
    const drifted = await mapYouTubeVideoFixtureToResourceObservation({
      ...YOUTUBE_VIDEO_FIXTURE,
      video: { ...YOUTUBE_VIDEO_FIXTURE.video, etag: "fixture-etag-force-basics-v2" },
    });
    expect(drifted.observation.observationRecordDigest).not.toBe(original.observation.observationRecordDigest);
    expect(drifted.observation.reviewSignalDigest).not.toBe(original.observation.reviewSignalDigest);
  });

  it("degrades a quota or provider outage only to an already reviewed internal alternative contract", () => {
    const failure = createYouTubeProviderFailure({
      schemaVersion: "youtube-provider-failure.v1",
      fixtureOnly: true,
      provider: "youtube",
      kind: "quota-exhausted",
      occurredAt: "2026-07-23T12:00:00.000Z",
      fallback: { route: "reviewed-internal-alternative-only", requiresExistingCatalogEligibility: true, externalAssignmentAllowed: false },
    });
    expect(failure).toMatchObject({ kind: "quota-exhausted", fallback: { route: "reviewed-internal-alternative-only", externalAssignmentAllowed: false } });
    expect(Object.isFrozen(failure)).toBe(true);
  });

  it("describes a click-to-load player without autoplay, iframe creation, branding suppression, or overlay interference", () => {
    const policy = createFixtureOnlyYouTubeClickToLoadPolicy({
      origin: "https://forge.example",
      policyOwnerIdentityRef: "identity.policy.youtube-owner",
      policyReviewedAt: "2026-07-01T12:00:00.000Z",
      madeForKids: false,
    });
    expect(policy).toMatchObject({
      fixtureOnly: true,
      externalPlaybackEnabled: false,
      autoplay: 0,
      controls: 1,
      branding: "provider-controlled",
      brandSuppression: "prohibited",
      playerOverlay: "prohibited",
      origin: "https://forge.example",
      referrerPolicy: "strict-origin-when-cross-origin",
      minimumPlayerSize: { width: 200, height: 200 },
      audienceProtection: {
        madeForKids: false,
        tracking: "provider-policy-review-required-before-enable",
        liveEnablementGate: "blocked-until-separate-enable-authority",
      },
      policyRevalidation: { cadenceDays: 90, nextReviewDueAt: "2026-09-29T12:00:00.000Z" },
    });
    expect(Object.isFrozen(policy.privacy)).toBe(true);
    expect(Object.isFrozen(policy.audienceProtection)).toBe(true);
    expect(youtubeClickToLoadPolicySchema.safeParse({
      ...policy,
      policyRevalidation: { ...policy.policyRevalidation, nextReviewDueAt: "2026-09-29T12:00:00.001Z" },
    }).success).toBe(false);
    expect(planYouTubeEmbedRequest(policy, false)).toEqual({ kind: "no-iframe-request", reason: "explicit-playback-election-required" });
    expect(planYouTubeEmbedRequest(policy, true)).toEqual({ kind: "no-iframe-request", reason: "provider-disabled" });
  });

  it("keeps Made-for-Kids playback disabled behind tracking-off and privacy-compliance proof", async () => {
    const result = await mapYouTubeVideoFixtureToResourceObservation(YOUTUBE_MADE_FOR_KIDS_FIXTURE);
    expect(result.policySignals.madeForKids).toBe(true);

    const policy = createFixtureOnlyYouTubeClickToLoadPolicy({
      origin: "https://forge.example",
      policyOwnerIdentityRef: "identity.policy.youtube-owner",
      policyReviewedAt: "2026-03-07T08:30:00.000Z",
      madeForKids: result.policySignals.madeForKids,
    });
    expect(policy).toMatchObject({
      externalPlaybackEnabled: false,
      audienceProtection: {
        madeForKids: true,
        tracking: "must-be-disabled-before-enable",
        playerDataCollection: "privacy-preserving-and-legally-compliant-configuration-required-before-enable",
        liveEnablementGate: "blocked-until-made-for-kids-compliance-proof",
      },
      policyRevalidation: { nextReviewDueAt: "2026-06-05T08:30:00.000Z" },
    });
    expect(planYouTubeEmbedRequest(policy, true)).toEqual({
      kind: "no-iframe-request",
      reason: "made-for-kids-protection-gate-unsatisfied",
    });
    expect(() => createFixtureOnlyYouTubeClickToLoadPolicy({
      origin: "https://forge.example",
      policyOwnerIdentityRef: "identity.policy.youtube-owner",
      policyReviewedAt: "2026-03-07T00:30:00.000-08:00",
      madeForKids: true,
    })).toThrow();
  });

  it("has no prohibited live-provider surface, credential input, media/transcript retrieval, feed, ranking, or autoplay source", () => {
    const source = productionSourceFiles(MODULE_ROOT).map((path) => readFileSync(path, "utf8")).join("\n");
    const forbidden = [
      "YOUTUBE" + "_API_KEY",
      "NEXT_PUBLIC" + "_",
      "fetch" + "(",
      "download" + "Caption",
      "download" + "Media",
      "search" + "(",
      "feed" + "(",
      "ranking" + "(",
      "watch" + "Time",
      "like" + "Count",
      "view" + "Count",
      "comments" + "(",
      "sponsor" + "Preference",
      "model" + "Preference",
      "auto" + "play: 1",
    ];
    for (const token of forbidden) expect(source).not.toContain(token);
    expect(source).not.toMatch(/https:\/\/www\.googleapis\.com\//);
  });
});
