import { describe, expect, it, vi } from "vitest";

import {
  projectUniversityLearningMap,
  universityLearningMapRequestSchema,
  type UniversityLearningMapRequestV2,
} from ".";

function request(): UniversityLearningMapRequestV2 {
  return {
    schemaVersion: "university-learning-map-request.v2",
    course: {
      courseRef: "course.local-01",
      ownershipDeclaration: "adult_learner_self_attested",
      sourceAuthority: "learner_declared_unverified",
    },
    outcomes: [{
      outcomeRef: "outcome.reason-01",
      declaration: "learner_declared_unverified",
    }],
    concepts: [{
      conceptRef: "concept.foundation-01",
      outcomeRefs: ["outcome.reason-01"],
      prerequisiteConceptRefs: [],
      prerequisiteKnowledge: "declared",
    }],
    evidence: [
      {
        evidenceRef: "evidence.attempt-01",
        kind: "attempt_receipt",
        authority: "bounded_reference_only",
        contentCaptured: false,
      },
      {
        evidenceRef: "evidence.help-01",
        kind: "source_reference",
        authority: "bounded_reference_only",
        contentCaptured: false,
      },
    ],
    attempts: [{
      attemptRef: "attempt.local-01",
      conceptRefs: ["concept.foundation-01"],
      attemptedOn: "2026-08-01",
      disposition: "completed",
      evidenceRefs: ["evidence.attempt-01"],
      helpUsed: [{
        helpRef: "help.local-01",
        kind: "ai",
        provenanceEvidenceRef: "evidence.help-01",
        effect: "unknown",
      }],
    }],
    delayedReturns: [{
      returnRef: "return.local-01",
      sourceAttemptRef: "attempt.local-01",
      conceptRefs: ["concept.foundation-01"],
      dueOn: "2026-08-08",
      completion: "scheduled",
    }],
    unknowns: [],
  };
}

describe("university learning map", () => {
  it("projects learner-declared continuity without upgrading authority", () => {
    const projection = projectUniversityLearningMap(request());
    expect(projection.status).toBe("ready_for_inspection");
    expect(projection.map?.attempts[0]?.helpUsed[0]).toMatchObject({
      provenanceEvidenceRef: "evidence.help-01",
      effect: "unknown",
    });
    expect(projection.map?.delayedReturns[0]?.dueOn).toBe("2026-08-08");
    expect(projection.authority).toEqual({
      projectionClass: "learner_declared_learning_map_inspection",
      adultStatusAuthority: "self_attested_not_verified",
      masteryEstablished: false,
      abilityScored: false,
      diagnosisAllowed: false,
      recommendationAllowed: false,
      answerGenerationAllowed: false,
      persistenceAllowed: false,
      networkAllowed: false,
      eventEmissionAllowed: false,
      personalDataAllowed: false,
    });
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.map?.attempts)).toBe(true);
  });

  it("rejects the retired v1 request schema", () => {
    const retiredRequest = {
      ...request(),
      schemaVersion: "university-learning-map-request.v1",
    };

    const projection = projectUniversityLearningMap(retiredRequest);

    expect(projection.status).toBe("invalid");
    expect(projection.issues.map((entry) => entry.code)).toContain(
      "schema.invalid",
    );
  });

  it("rejects the retired non-adult ownership literal without conversion", () => {
    const retiredOwnership = {
      ...request(),
      course: {
        ...request().course,
        ownershipDeclaration: "learner_self_attested",
      },
    };

    const projection = projectUniversityLearningMap(retiredOwnership);

    expect(projection).toMatchObject({
      status: "invalid",
      map: null,
      issues: [{
        code: "schema.invalid",
        path: "course.ownershipDeclaration",
      }],
    });
  });

  it("keeps explicit unknowns and structural gaps visible for review", () => {
    const value = request();
    value.concepts[0]!.prerequisiteKnowledge = "unknown";
    value.attempts[0]!.disposition = "unknown";
    value.delayedReturns[0]!.completion = "unknown";
    value.unknowns.push({
      unknownRef: "unknown.prerequisite-01",
      scopeRef: "concept.foundation-01",
      kind: "prerequisite_unknown",
      state: "explicit",
    });
    const projection = projectUniversityLearningMap(value);
    expect(projection.status).toBe("review_required");
    expect(projection.review?.explicitUnknownCount).toBe(1);
    expect(projection.issues.map((entry) => entry.code)).toContain("unknowns.explicit");
  });

  it("requires review for cycles, missing evidence, due-date inversion, and unmapped outcomes", () => {
    const value = request();
    value.outcomes.push({
      outcomeRef: "outcome.unmapped-02",
      declaration: "learner_declared_unverified",
    });
    value.concepts[0]!.prerequisiteConceptRefs = ["concept.loop-02"];
    value.concepts.push({
      conceptRef: "concept.loop-02",
      outcomeRefs: ["outcome.reason-01"],
      prerequisiteConceptRefs: ["concept.foundation-01"],
      prerequisiteKnowledge: "declared",
    });
    value.attempts[0]!.evidenceRefs = [];
    value.delayedReturns[0]!.dueOn = "2026-07-31";
    const projection = projectUniversityLearningMap(value);
    expect(projection.status).toBe("review_required");
    expect(projection.issues.map((entry) => entry.code)).toEqual([
      "attempts.evidence_missing",
      "delayed_returns.order_invalid",
      "outcomes.unmapped",
      "prerequisites.cycle",
    ]);
  });

  it("classifies a self-prerequisite as a cycle in every array position", () => {
    const first = request();
    first.concepts.push({
      conceptRef: "concept.other-02",
      outcomeRefs: ["outcome.reason-01"],
      prerequisiteConceptRefs: [],
      prerequisiteKnowledge: "declared",
    });
    first.concepts[0]!.prerequisiteConceptRefs = [
      "concept.foundation-01",
      "concept.other-02",
    ];
    const second = request();
    second.concepts.push({
      conceptRef: "concept.other-02",
      outcomeRefs: ["outcome.reason-01"],
      prerequisiteConceptRefs: [],
      prerequisiteKnowledge: "declared",
    });
    second.concepts[0]!.prerequisiteConceptRefs = [
      "concept.other-02",
      "concept.foundation-01",
    ];

    for (const candidate of [first, second]) {
      const projection = projectUniversityLearningMap(candidate);
      expect(projection.status).toBe("review_required");
      expect(projection.review?.cyclicConceptRefs).toEqual([
        "concept.foundation-01",
      ]);
      expect(projection.issues).toContainEqual({
        code: "prerequisites.cycle",
        path: "concepts",
      });
    }
  });

  it("rejects repeated nested references before schema traversal", () => {
    const value = request();
    const sharedOutcomeRefs = value.concepts[0]!.outcomeRefs;
    value.concepts.push({
      conceptRef: "concept.other-02",
      outcomeRefs: sharedOutcomeRefs,
      prerequisiteConceptRefs: [],
      prerequisiteKnowledge: "declared",
    });

    expect(projectUniversityLearningMap(value)).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid", path: "" }],
    });
  });

  it("rejects a delayed return that was not part of its source attempt", () => {
    const value = request();
    value.concepts.push({
      conceptRef: "concept.other-02",
      outcomeRefs: ["outcome.reason-01"],
      prerequisiteConceptRefs: [],
      prerequisiteKnowledge: "declared",
    });
    value.delayedReturns[0]!.conceptRefs = ["concept.other-02"];

    expect(projectUniversityLearningMap(value)).toMatchObject({
      status: "invalid",
      issues: [{ code: "references.missing", path: "" }],
    });
  });

  it("fails closed for dangling references, duplicate IDs, PII, prose, and authority fields", () => {
    const dangling = request();
    dangling.attempts[0]!.conceptRefs = ["concept.missing-99"];
    const duplicate = request();
    duplicate.evidence.push({ ...duplicate.evidence[0]! });
    const cases: unknown[] = [
      dangling,
      duplicate,
      { ...request(), studentName: "Person" },
      { ...request(), answer: "content" },
      { ...request(), recommendation: "next concept" },
      { ...request(), course: { ...request().course, title: "Private course" } },
    ];
    expect(cases.map(projectUniversityLearningMap).map((entry) => entry.status)).toEqual([
      "invalid",
      "invalid",
      "invalid",
      "invalid",
      "invalid",
      "invalid",
    ]);
  });

  it("rejects calendar-shaped text that is not a real date", () => {
    const invalidAttemptDate = request();
    invalidAttemptDate.attempts[0]!.attemptedOn = "2026-02-30";
    const invalidReturnDate = request();
    invalidReturnDate.delayedReturns[0]!.dueOn = "2026-13-01";

    expect(projectUniversityLearningMap(invalidAttemptDate).status).toBe(
      "invalid",
    );
    expect(projectUniversityLearningMap(invalidReturnDate).status).toBe(
      "invalid",
    );
  });

  it("rejects a string above the 4,096-code-unit boundary", () => {
    const value = {
      ...request(),
      oversizedText: "x".repeat(4_097),
    };

    expect(projectUniversityLearningMap(value)).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid", path: "" }],
    });
  });

  it("rejects an aggregate JSON value above the 512 KiB boundary", () => {
    const value = {
      ...request(),
      oversizedAggregate: Array.from(
        { length: 129 },
        () => "x".repeat(4_096),
      ),
    };

    expect(projectUniversityLearningMap(value)).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid", path: "" }],
    });
  });

  it("caps schema issues for a maximum-size malformed array", () => {
    const invalidMaximum = {
      ...request(),
      concepts: Array.from({ length: 96 }, () => null),
    };

    const first = projectUniversityLearningMap(invalidMaximum);
    const second = projectUniversityLearningMap(invalidMaximum);

    expect(first.status).toBe("invalid");
    expect(first.issues).toHaveLength(64);
    expect(first.issues.length).toBeLessThanOrEqual(64);
    expect(first).toEqual(second);
  });

  it("rejects unsafe numbers before Zod schema traversal", () => {
    const safeParse = vi.spyOn(
      universityLearningMapRequestSchema,
      "safeParse",
    );
    const value = {
      ...request(),
      unsafeNumber: Number.MAX_SAFE_INTEGER + 1,
    };

    expect(projectUniversityLearningMap(value)).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid", path: "" }],
    });
    expect(safeParse).not.toHaveBeenCalled();
    safeParse.mockRestore();
  });

  it("applies the string boundary before Zod schema traversal", () => {
    const safeParse = vi.spyOn(
      universityLearningMapRequestSchema,
      "safeParse",
    );
    const overLimit = {
      ...request(),
      boundaryProbe: "x".repeat(4_097),
    };
    const atLimit = {
      ...request(),
      boundaryProbe: "x".repeat(4_096),
    };

    expect(projectUniversityLearningMap(overLimit).status).toBe("invalid");
    expect(safeParse).not.toHaveBeenCalled();

    expect(projectUniversityLearningMap(atLimit).status).toBe("invalid");
    expect(safeParse).toHaveBeenCalledTimes(1);
    safeParse.mockRestore();
  });

  it("never invokes accessors and rejects proxies, symbols, sparse arrays, cycles, and exotic objects", () => {
    const getter = vi.fn(() => request());
    const accessor = Object.defineProperty({}, "schemaVersion", {
      enumerable: true,
      get: getter,
    });
    const symbol = request() as unknown as Record<PropertyKey, unknown>;
    symbol[Symbol("hidden")] = true;
    const sparse = request();
    sparse.outcomes = new Array(2) as UniversityLearningMapRequestV2["outcomes"];
    const cyclic = request() as unknown as Record<string, unknown>;
    cyclic.self = cyclic;
    const proxied = new Proxy(request(), {});
    const exotic = new Date();
    const results = [accessor, symbol, sparse, cyclic, proxied, exotic]
      .map(projectUniversityLearningMap);
    expect(results.every((entry) => entry.status === "invalid")).toBe(true);
    expect(getter).not.toHaveBeenCalled();
  });

  it("is deterministic, detached, deeply frozen, and exposes only the closed statuses", () => {
    const firstInput = request();
    firstInput.outcomes.reverse();
    const first = projectUniversityLearningMap(firstInput);
    const second = projectUniversityLearningMap(request());
    expect(first).toEqual(second);
    firstInput.attempts[0]!.disposition = "blocked";
    expect(first.map?.attempts[0]?.disposition).toBe("completed");
    expect(["invalid", "review_required", "ready_for_inspection"]).toContain(first.status);
    expect(JSON.stringify(first)).not.toMatch(
      /studentName|email|courseTitle|generatedAnswer|abilityScore":/,
    );
  });

  it("uses stable concept-reference order without inferring a study sequence", () => {
    const value = request();
    value.concepts[0] = {
      ...value.concepts[0]!,
      conceptRef: "concept.z-prerequisite",
    };
    value.concepts.push({
      conceptRef: "concept.a-dependent",
      outcomeRefs: ["outcome.reason-01"],
      prerequisiteConceptRefs: ["concept.z-prerequisite"],
      prerequisiteKnowledge: "declared",
    });
    value.attempts[0]!.conceptRefs = ["concept.z-prerequisite"];
    value.delayedReturns[0]!.conceptRefs = ["concept.z-prerequisite"];

    const projection = projectUniversityLearningMap(value);

    expect(projection.status).toBe("ready_for_inspection");
    expect(projection.map?.concepts.map((concept) => concept.conceptRef)).toEqual([
      "concept.a-dependent",
      "concept.z-prerequisite",
    ]);
  });
});
