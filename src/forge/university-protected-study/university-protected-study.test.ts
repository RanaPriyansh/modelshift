import { describe, expect, it, vi } from "vitest";

import { universityTodayFixtureRequest } from "@/app/internal/university-today/today-fixture.server";
import { trustedWorldRegistry } from "@/src/forge/registry.server";

import {
  projectUniversityProtectedStudy,
  type UniversityProtectedStudyRequestV1,
} from ".";

function pack() {
  const value = trustedWorldRegistry.getPack("world.source-corroboration");
  if (!value) throw new Error("Expected source corroboration World.");
  return value;
}

async function request(
  todayScenario: "ready" | "source-review" | "tight" | "no-room" = "ready",
): Promise<UniversityProtectedStudyRequestV1> {
  return {
    schemaVersion: "university-protected-study-request.v1",
    todayRequest: await universityTodayFixtureRequest(todayScenario),
    worldPack: pack(),
  };
}

describe("projectUniversityProtectedStudy", () => {
  it("binds a recomputed ready action to the exact released runtime contract", async () => {
    const result = await projectUniversityProtectedStudy(await request());

    expect(result).toMatchObject({
      schemaVersion: "university-protected-study-projection.v1",
      status: "ready",
      todayStatus: "ready",
      context: {
        courseLabel: "CS102: Evidence and computation",
        title: "Test one claim against two sources",
        effortMinutesLow: 30,
        effortMinutesHigh: 45,
        availableMinutes: 60,
      },
      world: {
        id: "world.source-corroboration",
        version: "1.0.1",
        route: "/learn/ai-and-learning",
        activityProtocol: "activity",
        evidenceTier: "grounded",
        sourceProvenanceStatus: "incomplete",
      },
      learningContract: {
        beginsWithLearnerWork: true,
        support: {
          allowedDuringProof: false,
          recordsCognitiveSupport: false,
          catalog: [],
        },
        proof: {
          proofClaimId: "proof.ai-literacy.independent-corroboration",
          aiMode: "off",
          validatorId: "validator.source-corroboration-transfer.v1",
          modelMayDetermineCorrectness: false,
          blockedActionKinds: [
            "instructional_support",
            "model_action",
            "experience_replay",
          ],
          accessAllowed: true,
        },
        receipt: {
          proofAuthority: "honour_based",
          persistence: "not_persisted",
          durable: false,
          delayedReturnAvailable: false,
        },
      },
      authority: {
        recommendationAllowed: false,
        assignmentAnsweringAllowed: false,
        sessionStartAllowed: false,
        persistenceAllowed: false,
        evidenceClaimAllowed: false,
      },
      recovery: "inspect_protected_study",
      issues: [],
    });
    expect(result.world?.sourceIds).toEqual([
      "source.bastani-pnas.genai-learning-2025",
      "source.tutor-copilot.arxiv-2024",
    ]);
    expect(result.projectionDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it.each([
    ["source-review", "source_review_required"],
    ["tight", "learner_choice_required"],
    ["no-room", "capacity_conflict"],
  ] as const)(
    "withholds the World when Today scenario %s is not ready",
    async (scenario, todayStatus) => {
      const result = await projectUniversityProtectedStudy(await request(scenario));

      expect(result).toMatchObject({
        status: "today_not_ready",
        todayStatus,
        context: null,
        world: null,
        learningContract: null,
        recovery: "return_to_today",
        issues: [{ code: "today.not_ready" }],
      });
    },
  );

  it.each([
    ["version", (value: ReturnType<typeof pack>) => ({
      ...value,
      manifest: { ...value.manifest, version: "1.0.2" },
    })],
    ["route", (value: ReturnType<typeof pack>) => ({
      ...value,
      manifest: { ...value.manifest, route: "/learn/source-check" },
    })],
    ["protocol", (value: ReturnType<typeof pack>) => ({
      ...value,
      manifest: { ...value.manifest, activityProtocol: "modelshift" as const },
    })],
    ["sources", (value: ReturnType<typeof pack>) => ({
      ...value,
      manifest: {
        ...value.manifest,
        sources: [...value.manifest.sources].reverse(),
      },
      runtime: {
        ...value.runtime!,
        sourceBindings: [...value.runtime!.sourceBindings].reverse(),
      },
    })],
  ])("refuses an exact World %s mismatch", async (_label, mutate) => {
    const input = await request();
    const result = await projectUniversityProtectedStudy({
      ...input,
      worldPack: mutate(pack()),
    });

    expect(result).toMatchObject({
      status: "world_mismatch",
      context: null,
      world: null,
      learningContract: null,
      recovery: "review_world_binding",
      issues: [{ code: "world.binding_mismatch" }],
    });
  });

  it("withholds a paused or runtime-less World", async () => {
    const input = await request();
    const exactPack = pack();
    const runtimeLessPack = {
      manifest: exactPack.manifest,
      release: exactPack.release,
      capabilities: exactPack.capabilities,
      proofClaims: exactPack.proofClaims,
      deterministicValidators: exactPack.deterministicValidators,
    };
    const paused = await projectUniversityProtectedStudy({
      ...input,
      worldPack: {
        ...pack(),
        manifest: {
          ...pack().manifest,
          availability: {
            status: "unavailable",
            reason: "Synthetic pause.",
          },
        },
      },
    });
    const runtimeLess = await projectUniversityProtectedStudy({
      ...input,
      worldPack: runtimeLessPack,
    });

    expect(paused).toMatchObject({
      status: "world_unavailable",
      issues: [{ code: "world.not_available" }],
    });
    expect(runtimeLess).toMatchObject({
      status: "world_unavailable",
      issues: [{ code: "world.runtime_missing" }],
    });
  });

  it("rejects malformed or strengthened proof packages", async () => {
    const input = await request();
    const runtime = pack().runtime!;
    const proofClaim = pack().proofClaims[0]!;
    const strengthened = await projectUniversityProtectedStudy({
      ...input,
      worldPack: {
        ...pack(),
        proofClaims: [{
          ...proofClaim,
          aiBoundary: {
            ...proofClaim.aiBoundary,
            mode: "bounded",
            allowedActions: ["coach-question"],
          },
        }],
        runtime: {
          ...runtime,
        },
      },
    });

    expect(await projectUniversityProtectedStudy(null)).toMatchObject({
      status: "invalid",
      projectionDigest: null,
      issues: [{ code: "schema.invalid" }],
    });
    expect(strengthened).toMatchObject({
      status: "invalid",
      projectionDigest: null,
      issues: [{ code: "world.invalid" }],
    });
  });

  it("withholds non-canonical learning order and answer-changing access", async () => {
    const input = await request();
    const runtime = pack().runtime!;
    const nonCanonical = await projectUniversityProtectedStudy({
      ...input,
      worldPack: {
        ...pack(),
        runtime: {
          ...runtime,
          semanticStages: [
            "commit_model",
            "encounter",
            ...runtime.semanticStages.slice(2),
          ],
        },
      },
    });
    const answerChanging = await projectUniversityProtectedStudy({
      ...input,
      worldPack: {
        ...pack(),
        runtime: {
          ...runtime,
          access: {
            ...runtime.access,
            accommodations: runtime.access.accommodations.map((entry, index) => (
              index === 0
                ? {
                    ...entry,
                    constructPreservation: "changes_construct",
                    answerChanging: true,
                  }
                : entry
            )),
          },
        },
      },
    });

    expect(nonCanonical).toMatchObject({
      status: "world_unavailable",
      issues: [{ code: "world.integrity_unenforceable" }],
    });
    expect(answerChanging).toMatchObject({
      status: "world_unavailable",
      issues: [{ code: "world.integrity_unenforceable" }],
    });
  });

  it("does not traverse hostile accessors", async () => {
    const getter = vi.fn(() => "university-protected-study-request.v1");
    const hostile = {};
    Object.defineProperty(hostile, "schemaVersion", {
      enumerable: true,
      get: getter,
    });
    const getPrototypeOf = vi.fn(() => {
      throw new Error("getPrototypeOf trap executed");
    });
    const ownKeys = vi.fn(() => {
      throw new Error("ownKeys trap executed");
    });
    const getOwnPropertyDescriptor = vi.fn(() => {
      throw new Error("getOwnPropertyDescriptor trap executed");
    });
    const proxy = new Proxy(await request(), {
      getPrototypeOf,
      ownKeys,
      getOwnPropertyDescriptor,
    });

    const [result, proxyResult] = await Promise.all([
      projectUniversityProtectedStudy(hostile),
      projectUniversityProtectedStudy(proxy),
    ]);

    expect(getter).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid" }],
    });
    expect(proxyResult).toMatchObject({
      status: "invalid",
      projectionDigest: null,
      issues: [{ code: "schema.invalid" }],
    });
    expect(getPrototypeOf).not.toHaveBeenCalled();
    expect(ownKeys).not.toHaveBeenCalled();
    expect(getOwnPropertyDescriptor).not.toHaveBeenCalled();
  });

  it("is deterministic, deeply frozen, and side-effect free", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const input = await request();
    const first = await projectUniversityProtectedStudy(input);
    const second = await projectUniversityProtectedStudy(input);

    expect(first).toEqual(second);
    expect(first.projectionDigest).toBe(second.projectionDigest);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.learningContract)).toBe(true);
    expect(Object.isFrozen(first.learningContract?.proof.successCriteria)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
