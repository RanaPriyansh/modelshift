import type { Metadata } from "next";

import {
  StudySessionRuntime,
  type StudyWorldLaunchPolicy,
} from "@/src/components/forge/StudySessionRuntime";
import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import { trustedWorldRegistry } from "@/src/forge/registry.server";
import { resolveWorldRouteAccess } from "@/src/lib/forge-auth/world-age-policy.server";

export const metadata: Metadata = {
  title: "Activity focus session — FORGE",
  description: "The exact non-ModelShift activity bound to one device-local path session.",
};

const RELEASED_WORLD_ROUTES = [
  "/learn/force-and-motion",
  "/learn/ai-and-learning",
  "/learn/proportional-reasoning",
  "/learn/primary-source-reasoning",
] as const;

function releasedPolicies(): StudyWorldLaunchPolicy[] {
  return RELEASED_WORLD_ROUTES.map((route) => {
    const entryPolicy = resolveWorldRouteAccess(route, {}).policy;
    const pack = trustedWorldRegistry.resolveAvailableRoute(route);
    if (!pack || pack.manifest.id !== entryPolicy.worldId) {
      throw new Error(`Released World identity changed while resolving ${route}.`);
    }
    return {
      ...entryPolicy,
      worldVersion: pack.manifest.version,
      worldRoute: pack.manifest.route,
      activityProtocol: pack.manifest.activityProtocol,
      sourceIds: pack.manifest.sources.map((source) => source.id),
    };
  });
}

export default async function ActivityFocusSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <ForgeWorldFrame exitHref="/app/study" worldLabel="Activity focus session">
      <StudySessionRuntime
        focusKind="activity"
        policies={releasedPolicies()}
        sessionId={sessionId}
      />
    </ForgeWorldFrame>
  );
}
