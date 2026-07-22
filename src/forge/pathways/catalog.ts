import { BUILT_IN_WORLD_PACKS } from "../worlds";

import type { SafetyPolicy } from "../contracts";

import {
  pathwayCapabilityCatalogSchema,
  type PathwayCapabilityCatalog,
  type PathwayEntitlementArea,
  type PathwaySourcePolicy,
} from "./contracts";

const EVIDENCE_EVENT_TYPES = [
  "world_run.started",
  "attempt.committed",
  "evidence.recorded",
  "world_run.completed",
] as const;

const REVIEWED_ENTITLEMENT_AREAS: Readonly<Record<string, readonly PathwayEntitlementArea[]>> = {
  "capability.force-motion.zero-net-force": ["science"],
  "capability.proportional-reasoning.compare-and-scale": ["mathematics"],
  "capability.ai-literacy.source-corroboration": ["computing-ai"],
  "capability.historical-literacy.observation-inference": ["history-source-reasoning"],
};

function sourcePolicyFor(
  ageMode: "under-13" | "13-17" | "18-plus",
  manifest: { readonly safety: Pick<SafetyPolicy, "guardianManaged" | "retrievalMode"> },
): PathwaySourcePolicy {
  if (manifest.safety.retrievalMode === "none") return "authored_only";
  if (manifest.safety.retrievalMode === "open-web") return "open_web";
  return ageMode === "under-13" && manifest.safety.guardianManaged ? "guardian_curated" : "curated";
}

function entitlementAreasFor(capabilityId: string): readonly PathwayEntitlementArea[] {
  const areas = REVIEWED_ENTITLEMENT_AREAS[capabilityId];
  if (!areas) throw new Error(`Released capability ${capabilityId} needs a reviewed entitlement-area mapping.`);
  return areas;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

/**
 * Read-only projection of currently released manifests. It is not a curriculum,
 * identity lookup, consent service, or registry integration.
 */
export const CURRENT_FORGE_PATHWAY_CATALOG: PathwayCapabilityCatalog = deepFreeze(
  pathwayCapabilityCatalogSchema.parse({
    schemaVersion: "1.0",
    generatedFrom: "released-world-packs",
    capabilities: BUILT_IN_WORLD_PACKS.flatMap((pack) => {
      if (pack.release.status !== "released" || pack.manifest.availability.status !== "available") return [];
      return pack.manifest.capabilityIds.map((capabilityId) => ({
        capabilityId,
        worldId: pack.manifest.id,
        entitlementAreas: entitlementAreasFor(capabilityId),
        ageModes: [...pack.manifest.ageModes],
        evidenceTier: pack.manifest.evidenceTier,
        sourcePoliciesByAge: Object.fromEntries(
          pack.manifest.ageModes.map((ageMode) => [ageMode, sourcePolicyFor(ageMode, pack.manifest)]),
        ),
        sourceIds: pack.manifest.sources.map((source) => source.id),
        evidenceEventTypes: [...EVIDENCE_EVENT_TYPES],
        guardianManaged: pack.manifest.safety.guardianManaged,
      }));
    }),
  }),
);
