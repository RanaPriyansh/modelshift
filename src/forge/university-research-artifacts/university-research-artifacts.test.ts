import { describe, expect, it, vi } from "vitest";

import {
  UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS,
  UNIVERSITY_RESEARCH_SCENARIO_IDS,
} from "../university-research-operations";
import { canonicalJson, sha256Digest } from "../events";
import {
  UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS,
  UNIVERSITY_RESEARCH_CANDIDATE_ADAPTER_DESCRIPTOR,
  UNIVERSITY_RESEARCH_RENDERER_BINDING_DESCRIPTOR,
  authoredUniversityResearchArtifactPreflightRequest,
  projectUniversityResearchArtifacts,
  type UniversityResearchArtifactPreflightRequestV1,
} from ".";

type JsonObject = Record<string, unknown>;
type Scenario =
  UniversityResearchArtifactPreflightRequestV1["scenarioPacks"][number][
    "scenarios"
  ][number];

async function request(): Promise<UniversityResearchArtifactPreflightRequestV1> {
  return JSON.parse(JSON.stringify(
    await authoredUniversityResearchArtifactPreflightRequest(),
  )) as UniversityResearchArtifactPreflightRequestV1;
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonObject)
        .reverse()
        .map(([key, child]) => [key, reverseObjectKeys(child)]),
    );
  }
  return value;
}

async function domainDigest(
  digestDomain: string,
  value: unknown,
): Promise<string> {
  return sha256Digest(canonicalJson({ digestDomain, value }));
}

async function refreshPackBindings(
  input: UniversityResearchArtifactPreflightRequestV1,
): Promise<void> {
  const [packP, packQ] = input.scenarioPacks;
  input.substitute.packBindings[0].packDigest = await domainDigest(
    UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenarioPack,
    packP,
  );
  input.substitute.packBindings[1].packDigest = await domainDigest(
    UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenarioPack,
    packQ,
  );
}

const SYMMETRIC_SEMANTIC_MUTATIONS: readonly [
  string,
  (scenario: Scenario) => void,
][] = [
  ["expected status", (scenario) => {
    scenario.expectedStatus = "path_blocked";
  }],
  ["source conflict metadata", (scenario) => {
    scenario.source.conflictCount = 1;
    scenario.source.freshness = "conflicting_fixture_copies";
  }],
  ["deadline title", (scenario) => {
    scenario.deadline.title = "Alternative concept check closes";
  }],
  ["relative deadline", (scenario) => {
    scenario.deadline.relativeMinutes = 1_919;
    scenario.deadline.at = new Date(
      Date.parse(scenario.context.asOf) + (1_919 * 60_000),
    ).toISOString();
  }],
  ["capacity values", (scenario) => {
    scenario.capacity.availableMinutes = 100;
    scenario.capacity.effortMinutesLow = 50;
    scenario.capacity.effortMinutesHigh = 70;
    scenario.capacity.relation = "fits";
  }],
  ["accepted action title", (scenario) => {
    scenario.path.actionTitle = "Map an alternative set of claims";
  }],
  ["World state", (scenario) => {
    scenario.world.state = "not_exposed";
  }],
  ["terminal state", (scenario) => {
    scenario.terminal.state = "action_complete";
  }],
  ["choice contract", (scenario) => {
    scenario.choices[0] = {
      ...scenario.choices[0]!,
      kind: "review_copied_sources",
      label: "Review the copied sources",
      owner: "source_reviewer",
    };
  }],
  ["next-job reason", (scenario) => {
    scenario.nextJob.reasonCode = "reason.symmetric-corruption";
  }],
  ["next-job owner", (scenario) => {
    scenario.nextJob.owner = "human_reviewer";
  }],
  ["control and navigation effect", (scenario) => {
    scenario.nextJob.primaryControl = {
      kind: "no_control",
      label: null,
      effect: "remain_in_place",
    };
    scenario.effects.navigationOnly = false;
    scenario.answerKey.effectPrediction = "no_effect";
    scenario.difficulty.navigationStepCount = 0;
  }],
  ["answer-key stop owner", (scenario) => {
    scenario.answerKey.stopOwner = "human_reviewer";
  }],
  ["difficulty dependency count", (scenario) => {
    scenario.difficulty.dependencyCount = 3;
  }],
];

describe("university research artifact preflight", () => {
  it("authors two exact packs and a neutral substitute without upgrading review authority", async () => {
    const projection = await projectUniversityResearchArtifacts(await request());

    expect(projection.status).toBe(
      "mechanical_parity_passed_review_required",
    );
    expect(projection.issues).toEqual([]);
    expect(projection.artifacts?.packP.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(projection.artifacts?.packQ.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(projection.artifacts?.packP.digest).not.toBe(
      projection.artifacts?.packQ.digest,
    );
    expect(projection.artifacts?.packP.scenarios).toHaveLength(7);
    expect(projection.artifacts?.packQ.scenarios).toHaveLength(7);
    expect(projection.artifacts?.substitute.artifactRef).toBe(
      "matched-substitute.phase-minus-one.v1",
    );
    expect(projection.artifacts?.independentReview.requestStatus).toBe(
      "requested",
    );
    expect(projection.openGates).toEqual([
      "candidate_pack_adapter_not_implemented",
      "candidate_substitute_render_parity_not_run",
      "independent_difficulty_equivalence_review_required",
      "artifact_approval_not_established",
      "synthetic_persona_rehearsal_not_run",
      "participant_operation_not_authorized",
    ]);
    expect(projection.authority.packEquivalenceAuthority).toBe(
      "not_established_independent_review_required",
    );
    expect(projection.authority.candidateBuildIdentityAuthority).toBe(
      "caller_asserted_not_verified",
    );
    expect(projection.authority.candidateAdapterIdentityAuthority).toBe(
      "locally_recomputed_manifest_only",
    );
    expect(projection.authority.rendererBindingIdentityAuthority).toBe(
      "locally_recomputed_manifest_only",
    );
    expect(projection.mechanicalChecks).toMatchObject({
      canonicalScenarioSemantics: true,
      uniqueReferences: true,
      substituteManifestDensity: true,
      rendererBindingVerified: true,
      candidateAdapterBindingVerified: true,
      candidateRenderParity: "not_rendered",
      substituteRenderParity: "not_rendered",
    });
    expect(projection.authority.rehearsalReadiness).toBe(false);
    expect(projection.authority.participantEnrollmentAllowed).toBe(false);
    expect(projection.authority.gateClosureAllowed).toBe(false);
  });

  it("binds all named protocol information while preserving the locked seven IDs", async () => {
    const projection = await projectUniversityResearchArtifacts(await request());

    expect(projection.informationItems.map((entry) => entry.itemId)).toEqual(
      UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS,
    );
    expect(projection.informationItems[0]?.covers).toEqual(["term", "course"]);
    expect(projection.informationItems[6]?.covers).toEqual([
      "terminal_state",
      "effect_boundaries",
    ]);
    projection.informationItems.forEach((entry) => {
      expect(entry.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });

  it("uses different invented lexical values with identical semantic signatures", async () => {
    const input = await request();
    const [packP, packQ] = input.scenarioPacks;
    const projection = await projectUniversityResearchArtifacts(input);

    expect(packP.scenarios.map((entry) => entry.scenarioId)).toEqual(
      UNIVERSITY_RESEARCH_SCENARIO_IDS,
    );
    expect(packQ.scenarios.map((entry) => entry.scenarioId)).toEqual(
      UNIVERSITY_RESEARCH_SCENARIO_IDS,
    );
    packP.scenarios.forEach((left, index) => {
      const right = packQ.scenarios[index]!;
      expect(left.context.termLabel).not.toBe(right.context.termLabel);
      expect(left.context.courseLabel).not.toBe(right.context.courseLabel);
      expect(left.context.asOf).not.toBe(right.context.asOf);
      expect(left.deadline.at).not.toBe(right.deadline.at);
      expect(left.scenarioRef).not.toBe(right.scenarioRef);
      expect(
        projection.artifacts?.packP.scenarios[index]?.semanticSignatureDigest,
      ).toBe(
        projection.artifacts?.packQ.scenarios[index]?.semanticSignatureDigest,
      );
    });
  });

  it("keeps every scenario synthetic, learner-owned, and side-effect free", async () => {
    const input = await request();

    input.scenarioPacks.forEach((pack) => {
      expect(pack.syntheticBoundary).toEqual({
        syntheticOnly: true,
        realInstitutionAllowed: false,
        realPersonAllowed: false,
        realCourseAllowed: false,
        realAccountAllowed: false,
        realAssignmentAllowed: false,
        participantDataCaptureAllowed: false,
      });
      pack.scenarios.forEach((scenario) => {
        expect(scenario.source.authority).toBe(
          "synthetic_copied_fact_not_university_truth",
        );
        expect(scenario.path.owner).toBe("learner_fixture");
        expect(scenario.path.selectedBySourceFacts).toBe(false);
        expect(scenario.deadline.universityTruth).toBe(false);
        expect(scenario.effects).toMatchObject({
          saves: false,
          sends: false,
          startsSession: false,
          submits: false,
          records: false,
          createsEvidence: false,
          changesPath: false,
          externalEffect: false,
          institutionalAction: false,
        });
      });
    });
  });

  it("authors a strict neutral content tree with exact pack bindings", async () => {
    const input = await request();
    const projection = await projectUniversityResearchArtifacts(input);
    const serializedSurface = JSON.stringify(input.substitute.surface);

    expect(input.substitute.surface.nodes.map((node) => node.kind)).toEqual([
      "heading",
      "anchor_navigation",
      "fact_table",
      "choice_list",
      "effect_boundary",
      "task_prompt",
      "terminal_note",
    ]);
    expect(input.substitute.surface.nodes[1]).toMatchObject({
      kind: "anchor_navigation",
      labelStrategy: "locked_ordinal_example_labels",
      items: UNIVERSITY_RESEARCH_SCENARIO_IDS.map((scenarioId, index) => ({
        scenarioId,
        label: `Example ${index + 1}`,
      })),
    });
    expect(serializedSurface).not.toMatch(/\bFORGE\b/i);
    expect(serializedSurface).not.toMatch(
      /protected_study_ready|source_review_required|path_complete/i,
    );
    expect(input.substitute.access).toMatchObject({
      minimumCssWidth: 320,
      allSevenStatesKeyboardReachable: true,
      motionRequired: false,
      remoteAssetsAllowed: false,
      rawHtmlAllowed: false,
      scriptAllowed: false,
      urlInputAllowed: false,
    });
    expect(input.substitute.packBindings).toEqual([
      {
        packId: "pack-p",
        packDigest: projection.artifacts?.packP.digest,
      },
      {
        packId: "pack-q",
        packDigest: projection.artifacts?.packQ.digest,
      },
    ]);
  });

  it("is deterministic across input key order and deeply freezes its output", async () => {
    const input = await request();
    const reordered = reverseObjectKeys(input);
    const [left, right] = await Promise.all([
      projectUniversityResearchArtifacts(input),
      projectUniversityResearchArtifacts(reordered),
    ]);

    expect(left).toEqual(right);
    expect(left.projectionDigest).toBe(right.projectionDigest);
    expect(Object.isFrozen(left)).toBe(true);
    expect(Object.isFrozen(left.artifacts)).toBe(true);
    expect(Object.isFrozen(left.artifacts?.packP.scenarios)).toBe(true);
    expect(() => {
      (left.mechanicalChecks as { exactScenarioOrder: boolean })
        .exactScenarioOrder = false;
    }).toThrow();
  });

  it("does not mutate an accepted input", async () => {
    const input = await request();
    const before = JSON.stringify(input);

    await projectUniversityResearchArtifacts(input);

    expect(JSON.stringify(input)).toBe(before);
  });

  it("rejects root, nested, and revoked proxies before their traps run", async () => {
    const trap = vi.fn(() => {
      throw new Error("trap invoked");
    });
    const proxied = new Proxy({}, {
      get: trap,
      ownKeys: trap,
      getPrototypeOf: trap,
      getOwnPropertyDescriptor: trap,
    });
    const nested = await request();
    (nested as unknown as JsonObject).protocolBinding = proxied;
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();

    const [rootResult, nestedResult, revokedResult] = await Promise.all([
      projectUniversityResearchArtifacts(proxied),
      projectUniversityResearchArtifacts(nested),
      projectUniversityResearchArtifacts(revoked.proxy),
    ]);

    expect(rootResult.status).toBe("invalid");
    expect(nestedResult.status).toBe("invalid");
    expect(revokedResult.status).toBe("invalid");
    expect(trap).not.toHaveBeenCalled();
  });

  it("rejects getters, symbols, non-enumerable fields, exotic objects, cycles, and aliases", async () => {
    const getter = vi.fn(() => "hidden");
    const withGetter = await request();
    Object.defineProperty(withGetter, "hidden", {
      enumerable: true,
      get: getter,
    });
    const withSymbol = await request();
    Object.defineProperty(withSymbol, Symbol("hidden"), {
      enumerable: true,
      value: true,
    });
    const withNonEnumerable = await request();
    Object.defineProperty(withNonEnumerable, "hidden", {
      enumerable: false,
      value: true,
    });
    const withDate = await request();
    (withDate as unknown as JsonObject).extra = new Date(0);
    const cyclic = await request();
    (cyclic as unknown as JsonObject).self = cyclic;
    const aliased = await request();
    (aliased as unknown as JsonObject).extra =
      (aliased as unknown as JsonObject).protocolBinding;

    const results = await Promise.all([
      withGetter,
      withSymbol,
      withNonEnumerable,
      withDate,
      cyclic,
      aliased,
    ].map(projectUniversityResearchArtifacts));

    results.forEach((result) => expect(result.status).toBe("invalid"));
    expect(getter).not.toHaveBeenCalled();
  });

  it("rejects sparse or extended arrays and unsupported numeric values", async () => {
    const sparse = await request();
    const sparseScenarios = sparse.scenarioPacks[0].scenarios;
    delete (sparseScenarios as unknown[])[2];
    const extended = await request();
    Object.defineProperty(extended.scenarioPacks[0].scenarios, "extra", {
      enumerable: true,
      value: "extra",
    });
    const unsafe = await request();
    (unsafe.scenarioPacks[0].scenarios[0].capacity as {
      availableMinutes: number;
    }).availableMinutes = Number.MAX_SAFE_INTEGER + 1;
    const negativeZero = await request();
    (negativeZero.scenarioPacks[0].scenarios[0].capacity as {
      availableMinutes: number;
    }).availableMinutes = -0;
    const bigint = await request();
    (bigint as unknown as JsonObject).extra = 1n;

    const results = await Promise.all([
      sparse,
      extended,
      unsafe,
      negativeZero,
      bigint,
    ].map(projectUniversityResearchArtifacts));

    results.forEach((result) => expect(result.status).toBe("invalid"));
  });

  it("bounds depth and aggregate string bytes", async () => {
    const deep = await request() as unknown as JsonObject;
    let cursor = deep;
    for (let index = 0; index < 30; index += 1) {
      cursor.extra = {};
      cursor = cursor.extra as JsonObject;
    }
    const broadText = await request() as unknown as JsonObject;
    broadText.extra = "a".repeat(100_000);

    await expect(projectUniversityResearchArtifacts(deep)).resolves.toMatchObject({
      status: "invalid",
    });
    await expect(
      projectUniversityResearchArtifacts(broadText),
    ).resolves.toMatchObject({ status: "invalid" });
  });

  it("rejects broad containers, oversized property names, and aggregate key bytes before schema traversal", async () => {
    const broad = {
      ...await request(),
      ...Object.fromEntries(Array.from(
        { length: 513 },
        (_, index) => [`extra${index}`, index],
      )),
    };
    const oversizedKey = await request() as unknown as JsonObject;
    oversizedKey[`x${"a".repeat(300)}`] = true;
    const aggregateKeys = {
      ...await request(),
      ...Object.fromEntries(Array.from(
        { length: 400 },
        (_, index) => [
          `extra${String(index).padStart(3, "0")}${"k".repeat(164)}`,
          true,
        ],
      )),
    };

    const results = await Promise.all([
      projectUniversityResearchArtifacts(broad),
      projectUniversityResearchArtifacts(oversizedKey),
      projectUniversityResearchArtifacts(aggregateKeys),
    ]);

    results.forEach((result) => {
      expect(result.status).toBe("invalid");
      expect(result.issues[0]).toMatchObject({
        code: "schema.invalid",
        path: "",
        message: "The artifact request must be bounded accessor-free plain JSON.",
      });
    });
  });

  it.each([
    ["non-NFC", "Course Cafe\u0301"],
    ["bidi", "Course \u202e title"],
    ["Arabic letter mark", "Course \u061c title"],
    ["Mongolian vowel separator", "Course \u180e title"],
    ["line separator", "Course \u2028 title"],
    ["paragraph separator", "Course \u2029 title"],
    ["variation selector", "Course \ufe0f title"],
    ["language tag", "Course \u{e0001} title"],
    ["leading BOM", "\ufeffCourse title"],
    ["trailing BOM", "Course title\ufeff"],
    ["leading tab", "\tCourse title"],
    ["trailing line feed", "Course title\n"],
    ["trailing carriage return", "Course title\r"],
    ["leading line separator", "\u2028Course title"],
    ["trailing paragraph separator", "Course title\u2029"],
    ["zero-width", "Course\u200b title"],
    ["control", "Course\u0007 title"],
  ])("rejects unsafe authored label text: %s", async (_name, label) => {
    const input = await request();
    input.scenarioPacks[0].scenarios[0].context.courseLabel = label;

    const projection = await projectUniversityResearchArtifacts(input);

    expect(projection.status).toBe("invalid");
    expect(projection.issues[0]?.message).not.toContain(label);
  });

  it("rejects missing, duplicate, and reordered scenario slots", async () => {
    const duplicate = await request();
    duplicate.scenarioPacks[0].scenarios[1] = JSON.parse(JSON.stringify(
      duplicate.scenarioPacks[0].scenarios[0],
    ));
    const reordered = await request();
    [
      reordered.scenarioPacks[0].scenarios[0],
      reordered.scenarioPacks[0].scenarios[1],
    ] = [
      reordered.scenarioPacks[0].scenarios[1],
      reordered.scenarioPacks[0].scenarios[0],
    ];
    const missing = await request();
    missing.scenarioPacks[0].scenarios.pop();

    const [duplicateResult, reorderedResult, missingResult] = await Promise.all([
      projectUniversityResearchArtifacts(duplicate),
      projectUniversityResearchArtifacts(reordered),
      projectUniversityResearchArtifacts(missing),
    ]);

    expect(duplicateResult.status).toBe("scenario_structure_mismatch");
    expect(reorderedResult.status).toBe("scenario_structure_mismatch");
    expect(missingResult.status).toBe("invalid");
  });

  it.each([
    "capacity relation",
    "relative deadline",
    "choice order",
    "next job",
    "difficulty",
  ])("detects hidden semantic drift in %s", async (kind) => {
    const input = await request();
    const scenario = input.scenarioPacks[1].scenarios[
      kind === "choice order" ? 3 : 0
    ];
    if (kind === "capacity relation") scenario.capacity.availableMinutes = 10;
    if (kind === "relative deadline") scenario.deadline.relativeMinutes = 1_919;
    if (kind === "choice order") scenario.choices.reverse();
    if (kind === "next job") {
      scenario.nextJob.reasonCode = "reason.drifted";
    }
    if (kind === "difficulty") scenario.difficulty.dependencyCount = 3;

    const projection = await projectUniversityResearchArtifacts(input);

    expect(projection.status).toBe("mechanical_parity_mismatch");
    expect(projection.issues.some(
      (entry) => entry.code === "scenario.semantic_mismatch",
    )).toBe(true);
  });

  it.each(SYMMETRIC_SEMANTIC_MUTATIONS)(
    "rejects symmetric P/Q semantic corruption in %s",
    async (_kind, mutate) => {
      const input = await request();
      input.scenarioPacks.forEach((pack) => mutate(pack.scenarios[0]));
      await refreshPackBindings(input);

      const projection = await projectUniversityResearchArtifacts(input);

      expect(projection.status).toBe("mechanical_parity_mismatch");
      expect(projection.mechanicalChecks.semanticSignaturesMatch).toBe(true);
      expect(projection.mechanicalChecks.canonicalScenarioSemantics).toBe(false);
      expect(projection.issues).toContainEqual(expect.objectContaining({
        code: "scenario.semantic_mismatch",
      }));
    },
  );

  it("rejects within-pack, cross-pack, cross-namespace, artifact, and substitute-node reference collisions", async () => {
    const withinPack = await request();
    withinPack.scenarioPacks[0].scenarios[1].context.termRef =
      withinPack.scenarioPacks[0].scenarios[0].context.termRef;
    await refreshPackBindings(withinPack);

    const crossPack = await request();
    crossPack.scenarioPacks[1].scenarios[0].path.actionRef =
      crossPack.scenarioPacks[0].scenarios[0].path.actionRef;
    await refreshPackBindings(crossPack);

    const artifactRef = await request();
    artifactRef.scenarioPacks[1].artifactRef =
      artifactRef.scenarioPacks[0].artifactRef;
    await refreshPackBindings(artifactRef);

    const crossNamespace = await request();
    crossNamespace.scenarioPacks[0].scenarios[0].scenarioRef =
      crossNamespace.substitute.surface.nodes[0].nodeRef;
    await refreshPackBindings(crossNamespace);

    const nodeRef = await request();
    nodeRef.substitute.surface.nodes[1].nodeRef =
      nodeRef.substitute.surface.nodes[0].nodeRef;

    const [
      withinResult,
      crossResult,
      artifactResult,
      crossNamespaceResult,
      nodeResult,
    ] =
      await Promise.all([
        projectUniversityResearchArtifacts(withinPack),
        projectUniversityResearchArtifacts(crossPack),
        projectUniversityResearchArtifacts(artifactRef),
        projectUniversityResearchArtifacts(crossNamespace),
        projectUniversityResearchArtifacts(nodeRef),
      ]);

    [
      withinResult,
      crossResult,
      artifactResult,
      crossNamespaceResult,
    ].forEach((result) => {
      expect(result.mechanicalChecks.uniqueReferences).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        code: "scenario.reference_collision",
      }));
    });
    expect(nodeResult.mechanicalChecks.uniqueReferences).toBe(false);
    expect(nodeResult.issues).toContainEqual(expect.objectContaining({
      code: "substitute.node_reference_collision",
    }));
  });

  it("requires every permitted P/Q lexical dimension to actually differ", async () => {
    const input = await request();
    input.scenarioPacks[1].scenarios[0].context.courseLabel =
      input.scenarioPacks[0].scenarios[0].context.courseLabel;

    const projection = await projectUniversityResearchArtifacts(input);

    expect(projection.status).toBe("mechanical_parity_mismatch");
    expect(projection.issues).toContainEqual(expect.objectContaining({
      code: "scenario.lexical_variation_missing",
    }));
  });

  it("requires P/Q absolute instants to differ rather than accepting alternate offset spellings", async () => {
    const input = await request();
    const [packP, packQ] = input.scenarioPacks;
    packQ.scenarios[0].context.asOf = new Date(
      Date.parse(packP.scenarios[0].context.asOf),
    ).toISOString().replace("Z", "+00:00");
    packQ.scenarios[0].deadline.at = new Date(
      Date.parse(packP.scenarios[0].deadline.at),
    ).toISOString().replace("Z", "+00:00");
    await refreshPackBindings(input);

    const projection = await projectUniversityResearchArtifacts(input);

    expect(projection.status).toBe("mechanical_parity_mismatch");
    expect(projection.issues).toContainEqual(expect.objectContaining({
      code: "scenario.lexical_variation_missing",
    }));
  });

  it("detects substitute neutrality and exact pack-binding drift", async () => {
    const branded = await request();
    branded.substitute.surface.title = "FORGE course worksheet";
    const reordered = await request();
    reordered.substitute.surface.nodes.reverse();
    const relabeledInformation = await request();
    relabeledInformation.informationItems[0].label = "Term and module";
    const staleBinding = await request();
    staleBinding.substitute.packBindings[0].packDigest =
      `sha256:${"0".repeat(64)}`;

    const [brandedResult, reorderedResult, relabeledResult, staleResult] =
      await Promise.all([
        projectUniversityResearchArtifacts(branded),
        projectUniversityResearchArtifacts(reordered),
        projectUniversityResearchArtifacts(relabeledInformation),
        projectUniversityResearchArtifacts(staleBinding),
      ]);

    expect(brandedResult.status).toBe("neutrality_mismatch");
    expect(reorderedResult.status).toBe("neutrality_mismatch");
    expect(relabeledResult.status).toBe("neutrality_mismatch");
    expect(staleResult.status).toBe("mechanical_parity_mismatch");
    expect(staleResult.issues).toContainEqual(expect.objectContaining({
      code: "substitute.binding_mismatch",
    }));
  });

  it.each([
    "AI advice and scoring",
    "AI guidance",
    "AI help",
    "AI tutor",
    "AI feedback",
    "AI counsel",
    "AI answer",
    "Recommended by AI",
    "Recommended by A.I.",
    "Model-generated recommendation",
    "A ranked course example",
    "protected-study-ready",
    "FΟRGE course example",
    "ΑΙ advice",
  ])("rejects neutral-language policy bypasses in visible labels: %s", async (label) => {
    const input = await request();
    input.scenarioPacks[0].scenarios[0].context.termLabel = `${label} P`;
    input.scenarioPacks[1].scenarios[0].context.termLabel = `${label} Q`;
    await refreshPackBindings(input);

    const projection = await projectUniversityResearchArtifacts(input);

    expect(projection.status).toBe("neutrality_mismatch");
    expect(projection.mechanicalChecks.substituteNeutrality).toBe(false);
    expect(projection.issues).toContainEqual(expect.objectContaining({
      code: "substitute.neutrality_mismatch",
    }));
  });

  it("rejects a declared substitute manifest that exceeds its actual per-scenario text budget", async () => {
    const input = await request();
    input.scenarioPacks.forEach((pack, packIndex) => {
      const suffix = packIndex === 0 ? " p" : " q";
      pack.scenarios[0].context.termLabel = `${"T".repeat(230)}${suffix}`;
      pack.scenarios[0].context.courseLabel = `${"C".repeat(230)}${suffix}`;
    });
    await refreshPackBindings(input);

    const projection = await projectUniversityResearchArtifacts(input);

    expect(projection.status).toBe("mechanical_parity_mismatch");
    expect(projection.mechanicalChecks.substituteManifestDensity).toBe(false);
    expect(projection.issues).toContainEqual(expect.objectContaining({
      code: "substitute.density_mismatch",
    }));
  });

  it("recomputes renderer and candidate-adapter identities instead of trusting shaped digests", async () => {
    const rendererDrift = await request();
    rendererDrift.substitute.rendererBindingDigest =
      `sha256:${"0".repeat(64)}`;
    const adapterDrift = await request();
    adapterDrift.candidateBaseline.adapterDigest =
      `sha256:${"1".repeat(64)}`;

    const [rendererResult, adapterResult] = await Promise.all([
      projectUniversityResearchArtifacts(rendererDrift),
      projectUniversityResearchArtifacts(adapterDrift),
    ]);

    expect(rendererResult.mechanicalChecks.rendererBindingVerified).toBe(false);
    expect(rendererResult.artifacts?.substitute.rendererBindingDigest).toBe(
      rendererDrift.substitute.rendererBindingDigest,
    );
    expect(
      rendererResult.artifacts?.substitute.expectedRendererBindingDigest,
    ).not.toBe(rendererDrift.substitute.rendererBindingDigest);
    expect(rendererResult.issues).toContainEqual(expect.objectContaining({
      code: "substitute.renderer_binding_mismatch",
    }));
    expect(adapterResult.mechanicalChecks.candidateAdapterBindingVerified)
      .toBe(false);
    expect(adapterResult.issues).toContainEqual(expect.objectContaining({
      code: "candidate.adapter_binding_mismatch",
    }));
  });

  it("keeps the candidate build digest caller-asserted and explicitly unverified", async () => {
    const input = await request();
    input.candidateBaseline.buildDigest = `sha256:${"a".repeat(64)}`;

    const projection = await projectUniversityResearchArtifacts(input);

    expect(projection.status).toBe(
      "mechanical_parity_passed_review_required",
    );
    expect(projection.authority.candidateBuildIdentityAuthority).toBe(
      "caller_asserted_not_verified",
    );
  });

  it("uses exact distinct digest domains for candidate, renderer, and artifact identities", async () => {
    const input = await request();
    const allDomains = Object.values(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS,
    );
    const [
      expectedAdapter,
      wrongAdapterDomain,
      expectedRenderer,
      wrongRendererDomain,
      fixtureDomainDigest,
      rawFixtureDigest,
    ] = await Promise.all([
      domainDigest(
        UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.candidateAdapter,
        UNIVERSITY_RESEARCH_CANDIDATE_ADAPTER_DESCRIPTOR,
      ),
      domainDigest(
        UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenarioPack,
        UNIVERSITY_RESEARCH_CANDIDATE_ADAPTER_DESCRIPTOR,
      ),
      domainDigest(
        UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.rendererBinding,
        UNIVERSITY_RESEARCH_RENDERER_BINDING_DESCRIPTOR,
      ),
      domainDigest(
        UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.neutralSubstituteTemplate,
        UNIVERSITY_RESEARCH_RENDERER_BINDING_DESCRIPTOR,
      ),
      domainDigest(
        UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.candidateFixture,
        { fixture: "candidate" },
      ),
      sha256Digest(canonicalJson({ fixture: "candidate" })),
    ]);

    expect(new Set(allDomains).size).toBe(allDomains.length);
    expect(input.candidateBaseline.adapterDigest).toBe(expectedAdapter);
    expect(expectedAdapter).not.toBe(wrongAdapterDomain);
    expect(input.substitute.rendererBindingDigest).toBe(expectedRenderer);
    expect(expectedRenderer).not.toBe(wrongRendererDomain);
    expect(fixtureDomainDigest).not.toBe(rawFixtureDigest);
  });

  it("rejects a stale independent-review checklist identity", async () => {
    const input = await request();
    input.reviewRequest.checklistDigest = `sha256:${"f".repeat(64)}`;

    const projection = await projectUniversityResearchArtifacts(input);

    expect(projection.status).toBe("mechanical_parity_mismatch");
    expect(projection.artifacts?.independentReview.checklistDigest).toBe(
      input.reviewRequest.checklistDigest,
    );
    expect(
      projection.artifacts?.independentReview.expectedChecklistDigest,
    ).not.toBe(input.reviewRequest.checklistDigest);
    expect(projection.issues).toContainEqual(expect.objectContaining({
      code: "review.checklist_mismatch",
    }));
  });

  it("changes exact identities after any material artifact mutation", async () => {
    const baseline = await request();
    const changed = await request();
    changed.scenarioPacks[1].scenarios[0].path.actionTitle =
      "Map the contested claims";

    const [before, after] = await Promise.all([
      projectUniversityResearchArtifacts(baseline),
      projectUniversityResearchArtifacts(changed),
    ]);

    expect(after.artifacts?.packQ.digest).not.toBe(
      before.artifacts?.packQ.digest,
    );
    expect(after.artifacts?.independentReview.envelopeDigest).not.toBe(
      before.artifacts?.independentReview.envelopeDigest,
    );
    expect(after.projectionDigest).not.toBe(before.projectionDigest);
  });

  it("uses no clock, random source, fetch, logging, or event dispatch", async () => {
    const dateSpy = vi.spyOn(Date, "now");
    const randomSpy = vi.spyOn(Math, "random");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const logSpy = vi.spyOn(console, "log");
    const dispatchSpy = vi.spyOn(EventTarget.prototype, "dispatchEvent");

    await projectUniversityResearchArtifacts(await request());

    expect(dateSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
