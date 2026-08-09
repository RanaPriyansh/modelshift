import { beforeAll, describe, expect, it } from "vitest";

import {
  universitySemesterOverviewFixture,
  type UniversitySemesterOverviewFixture,
} from "@/app/internal/university-semester-overview/semester-overview-fixture.server";

let fixture: UniversitySemesterOverviewFixture;

beforeAll(async () => {
  fixture = await universitySemesterOverviewFixture();
});

describe("university semester overview fixture", () => {
  it("projects four closed scenarios through the real aggregate boundary", () => {
    expect(fixture.schemaVersion).toBe(
      "university-semester-overview-fixture.v1",
    );
    expect(fixture.scenarios.map(({ id }) => id)).toEqual([
      "mixed-term",
      "term-source-review",
      "capacity-choice",
      "world-changed",
    ]);

    for (const scenario of fixture.scenarios) {
      expect(scenario.view.status).toBe("ready_for_inspection");
      expect(scenario.view.termBoundary).not.toBeNull();
      expect(scenario.view.courses).toHaveLength(4);
      expect(scenario.view.courses.map(({ courseLabel }) => courseLabel))
        .toEqual([
          "CS102: Evidence and computation",
          "MATH110: Discrete structures",
          "HIST204: Modern history",
          "BIO120: Cell systems",
        ]);
    }
  });

  it("keeps term Recovery and per-course loop states visibly separate", () => {
    const byId = Object.fromEntries(
      fixture.scenarios.map((scenario) => [scenario.id, scenario]),
    );

    expect(byId["mixed-term"]?.view.termBoundary?.statusLabel)
      .toBe("draft ready");
    expect(byId["mixed-term"]?.view.courses.map(
      ({ semesterLoopStatusLabel }) => semesterLoopStatusLabel,
    )).toEqual([
      "protected study ready",
      "learner choice required",
      "recovery required",
      "path complete",
    ]);

    expect(byId["term-source-review"]?.view.termBoundary?.statusLabel)
      .toBe("source review required");
    expect(byId["term-source-review"]?.view.courses.every(
      ({ semesterLoopStatusLabel }) => (
        semesterLoopStatusLabel === "source review required"
      ),
    )).toBe(true);

    expect(byId["capacity-choice"]?.view.termBoundary?.statusLabel)
      .toBe("learner choice required");
    expect(byId["world-changed"]?.view.courses[0]?.semesterLoopStatusLabel)
      .toBe("world review required");
  });

  it("sends only a presentation DTO to the client surface", () => {
    const serialized = JSON.stringify(fixture);

    expect(serialized).not.toMatch(
      /projectionDigest|semesterLoopDigest|recoveryDigest|worldPack|reconciliationRequest/,
    );
    expect(serialized).not.toMatch(
      /course-source-candidate|learning-path-node|source-revision/,
    );
    expect(serialized).not.toMatch(/course\.sample-/);
    expect(fixture.authority).toMatchObject({
      orderBasis: "Course ID, not priority",
      identity: "Caller-asserted synthetic input; not verified",
      rightsEnforcement: "Not established",
      termFeasibility: "Not allowed",
      courseSelection: "Not allowed",
      globalAction: "Not allowed",
      recommendation: "Not allowed",
      scheduling: "Not allowed",
      providerCall: "Not allowed",
      persistence: "Not allowed",
      session: "Not allowed",
      evidence: "Not allowed",
      externalEffect: "Not allowed",
    });
  });
});
