# Disabled YouTube metadata adapter

This module is W6-C's checked-in fixture boundary. It performs no live discovery, provider request, playback, credential handling, media/caption retrieval, account action, or learner-facing assignment. It only turns strict `videos`-resource fixtures into FORGE's neutral `ResourceObservation` candidate records. Every result remains `fixtureOnly`, has absent network authority, and has `runtimeAssignmentAllowed: false`.

The module intentionally has no raw-query field: its discovery shape contains only reviewed capability/curriculum identifiers plus closed purpose, language, access, material, and country tokens. Country inputs must be exact uppercase values from a checked-in ISO 3166-1 alpha-2 allowlist; unknown, private-use, lowercase, and malformed tokens return an unavailable/invalid-input state rather than being normalized. Raw learner wording, private notes, names, contact details, URLs, credentials, client keys, search response feeds, statistics, comments, rankings, watch data, and sponsorship preferences are not part of the contract.

Provider metadata does not establish rights, accessibility quality, pedagogical fit, age suitability, source authority, or assignment. `contentDetails.caption` only establishes the provider's declaration; caption language and quality stay unknown pending independent review. Every timestamp must use canonical UTC `YYYY-MM-DDTHH:mm:ss.sssZ` form. Every external observation expires after exactly 30 UTC calendar days, independent of local daylight-saving transitions; ETag is included in the review-signal input so material provider metadata drift invalidates review.

The player policy is declarative and disabled. It specifies click-to-load requirements for a later, separately authorized connector: no iframe before a clear playback election; `autoplay=0`; standard controls; provider-controlled branding; no FORGE overlay; a 200 × 200 minimum; explicit origin/referrer configuration; per-item attribution; a client privacy policy with the Google Privacy Policy link; and a named 90-UTC-calendar-day policy owner. A `madeForKids: true` signal activates a distinct live-enablement gate: tracking must be disabled and player data collection must be proven privacy-preserving and legally compliant before any later connector may enable playback. This packet cannot satisfy that gate and therefore returns no iframe request. It does not promise to suppress provider-controlled contextual ads or related videos.

Primary references (checked 23 July 2026):

- [YouTube Data API `videos` resource](https://developers.google.com/youtube/v3/docs/videos) — documented status, caption, region, age, and embed metadata fields.
- [YouTube embedded player parameters](https://developers.google.com/youtube/player_parameters) — `autoplay`, controls, provider branding, and 200 × 200 player minimum.
- [IFrame Player API reference](https://developers.google.com/youtube/iframe_api_reference) — `origin` protection guidance.
- [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies) — privacy, attribution, user action, playback-integrity, and no-scraping obligations.
- [Finding the Made-for-Kids status of a video](https://developers.google.com/youtube/v3/guides/made_for_kids_status) — tracking-off and lawful data-collection duties for embedded Made-for-Kids videos.
