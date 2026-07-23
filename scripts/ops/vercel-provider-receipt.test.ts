import { describe, expect, it } from "vitest";

import { __test__, collectVercelProviderReceipt, validateVercelProviderReceipt } from "./vercel-provider-receipt";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const DIGEST = "aad49329533835e0ae319c56990f01afff52ebd35f98b130b44f2e56c1dcc3b1";
const TARGET = {
  origin: "https://modelshift.vercel.app",
  hostname: "modelshift.vercel.app",
  project_id: "prj_SnTYtzLicYKYlHvXCNwq9J7ehQZB",
  team_id: "team_lr0E9GlEDc3XYJP7xrx8po2W",
  immutable_deployment: { hostname_prefix: "forge-learning-", hostname_suffix: "-ranapriyanshs-projects.vercel.app" },
} as const;
const DEPLOYMENT = {
  id: "dpl_Er7rVecXt3iga56P4uPDoLnWt9V4",
  projectId: TARGET.project_id,
  url: "forge-learning-7a63ywsp5-ranapriyanshs-projects.vercel.app",
  readyState: "READY",
  createdAt: 1_784_764_800_000,
  meta: { githubCommitSha: SHA },
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
    const receipt = __test__.buildReceiptFromVercelResponses(DEPLOYMENT, EVENTS, TARGET, "2026-07-23T00:02:00.000Z");
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
    ["unrelated immutable host", { ...DEPLOYMENT, url: "unrelated.example" }, EVENTS],
    ["non-default immutable port", { ...DEPLOYMENT, url: "forge-learning-7a63ywsp5-ranapriyanshs-projects.vercel.app:444" }, EVENTS],
    ["alias as immutable URL", { ...DEPLOYMENT, url: "modelshift.vercel.app" }, EVENTS],
    ["missing source SHA", { ...DEPLOYMENT, meta: {} }, EVENTS],
    ["ambiguous digest logs", DEPLOYMENT, { events: [...EVENTS.events, { ...EVENTS.events[0], id: "evt_ZzYyXxWwVvUuTtSsRrQqPpOoNnMm", created: 1_784_764_861_000 }] }],
  ])("fails closed for %s", (_label, deployment, events) => {
    expect(() => __test__.buildReceiptFromVercelResponses(deployment, events, TARGET, "2026-07-23T00:02:00.000Z")).toThrow();
  });

  it("reads only official provider endpoints with a token that never enters the receipt", async () => {
    const calls: Array<{ url: string; authorization: string | null }> = [];
    const receipt = await collectVercelProviderReceipt({
      deploymentId: DEPLOYMENT.id,
      token: "vercel-read-only-token",
      target: TARGET,
      collectedAt: "2026-07-23T00:02:00.000Z",
      fetchImpl: async (input, init) => {
        const url = input.toString();
        calls.push({ url, authorization: new Headers(init?.headers).get("authorization") });
        return Response.json(url.includes("/events?") ? EVENTS : DEPLOYMENT);
      },
    });
    expect(calls).toEqual([
      expect.objectContaining({ url: expect.stringContaining(`/v13/deployments/${DEPLOYMENT.id}?teamId=${TARGET.team_id}`), authorization: "Bearer vercel-read-only-token" }),
      expect.objectContaining({ url: expect.stringContaining(`/v2/deployments/${DEPLOYMENT.id}/events?teamId=${TARGET.team_id}&direction=backward&errorsOnly=false&limit=500`), authorization: "Bearer vercel-read-only-token" }),
    ]);
    expect(JSON.stringify(receipt)).not.toContain("vercel-read-only-token");
  });
});
