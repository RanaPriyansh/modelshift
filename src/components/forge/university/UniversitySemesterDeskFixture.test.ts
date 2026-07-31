import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  assertUniversitySemesterDeskCourseParity,
  assertUniversitySemesterDeskEnvelopeParity,
  universitySemesterDeskFixture,
  type UniversitySemesterDeskFixture,
  type UniversitySemesterDeskServerEnvelope,
} from "@/app/internal/university-semester-desk/semester-desk-fixture.server";
import {
  universitySemesterOverviewFixtureRequest,
} from "@/app/internal/university-semester-overview/semester-overview-fixture.server";
import {
  universityRecoveryRequestSchema,
} from "@/src/forge/university-recovery";
import {
  projectUniversitySemesterLoop,
} from "@/src/forge/university-semester-loop";
import {
  projectUniversitySemesterOverview,
} from "@/src/forge/university-semester-overview/index.server";
import {
  universityTodayRequestSchema,
} from "@/src/forge/university-today";

let fixture: UniversitySemesterDeskFixture;

function expectDeeplyFrozen(
  value: unknown,
  seen = new WeakSet<object>(),
): void {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) {
    expectDeeplyFrozen(child, seen);
  }
}

beforeAll(async () => {
  fixture = await universitySemesterDeskFixture();
});

describe("university Semester Desk fixture", () => {
  it("precomputes four exact scenarios with four opaque course options each", () => {
    expect(fixture).toMatchObject({
      schemaVersion: "university-semester-desk-fixture.v1",
      termLabel: "Autumn 2026",
      timeZone: "Asia/Kolkata",
    });
    expect(fixture.scenarios.map(({ id }) => id)).toEqual([
      "mixed-term",
      "term-source-review",
      "capacity-choice",
      "world-changed",
    ]);

    const optionIds = [
      "semester-desk-option-6f2d",
      "semester-desk-option-91ac",
      "semester-desk-option-b8e4",
      "semester-desk-option-3c75",
    ];
    for (const scenario of fixture.scenarios) {
      expect(scenario.termBoundary).toMatchObject({
        courseCountLabel: "4 synthetic courses in one exact term envelope",
        readinessBoundary:
          "Inspectable does not mean the term, Recovery plan, or any course is ready or feasible.",
      });
      expect(scenario.courses).toHaveLength(4);
      expect(scenario.courses.map(({ optionId }) => optionId))
        .toEqual(optionIds);
      expect(scenario.courses.map(({ courseLabel }) => courseLabel)).toEqual([
        "CS102: Evidence and computation",
        "MATH110: Discrete structures",
        "HIST204: Modern history",
        "BIO120: Cell systems",
      ]);
      for (const course of scenario.courses) {
        expect(course.journey.map(({ id }) => id)).toEqual([
          "sources",
          "today",
          "recovery",
          "study",
          "return",
        ]);
        expect(course.learnerSelectionStatement).toBe(
          "You choose what to inspect. FORGE does not choose what to do.",
        );
        expect(course.noEffectBoundary).toMatch(
          /^Inspection changes only this refresh-clear synthetic view\./,
        );
        expect(course.announcement).toContain(
          "does not choose course work or priority",
        );
      }
    }
    expectDeeplyFrozen(fixture);
  });

  it("preserves the canonical term and course state taxonomy", () => {
    const byId = Object.fromEntries(
      fixture.scenarios.map((scenario) => [scenario.id, scenario]),
    );
    expect(byId["mixed-term"]?.termBoundary.statusLabel).toBe("draft ready");
    expect(byId["mixed-term"]?.courses.map(
      ({ todayStatusLabel }) => todayStatusLabel,
    )).toEqual([
      "ready",
      "learner choice required",
      "capacity conflict",
      "complete",
    ]);
    expect(byId["mixed-term"]?.courses.map(
      ({ semesterLoopStatusLabel }) => semesterLoopStatusLabel,
    )).toEqual([
      "protected study ready",
      "learner choice required",
      "recovery required",
      "path complete",
    ]);
    expect(byId["term-source-review"]?.termBoundary.statusLabel)
      .toBe("source review required");
    expect(byId["term-source-review"]?.courses.every(
      ({ semesterLoopStatusLabel }) => (
        semesterLoopStatusLabel === "source review required"
      ),
    )).toBe(true);
    expect(byId["capacity-choice"]?.termBoundary.statusLabel)
      .toBe("learner choice required");
    expect(byId["world-changed"]?.courses[0]?.semesterLoopStatusLabel)
      .toBe("world review required");
  });

  it("exposes complete presentation labels without raw child authority", () => {
    for (const scenario of fixture.scenarios) {
      for (const course of scenario.courses) {
        expect(course.todayStatusLabel).not.toBe("");
        expect(course.semesterLoopStatusLabel).not.toBe("");
        expect(course.explanation).not.toBe("");
        expect([
          "inspectable",
          "choice",
          "stopped",
          "complete",
        ]).toContain(course.tone);
        expect(course.currentJob).toEqual(expect.objectContaining({
          index: expect.any(String),
          eyebrow: expect.any(String),
          title: expect.any(String),
          body: expect.any(String),
          boundary: expect.any(String),
        }));
        expect(course.evidence).toEqual(expect.objectContaining({
          sourceReviewState: expect.any(String),
          reviewedFactCountLabel: expect.any(String),
          conflictCountLabel: expect.any(String),
          institutionalCompleteness: "Not established",
          availableTimeLabel: expect.any(String),
          effortLabel: expect.any(String),
          capacityState: expect.any(String),
          actionStatement: expect.any(String),
          actionSelectionBasis:
            "Existing learner-accepted reviewed path only",
          worldState: expect.any(String),
          protectedStudyState: expect.any(String),
        }));
      }
    }

    const serialized = JSON.stringify(fixture);
    for (const forbidden of [
      "todayRequest",
      "recoveryRequest",
      "worldPack",
      "courseId",
      "projectionDigest",
      "semesterLoopDigest",
      "sha256:",
      "course.sample-",
      "course-source-candidate",
      "source-revision",
      "learning-path",
      "path-revision.",
      "path-node.",
      "\"projector\"",
      "\"command\"",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("allows only inspection selection and denies consequential authority", () => {
    expect(fixture.authority).toEqual({
      projectionClass: "Fixture-only semester inspection desk",
      orderBasis: "Course ID, not priority",
      identity: "Caller-asserted synthetic input; not verified",
      tenantIsolation: "Not established",
      rightsEnforcement: "Not established",
      institutionalCompleteness: "Not established",
      inspectionSelection:
        "Allowed only for explicit refresh-clear synthetic inspection",
      courseWorkSelection: "Not allowed",
      priority: "Not allowed",
      recommendation: "Not allowed",
      termFeasibility: "Not allowed",
      scheduling: "Not allowed",
      session: "Not allowed",
      persistence: "Not allowed",
      providerCall: "Not allowed",
      evidence: "Not allowed",
      message: "Not allowed",
      event: "Not allowed",
      externalEffect: "Not allowed",
    });
  });

  it("refuses direct-loop status or digest drift from the exact overview", async () => {
    const request = await universitySemesterOverviewFixtureRequest("mixed-term");
    const recovery = universityRecoveryRequestSchema.parse(
      request.recoveryRequest,
    );
    const today = universityTodayRequestSchema.parse(
      request.courses[0]!.todayRequest,
    );
    const [overview, direct] = await Promise.all([
      projectUniversitySemesterOverview(request),
      projectUniversitySemesterLoop({
        schemaVersion: "university-semester-loop-request.v1",
        todayRequest: today,
        recoveryRequest: recovery,
        worldPack: request.courses[0]!.worldPack,
      }),
    ]);
    expect(overview.status).toBe("ready_for_inspection");
    const overviewCourse = overview.courses.find(
      (course) => course.courseId === today.context.scope.courseId,
    );
    expect(overviewCourse).toBeDefined();
    expect(() => {
      assertUniversitySemesterDeskCourseParity(overviewCourse!, direct);
    }).not.toThrow();

    const drifted = {
      ...direct,
      projectionDigest:
        "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    };
    expect(() => {
      assertUniversitySemesterDeskCourseParity(overviewCourse!, drifted);
    }).toThrow(
      /direct canonical loop drifted from the exact overview summary/,
    );
  });

  it("refuses any cross-scenario term scope or ordered course-identity drift", () => {
    const baseline = {
      ownerUserId: "owner-a",
      tenantId: "tenant-a",
      termId: "term.a",
      asOf: "2026-09-01T00:00:00.000Z",
      termLabel: "Autumn 2026",
      timeZone: "Asia/Kolkata",
      courses: [
        { courseId: "course.a", courseLabel: "Course A" },
        { courseId: "course.b", courseLabel: "Course B" },
      ],
    } satisfies UniversitySemesterDeskServerEnvelope;
    expect(() => {
      assertUniversitySemesterDeskEnvelopeParity(baseline, baseline);
    }).not.toThrow();

    const drifted = [
      { ...baseline, ownerUserId: "owner-b" },
      { ...baseline, tenantId: "tenant-b" },
      { ...baseline, termId: "term.b" },
      { ...baseline, asOf: "2026-09-01T00:00:01.000Z" },
      { ...baseline, termLabel: "Winter 2026" },
      { ...baseline, timeZone: "UTC" },
      {
        ...baseline,
        courses: [
          { courseId: "course.changed", courseLabel: "Course A" },
          baseline.courses[1]!,
        ],
      },
      {
        ...baseline,
        courses: [
          { courseId: "course.a", courseLabel: "Renamed Course A" },
          baseline.courses[1]!,
        ],
      },
      { ...baseline, courses: [...baseline.courses].reverse() },
      { ...baseline, courses: baseline.courses.slice(0, 1) },
    ] satisfies readonly UniversitySemesterDeskServerEnvelope[];

    for (const candidate of drifted) {
      expect(() => {
        assertUniversitySemesterDeskEnvelopeParity(baseline, candidate);
      }).toThrow(/drifted from the baseline term envelope/);
    }
  });

  it("performs no network operation while building the presentation fixture", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await universitySemesterDeskFixture();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
