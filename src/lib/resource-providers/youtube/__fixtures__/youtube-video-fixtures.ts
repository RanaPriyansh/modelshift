import type { YouTubeVideoMetadataFixtureV1 } from "../contracts";

export const YOUTUBE_VIDEO_FIXTURE: YouTubeVideoMetadataFixtureV1 = {
  schemaVersion: "youtube-video-metadata-fixture.v1",
  fixtureId: "youtube-fixture.force-basics",
  resourceId: "resource.youtube.force-basics",
  observedAt: "2026-07-01T12:00:00.000Z",
  video: {
    kind: "youtube#video",
    etag: "fixture-etag-force-basics-v1",
    id: "aB3dE5fG7h_",
    snippet: { title: "Force and motion: a reviewed fixture", channelTitle: "FORGE fixture channel", defaultLanguage: "en" },
    contentDetails: { duration: "PT3M", caption: "true", regionRestriction: { blocked: ["KP"] }, contentRating: {} },
    status: { uploadStatus: "processed", privacyStatus: "public", embeddable: true, madeForKids: false },
  },
};

export const YOUTUBE_UNAVAILABLE_FIXTURE: YouTubeVideoMetadataFixtureV1 = {
  ...YOUTUBE_VIDEO_FIXTURE,
  fixtureId: "youtube-fixture.unavailable",
  resourceId: "resource.youtube.unavailable",
  video: { ...YOUTUBE_VIDEO_FIXTURE.video, etag: "fixture-etag-unavailable-v1", status: { ...YOUTUBE_VIDEO_FIXTURE.video.status, uploadStatus: "deleted", embeddable: false } },
};

export const YOUTUBE_NO_CAPTIONS_FIXTURE: YouTubeVideoMetadataFixtureV1 = {
  ...YOUTUBE_VIDEO_FIXTURE,
  fixtureId: "youtube-fixture.no-captions",
  resourceId: "resource.youtube.no-captions",
  video: { ...YOUTUBE_VIDEO_FIXTURE.video, etag: "fixture-etag-no-captions-v1", contentDetails: { ...YOUTUBE_VIDEO_FIXTURE.video.contentDetails, caption: "false" } },
};

export const YOUTUBE_NOT_EMBEDDABLE_FIXTURE: YouTubeVideoMetadataFixtureV1 = {
  ...YOUTUBE_VIDEO_FIXTURE,
  fixtureId: "youtube-fixture.not-embeddable",
  resourceId: "resource.youtube.not-embeddable",
  video: { ...YOUTUBE_VIDEO_FIXTURE.video, etag: "fixture-etag-not-embeddable-v1", status: { ...YOUTUBE_VIDEO_FIXTURE.video.status, embeddable: false } },
};

export const YOUTUBE_MADE_FOR_KIDS_FIXTURE: YouTubeVideoMetadataFixtureV1 = {
  ...YOUTUBE_VIDEO_FIXTURE,
  fixtureId: "youtube-fixture.made-for-kids",
  resourceId: "resource.youtube.made-for-kids",
  video: {
    ...YOUTUBE_VIDEO_FIXTURE.video,
    etag: "fixture-etag-made-for-kids-v1",
    status: { ...YOUTUBE_VIDEO_FIXTURE.video.status, madeForKids: true },
  },
};
