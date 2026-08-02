import { describe, expect, it } from "vitest";

import {
  FORGE_CANONICAL_ROUTE_PATHNAMES,
  FORGE_METADATA_ROUTE_PATHNAMES,
  classifyForgeReleaseRoute,
  normalizeForgeReleasePathname,
} from "./forge-release-route-policy";

describe("FORGE release route policy", () => {
  it("normalizes safe path forms without treating a query as a route", () => {
    expect(normalizeForgeReleasePathname("/")).toBe("/");
    expect(normalizeForgeReleasePathname("/app/")).toBe("/app");
    expect(normalizeForgeReleasePathname("/app//")).toBe("/app");
    expect(normalizeForgeReleasePathname("/app?source=public#desk")).toBe("/app");
    expect(normalizeForgeReleasePathname("/app%2Fpath")).toBeNull();
    expect(normalizeForgeReleasePathname("/app/../internal")).toBeNull();
    expect(normalizeForgeReleasePathname("//app")).toBeNull();
    expect(normalizeForgeReleasePathname("app")).toBeNull();
    expect(normalizeForgeReleasePathname("/%zz")).toBeNull();
  });

  it("allows every canonical release route for GET and HEAD", () => {
    for (const pathname of FORGE_CANONICAL_ROUTE_PATHNAMES) {
      expect(classifyForgeReleaseRoute("GET", pathname)).toMatchObject({
        allowed: true,
        kind: "canonical",
        pathname,
      });
      expect(classifyForgeReleaseRoute("HEAD", `${pathname}?check=1`)).toMatchObject({
        allowed: true,
        kind: "canonical",
        pathname,
      });
    }
  });

  it("allows exact metadata routes and required Next framework paths", () => {
    for (const pathname of FORGE_METADATA_ROUTE_PATHNAMES) {
      expect(classifyForgeReleaseRoute("GET", pathname)).toMatchObject({
        allowed: true,
        kind: "metadata",
        pathname,
      });
    }

    expect(classifyForgeReleaseRoute("GET", "/_next/static/chunks/app.js")).toMatchObject({
      allowed: true,
      kind: "framework",
      pathname: "/_next/static/chunks/app.js",
    });
    expect(classifyForgeReleaseRoute("HEAD", "/_next/image?url=%2Ficon.svg")).toMatchObject({
      allowed: true,
      kind: "framework",
      pathname: "/_next/image",
    });
  });

  it("returns retired for obsolete product, fixture, and API routes", () => {
    for (const pathname of [
      "/app/study",
      "/how-it-works",
      "/internal/university-semester-desk",
      "/api/interpret",
      "/learn/force-and-motion",
      "/favicon.ico",
    ]) {
      expect(classifyForgeReleaseRoute("GET", pathname)).toMatchObject({
        allowed: false,
        kind: "retired",
        pathname,
      });
    }
  });

  it("returns retired for unsupported methods even on a canonical pathname", () => {
    expect(classifyForgeReleaseRoute("POST", "/app")).toMatchObject({
      allowed: false,
      kind: "retired",
      method: "POST",
      pathname: "/app",
    });
    expect(classifyForgeReleaseRoute("options", "/api/health")).toMatchObject({
      allowed: false,
      kind: "retired",
      method: "OPTIONS",
      pathname: "/api/health",
    });
  });
});
