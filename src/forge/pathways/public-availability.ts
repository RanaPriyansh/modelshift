import "server-only";

import { BUILT_IN_WORLD_PACKS } from "../worlds";

import {
  PATHWAY_ENTITLEMENT_AREAS,
  type PathwayEntitlementArea,
  type PathwaySourcePolicy,
} from "./contracts";
import { CURRENT_FORGE_PATHWAY_CATALOG } from "./catalog";

export type PublicPathwayAgeMode = {
  readonly label: string;
  readonly policyLabel: string;
};

export type PublicPathwayAvailability =
  | {
      readonly area: PathwayEntitlementArea;
      readonly areaLabel: string;
      readonly status: "released-capability";
      readonly capability: {
        readonly title: string;
      };
      readonly world: {
        readonly title: string;
        readonly route: string;
      };
      readonly ageModes: readonly PublicPathwayAgeMode[];
      readonly returnProof: {
        readonly status: "available" | "unavailable";
        readonly text: string;
      };
    }
  | {
      readonly area: PathwayEntitlementArea;
      readonly areaLabel: string;
      readonly status: "identified-gap";
      readonly gapText: string;
    };

const AREA_LABELS: Readonly<Record<PathwayEntitlementArea, string>> = {
  "language-literacy": "Language & literacy",
  mathematics: "Mathematics",
  science: "Science",
  "history-source-reasoning": "History & source reasoning",
  "computing-ai": "Computing & AI",
  "arts-design": "Arts & design",
  "practical-life": "Practical life",
  "civic-media": "Civic & media",
  "health-movement": "Health & movement",
};

const AGE_MODE_LABELS = {
  "under-13": "Child + grown-up",
  "13-17": "Teen",
  "18-plus": "Adult",
} as const;

const SOURCE_POLICY_LABELS: Readonly<Record<PathwaySourcePolicy, string>> = {
  authored_only: "Authored only",
  curated: "Curated",
  guardian_curated: "Guardian-curated",
  open_web: "Open web",
};

function releasedPackFor(worldId: string) {
  const pack = BUILT_IN_WORLD_PACKS.find((candidate) => candidate.manifest.id === worldId);
  if (!pack || pack.release.status !== "released" || pack.manifest.availability.status !== "available") {
    throw new Error(`Pathway availability needs a released available World for ${worldId}.`);
  }
  return pack;
}

function releasedCapabilityFor(
  pack: ReturnType<typeof releasedPackFor>,
  capabilityId: string,
) {
  const capability = pack.capabilities.find((candidate) => candidate.id === capabilityId);
  if (!capability) {
    throw new Error(`Pathway availability needs a released capability definition for ${capabilityId}.`);
  }
  return capability;
}

/**
 * Server-only presentation projection of Packet C's frozen, released catalog.
 * It deliberately contains availability and named gaps only: no learner input,
 * local evidence, event receipt, schedule, recommendation, or completion state.
 */
export function getCurrentPathwayAvailability(): readonly PublicPathwayAvailability[] {
  const publishedByArea = new Map<PathwayEntitlementArea, PublicPathwayAvailability>();

  for (const capability of CURRENT_FORGE_PATHWAY_CATALOG.capabilities) {
    const pack = releasedPackFor(capability.worldId);
    const releasedCapability = releasedCapabilityFor(pack, capability.capabilityId);
    const ageModes = capability.ageModes.map((ageMode) => {
      const sourcePolicy = capability.sourcePoliciesByAge[ageMode];
      if (!sourcePolicy) throw new Error(`Pathway availability needs a source policy for ${capability.capabilityId}.`);
      return {
        label: AGE_MODE_LABELS[ageMode],
        policyLabel: SOURCE_POLICY_LABELS[sourcePolicy],
      };
    });
    const returnProof = pack.manifest.returnProof.enabled
      ? { status: "available" as const, text: "Reviewed return proof is available for this World." }
      : { status: "unavailable" as const, text: "Return proof is not available: no reviewed delayed task family is published." };

    for (const area of capability.entitlementAreas) {
      if (publishedByArea.has(area)) {
        throw new Error(`Pathway availability cannot choose between multiple released capabilities for ${area}.`);
      }
      publishedByArea.set(area, {
        area,
        areaLabel: AREA_LABELS[area],
        status: "released-capability",
        capability: {
          title: releasedCapability.title,
        },
        world: {
          title: pack.manifest.title,
          route: pack.manifest.route,
        },
        ageModes,
        returnProof,
      });
    }
  }

  return Object.freeze(
    PATHWAY_ENTITLEMENT_AREAS.map((area) =>
      publishedByArea.get(area) ?? {
        area,
        areaLabel: AREA_LABELS[area],
        status: "identified-gap" as const,
        gapText: `No released World is mapped to ${AREA_LABELS[area]} yet.`,
      },
    ),
  );
}
