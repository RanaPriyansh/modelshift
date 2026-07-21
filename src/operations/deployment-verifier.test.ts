import { describe, expect, it } from "vitest";

import {
  validateTargetUrl,
  verifyDeployment,
  type DeploymentVerificationReport,
} from "../../scripts/ops/deployment-verifier";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const CSP = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'";

function pageHeaders(contentType = "text/html; charset=utf-8") {
  return {
    "content-type": contentType,
    "content-security-policy": CSP,
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
  };
}

function successfulFetch(assetBody = "self.__next_f = []") {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.pathname === "/api/health") {
      return Response.json(
        { schema_version: "1.0", status: "ok", service: "forge-learning-os", release_sha: SHA },
        { headers: { "cache-control": "no-store", "x-forge-release-sha": SHA } },
      );
    }
    if (url.pathname.startsWith("/_next/static/")) {
      return new Response(assetBody, { status: 200, headers: { "content-type": "application/javascript" } });
    }
    const marker = url.pathname === "/" ? "FORGE" : "The engine is off";
    return new Response(`<html><body>${marker}<script src="/_next/static/app.js"></script></body></html>`, {
      status: 200,
      headers: pageHeaders(),
    });
  };
}

async function run(fetchImpl = successfulFetch()): Promise<DeploymentVerificationReport> {
  return verifyDeployment({
    baseUrl: "https://modelshift.example",
    expectedSha: SHA,
    allowedHosts: ["modelshift.example"],
    fetchImpl: fetchImpl as typeof fetch,
    generatedAt: "2026-07-22T00:00:00.000Z",
  });
}

describe("deployment verifier", () => {
  it("passes a matching public deployment using GET-only bounded evidence", async () => {
    const report = await run();

    expect(report.status).toBe("pass");
    expect(report.observed_release_sha).toBe(SHA);
    expect(report.request_policy).toEqual({
      methods: ["GET"],
      same_origin_only: true,
      redirects_followed: false,
      state_changing_requests: false,
      response_bodies_retained: false,
      learner_data_collected: false,
    });
  });

  it("rejects non-HTTPS, credentialed, and non-allowlisted remote targets", () => {
    expect(() => validateTargetUrl("http://modelshift.example", ["modelshift.example"])).toThrow(/HTTPS/);
    expect(() => validateTargetUrl("https://user:pass@modelshift.example", ["modelshift.example"])).toThrow(/credentials/);
    expect(() => validateTargetUrl("https://other.example", ["modelshift.example"])).toThrow(/allowlisted/);
  });

  it("allows local HTTP only with an explicit local-verification flag", () => {
    expect(() => validateTargetUrl("http://127.0.0.1:3100", [], false)).toThrow(/allow-localhost/);
    expect(validateTargetUrl("http://127.0.0.1:3100", [], true).origin).toBe("http://127.0.0.1:3100");
  });

  it("fails without copying detected credential material into the report", async () => {
    const exposed = `sk-${"x".repeat(32)}`;
    const report = await run(successfulFetch(`window.token = "${exposed}"`));

    expect(report.status).toBe("fail");
    expect(report.checks.some((check) => check.id.startsWith("client_asset.") && check.status === "fail")).toBe(true);
    expect(JSON.stringify(report)).not.toContain(exposed);
  });

  it("fails closed on a release identity mismatch", async () => {
    const report = await verifyDeployment({
      baseUrl: "https://modelshift.example",
      expectedSha: "f".repeat(40),
      allowedHosts: ["modelshift.example"],
      fetchImpl: successfulFetch() as typeof fetch,
    });

    expect(report.status).toBe("fail");
    expect(report.checks.find((check) => check.id === "release.identity")?.status).toBe("fail");
  });
});
