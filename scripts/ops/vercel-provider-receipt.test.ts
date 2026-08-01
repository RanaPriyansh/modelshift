import { describe, expect, it } from "vitest";

import { productionBuildId } from "./build-source-identity";
import {
  PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX,
  PUBLIC_BUILD_ARTIFACT_MARKER_SCHEMA_VERSION,
  type PublicBuildArtifactMarker,
} from "./public-build-boundary-receipt";
import { PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION } from "./production-build-receipt";
import {
  normalizeVercelProviderReceipt,
  parseBoundedProviderJson,
  receiptFromAuthenticatedHandle,
  validateVercelProviderReceipt,
} from "./vercel-provider-receipt";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const TREE = "89abcdef0123456789abcdef0123456789abcdef";
const MARKER: PublicBuildArtifactMarker = {
  schemaVersion: PUBLIC_BUILD_ARTIFACT_MARKER_SCHEMA_VERSION,
  productionReceiptSchemaVersion: PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION,
  sourceCommit: SHA,
  sourceTree: TREE,
  sourceState: "clean",
  buildId: productionBuildId(SHA),
  artifactDigest: `sha256:${"a".repeat(64)}`,
  artifactFileCount: 1_472,
  publicAssetDigest: `sha256:${"b".repeat(64)}`,
  publicAssetFileCount: 71,
  publicDirectoryDigest: `sha256:${"c".repeat(64)}`,
  publicDirectoryFileCount: 5,
  runtimeCachePolicy: "fresh_ephemeral_next_cache_v1",
  runtimeConfigurationDigest: `sha256:${"d".repeat(64)}`,
  runtimeConfigurationFileCount: 4,
};
const TARGET = {
  origin: "https://modelshift.vercel.app",
  hostname: "modelshift.vercel.app",
  project_id: "prj_SnTYtzLicYKYlHvXCNwq9J7ehQZB",
  team_id: "team_lr0E9GlEDc3XYJP7xrx8po2W",
  git_source: { type: "github", ref: "main", repository_id: 1308085427 },
  git_repository: { namespace: "RanaPriyansh", name: "modelshift", path: "RanaPriyansh/modelshift", type: "github", default_branch: "main" },
  immutable_deployment: { hostname_prefix: "forge-learning-", hostname_suffix: "-ranapriyanshs-projects.vercel.app" },
} as const;
const DEPLOYMENT = {
  id: "dpl_Er7rVecXt3iga56P4uPDoLnWt9V4",
  projectId: TARGET.project_id,
  url: "forge-learning-7a63ywsp5-ranapriyanshs-projects.vercel.app",
  readyState: "READY",
  target: "production",
  createdAt: 1_784_764_800_000,
  gitSource: { type: "github", repoId: 1308085427, ref: "main", sha: SHA },
  gitRepo: { namespace: "RanaPriyansh", name: "modelshift", path: "RanaPriyansh/modelshift", type: "github", defaultBranch: "main" },
};

function markerLine(
  overrides: Partial<PublicBuildArtifactMarker> = {},
): string {
  return `${PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX}${JSON.stringify({
    ...MARKER,
    ...overrides,
  })}`;
}

function nestedEvents(text = markerLine()) {
  return [{
    payload: {
      deploymentId: DEPLOYMENT.id,
      id: "evt_AbCdEfGhIjKlMnOpQrStUvWxYz12",
      date: 1_784_764_860_000,
      text,
      info: { type: "stdout" },
    },
    created: 1_784_764_861_000,
  }];
}

const LIVE_EVENTS = nestedEvents();
const TOP_LEVEL_EVENTS = {
  events: [{
    deploymentId: DEPLOYMENT.id,
    id: "evt_QrStUvWxYz12AbCdEfGhIjKlMnOp",
    created: 1_784_764_860_000,
    text: markerLine(),
  }],
};

describe("Vercel provider deployment receipt", () => {
  it("normalizes one exact complete artifact marker from the live nested event shape", () => {
    const receipt = normalizeVercelProviderReceipt(
      DEPLOYMENT,
      LIVE_EVENTS,
      TARGET,
      "2026-07-23T00:02:00.000Z",
    );
    expect(receipt).toMatchObject({
      schema_version: "2.0",
      receipt_kind: "vercel_authenticated_complete_artifact_build_log",
      provider: "vercel",
      deployment: {
        id: DEPLOYMENT.id,
        project_id: TARGET.project_id,
        source_sha: SHA,
        immutable_url: "https://forge-learning-7a63ywsp5-ranapriyanshs-projects.vercel.app/",
        ready_state: "READY",
      },
      artifact: {
        source: "vercel_complete_artifact_build_log_marker",
        marker: MARKER,
      },
    });
    expect(validateVercelProviderReceipt(receipt)).toEqual([]);
  });

  it("retains the explicitly deployment-bound top-level event variant", () => {
    const receipt = normalizeVercelProviderReceipt(
      DEPLOYMENT,
      TOP_LEVEL_EVENTS,
      TARGET,
      "2026-07-23T00:02:00.000Z",
    );
    expect(receipt.artifact).toMatchObject({
      event_id: TOP_LEVEL_EVENTS.events[0].id,
      observed_at: "2026-07-23T00:01:00.000Z",
      marker: MARKER,
    });
  });

  it.each([
    ["wrong project", { ...DEPLOYMENT, projectId: "prj_AbCdEfGhIjKlMnOpQrStUvWxYz12" }, LIVE_EVENTS],
    ["preview deployment", { ...DEPLOYMENT, target: "preview" }, LIVE_EVENTS],
    ["unrelated immutable host", { ...DEPLOYMENT, url: "unrelated.example" }, LIVE_EVENTS],
    ["non-default immutable port", { ...DEPLOYMENT, url: "forge-learning-7a63ywsp5-ranapriyanshs-projects.vercel.app:444" }, LIVE_EVENTS],
    ["alias as immutable URL", { ...DEPLOYMENT, url: "modelshift.vercel.app" }, LIVE_EVENTS],
    ["meta-only source SHA", { ...DEPLOYMENT, gitSource: undefined, meta: { githubCommitSha: SHA } }, LIVE_EVENTS],
    ["conflicting caller meta SHA", { ...DEPLOYMENT, meta: { githubCommitSha: "f".repeat(40) } }, LIVE_EVENTS],
    ["conflicting caller meta repository", { ...DEPLOYMENT, meta: { githubRepo: "attacker/other" } }, LIVE_EVENTS],
    ["missing provider git repository", { ...DEPLOYMENT, gitRepo: undefined }, LIVE_EVENTS],
    ["wrong provider repository ID", { ...DEPLOYMENT, gitSource: { ...DEPLOYMENT.gitSource, repoId: 99 } }, LIVE_EVENTS],
    ["wrong provider git repository path", { ...DEPLOYMENT, gitRepo: { ...DEPLOYMENT.gitRepo, path: "attacker/other" } }, LIVE_EVENTS],
    ["wrong provider git ref", { ...DEPLOYMENT, gitSource: { ...DEPLOYMENT.gitSource, ref: "feature/dirty" } }, LIVE_EVENTS],
    ["missing nested deployment ID", DEPLOYMENT, [{ ...LIVE_EVENTS[0], payload: { ...LIVE_EVENTS[0].payload, deploymentId: undefined } }]],
    ["cross-deployment nested marker", DEPLOYMENT, [{ ...LIVE_EVENTS[0], payload: { ...LIVE_EVENTS[0].payload, deploymentId: "dpl_ZzYyXxWwVvUuTtSsRrQqPpOoNnMm" } }]],
    ["missing nested marker date", DEPLOYMENT, [{ ...LIVE_EVENTS[0], payload: { ...LIVE_EVENTS[0].payload, date: undefined } }]],
    ["malformed nested marker date", DEPLOYMENT, [{ ...LIVE_EVENTS[0], payload: { ...LIVE_EVENTS[0].payload, date: "not-a-timestamp" } }]],
    ["undefined payload cannot fall through", DEPLOYMENT, [{ payload: undefined, deploymentId: DEPLOYMENT.id, id: "evt_AbCdEfGhIjKlMnOpQrStUvWxYz12", created: 1_784_764_860_000, text: markerLine() }]],
    ["matching top-level shadow", DEPLOYMENT, [{ ...LIVE_EVENTS[0], text: markerLine(), id: LIVE_EVENTS[0].payload.id, deploymentId: LIVE_EVENTS[0].payload.deploymentId, date: LIVE_EVENTS[0].payload.date }]],
    ["two markers in one nested payload", DEPLOYMENT, nestedEvents(`${markerLine()}\n${markerLine()}`)],
    ["duplicate matching markers", DEPLOYMENT, [...LIVE_EVENTS, { ...LIVE_EVENTS[0], payload: { ...LIVE_EVENTS[0].payload, id: "evt_ZzYyXxWwVvUuTtSsRrQqPpOoNnMm" } }]],
  ])("fails closed for %s", (_label, deployment, events) => {
    expect(() => normalizeVercelProviderReceipt(
      deployment,
      events,
      TARGET,
      "2026-07-23T00:02:00.000Z",
    )).toThrow();
  });

  it.each([
    ["retired asset-only marker", `Public build boundary verified across 71 static assets; public asset digest ${"b".repeat(64)}.`],
    ["retired marker family version", markerLine().replace("MARKER.v2", "MARKER.v1")],
    ["malformed marker JSON", `${PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX}{bad-json}`],
    ["missing marker field", (() => {
      const incomplete: Record<string, unknown> = { ...MARKER };
      delete incomplete.artifactDigest;
      return `${PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX}${JSON.stringify(incomplete)}`;
    })()],
    ["extra marker field", `${PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX}${JSON.stringify({ ...MARKER, extra: true })}`],
    ["unverified source", markerLine({ sourceState: "unverified" })],
    ["unknown source tree", markerLine({ sourceTree: "unknown", sourceState: "unverified" })],
    ["dirty source", markerLine({ sourceState: "dirty" })],
    ["mismatched provider source", markerLine({ sourceCommit: "f".repeat(40), buildId: productionBuildId("f".repeat(40)) })],
  ])("rejects %s", (_label, text) => {
    expect(() => normalizeVercelProviderReceipt(
      DEPLOYMENT,
      nestedEvents(text),
      TARGET,
      "2026-07-23T00:02:00.000Z",
    )).toThrow();
  });

  it("rejects a duplicated JSON field that JSON.parse would overwrite", () => {
    const duplicated = markerLine().replace(
      `"sourceCommit":"${SHA}"`,
      `"sourceCommit":"${SHA}","sourceCommit":"${SHA}"`,
    );
    expect(() => normalizeVercelProviderReceipt(
      DEPLOYMENT,
      nestedEvents(duplicated),
      TARGET,
      "2026-07-23T00:02:00.000Z",
    )).toThrow();
  });

  it("rejects retired provider receipt schemas and incomplete artifact objects", () => {
    const receipt = normalizeVercelProviderReceipt(
      DEPLOYMENT,
      LIVE_EVENTS,
      TARGET,
      "2026-07-23T00:02:00.000Z",
    );
    expect(validateVercelProviderReceipt({
      ...receipt,
      schema_version: "1.0",
      receipt_kind: "vercel_authenticated_build_log",
    })).not.toEqual([]);
    expect(validateVercelProviderReceipt({
      ...receipt,
      artifact: {
        ...receipt.artifact,
        marker: {
          ...receipt.artifact.marker,
          publicDirectoryDigest: undefined,
        },
      },
    })).not.toEqual([]);
    expect(validateVercelProviderReceipt({
      ...receipt,
      artifact: { ...receipt.artifact, duplicate: true },
    })).not.toEqual([]);
    expect(validateVercelProviderReceipt({
      ...receipt,
      artifact: {
        ...receipt.artifact,
        marker: {
          ...receipt.artifact.marker,
          runtimeCachePolicy: "retired",
        },
      },
    })).not.toEqual([]);
  });

  it("does not turn normalized JSON or a fabricated object into an authenticated capability", () => {
    const plainReceipt = normalizeVercelProviderReceipt(
      DEPLOYMENT,
      LIVE_EVENTS,
      TARGET,
      "2026-07-23T00:02:00.000Z",
    );
    expect(receiptFromAuthenticatedHandle(plainReceipt)).toBeNull();
    expect(receiptFromAuthenticatedHandle({})).toBeNull();
  });

  it("enforces a streaming byte cap when content length is absent or lies", async () => {
    async function* chunks(values: readonly string[]): AsyncGenerator<Buffer> {
      for (const value of values) yield Buffer.from(value);
    }
    await expect(parseBoundedProviderJson(
      chunks(["{\"ok\":", "true}"]),
      undefined,
      32,
    )).resolves.toEqual({ ok: true });
    await expect(parseBoundedProviderJson(
      chunks(["{\"payload\":\"", "x".repeat(64), "\"}"]),
      undefined,
      32,
    )).rejects.toThrow(/bounded collector size/);
    await expect(parseBoundedProviderJson(
      chunks(["{}"]),
      "999",
      32,
    )).rejects.toThrow(/bounded collector size/);
  });
});
