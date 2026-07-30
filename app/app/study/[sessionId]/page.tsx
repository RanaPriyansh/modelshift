import type { Metadata } from "next";

import {
  StudySessionRuntime,
  type StudyWorldLaunchPolicy,
} from "@/src/components/forge/StudySessionRuntime";
import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import { trustedWorldRegistry } from "@/src/forge/registry.server";
import { resolveWorldRouteAccess } from "@/src/lib/forge-auth/world-age-policy.server";

export const metadata: Metadata = {
  title: "Local study session — FORGE",
  description:
    "An opaque device-local session bound to one accepted path activity and exact reviewed Learning World.",
};

const RELEASED_WORLD_ROUTES = [
  "/learn/force-and-motion",
  "/learn/ai-and-learning",
  "/learn/proportional-reasoning",
  "/learn/primary-source-reasoning",
] as const;

export default async function DeviceStudySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const policies: StudyWorldLaunchPolicy[] = RELEASED_WORLD_ROUTES.map((route) => {
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

  return (
    <ForgeWorldFrame exitHref="/app/study" worldLabel="Path study session">
      <StudySessionRuntime sessionId={sessionId} policies={policies} />
    </ForgeWorldFrame>
  );
}
