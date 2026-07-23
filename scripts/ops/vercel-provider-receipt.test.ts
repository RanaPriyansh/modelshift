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
const EVENTS = {
  events: [{
    id: "evt_AbCdEfGhIjKlMnOpQrStUvWxYz12",
    created: 1_784_764_860_000,
    text: `Public build boundary verified across 38 static assets; public asset digest ${DIGEST}.`,
  }],
};

describe("Vercel provider deployment receipt", () => {
  it("normalizes the provider deployment metadata and observed terminal build-log digest", () => {
    const receipt = normalizeVercelProviderReceipt(DEPLOYMENT, EVENTS, TARGET, "2026-07-23T00:02:00.000Z");
    expect(receipt).toMatchObject({
      schema_version: "1.0",
      receipt_kind: "vercel_authenticated_build_log",
      provider: "vercel",
      deployment: { id: DEPLOYMENT.id, project_id: TARGET.project_id, source_sha: SHA, immutable_url: "https://forge-learning-7a63ywsp5-ranapriyanshs-projects.vercel.app/", ready_state: "READY" },
      public_asset: { algorithm: "sha256", digest: DIGEST, source: "vercel_build_log_marker" },
    });
    expect(validateVercelProviderReceipt(receipt)).toEqual([]);
  });

  it.each([
    ["wrong project", { ...DEPLOYMENT, projectId: "prj_AbCdEfGhIjKlMnOpQrStUvWxYz12" }, EVENTS],
    ["preview deployment", { ...DEPLOYMENT, target: "preview" }, EVENTS],
    ["unrelated immutable host", { ...DEPLOYMENT, url: "unrelated.example" }, EVENTS],
    ["non-default immutable port", { ...DEPLOYMENT, url: "forge-learning-7a63ywsp5-ranapriyanshs-projects.vercel.app:444" }, EVENTS],
    ["alias as immutable URL", { ...DEPLOYMENT, url: "modelshift.vercel.app" }, EVENTS],
    ["meta-only source SHA", { ...DEPLOYMENT, gitSource: undefined, meta: { githubCommitSha: SHA } }, EVENTS],
    ["conflicting caller meta SHA", { ...DEPLOYMENT, meta: { githubCommitSha: "f".repeat(40) } }, EVENTS],
    ["conflicting caller meta repository", { ...DEPLOYMENT, meta: { githubRepo: "attacker/other" } }, EVENTS],
    ["dirty local-source archive without provider gitSource", { ...DEPLOYMENT, gitSource: undefined, meta: { githubCommitSha: SHA, githubRepo: "RanaPriyansh/modelshift", githubCommitRef: "main" } }, EVENTS],
    ["missing provider git repository", { ...DEPLOYMENT, gitRepo: undefined }, EVENTS],
    ["wrong provider repository ID", { ...DEPLOYMENT, gitSource: { ...DEPLOYMENT.gitSource, repoId: 99 } }, EVENTS],
    ["wrong provider git repository path", { ...DEPLOYMENT, gitRepo: { ...DEPLOYMENT.gitRepo, path: "attacker/other" } }, EVENTS],
    ["wrong provider git ref", { ...DEPLOYMENT, gitSource: { ...DEPLOYMENT.gitSource, ref: "feature/dirty" } }, EVENTS],
    ["ambiguous digest logs", DEPLOYMENT, { events: [...EVENTS.events, { ...EVENTS.events[0], id: "evt_ZzYyXxWwVvUuTtSsRrQqPpOoNnMm", created: 1_784_764_861_000 }] }],
  ])("fails closed for %s", (_label, deployment, events) => {
    expect(() => normalizeVercelProviderReceipt(deployment, events, TARGET, "2026-07-23T00:02:00.000Z")).toThrow();
  });

  it("does not turn normalized JSON or a fabricated object into an authenticated capability", () => {
    const plainReceipt = normalizeVercelProviderReceipt(DEPLOYMENT, EVENTS, TARGET, "2026-07-23T00:02:00.000Z");
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
