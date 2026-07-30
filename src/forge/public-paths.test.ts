import { describe, expect, it } from "vitest";

import {
  PUBLIC_GOAL_DIRECTIONS,
  PUBLIC_GOAL_DIRECTION_IDS,
  publicGoalDirectionSchema,
} from "./public-paths";

describe("public goal directions", () => {
  it("covers every declared broad direction exactly once", () => {
    expect(PUBLIC_GOAL_DIRECTIONS.map((direction) => direction.id)).toEqual(PUBLIC_GOAL_DIRECTION_IDS);
    expect(new Set(PUBLIC_GOAL_DIRECTIONS.map((direction) => direction.id)).size).toBe(
      PUBLIC_GOAL_DIRECTIONS.length,
    );
  });

  it("never promotes an outline or partial component set to a reviewed path", () => {
    for (const direction of PUBLIC_GOAL_DIRECTIONS) {
      expect(publicGoalDirectionSchema.safeParse(direction).success).toBe(true);
      expect(["reviewed_components", "outline_only"]).toContain(direction.status);
      expect(direction.missingBeforePathPublication.length).toBeGreaterThan(0);
    }
  });

  it("names reviewed components only where a component is actually listed", () => {
    for (const direction of PUBLIC_GOAL_DIRECTIONS) {
      expect(direction.status === "reviewed_components").toBe(direction.availableNow.length > 0);
    }
  });
});
