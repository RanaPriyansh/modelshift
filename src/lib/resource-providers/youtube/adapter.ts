import {
  createResourceObservation,
  type ResourceObservationV1,
} from "../../../forge/resources";

import {
  addYouTubeUtcCalendarDays,
  YOUTUBE_ADAPTER_RESULT_SCHEMA_VERSION,
  YOUTUBE_METADATA_REFRESH_DAYS,
  youtubeAdapterPolicySignalsSchema,
  youtubeAvailabilityReasonSchema,
  youtubeCanonicalUtcTimestampSchema,
  youtubeCapabilityDiscoveryQuerySchema,
  youtubeCountryAvailabilityResultSchema,
  youtubeCountryCodeSchema,
  youtubeProviderFailureSchema,
  youtubeVideoMetadataFixtureSchema,
  type YouTubeAdapterPolicySignalsV1,
  type YouTubeAvailabilityReason,
  type YouTubeCapabilityDiscoveryQueryV1,
  type YouTubeCountryAvailabilityResultV1,
  type YouTubeProviderFailureV1,
  type YouTubeVideoMetadataFixtureV1,
} from "./contracts";
import { deepFreeze } from "./deep-freeze";

export interface YouTubeFixtureAdapterResultV1 {
  readonly schemaVersion: typeof YOUTUBE_ADAPTER_RESULT_SCHEMA_VERSION;
  readonly fixtureOnly: true;
  readonly runtimeAssignmentAllowed: false;
  readonly providerNetworkAuthority: "absent";
  readonly observation: Readonly<ResourceObservationV1>;
  readonly policySignals: Readonly<YouTubeAdapterPolicySignalsV1>;
}

function durationSeconds(isoDuration: string): number {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(isoDuration);
  if (!match) throw new Error("A validated ISO duration was unexpectedly invalid.");
  const days = Number(match[1] ?? "0");
  const hours = Number(match[2] ?? "0");
  const minutes = Number(match[3] ?? "0");
  const seconds = Number(match[4] ?? "0");
  const total = days * 86_400 + hours * 3_600 + minutes * 60 + seconds;
  if (!Number.isInteger(total) || total <= 0 || total > 86_400) throw new Error("YouTube fixture duration must be between one second and one day.");
  return total;
}

function regionSignals(video: YouTubeVideoMetadataFixtureV1["video"]) {
  const restriction = video.contentDetails.regionRestriction;
  if (restriction?.allowed) return { mode: "allowed-list" as const, countryCodes: restriction.allowed };
  if (restriction?.blocked) return { mode: "blocked-list" as const, countryCodes: restriction.blocked };
  return { mode: "unrestricted-observed" as const, countryCodes: [] };
}

function availabilityForVideo(video: YouTubeVideoMetadataFixtureV1["video"]): YouTubeAvailabilityReason {
  if (video.status.uploadStatus === "deleted" || video.status.uploadStatus === "failed" || video.status.uploadStatus === "rejected") return "unavailable";
  if (video.status.uploadStatus !== "processed") return "not-processed";
  if (video.status.privacyStatus !== "public") return "not-public";
  return "available";
}

function policySignalsForFixture(fixture: YouTubeVideoMetadataFixtureV1): Readonly<YouTubeAdapterPolicySignalsV1> {
  const video = fixture.video;
  const regions = regionSignals(video);
  const availability = availabilityForVideo(video);
  return deepFreeze(youtubeAdapterPolicySignalsSchema.parse({
    availability,
    madeForKids: video.status.madeForKids,
    ageRestriction: video.contentDetails.contentRating?.ytRating === "ytAgeRestricted" ? "restricted" : "none-observed",
    captions: video.contentDetails.caption === "true"
      ? "provider-declared-available-language-unverified"
      : "provider-declared-unavailable",
    embed: availability === "available" && video.status.embeddable ? "allowed" : "not-allowed",
    regionMode: regions.mode,
    metadataEditRisk: "etag-bound-review-invalidation-required",
    reviewRequired: true,
    providerControlledSurfaces: ["ads", "related-videos"],
  }));
}

/** Validates an already-sanitized local fixture request. It does not search or contact YouTube. */
export function createFixtureOnlyYouTubeDiscoveryQuery(value: unknown): Readonly<YouTubeCapabilityDiscoveryQueryV1> {
  return deepFreeze(youtubeCapabilityDiscoveryQuerySchema.parse(value));
}

/**
 * Maps a checked-in YouTube `videos` fixture to the provider-neutral catalog
 * observation. This function has no inputs for a credential, URL, raw learner
 * text, request body, account, browser, or network transport.
 */
export async function mapYouTubeVideoFixtureToResourceObservation(value: unknown): Promise<Readonly<YouTubeFixtureAdapterResultV1>> {
  const fixture = youtubeVideoMetadataFixtureSchema.parse(value);
  const video = fixture.video;
  const signals = policySignalsForFixture(fixture);
  const available = signals.availability === "available";
  const regions = regionSignals(video);

  const observation = await createResourceObservation({
    schemaVersion: "resource-observation.v1",
    observationId: `resource-observation.youtube.${fixture.fixtureId.slice("youtube-fixture.".length)}`,
    resourceId: fixture.resourceId,
    observerIdentityRef: "identity.youtube.fixture-adapter",
    observedAt: fixture.observedAt,
    creator: video.snippet.channelTitle,
    title: video.snippet.title,
    language: video.snippet.defaultLanguage,
    contentType: "video",
    durationSeconds: durationSeconds(video.contentDetails.duration),
    /** The API only declares existence, not language or review quality. */
    captions: { presence: "unknown", languages: [], source: "unknown", accuracyReview: "not-reviewed", descriptiveTranscript: "unknown" },
    transcriptUse: "metadata-only",
    /** API metadata cannot establish reuse rights or sponsored-content status. */
    rightsSignals: { status: "unknown", commercialInfluence: "unknown" },
    ageSignals: {
      madeForKids: video.status.madeForKids ? "true" : "false",
      ageRestriction: signals.ageRestriction,
      manualAudienceReview: "not-reviewed",
    },
    trackingAndAds: { thirdPartyDataFlow: "unknown", adsMayAppear: "unknown", paidPlacement: "unknown" },
    regionSignals: regions,
    embedStatus: signals.embed,
    /** Canonical provider navigation is HTTPS but still needs catalog review. */
    linkOut: available ? { status: "not-reviewed" } : { status: "unavailable" },
    authorityKind: "external-provider-metadata",
    provider: "youtube",
    externalId: video.id,
    canonicalUrl: `https://www.youtube.com/watch?v=${video.id}`,
    /** ETag is included so provider metadata drift invalidates a prior review. */
    providerMetadataVersion: video.etag,
    retentionClass: "provider-metadata-ttl",
    refreshOrDeleteAt: addYouTubeUtcCalendarDays(fixture.observedAt, YOUTUBE_METADATA_REFRESH_DAYS),
  });

  return deepFreeze({
    schemaVersion: YOUTUBE_ADAPTER_RESULT_SCHEMA_VERSION,
    fixtureOnly: true,
    runtimeAssignmentAllowed: false,
    providerNetworkAuthority: "absent",
    observation,
    policySignals: signals,
  });
}

/** A pure, country-specific availability reading. It cannot assign a resource. */
export function evaluateYouTubeFixtureAvailability(
  result: Pick<YouTubeFixtureAdapterResultV1, "observation" | "policySignals">,
  countryCode: string,
): Readonly<YouTubeCountryAvailabilityResultV1> {
  const parsedCountry = youtubeCountryCodeSchema.safeParse(countryCode);
  if (!parsedCountry.success) {
    return deepFreeze(youtubeCountryAvailabilityResultSchema.parse({
      inputState: "invalid-input",
      availability: "unavailable",
      reason: "invalid-country-code",
      runtimeAssignmentAllowed: false,
    }));
  }
  const base = result.policySignals.availability;
  if (base !== "available") {
    return deepFreeze(youtubeCountryAvailabilityResultSchema.parse({
      inputState: "validated",
      availability: youtubeAvailabilityReasonSchema.parse(base),
      runtimeAssignmentAllowed: false,
    }));
  }
  const regions = result.observation.regionSignals;
  const blocked = (regions.mode === "allowed-list" && !regions.countryCodes.includes(parsedCountry.data))
    || (regions.mode === "blocked-list" && regions.countryCodes.includes(parsedCountry.data));
  return deepFreeze(youtubeCountryAvailabilityResultSchema.parse({
    inputState: "validated",
    availability: blocked ? "region-blocked" : "available",
    runtimeAssignmentAllowed: false,
  }));
}

/** Provider data is stale at its TTL boundary and must be refreshed or deleted, never silently reused. */
export function evaluateYouTubeMetadataFreshness(
  result: Pick<YouTubeFixtureAdapterResultV1, "observation">,
  asOf: string,
): Readonly<{ state: "fresh" | "stale"; refreshOrDeleteAt: string; runtimeAssignmentAllowed: false }> {
  const parsedAsOf = Date.parse(youtubeCanonicalUtcTimestampSchema.parse(asOf));
  if (result.observation.authorityKind !== "external-provider-metadata") throw new Error("YouTube observations must be external provider metadata.");
  const refreshOrDeleteAt = youtubeCanonicalUtcTimestampSchema.parse(result.observation.refreshOrDeleteAt);
  return deepFreeze({
    state: parsedAsOf >= Date.parse(refreshOrDeleteAt) ? "stale" : "fresh",
    refreshOrDeleteAt,
    runtimeAssignmentAllowed: false,
  });
}

/** A provider error can only point back to an already reviewed internal alternative. */
export function createYouTubeProviderFailure(value: unknown): Readonly<YouTubeProviderFailureV1> {
  return deepFreeze(youtubeProviderFailureSchema.parse(value));
}
