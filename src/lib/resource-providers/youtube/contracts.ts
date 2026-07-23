import { z } from "zod";

z.config({ jitless: true });

/**
 * W6-C is a metadata fixture boundary only. It intentionally contains no
 * credential, transport, browser, player, or account authority.
 */
export const YOUTUBE_DISCOVERY_QUERY_SCHEMA_VERSION = "youtube-capability-query.v1" as const;
export const YOUTUBE_METADATA_FIXTURE_SCHEMA_VERSION = "youtube-video-metadata-fixture.v1" as const;
export const YOUTUBE_ADAPTER_RESULT_SCHEMA_VERSION = "youtube-adapter-result.v1" as const;
export const YOUTUBE_EMBED_POLICY_SCHEMA_VERSION = "youtube-click-to-load-policy.v1" as const;

export const YOUTUBE_DISCOVERY_PURPOSES = ["demonstration", "worked-example", "comparison"] as const;
export const YOUTUBE_ROUTE_LANGUAGES = ["ar", "de", "en", "es", "fr", "hi", "ja", "ko", "pt", "zh-Hans", "zh-Hant"] as const;
export const YOUTUBE_QUERY_ACCESS_TOKENS = ["captions", "keyboard-only", "low-bandwidth", "reduced-motion", "screen-reader", "transcript"] as const;
export const YOUTUBE_QUERY_MATERIAL_CLASSES = ["computer", "common-household", "none", "paper"] as const;

/**
 * Static ISO 3166-1 alpha-2 allowlist. Provider input is not normalized:
 * lowercase, reserved, private-use, and unknown tokens fail closed.
 */
export const YOUTUBE_ISO_3166_ALPHA_2_COUNTRY_CODES = Object.freeze([
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
  "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
  "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
] as const);

const countryCodeSet = new Set<string>(YOUTUBE_ISO_3166_ALPHA_2_COUNTRY_CODES);

/**
 * Only the canonical ECMAScript/ISO form is accepted:
 * `YYYY-MM-DDTHH:mm:ss.sssZ`. Rejecting offsets makes calendar retention an
 * unambiguous UTC rule rather than a host-timezone or DST calculation.
 */
export const youtubeCanonicalUtcTimestampSchema = z.string()
  .datetime({ offset: false, precision: 3 })
  .refine((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
  }, "Use a canonical UTC timestamp ending in .sssZ.");

export function addYouTubeUtcCalendarDays(isoTimestamp: string, days: number): string {
  const canonicalTimestamp = youtubeCanonicalUtcTimestampSchema.parse(isoTimestamp);
  if (!Number.isInteger(days) || days < 0) throw new Error("UTC calendar days must be a non-negative integer.");
  const result = new Date(canonicalTimestamp);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString();
}

export const youtubeCountryCodeSchema = z.string().refine(
  (value) => countryCodeSet.has(value),
  "Use an exact uppercase ISO 3166-1 alpha-2 country code.",
);
const capabilityIdSchema = z.string().trim().max(160).regex(/^capability\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const curriculumNodeIdSchema = z.string().trim().max(160).regex(/^curriculum-node\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const resourceIdSchema = z.string().trim().max(160).regex(/^resource\.youtube\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const fixtureIdSchema = z.string().trim().max(160).regex(/^youtube-fixture\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const etagSchema = z.string().trim().min(1).max(320);
const youtubeVideoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/);
const textSchema = z.string().trim().min(1).max(600);

function uniqueValues<T extends z.ZodTypeAny>(item: T, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const identity = typeof value === "string" ? value : JSON.stringify(value);
      if (seen.has(identity)) context.addIssue({ code: "custom", path: [index], message: "Values must be unique." });
      seen.add(identity);
    });
  });
}

/**
 * This is deliberately not a text-search request. It has no field through
 * which learner prose, private notes, names, or contact data can pass.
 */
export const youtubeCapabilityDiscoveryQuerySchema = z.strictObject({
  schemaVersion: z.literal(YOUTUBE_DISCOVERY_QUERY_SCHEMA_VERSION),
  fixtureOnly: z.literal(true),
  audience: z.literal("adult"),
  curriculumNodeId: curriculumNodeIdSchema,
  capabilityId: capabilityIdSchema,
  capabilityVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  purpose: z.enum(YOUTUBE_DISCOVERY_PURPOSES),
  language: z.enum(YOUTUBE_ROUTE_LANGUAGES),
  countryCode: youtubeCountryCodeSchema,
  accessTokens: uniqueValues(z.enum(YOUTUBE_QUERY_ACCESS_TOKENS), 0, YOUTUBE_QUERY_ACCESS_TOKENS.length),
  materialClasses: uniqueValues(z.enum(YOUTUBE_QUERY_MATERIAL_CLASSES), 0, YOUTUBE_QUERY_MATERIAL_CLASSES.length),
});
export type YouTubeCapabilityDiscoveryQueryV1 = z.infer<typeof youtubeCapabilityDiscoveryQuerySchema>;

const regionRestrictionSchema = z.strictObject({
  allowed: uniqueValues(youtubeCountryCodeSchema, 0, 256).optional(),
  blocked: uniqueValues(youtubeCountryCodeSchema, 0, 256).optional(),
}).superRefine((restriction, context) => {
  if (restriction.allowed && restriction.blocked) {
    context.addIssue({ code: "custom", message: "A YouTube region restriction cannot have both allowed and blocked lists." });
  }
});

/**
 * Minimal, strict fixture shape from the documented `videos` resource. The
 * unsupported statistics/search/comment surfaces are intentionally absent.
 * https://developers.google.com/youtube/v3/docs/videos
 */
export const youtubeVideoMetadataFixtureSchema = z.strictObject({
  schemaVersion: z.literal(YOUTUBE_METADATA_FIXTURE_SCHEMA_VERSION),
  fixtureId: fixtureIdSchema,
  resourceId: resourceIdSchema,
  observedAt: youtubeCanonicalUtcTimestampSchema,
  video: z.strictObject({
    kind: z.literal("youtube#video"),
    etag: etagSchema,
    id: youtubeVideoIdSchema,
    snippet: z.strictObject({
      title: textSchema,
      channelTitle: textSchema,
      defaultLanguage: z.enum(YOUTUBE_ROUTE_LANGUAGES),
    }),
    contentDetails: z.strictObject({
      duration: z.string().regex(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/, "Use an ISO 8601 duration."),
      caption: z.enum(["true", "false"]),
      regionRestriction: regionRestrictionSchema.optional(),
      /** Required even when empty: omission means the audience metadata was not collected. */
      contentRating: z.strictObject({
        ytRating: z.literal("ytAgeRestricted").optional(),
      }),
    }),
    status: z.strictObject({
      uploadStatus: z.enum(["deleted", "failed", "processed", "rejected", "uploaded"]),
      privacyStatus: z.enum(["private", "public", "unlisted"]),
      embeddable: z.boolean(),
      /** Required: missing made-for-kids status cannot be treated as safe. */
      madeForKids: z.boolean(),
    }),
  }),
});
export type YouTubeVideoMetadataFixtureV1 = z.infer<typeof youtubeVideoMetadataFixtureSchema>;

export const youtubeAvailabilityReasonSchema = z.enum([
  "available",
  "not-public",
  "not-processed",
  "region-blocked",
  "unavailable",
]);
export type YouTubeAvailabilityReason = z.infer<typeof youtubeAvailabilityReasonSchema>;

export const youtubeCountryAvailabilityResultSchema = z.discriminatedUnion("inputState", [
  z.strictObject({
    inputState: z.literal("validated"),
    availability: youtubeAvailabilityReasonSchema,
    runtimeAssignmentAllowed: z.literal(false),
  }),
  z.strictObject({
    inputState: z.literal("invalid-input"),
    availability: z.literal("unavailable"),
    reason: z.literal("invalid-country-code"),
    runtimeAssignmentAllowed: z.literal(false),
  }),
]);
export type YouTubeCountryAvailabilityResultV1 = z.infer<typeof youtubeCountryAvailabilityResultSchema>;

export const youtubeCaptionStatusSchema = z.enum([
  "provider-declared-available-language-unverified",
  "provider-declared-unavailable",
]);
export type YouTubeCaptionStatus = z.infer<typeof youtubeCaptionStatusSchema>;

export const youtubeAdapterPolicySignalsSchema = z.strictObject({
  availability: youtubeAvailabilityReasonSchema,
  madeForKids: z.boolean(),
  ageRestriction: z.enum(["none-observed", "restricted"]),
  captions: youtubeCaptionStatusSchema,
  embed: z.enum(["allowed", "not-allowed"]),
  regionMode: z.enum(["allowed-list", "blocked-list", "unrestricted-observed"]),
  metadataEditRisk: z.literal("etag-bound-review-invalidation-required"),
  /** API metadata is not a rights, accessibility, or pedagogical approval. */
  reviewRequired: z.literal(true),
  providerControlledSurfaces: z.tuple([z.literal("ads"), z.literal("related-videos")]),
});
export type YouTubeAdapterPolicySignalsV1 = z.infer<typeof youtubeAdapterPolicySignalsSchema>;

export const youtubeProviderFailureSchema = z.strictObject({
  schemaVersion: z.literal("youtube-provider-failure.v1"),
  fixtureOnly: z.literal(true),
  provider: z.literal("youtube"),
  kind: z.enum(["metadata-unavailable", "quota-exhausted", "provider-outage", "region-blocked", "video-unavailable"]),
  occurredAt: youtubeCanonicalUtcTimestampSchema,
  /** Selection must be delegated to the reviewed catalog, never discovered here. */
  fallback: z.strictObject({
    route: z.literal("reviewed-internal-alternative-only"),
    requiresExistingCatalogEligibility: z.literal(true),
    externalAssignmentAllowed: z.literal(false),
  }),
});
export type YouTubeProviderFailureV1 = z.infer<typeof youtubeProviderFailureSchema>;

const httpsOriginSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.origin === value && url.pathname === "/";
}, "Use an HTTPS origin with no path, query, or fragment.");
const identityRefSchema = z.string().trim().max(160).regex(/^identity\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

/**
 * Policy, not player code. A later enabled connector must revalidate its own
 * adult entitlement, current policy review, resource review, and CSP.
 */
export const youtubeClickToLoadPolicyInputSchema = z.strictObject({
  origin: httpsOriginSchema,
  policyOwnerIdentityRef: identityRefSchema,
  policyReviewedAt: youtubeCanonicalUtcTimestampSchema,
  /** Must come from the validated provider metadata record in any later connector. */
  madeForKids: z.boolean(),
});
export type YouTubeClickToLoadPolicyInputV1 = z.infer<typeof youtubeClickToLoadPolicyInputSchema>;

export const youtubeClickToLoadPolicySchema = z.strictObject({
  schemaVersion: z.literal(YOUTUBE_EMBED_POLICY_SCHEMA_VERSION),
  fixtureOnly: z.literal(true),
  externalPlaybackEnabled: z.literal(false),
  clientIdentity: z.strictObject({
    id: z.literal("forge-youtube-player.v1"),
    displayName: z.literal("FORGE YouTube player"),
  }),
  iframeCreation: z.literal("only-after-explicit-playback-election-and-separate-enable-authority"),
  autoplay: z.literal(0),
  controls: z.literal(1),
  branding: z.literal("provider-controlled"),
  brandSuppression: z.literal("prohibited"),
  playerOverlay: z.literal("prohibited"),
  origin: httpsOriginSchema,
  referrerPolicy: z.literal("strict-origin-when-cross-origin"),
  minimumPlayerSize: z.strictObject({ width: z.literal(200), height: z.literal(200) }),
  attribution: z.strictObject({
    perItem: z.literal("YouTube"),
    providerTermsUrl: z.literal("https://www.youtube.com/t/terms"),
  }),
  privacy: z.strictObject({
    clientPrivacyPolicy: z.literal("required-before-enable"),
    googlePrivacyPolicyUrl: z.literal("https://policies.google.com/privacy"),
    providerMayDisplay: z.tuple([z.literal("ads"), z.literal("related-videos")]),
  }),
  audienceProtection: z.discriminatedUnion("madeForKids", [
    z.strictObject({
      madeForKids: z.literal(true),
      tracking: z.literal("must-be-disabled-before-enable"),
      playerDataCollection: z.literal("privacy-preserving-and-legally-compliant-configuration-required-before-enable"),
      liveEnablementGate: z.literal("blocked-until-made-for-kids-compliance-proof"),
    }),
    z.strictObject({
      madeForKids: z.literal(false),
      tracking: z.literal("provider-policy-review-required-before-enable"),
      playerDataCollection: z.literal("client-privacy-review-required-before-enable"),
      liveEnablementGate: z.literal("blocked-until-separate-enable-authority"),
    }),
  ]),
  policyRevalidation: z.strictObject({
    cadenceDays: z.literal(90),
    ownerIdentityRef: identityRefSchema,
    lastReviewedAt: youtubeCanonicalUtcTimestampSchema,
    nextReviewDueAt: youtubeCanonicalUtcTimestampSchema,
  }),
}).superRefine((policy, context) => {
  const expectedNextReviewDueAt = addYouTubeUtcCalendarDays(
    policy.policyRevalidation.lastReviewedAt,
    policy.policyRevalidation.cadenceDays,
  );
  if (policy.policyRevalidation.nextReviewDueAt !== expectedNextReviewDueAt) {
    context.addIssue({
      code: "custom",
      path: ["policyRevalidation", "nextReviewDueAt"],
      message: "The next review must be exactly 90 UTC calendar days after the last review.",
    });
  }
});
export type YouTubeClickToLoadPolicyV1 = z.infer<typeof youtubeClickToLoadPolicySchema>;

export const youtubeEmbedRequestPlanSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("no-iframe-request"),
    reason: z.enum([
      "explicit-playback-election-required",
      "made-for-kids-protection-gate-unsatisfied",
      "provider-disabled",
    ]),
  }),
  z.strictObject({
    kind: z.literal("separate-enable-authority-required"),
    reason: z.literal("fixture-only-policy-never-creates-an-iframe"),
  }),
]);
export type YouTubeEmbedRequestPlanV1 = z.infer<typeof youtubeEmbedRequestPlanSchema>;

export const YOUTUBE_METADATA_REFRESH_DAYS = 30 as const;
export const YOUTUBE_POLICY_REVALIDATION_DAYS = 90 as const;
