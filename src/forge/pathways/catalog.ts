import { BUILT_IN_WORLD_PACKS } from "../worlds";

import type { SafetyPolicy } from "../contracts";

import { pathwayCapabilityCatalogSchema, type PathwayCapabilityCatalog, type PathwaySourcePolicy } from "./contracts";

const EVIDENCE_EVENT_TYPES = [
  "world_run.started",
  "attempt.committed",
  "assistance.recorded",
  "proof.submitted",
  "evidence.recorded",
  "world_run.completed",
  "world_run.corrected",
] as const;

function sourcePolicyFor(
  ageMode: "under-13" | "13-17" | "18-plus",
  manifest: { readonly safety: Pick<SafetyPolicy, "guardianManaged" | "retrievalMode"> },
): PathwaySourcePolicy {
  if (manifest.safety.retrievalMode === "none") return "authored_only";
  if (manifest.safety.retrievalMode === "open-web") return "open_web";
  return ageMode === "under-13" && manifest.safety.guardianManaged ? "guardian_curated" : "curated";
}

/**
 * Read-only projection of currently released manifests. It is not a curriculum,
 * identity lookup, consent service, or registry integration.
 */
export const CURRENT_FORGE_PATHWAY_CATALOG: PathwayCapabilityCatalog = Object.freeze(
  pathwayCapabilityCatalogSchema.parse({
    schemaVersion: "1.0",
    generatedFrom: "released-world-packs",
    capabilities: BUILT_IN_WORLD_PACKS.flatMap((pack) => {
      if (pack.release.status !== "released" || pack.manifest.availability.status !== "available") return [];
      return pack.manifest.capabilityIds.map((capabilityId) => ({
        capabilityId,
        worldId: pack.manifest.id,
        ageModes: [...pack.manifest.ageModes],
        evidenceTier: pack.manifest.evidenceTier,
        sourcePolicies: [...new Set(pack.manifest.ageModes.map((ageMode) => sourcePolicyFor(ageMode, pack.manifest)))],
        sourceIds: pack.manifest.sources.map((source) => source.id),
        evidenceEventTypes: [...EVIDENCE_EVENT_TYPES],
        guardianManaged: pack.manifest.safety.guardianManaged,
      }));
    }),
  }),
);
