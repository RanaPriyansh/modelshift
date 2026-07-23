import { describe, expect, it } from "vitest";

import { normalizeVercelProviderReceipt, parseBoundedProviderJson, receiptFromAuthenticatedHandle, validateVercelProviderReceipt } from "./vercel-provider-receipt";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const DIGEST = "aad49329533835e0ae319c56990f01afff52ebd35f98b130b44f2e56c1dcc3b1";
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
  // Matches Vercel's documented Git deployment shape: the source object uses
  // repoId, while repository owner/name/path are in the separate gitRepo.
  gitSource: { type: "github", repoId: 1308085427, ref: "main", sha: SHA },
  gitRepo: { namespace: "RanaPriyansh", name: "modelshift", path: "RanaPriyansh/modelshift", type: "github", defaultBranch: "main" },
};
// Exact shape observed from GET /v2/deployments/<id>/events. The API returns
// an array; the log identity/text/date live in event.payload, while created is
// the enclosing event timestamp.
const LIVE_EVENTS = [{
  payload: {
    deploymentId: DEPLOYMENT.id,
    id: "evt_AbCdEfGhIjKlMnOpQrStUvWxYz12",
    date: 1_784_764_860_000,
    text: `Public build boundary verified across 38 static assets; public asset digest ${DIGEST}.`,
    info: { type: "stdout" },
  },
  created: 1_784_764_861_000,
}];

// Retained top-level variant: it is accepted only with an equally explicit
// deployment binding and canonical envelope timestamp.
const TOP_LEVEL_EVENTS = {
  events: [{
    deploymentId: DEPLOYMENT.id,
    id: "evt_QrStUvWxYz12AbCdEfGhIjKlMnOp",
    created: 1_784_764_860_000,
    text: `Public build boundary verified across 38 static assets; public asset digest ${DIGEST}.`,
  }],
};

describe("Vercel provider deployment receipt", () => {
  it("normalizes the exact nested live-provider event shape and observed terminal build-log digest", () => {
    const receipt = normalizeVercelProviderReceipt(DEPLOYMENT, LIVE_EVENTS, TARGET, "2026-07-23T00:02:00.000Z");
    expect(receipt).toMatchObject({
      schema_version: "1.0",
      receipt_kind: "vercel_authenticated_build_log",
      provider: "vercel",
      deployment: { id: DEPLOYMENT.id, project_id: TARGET.project_id, source_sha: SHA, immutable_url: "https://forge-learning-7a63ywsp5-ranapriyanshs-projects.vercel.app/", ready_state: "READY" },
      public_asset: { algorithm: "sha256", digest: DIGEST, source: "vercel_build_log_marker" },
    });
    expect(validateVercelProviderReceipt(receipt)).toEqual([]);
  });

  it("retains the explicitly bound top-level event variant", () => {
    const receipt = normalizeVercelProviderReceipt(DEPLOYMENT, TOP_LEVEL_EVENTS, TARGET, "2026-07-23T00:02:00.000Z");
    expect(receipt.public_asset).toMatchObject({ event_id: TOP_LEVEL_EVENTS.events[0].id, observed_at: "2026-07-23T00:01:00.000Z" });
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
    ["dirty local-source archive without provider gitSource", { ...DEPLOYMENT, gitSource: undefined, meta: { githubCommitSha: SHA, githubRepo: "RanaPriyansh/modelshift", githubCommitRef: "main" } }, LIVE_EVENTS],
    ["missing provider git repository", { ...DEPLOYMENT, gitRepo: undefined }, LIVE_EVENTS],
    ["wrong provider repository ID", { ...DEPLOYMENT, gitSource: { ...DEPLOYMENT.gitSource, repoId: 99 } }, LIVE_EVENTS],
    ["wrong provider git repository path", { ...DEPLOYMENT, gitRepo: { ...DEPLOYMENT.gitRepo, path: "attacker/other" } }, LIVE_EVENTS],
    ["wrong provider git ref", { ...DEPLOYMENT, gitSource: { ...DEPLOYMENT.gitSource, ref: "feature/dirty" } }, LIVE_EVENTS],
    ["missing nested deployment ID", DEPLOYMENT, [{ ...LIVE_EVENTS[0], payload: { ...LIVE_EVENTS[0].payload, deploymentId: undefined } }]],
    ["cross-deployment nested marker", DEPLOYMENT, [{ ...LIVE_EVENTS[0], payload: { ...LIVE_EVENTS[0].payload, deploymentId: "dpl_ZzYyXxWwVvUuTtSsRrQqPpOoNnMm" } }]],
    ["cross-deployment marker alongside matching marker", DEPLOYMENT, [...LIVE_EVENTS, { ...LIVE_EVENTS[0], created: 1_784_764_861_000, payload: { ...LIVE_EVENTS[0].payload, id: "evt_ZzYyXxWwVvUuTtSsRrQqPpOoNnMm", deploymentId: "dpl_ZzYyXxWwVvUuTtSsRrQqPpOoNnMm" } }]],
    ["missing nested marker date", DEPLOYMENT, [{ ...LIVE_EVENTS[0], payload: { ...LIVE_EVENTS[0].payload, date: undefined } }]],
    ["malformed nested marker date", DEPLOYMENT, [{ ...LIVE_EVENTS[0], payload: { ...LIVE_EVENTS[0].payload, date: "not-a-timestamp" } }]],
    ["two matching markers with the same digest in one nested payload", DEPLOYMENT, [{ ...LIVE_EVENTS[0], payload: { ...LIVE_EVENTS[0].payload, text: `${LIVE_EVENTS[0].payload.text}\n${LIVE_EVENTS[0].payload.text}` } }]],
    ["two matching markers with different digests in one nested payload", DEPLOYMENT, [{ ...LIVE_EVENTS[0], payload: { ...LIVE_EVENTS[0].payload, text: `${LIVE_EVENTS[0].payload.text}\nPublic build boundary verified across 39 static assets; public asset digest ${"b".repeat(64)}.` } }]],
    ["duplicate matching digest markers", DEPLOYMENT, [...LIVE_EVENTS, { ...LIVE_EVENTS[0], created: 1_784_764_861_000, payload: { ...LIVE_EVENTS[0].payload, id: "evt_ZzYyXxWwVvUuTtSsRrQqPpOoNnMm" } }]],
  ])("fails closed for %s", (_label, deployment, events) => {
    expect(() => normalizeVercelProviderReceipt(deployment, events, TARGET, "2026-07-23T00:02:00.000Z")).toThrow();
  });

  it("does not turn normalized JSON or a fabricated object into an authenticated capability", () => {
    const plainReceipt = normalizeVercelProviderReceipt(DEPLOYMENT, LIVE_EVENTS, TARGET, "2026-07-23T00:02:00.000Z");
    expect(receiptFromAuthenticatedHandle(plainReceipt)).toBeNull();
    expect(receiptFromAuthenticatedHandle({})).toBeNull();
  });

  it("enforces a streaming byte cap when content length is absent or lies", async () => {
    async function* chunks(values: readonly string[]): AsyncGenerator<Buffer> {
      for (const value of values) yield Buffer.from(value);
    }
    await expect(parseBoundedProviderJson(chunks(["{\"ok\":", "true}"]), undefined, 32)).resolves.toEqual({ ok: true });
    await expect(parseBoundedProviderJson(chunks(["{\"payload\":\"", "x".repeat(64), "\"}"]), undefined, 32)).rejects.toThrow(/bounded collector size/);
    await expect(parseBoundedProviderJson(chunks(["{}"]), "999", 32)).rejects.toThrow(/bounded collector size/);
  });
});
