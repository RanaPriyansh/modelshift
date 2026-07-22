import { describe, expect, it } from "vitest";

import { WORLD_IDS, WORLD_ROUTES } from "../lib/forge-planner/catalog";
import { CURRENT_FORGE_PATHWAY_CATALOG } from "./pathways/catalog";
import {
  BUILT_IN_SOURCE_IDS,
  BUILT_IN_WORLD_IDS,
  PUBLIC_SOURCE_IDS,
  PUBLIC_WORLD_CATALOG,
  PUBLIC_WORLD_IDS,
  PUBLIC_WORLD_ROUTES,
} from "./worlds";
import {
  ARGUMENT_EVIDENCE_WORLD,
  INTERNAL_BUILT_IN_WORLD_IDS,
} from "./worlds.internal";

describe("retained unavailable package public boundary", () => {
  it("keeps Argument & Evidence executable internally while excluding every public catalog, planner, and pathway projection", () => {
    expect(ARGUMENT_EVIDENCE_WORLD).toMatchObject({ release: { status: "released" }, manifest: { availability: { status: "unavailable" } } });
    expect(INTERNAL_BUILT_IN_WORLD_IDS).toContain("world.argument-evidence");
    expect(BUILT_IN_WORLD_IDS).not.toContain("world.argument-evidence");
    expect(BUILT_IN_SOURCE_IDS).not.toContain("source.argument-evidence.authored-fixture");
    expect(PUBLIC_WORLD_IDS).not.toContain("world.argument-evidence");
    expect(PUBLIC_WORLD_ROUTES).not.toContain("/learn/argument-evidence");
    expect(PUBLIC_WORLD_CATALOG.map((world) => world.id)).not.toContain("world.argument-evidence");
    expect(WORLD_IDS).not.toContain("world.argument-evidence");
    expect(WORLD_ROUTES).not.toContain("/learn/argument-evidence");
    expect(PUBLIC_SOURCE_IDS).not.toContain("source.argument-evidence.authored-fixture");
    expect(CURRENT_FORGE_PATHWAY_CATALOG.capabilities.map((capability) => capability.worldId)).not.toContain("world.argument-evidence");
  });
});
