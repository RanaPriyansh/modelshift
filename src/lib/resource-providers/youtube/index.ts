export {
  createFixtureOnlyYouTubeDiscoveryQuery,
  createYouTubeProviderFailure,
  evaluateYouTubeFixtureAvailability,
  evaluateYouTubeMetadataFreshness,
  mapYouTubeVideoFixtureToResourceObservation,
} from "./adapter";

export {
  createFixtureOnlyYouTubeClickToLoadPolicy,
  planYouTubeEmbedRequest,
} from "./policy";

export {
  YOUTUBE_ADAPTER_RESULT_SCHEMA_VERSION,
  YOUTUBE_DISCOVERY_PURPOSES,
  YOUTUBE_DISCOVERY_QUERY_SCHEMA_VERSION,
  YOUTUBE_EMBED_POLICY_SCHEMA_VERSION,
  YOUTUBE_ISO_3166_ALPHA_2_COUNTRY_CODES,
  YOUTUBE_METADATA_FIXTURE_SCHEMA_VERSION,
  YOUTUBE_METADATA_REFRESH_DAYS,
  YOUTUBE_POLICY_REVALIDATION_DAYS,
  YOUTUBE_QUERY_ACCESS_TOKENS,
  YOUTUBE_QUERY_MATERIAL_CLASSES,
  YOUTUBE_ROUTE_LANGUAGES,
  youtubeCapabilityDiscoveryQuerySchema,
  youtubeCanonicalUtcTimestampSchema,
  youtubeClickToLoadPolicyInputSchema,
  youtubeClickToLoadPolicySchema,
  youtubeCountryAvailabilityResultSchema,
  youtubeCountryCodeSchema,
  youtubeEmbedRequestPlanSchema,
  youtubeProviderFailureSchema,
  youtubeVideoMetadataFixtureSchema,
} from "./contracts";

export type {
  YouTubeAdapterPolicySignalsV1,
  YouTubeAvailabilityReason,
  YouTubeCapabilityDiscoveryQueryV1,
  YouTubeCaptionStatus,
  YouTubeClickToLoadPolicyInputV1,
  YouTubeClickToLoadPolicyV1,
  YouTubeCountryAvailabilityResultV1,
  YouTubeEmbedRequestPlanV1,
  YouTubeProviderFailureV1,
  YouTubeVideoMetadataFixtureV1,
} from "./contracts";

export type { YouTubeFixtureAdapterResultV1 } from "./adapter";
