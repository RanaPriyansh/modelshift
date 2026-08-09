import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_RESEARCH_EXPOSURE_TASKS,
  UNIVERSITY_RESEARCH_SCENARIO_IDS,
} from "../university-research-operations/contracts";
import {
  UNIVERSITY_RESEARCH_ARTIFACT_INFORMATION_ITEMS,
  UNIVERSITY_RESEARCH_NEUTRAL_NAVIGATION_ITEMS,
} from "./authored";
import { compileUniversityResearchSurfacePacket } from "./surface-packet";

describe("university research surface packet", () => {
  it.each(["pack-p", "pack-q"] as const)(
    "compiles the exact %s scenarios into one bounded shared surface packet",
    async (packId) => {
      const packet = await compileUniversityResearchSurfacePacket(packId);

      expect(packet).toMatchObject({
        schemaVersion: "university-research-surface-packet.v1",
        packId,
        artifactVersion: "1.1.0",
        title: "Course worksheet",
        navigationHeading: "Compare the seven examples",
      });
      expect(packet.packDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(packet.rendererBindingDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(packet.packetDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(packet.navigationItems.map(({ scenarioId, label }) => ({
        scenarioId,
        label,
      }))).toEqual(UNIVERSITY_RESEARCH_NEUTRAL_NAVIGATION_ITEMS);
      expect(packet.scenarios.map((scenario) => scenario.scenarioId)).toEqual(
        UNIVERSITY_RESEARCH_SCENARIO_IDS,
      );

      packet.scenarios.forEach((scenario, index) => {
        expect(scenario.ordinal).toBe(index + 1);
        expect(scenario.facts.map((fact) => fact.itemId)).toEqual(
          UNIVERSITY_RESEARCH_ARTIFACT_INFORMATION_ITEMS.map(
            (item) => item.itemId,
          ),
        );
        expect(scenario.facts).toHaveLength(7);
        expect(scenario.tasks).toEqual(UNIVERSITY_RESEARCH_EXPOSURE_TASKS);
        expect(scenario.effects).toHaveLength(10);
        expect(scenario.terminal).toHaveLength(4);
        expect(scenario.visibleCharacterCount).toBeLessThanOrEqual(
          packet.maximumVisibleCharactersPerScenario,
        );
        expect(scenario.nextJob.primaryControl.targetId).toBe(
          scenario.nextJob.primaryControl.effect
              === "navigate_to_local_synthetic_detail"
            ? scenario.effectBoundaryId
            : null,
        );
      });
    },
  );

  it("is deterministic, deeply frozen, and keeps P/Q lexical packets distinct", async () => {
    const [pFirst, pSecond, q] = await Promise.all([
      compileUniversityResearchSurfacePacket("pack-p"),
      compileUniversityResearchSurfacePacket("pack-p"),
      compileUniversityResearchSurfacePacket("pack-q"),
    ]);

    expect(pFirst).toEqual(pSecond);
    expect(pFirst.packetDigest).toBe(pSecond.packetDigest);
    expect(pFirst.packetDigest).not.toBe(q.packetDigest);
    expect(Object.isFrozen(pFirst)).toBe(true);
    expect(Object.isFrozen(pFirst.navigationItems)).toBe(true);
    expect(Object.isFrozen(pFirst.scenarios[0]?.facts)).toBe(true);
    expect(Object.isFrozen(pFirst.scenarios[0]?.nextJob.primaryControl)).toBe(
      true,
    );
  });

  it("contains no raw HTML, remote asset, URL, script, or candidate status in neutral navigation copy", async () => {
    const packet = await compileUniversityResearchSurfacePacket("pack-p");
    const navigationCopy = JSON.stringify({
      title: packet.title,
      navigationHeading: packet.navigationHeading,
      navigationItems: packet.navigationItems.map((item) => item.label),
    });

    expect(navigationCopy).not.toMatch(
      /FORGE|protected_study_ready|source_review_required|path_complete/i,
    );
    expect(navigationCopy).not.toMatch(
      /<script|<style|https?:|data:|javascript:/i,
    );
  });

  it("fails closed for unknown or boxed pack identities", async () => {
    await expect(
      compileUniversityResearchSurfacePacket("pack-r"),
    ).rejects.toThrow("requested authored research pack is unavailable");
    await expect(
      compileUniversityResearchSurfacePacket(new String("pack-p")),
    ).rejects.toThrow("requested authored research pack is unavailable");
  });
});
