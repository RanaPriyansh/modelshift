import { describe, expect, it } from "vitest";

import { PATHWAY_ENTITLEMENT_AREAS } from "./contracts";
import { getCurrentPathwayAvailability } from "./public-availability";

describe("public FORGE pathway availability", () => {
  it("projects all nine entitlement areas in the reviewed Packet C order", () => {
    const availability = getCurrentPathwayAvailability();

    expect(availability).toHaveLength(9);
    expect(availability.map((entry) => entry.area)).toEqual(PATHWAY_ENTITLEMENT_AREAS);
    expect(new Set(availability.map((entry) => entry.area)).size).toBe(9);
  });

  it("exposes exactly the four released mappings and the five explicit gaps", () => {
    const availability = getCurrentPathwayAvailability();
    const released = availability.filter((entry) => entry.status === "released-capability");
    const gaps = availability.filter((entry) => entry.status === "identified-gap");

    expect(released.map((entry) => [entry.area, entry.capability.title, entry.world.title])).toEqual([
      ["mathematics", "Compare and scale proportional relationships", "Ratios that stay the same"],
      ["science", "Distinguish net force from velocity", "Force & motion"],
      ["history-source-reasoning", "Keep historical claims inside their evidence boundary", "What can a photograph prove?"],
      ["computing-ai", "Corroborate a model-generated factual claim", "AI & learning"],
    ]);
    expect(gaps.map((entry) => entry.area)).toEqual([
      "language-literacy",
      "arts-design",
      "practical-life",
      "civic-media",
      "health-movement",
    ]);
    expect(gaps.every((entry) => entry.gapText.startsWith("No released World is mapped"))).toBe(true);
  });

  it("keeps the projection non-personal and exposes current age, source, and return boundaries", () => {
    const released = getCurrentPathwayAvailability().filter((entry) => entry.status === "released-capability");
    const ratio = released.find((entry) => entry.area === "mathematics");
    const force = released.find((entry) => entry.area === "science");

    expect(ratio).toMatchObject({
      ageModes: [
        { label: "Child + grown-up", policyLabel: "Authored only" },
        { label: "Teen", policyLabel: "Authored only" },
        { label: "Adult", policyLabel: "Authored only" },
      ],
      returnProof: { status: "unavailable" },
    });
    expect(force).toMatchObject({
      ageModes: [
        { label: "Teen", policyLabel: "Authored only" },
        { label: "Adult", policyLabel: "Authored only" },
      ],
      returnProof: { status: "unavailable" },
    });
    const serialized = JSON.stringify(getCurrentPathwayAvailability());
    expect(serialized).not.toMatch(/"(?:learnerId|profileId|eventRef|eventType|sourceIds|sourceUrl|url|receipt|schedule)"/i);
    expect(serialized).not.toMatch(/https?:\/\//i);
    expect(serialized).not.toMatch(/recommend/i);
  });
});
