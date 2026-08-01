import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UniversityDegreeMapRequestV2 } from "@/src/forge/university-degree-map";
import type { UniversityLearningMapRequestV2 } from "@/src/forge/university-learning-map";

const moduleReaders = vi.hoisted(() => ({
  identity: vi.fn<() => Promise<unknown>>(),
  bindingKey: {
    calls: 0,
    read: () => null as unknown,
  },
}));

vi.mock("@/src/lib/forge-auth/session.server", () => ({
  readForgeCloudIdentitySubject: moduleReaders.identity,
}));

vi.mock("./binding-key-provider.server", () => ({
  readUniversityAccountContextBindingKey: () => {
    moduleReaders.bindingKey.calls += 1;
    return moduleReaders.bindingKey.read();
  },
}));

import {
  bindUniversityAccountContext,
  type UniversityAccountContextRequestV2,
} from "./index.server";
import * as accountContextModule from "./index.server";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const MAXIMUM_SERIALIZED_JSON_BYTES = 512 * 1_024;
const MAXIMUM_STRING_LENGTH = 4_096;
const EXPECTED_BINDING_ID =
  "learner.hmac-sha256.v1.35d071ae2c402ec6691e308bce35445f71e41cb5660153c59634e14ab0f94c5a";

function degreeRequest(): UniversityDegreeMapRequestV2 {
  return {
    schemaVersion: "university-degree-map-request.v2",
    ownershipDeclaration: {
      subject: "adult_learner_self_attested",
      control: "learner_managed_self_attested",
    },
    program: {
      programRef: "program.computing.v1",
      creditUnit: "institution_credit_unit",
      sourceRef: "source.catalog.v1",
    },
    sourceRegistry: [{
      sourceRef: "source.catalog.v1",
      declaredSourceDigest: `sha256:${"a".repeat(64)}`,
      authority: "learner_supplied_not_verified",
    }],
    courses: [
      {
        courseId: "course.math100",
        creditUnits: 3,
        state: "completed",
        prerequisiteCourseIds: [],
        sourceRef: "source.catalog.v1",
      },
      {
        courseId: "course.cs100",
        creditUnits: 4,
        state: "in_progress",
        prerequisiteCourseIds: ["course.math100"],
        sourceRef: "source.catalog.v1",
      },
    ],
    requirements: [{
      requirementId: "requirement.credits.core",
      kind: "minimum_credits",
      minimumCreditUnits: 7,
      eligibleCourseIds: ["course.math100", "course.cs100"],
      sourceRef: "source.catalog.v1",
    }],
  };
}

function learningRequest(): UniversityLearningMapRequestV2 {
  return {
    schemaVersion: "university-learning-map-request.v2",
    course: {
      courseRef: "course.cs100",
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
    evidence: [{
      evidenceRef: "evidence.attempt-01",
      kind: "attempt_receipt",
      authority: "bounded_reference_only",
      contentCaptured: false,
    }],
    attempts: [{
      attemptRef: "attempt.local-01",
      conceptRefs: ["concept.foundation-01"],
      attemptedOn: "2026-08-01",
      disposition: "completed",
      evidenceRefs: ["evidence.attempt-01"],
      helpUsed: [],
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

function request(): UniversityAccountContextRequestV2 {
  return {
    schemaVersion: "university-account-context-request.v2",
    degreeMapRequest: degreeRequest(),
    learningMapRequest: learningRequest(),
  };
}

function identity(id = ACCOUNT_ID): unknown {
  return {
    id,
    accountKind: "cloud_identity",
  };
}

function bindingKey(): Uint8Array {
  return Uint8Array.from({ length: 32 }, (_, index) => index + 1);
}

function serializedBoundaryInput(additionalBytes = 0): unknown {
  const input = request() as unknown as {
    degreeMapRequest: {
      program: Record<string, unknown>;
    };
  };
  const values: string[] = [];
  input.degreeMapRequest.program.boundary = values;
  const targetBytes = MAXIMUM_SERIALIZED_JSON_BYTES + additionalBytes;

  while (true) {
    const remainingBytes = targetBytes
      - Buffer.byteLength(JSON.stringify(input));
    const nextStringJsonBytes = values.length === 0 ? 2 : 3;
    if (remainingBytes <= nextStringJsonBytes + MAXIMUM_STRING_LENGTH) {
      values.push("x".repeat(remainingBytes - nextStringJsonBytes));
      return input;
    }
    values.push("x".repeat(MAXIMUM_STRING_LENGTH));
  }
}

function expectDeeplyFrozen(
  value: unknown,
  seen = new WeakSet<object>(),
): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) {
      expectDeeplyFrozen(descriptor.value, seen);
    }
  }
}

beforeEach(() => {
  moduleReaders.identity.mockReset();
  moduleReaders.identity.mockResolvedValue(identity());
  moduleReaders.bindingKey.calls = 0;
  moduleReaders.bindingKey.read = () => bindingKey();
});

describe("bindUniversityAccountContext", () => {
  it("keeps the module-owned production providers unavailable by default", async () => {
    const actualProvider = await vi.importActual<
      typeof import("./binding-key-provider.server")
    >("./binding-key-provider.server");
    moduleReaders.identity.mockResolvedValueOnce(null);

    const result = await bindUniversityAccountContext(request());

    expect(actualProvider.readUniversityAccountContextBindingKey()).toBeNull();
    expect(bindUniversityAccountContext).toHaveLength(1);
    expect("readUniversityAccountContextBindingKey" in accountContextModule)
      .toBe(false);
    expect(result.status).toBe("unavailable");
    expect(result.context).toBeNull();
    expect(result.authority).toMatchObject({
      accountBindingAuthority: "not_established",
      bindingIdentifierAuthority: "not_established",
      bindingKeyAuthority: "not_established",
    });
    expect(moduleReaders.bindingKey.calls).toBe(0);
  });

  it("keeps an admitted identity unavailable without a server binding key", async () => {
    moduleReaders.bindingKey.read = () => null;

    const result = await bindUniversityAccountContext(request());

    expect(result).toMatchObject({
      schemaVersion: "university-account-context-result.v2",
      status: "unavailable",
      reason: "binding_key_unavailable",
      context: null,
      issues: [],
    });
  });

  it("binds strict learner declarations with a versioned keyed identifier", async () => {
    const result = await bindUniversityAccountContext(request());

    expect(result).toMatchObject({
      schemaVersion: "university-account-context-result.v2",
      status: "bound_for_inspection",
      reason: null,
      context: {
        canonicalStatus: "ready_for_inspection",
        contextBinding: {
          bindingId: EXPECTED_BINDING_ID,
          ownershipDeclaration: "adult_learner_self_attested",
        },
        degreeAxis: {
          status: "ready_for_inspection",
          programRef: "program.computing.v1",
        },
        learningAxis: {
          status: "ready_for_inspection",
          map: {
            course: {
              courseRef: "course.cs100",
            },
          },
        },
      },
      authority: {
        accountBindingAuthority:
          "authenticated_active_adult_cloud_profile",
        bindingIdentifierAuthority:
          "server_derived_context_specific_hmac_sha256_v1",
        bindingKeyAuthority: "server_injected_minimum_32_byte_key",
        ageVerificationAuthority: "not_established",
        learnerContentAuthority: "learner_declared_not_verified",
        institutionalAuthorityEstablished: false,
        tenantAuthorityEstablished: false,
        persistenceAllowed: false,
        eventEmissionAllowed: false,
        providerCallAllowed: false,
        recommendationAllowed: false,
        answerGenerationAllowed: false,
        masteryInferenceAllowed: false,
        networkBeyondIdentityReaderAllowed: false,
        externalEffectsAllowed: false,
      },
      issues: [],
    });
  });

  it("rejects retired outer and child v1 schemas before server reads", async () => {
    const retiredRequests: unknown[] = [
      {
        ...request(),
        schemaVersion: "university-account-context-request.v1",
      },
      {
        ...request(),
        degreeMapRequest: {
          ...degreeRequest(),
          schemaVersion: "university-degree-map-request.v1",
        },
      },
      {
        ...request(),
        learningMapRequest: {
          ...learningRequest(),
          schemaVersion: "university-learning-map-request.v1",
        },
      },
    ];

    for (const retiredRequest of retiredRequests) {
      const result = await bindUniversityAccountContext(retiredRequest);
      expect(result.status).toBe("invalid");
      expect(result.reason).toBe("input_invalid");
      expect(result.context).toBeNull();
    }

    expect(moduleReaders.identity).not.toHaveBeenCalled();
    expect(moduleReaders.bindingKey.calls).toBe(0);
  });

  it("derives stable domain-separated bindings and separates accounts and keys", async () => {
    const first = await bindUniversityAccountContext(request());
    const second = await bindUniversityAccountContext(request());
    moduleReaders.identity.mockResolvedValueOnce(identity(OTHER_ACCOUNT_ID));
    const otherAccount = await bindUniversityAccountContext(request());
    const otherKey = bindingKey();
    otherKey[0] = 255;
    moduleReaders.bindingKey.read = () => otherKey;
    const rotated = await bindUniversityAccountContext(request());

    expect(first.context?.contextBinding.bindingId).toBe(EXPECTED_BINDING_ID);
    expect(second.context?.contextBinding.bindingId).toBe(EXPECTED_BINDING_ID);
    expect(otherAccount.context?.contextBinding.bindingId)
      .not.toBe(EXPECTED_BINDING_ID);
    expect(rotated.context?.contextBinding.bindingId)
      .not.toBe(EXPECTED_BINDING_ID);
    const undomainedDigest = createHmac("sha256", bindingKey())
      .update(ACCOUNT_ID)
      .digest("hex");
    expect(first.context?.contextBinding.bindingId)
      .not.toBe(`learner.hmac-sha256.v1.${undomainedDigest}`);
    expect(otherKey[0]).toBe(255);
  });

  it("does not return account data or the server binding key", async () => {
    const result = await bindUniversityAccountContext(request());
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(ACCOUNT_ID);
    expect(serialized).not.toContain(JSON.stringify(Array.from(bindingKey())));
  });

  it("rejects contact data from the module-owned identity subject boundary", async () => {
    moduleReaders.identity.mockResolvedValueOnce({
      ...identity() as object,
      email: "learner@example.test",
    });

    const result = await bindUniversityAccountContext(request());

    expect(result).toMatchObject({
      status: "invalid",
      reason: "identity_record_invalid",
      context: null,
    });
    expect(JSON.stringify(result)).not.toContain("learner@example.test");
    expect(moduleReaders.bindingKey.calls).toBe(0);
  });

  it("rejects caller authority fields and ignores forged reader options", async () => {
    const fields = [
      [
        "contextBinding",
        {
          bindingId: "caller.binding",
          ownershipDeclaration: "adult_learner_self_attested",
        },
      ],
      ["accountId", ACCOUNT_ID],
      ["adultClaim", true],
      ["tenantId", "tenant.university"],
      ["persistenceAllowed", true],
      ["authority", { institutionalAuthorityEstablished: true }],
    ] as const;
    const invalidResults = await Promise.all(fields.map(([name, value]) => (
      bindUniversityAccountContext({ ...request(), [name]: value })
    )));
    const forgedIdentity = vi.fn(async () => identity());
    const forgedKey = vi.fn(() => bindingKey());
    moduleReaders.identity.mockResolvedValueOnce(null);
    const callWithForgedOptions = bindUniversityAccountContext as unknown as (
      value: unknown,
      options: unknown,
    ) => ReturnType<typeof bindUniversityAccountContext>;
    const forgedResult = await callWithForgedOptions(request(), {
      identityReader: forgedIdentity,
      bindingKeyReader: forgedKey,
    });

    expect(invalidResults.every((result) => result.status === "invalid"))
      .toBe(true);
    expect(invalidResults.every((result) => result.reason === "input_invalid"))
      .toBe(true);
    expect(forgedResult).toMatchObject({
      status: "unavailable",
      reason: "cloud_identity_unavailable",
      context: null,
    });
    expect(forgedIdentity).not.toHaveBeenCalled();
    expect(forgedKey).not.toHaveBeenCalled();
    expect(moduleReaders.identity).toHaveBeenCalledTimes(1);
    expect(moduleReaders.bindingKey.calls).toBe(0);
  });

  it("does not invoke caller accessors or proxy traps", async () => {
    const getter = vi.fn(() => request().schemaVersion);
    const accessor = request() as unknown as Record<string, unknown>;
    Object.defineProperty(accessor, "schemaVersion", {
      enumerable: true,
      get: getter,
    });
    const trap = vi.fn(() => {
      throw new Error("proxy trap executed");
    });
    const rootProxy = new Proxy(request(), {
      getPrototypeOf: trap,
      ownKeys: trap,
      getOwnPropertyDescriptor: trap,
    });
    const nestedProxy = request() as unknown as {
      learningMapRequest: { course: unknown };
    };
    nestedProxy.learningMapRequest.course = new Proxy(
      learningRequest().course,
      {
        getPrototypeOf: trap,
        ownKeys: trap,
        getOwnPropertyDescriptor: trap,
      },
    );

    const results = await Promise.all(
      [accessor, rootProxy, nestedProxy].map((value) => (
        bindUniversityAccountContext(value)
      )),
    );

    expect(results.every((result) => result.status === "invalid")).toBe(true);
    expect(getter).not.toHaveBeenCalled();
    expect(trap).not.toHaveBeenCalled();
    expect(moduleReaders.identity).not.toHaveBeenCalled();
    expect(moduleReaders.bindingKey.calls).toBe(0);
  });

  it("rejects repeated references and oversized caller input", async () => {
    const alias = request() as unknown as {
      degreeMapRequest: { program: unknown };
      learningMapRequest: { course: unknown };
    };
    alias.learningMapRequest.course = alias.degreeMapRequest.program;
    const oversized = request() as unknown as {
      degreeMapRequest: { courses: unknown[] };
    };
    oversized.degreeMapRequest.courses = new Array(513).fill(null);

    const results = await Promise.all([alias, oversized].map((value) => (
      bindUniversityAccountContext(value)
    )));

    expect(results.every((result) => result.status === "invalid")).toBe(true);
    expect(results.every((result) => result.reason === "input_invalid"))
      .toBe(true);
    expect(moduleReaders.identity).not.toHaveBeenCalled();
    expect(moduleReaders.bindingKey.calls).toBe(0);
  });

  it("rejects over-limit strings and serialized inputs before server reads", async () => {
    const overlongString = request();
    overlongString.degreeMapRequest.program.programRef =
      "x".repeat(MAXIMUM_STRING_LENGTH + 1);
    const oversizedSerializedInput = serializedBoundaryInput(1);

    expect(Buffer.byteLength(JSON.stringify(oversizedSerializedInput)))
      .toBe(MAXIMUM_SERIALIZED_JSON_BYTES + 1);

    const results = await Promise.all([
      bindUniversityAccountContext(overlongString),
      bindUniversityAccountContext(oversizedSerializedInput),
    ]);

    for (const result of results) {
      expect(result).toMatchObject({
        status: "invalid",
        reason: "input_invalid",
        context: null,
        issues: [{
          code: "input.invalid",
          path: "",
          message: "The account-context request must be bounded plain JSON.",
        }],
      });
    }
    expect(moduleReaders.identity).not.toHaveBeenCalled();
    expect(moduleReaders.bindingKey.calls).toBe(0);
  });

  it("admits exact input ceilings to strict schema validation", async () => {
    const exactStringBoundary = request();
    exactStringBoundary.degreeMapRequest.program.programRef =
      "x".repeat(MAXIMUM_STRING_LENGTH);
    const exactSerializedBoundary = serializedBoundaryInput();

    expect(Buffer.byteLength(JSON.stringify(exactSerializedBoundary)))
      .toBe(MAXIMUM_SERIALIZED_JSON_BYTES);

    const results = await Promise.all([
      bindUniversityAccountContext(exactStringBoundary),
      bindUniversityAccountContext(exactSerializedBoundary),
    ]);

    expect(results.every((result) => result.status === "invalid")).toBe(true);
    expect(results.every((result) => result.reason === "input_invalid"))
      .toBe(true);
    expect(results[0]?.issues.some(
      (issue) => issue.path === "degreeMapRequest.program.programRef",
    )).toBe(true);
    expect(results[1]?.issues.some(
      (issue) => issue.path === "degreeMapRequest.program",
    )).toBe(true);
    expect(moduleReaders.identity).not.toHaveBeenCalled();
    expect(moduleReaders.bindingKey.calls).toBe(0);
  });

  it("rejects malformed and hostile server identity records", async () => {
    const getter = vi.fn(() => ACCOUNT_ID);
    const accessor = identity() as Record<string, unknown>;
    Object.defineProperty(accessor, "id", {
      enumerable: true,
      get: getter,
    });
    const trap = vi.fn(() => {
      throw new Error("identity proxy trap executed");
    });
    const identityProxy = new Proxy(identity() as object, {
      getPrototypeOf: trap,
      ownKeys: trap,
      getOwnPropertyDescriptor: trap,
    });
    const malformed = {
      ...identity() as object,
      tenantId: "tenant.university",
    };
    moduleReaders.identity
      .mockResolvedValueOnce(accessor)
      .mockResolvedValueOnce(identityProxy)
      .mockResolvedValueOnce(malformed);

    const results = await Promise.all([
      bindUniversityAccountContext(request()),
      bindUniversityAccountContext(request()),
      bindUniversityAccountContext(request()),
    ]);

    expect(results.every((result) => result.status === "invalid")).toBe(true);
    expect(results.every(
      (result) => result.reason === "identity_record_invalid",
    )).toBe(true);
    expect(getter).not.toHaveBeenCalled();
    expect(trap).not.toHaveBeenCalled();
    expect(moduleReaders.bindingKey.calls).toBe(0);
  });

  it("returns unavailable for weak, oversized, and hostile server binding keys", async () => {
    const trap = vi.fn(() => {
      throw new Error("binding-key proxy trap executed");
    });
    const proxyKey = new Proxy(bindingKey(), {
      getPrototypeOf: trap,
      ownKeys: trap,
      getOwnPropertyDescriptor: trap,
    });
    const values: unknown[] = [
      "0123456789abcdef0123456789abcdef",
      new Uint8Array(31),
      new Uint8Array(4_097),
      proxyKey,
    ];
    const pendingValues = [...values];
    moduleReaders.bindingKey.read = () => pendingValues.shift();

    const results = await Promise.all(values.map(() => (
      bindUniversityAccountContext(request())
    )));

    expect(results.every((result) => result.status === "unavailable"))
      .toBe(true);
    expect(results.map((result) => result.reason)).toEqual([
      "binding_key_invalid",
      "binding_key_invalid",
      "binding_key_invalid",
      "binding_key_invalid",
    ]);
    expect(trap).not.toHaveBeenCalled();
  });

  it("fails closed and sanitizes module-owned reader failures", async () => {
    moduleReaders.identity.mockRejectedValueOnce(
      new Error(`secret identity failure for ${ACCOUNT_ID}`),
    );
    const identityFailure = await bindUniversityAccountContext(request());
    moduleReaders.bindingKey.read = () => {
      throw new Error("secret binding key failure");
    };
    const keyFailure = await bindUniversityAccountContext(request());

    expect(identityFailure).toMatchObject({
      status: "invalid",
      reason: "identity_reader_failed",
      context: null,
    });
    expect(keyFailure).toMatchObject({
      status: "unavailable",
      reason: "binding_key_unavailable",
      context: null,
    });
    expect(JSON.stringify([identityFailure, keyFailure]))
      .not.toContain("secret");
    expect(JSON.stringify([identityFailure, keyFailure]))
      .not.toContain(ACCOUNT_ID);
  });

  it("returns canonical context errors without account authority", async () => {
    const value = request();
    value.learningMapRequest.course.courseRef = "course.unknown-999";

    const result = await bindUniversityAccountContext(value);

    expect(result).toMatchObject({
      status: "invalid",
      reason: "student_context_invalid",
      context: null,
      authority: {
        accountBindingAuthority: "not_established",
        bindingIdentifierAuthority: "not_established",
        bindingKeyAuthority: "not_established",
      },
    });
    expect(result.issues).toEqual([{
      code: "student_context.invalid",
      path: "learningMapRequest.course.courseRef",
      message: "The canonical student context rejected this request.",
    }]);
  });

  it("preserves canonical review status without creating recommendations", async () => {
    const value = request();
    value.learningMapRequest.unknowns.push({
      unknownRef: "unknown.prerequisite-01",
      scopeRef: "concept.foundation-01",
      kind: "prerequisite_unknown",
      state: "explicit",
    });

    const result = await bindUniversityAccountContext(value);

    expect(result.status).toBe("bound_for_inspection");
    expect(result.context?.canonicalStatus).toBe("review_required");
    expect(result.context?.learningAxis.status).toBe("review_required");
    expect(JSON.stringify(result)).not.toContain("recommended");
  });

  it("snapshots caller input before it waits for server identity", async () => {
    let resolveIdentity: ((value: unknown) => void) | undefined;
    const identityPromise = new Promise<unknown>((resolve) => {
      resolveIdentity = resolve;
    });
    moduleReaders.identity.mockReturnValueOnce(identityPromise);
    const value = request();
    const pending = bindUniversityAccountContext(value);

    value.degreeMapRequest.courses[1]!.state = "completed";
    resolveIdentity?.(identity());
    const result = await pending;

    expect(result.status).toBe("bound_for_inspection");
    expect(result.context?.degreeAxis.courses.find(
      (course) => course.courseId === "course.cs100",
    )?.state).toBe("in_progress");
  });

  it("calls each module provider once and returns frozen effect-free data", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dispatchSpy = vi.spyOn(EventTarget.prototype, "dispatchEvent");

    const result = await bindUniversityAccountContext(request());

    expect(moduleReaders.identity).toHaveBeenCalledTimes(1);
    expect(moduleReaders.bindingKey.calls).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(dispatchSpy).not.toHaveBeenCalled();
    expectDeeplyFrozen(result);
    expect(() => {
      (result.issues as unknown as unknown[]).push({});
    }).toThrow();
    fetchSpy.mockRestore();
    dispatchSpy.mockRestore();
  });
});
