// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  resolvedRoutes: [] as string[],
  resolvedRegistryRoutes: [] as string[],
}));

vi.mock("@/src/lib/forge-auth/world-age-policy.server", () => ({
  resolveWorldRouteAccess: (route: string) => {
    mocked.resolvedRoutes.push(route);
    return {
      policy: {
        worldId: `world-for:${route}`,
        worldTitle: route,
        allowedAgeModes: ["18-plus"],
        allowedAudienceModes: ["adult"],
      },
    };
  },
}));

vi.mock("@/src/forge/registry.server", () => ({
  trustedWorldRegistry: {
    resolveAvailableRoute: (route: string) => {
      mocked.resolvedRegistryRoutes.push(route);
      return {
        manifest: {
          id: `world-for:${route}`,
          version: "1.2.3",
          route,
          activityProtocol: route === "/learn/force-and-motion" ? "modelshift" : "activity",
          sources: [{ id: `source-for:${route}` }],
        },
      };
    },
  },
}));

vi.mock("@/src/components/forge/ForgeShell", () => ({
  ForgeWorldFrame: ({
    children,
    worldLabel,
  }: {
    children: React.ReactNode;
    worldLabel: string;
  }) => (
    <section data-testid="world-frame">
      <span>{worldLabel}</span>
      {children}
    </section>
  ),
}));

vi.mock("@/src/components/forge/StudySessionRuntime", () => ({
  StudySessionRuntime: ({
    policies,
    sessionId,
  }: {
    policies: ReadonlyArray<{
      sourceIds: readonly string[];
      worldRoute: string;
      worldVersion: string;
      activityProtocol: "modelshift" | "activity";
    }>;
    sessionId: string;
  }) => (
    <div
      data-exact-first-policy={[
        policies[0]?.worldVersion,
        policies[0]?.worldRoute,
        policies[0]?.sourceIds.join(","),
      ].join("|")}
      data-policy-count={policies.length}
      data-testid="session-runtime"
    >
      {sessionId}
    </div>
  ),
}));

import DeviceStudySessionPage from "../../../app/app/study/[sessionId]/page";

afterEach(() => {
  cleanup();
  mocked.resolvedRoutes.length = 0;
  mocked.resolvedRegistryRoutes.length = 0;
});

describe("/app/study/[sessionId]", () => {
  it("passes only the opaque route identity and server-derived released World policies", async () => {
    const page = await DeviceStudySessionPage({
      params: Promise.resolve({
        sessionId: "study-session.opaque-route-identity",
      }),
    });
    render(page);

    const runtime = screen.getByTestId("session-runtime");
    expect(runtime.textContent).toBe("study-session.opaque-route-identity");
    expect(runtime.getAttribute("data-policy-count")).toBe("4");
    expect(runtime.getAttribute("data-exact-first-policy")).toBe(
      "1.2.3|/learn/force-and-motion|source-for:/learn/force-and-motion",
    );
    expect(screen.getByTestId("world-frame").textContent).toContain(
      "Path study session",
    );
    expect(mocked.resolvedRoutes).toEqual([
      "/learn/force-and-motion",
      "/learn/ai-and-learning",
      "/learn/proportional-reasoning",
      "/learn/primary-source-reasoning",
    ]);
    expect(mocked.resolvedRegistryRoutes).toEqual(mocked.resolvedRoutes);
  });
});
