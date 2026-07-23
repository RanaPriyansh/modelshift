import {
  addYouTubeUtcCalendarDays,
  YOUTUBE_POLICY_REVALIDATION_DAYS,
  youtubeClickToLoadPolicyInputSchema,
  youtubeClickToLoadPolicySchema,
  youtubeEmbedRequestPlanSchema,
  type YouTubeClickToLoadPolicyV1,
  type YouTubeEmbedRequestPlanV1,
} from "./contracts";
import { deepFreeze } from "./deep-freeze";

/**
 * Pure policy only. It deliberately does not create an iframe, make a player
 * URL, add a script tag, or access a provider. Official parameters require a
 * minimum 200x200 player and recommend `origin` when player JS is enabled:
 * https://developers.google.com/youtube/player_parameters
 */
export function createFixtureOnlyYouTubeClickToLoadPolicy(value: unknown): Readonly<YouTubeClickToLoadPolicyV1> {
  const input = youtubeClickToLoadPolicyInputSchema.parse(value);
  return deepFreeze(youtubeClickToLoadPolicySchema.parse({
    schemaVersion: "youtube-click-to-load-policy.v1",
    fixtureOnly: true,
    externalPlaybackEnabled: false,
    clientIdentity: { id: "forge-youtube-player.v1", displayName: "FORGE YouTube player" },
    iframeCreation: "only-after-explicit-playback-election-and-separate-enable-authority",
    autoplay: 0,
    controls: 1,
    branding: "provider-controlled",
    brandSuppression: "prohibited",
    playerOverlay: "prohibited",
    origin: input.origin,
    referrerPolicy: "strict-origin-when-cross-origin",
    minimumPlayerSize: { width: 200, height: 200 },
    attribution: { perItem: "YouTube", providerTermsUrl: "https://www.youtube.com/t/terms" },
    privacy: {
      clientPrivacyPolicy: "required-before-enable",
      googlePrivacyPolicyUrl: "https://policies.google.com/privacy",
      providerMayDisplay: ["ads", "related-videos"],
    },
    audienceProtection: input.madeForKids
      ? {
          madeForKids: true,
          tracking: "must-be-disabled-before-enable",
          playerDataCollection: "privacy-preserving-and-legally-compliant-configuration-required-before-enable",
          liveEnablementGate: "blocked-until-made-for-kids-compliance-proof",
        }
      : {
          madeForKids: false,
          tracking: "provider-policy-review-required-before-enable",
          playerDataCollection: "client-privacy-review-required-before-enable",
          liveEnablementGate: "blocked-until-separate-enable-authority",
        },
    policyRevalidation: {
      cadenceDays: YOUTUBE_POLICY_REVALIDATION_DAYS,
      ownerIdentityRef: input.policyOwnerIdentityRef,
      lastReviewedAt: input.policyReviewedAt,
      nextReviewDueAt: addYouTubeUtcCalendarDays(input.policyReviewedAt, YOUTUBE_POLICY_REVALIDATION_DAYS),
    },
  }));
}

/**
 * No request is possible before an explicit playback election. Even after an
 * election this disabled packet only records that separate authorization is
 * required; it never returns a URL, iframe, or playback side effect.
 */
export function planYouTubeEmbedRequest(
  policy: Pick<YouTubeClickToLoadPolicyV1, "audienceProtection" | "externalPlaybackEnabled">,
  explicitPlaybackElection: boolean,
): Readonly<YouTubeEmbedRequestPlanV1> {
  if (!explicitPlaybackElection) {
    return deepFreeze(youtubeEmbedRequestPlanSchema.parse({ kind: "no-iframe-request", reason: "explicit-playback-election-required" }));
  }
  if (policy.audienceProtection.madeForKids) {
    return deepFreeze(youtubeEmbedRequestPlanSchema.parse({
      kind: "no-iframe-request",
      reason: "made-for-kids-protection-gate-unsatisfied",
    }));
  }
  if (!policy.externalPlaybackEnabled) {
    return deepFreeze(youtubeEmbedRequestPlanSchema.parse({ kind: "no-iframe-request", reason: "provider-disabled" }));
  }
  return deepFreeze(youtubeEmbedRequestPlanSchema.parse({
    kind: "separate-enable-authority-required",
    reason: "fixture-only-policy-never-creates-an-iframe",
  }));
}
