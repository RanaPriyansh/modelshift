import { types as nodeUtilTypes } from "node:util";

import { ZodError } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS,
  UNIVERSITY_RESEARCH_SCENARIO_IDS,
} from "../university-research-operations/contracts";
import {
  UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS,
  UNIVERSITY_RESEARCH_ARTIFACT_PREFLIGHT_PROJECTION_SCHEMA_VERSION,
  type UniversityResearchArtifactPreflightIssue,
  type UniversityResearchArtifactPreflightProjectionV1,
  type UniversityResearchArtifactPreflightRequestV1,
  type UniversityResearchScenarioPackV1,
  universityResearchArtifactPreflightRequestSchema,
} from "./contracts";
import {
  AUTHORED_UNIVERSITY_RESEARCH_PACK_P,
  AUTHORED_UNIVERSITY_RESEARCH_PACK_Q,
  UNIVERSITY_RESEARCH_ARTIFACT_INFORMATION_ITEMS,
  UNIVERSITY_RESEARCH_CANDIDATE_ADAPTER_DESCRIPTOR,
  UNIVERSITY_RESEARCH_NEUTRAL_SUBSTITUTE_DECLARATION,
  UNIVERSITY_RESEARCH_RENDERER_BINDING_DESCRIPTOR,
} from "./authored";

const MAX_JSON_DEPTH = 20;
const MAX_JSON_NODES = 16_384;
const MAX_STRING_BYTES = 96_000;
const MAX_CONTAINER_KEYS = 512;
const MAX_PROPERTY_NAME_BYTES = 256;
const MAX_AGGREGATE_KEY_BYTES = 64_000;
const MAX_ISSUES = 64;
const ARRAY_INDEX = /^(0|[1-9][0-9]*)$/;
const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const UTF8_ENCODER = new TextEncoder();

const OPEN_GATES = deepFreeze([
  "candidate_pack_adapter_not_implemented",
  "candidate_substitute_render_parity_not_run",
  "independent_difficulty_equivalence_review_required",
  "artifact_approval_not_established",
  "synthetic_persona_rehearsal_not_run",
  "participant_operation_not_authorized",
] as const);

const AUTHORITY = deepFreeze({
  projectionClass: "fixture_only_research_artifact_preflight",
  inputAuthority: "caller_asserted_synthetic_manifest_only",
  digestAuthority: "local_canonical_identity_only",
  candidateBuildIdentityAuthority: "caller_asserted_not_verified",
  candidateAdapterIdentityAuthority: "locally_recomputed_manifest_only",
  rendererBindingIdentityAuthority: "locally_recomputed_manifest_only",
  artifactApprovalAuthority: "not_established",
  syntheticContentTruthAuthority: "not_established",
  realEntityExclusionAuthority: "not_established",
  candidateRenderParityAuthority: "manifest_only_not_rendered",
  substituteNeutralityAuthority: "mechanical_constraints_only",
  packEquivalenceAuthority:
    "not_established_independent_review_required",
  reviewerIdentityAuthority: "not_established",
  rehearsalReadiness: false,
  participantEnrollmentAllowed: false,
  participantDataCaptureAllowed: false,
  courseworkCaptureAllowed: false,
  persistenceAllowed: false,
  publishAllowed: false,
  sendAllowed: false,
  externalEffectsAllowed: false,
  claimUpgradeAllowed: false,
  gateClosureAllowed: false,
} as const);

const EMPTY_CHECKS = deepFreeze({
  exactScenarioOrder: false,
  canonicalScenarioSemantics: false,
  uniqueReferences: false,
  distinctLexicalVariants: false,
  semanticSignaturesMatch: false,
  distinctPackDigests: false,
  substituteNeutrality: false,
  substituteManifestDensity: false,
  rendererBindingVerified: false,
  candidateAdapterBindingVerified: false,
  substitutePackBindings: false,
  pairingManifestComplete: false,
  candidateRenderParity: "not_rendered",
  substituteRenderParity: "not_rendered",
} as const);

const INFORMATION_COVERAGE = deepFreeze([
  ["term", "course"],
  ["source"],
  ["deadline"],
  ["capacity"],
  ["accepted_action"],
  ["world_binding"],
  ["terminal_state", "effect_boundaries"],
] as const);

class UnsafeJsonInput extends Error {}

function copyPlainJson(value: unknown): unknown {
  const budget = { nodes: 0, stringBytes: 0, keyBytes: 0 };
  const seen = new WeakSet<object>();

  function boundedOwnPropertyNames(current: object): string[] {
    const names = Object.getOwnPropertyNames(current);
    if (names.length > MAX_CONTAINER_KEYS) throw new UnsafeJsonInput();
    for (const name of names) {
      if (
        name.length > MAX_PROPERTY_NAME_BYTES
        || budget.keyBytes + name.length > MAX_AGGREGATE_KEY_BYTES
      ) throw new UnsafeJsonInput();
      const keyBytes = UTF8_ENCODER.encode(name).byteLength;
      if (keyBytes > MAX_PROPERTY_NAME_BYTES) throw new UnsafeJsonInput();
      budget.keyBytes += keyBytes;
      if (budget.keyBytes > MAX_AGGREGATE_KEY_BYTES) {
        throw new UnsafeJsonInput();
      }
    }
    return names;
  }

  function visit(current: unknown, depth: number): unknown {
    budget.nodes += 1;
    if (budget.nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) {
      throw new UnsafeJsonInput();
    }
    if (current === null || typeof current === "boolean") return current;
    if (typeof current === "string") {
      if (budget.stringBytes + current.length > MAX_STRING_BYTES) {
        throw new UnsafeJsonInput();
      }
      budget.stringBytes += UTF8_ENCODER.encode(current).byteLength;
      if (budget.stringBytes > MAX_STRING_BYTES) throw new UnsafeJsonInput();
      return current;
    }
    if (typeof current === "number") {
      if (!Number.isSafeInteger(current) || Object.is(current, -0)) {
        throw new UnsafeJsonInput();
      }
      return current;
    }
    if (typeof current !== "object" || nodeUtilTypes.isProxy(current)) {
      throw new UnsafeJsonInput();
    }
    if (seen.has(current)) throw new UnsafeJsonInput();
    seen.add(current);

    if (Array.isArray(current)) {
      if (Object.getPrototypeOf(current) !== Array.prototype) {
        throw new UnsafeJsonInput();
      }
      if (current.length >= MAX_CONTAINER_KEYS) {
        throw new UnsafeJsonInput();
      }
      const names = boundedOwnPropertyNames(current);
      if (
        names.length !== current.length + 1
        || names.some((name) => name !== "length" && !ARRAY_INDEX.test(name))
        || Object.getOwnPropertySymbols(current).length > 0
      ) throw new UnsafeJsonInput();
      const result: unknown[] = [];
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          current,
          String(index),
        );
        if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
          throw new UnsafeJsonInput();
        }
        result.push(visit(descriptor.value, depth + 1));
      }
      return result;
    }

    if (Object.getPrototypeOf(current) !== Object.prototype) {
      throw new UnsafeJsonInput();
    }
    const names = boundedOwnPropertyNames(current);
    if (Object.getOwnPropertySymbols(current).length > 0) {
      throw new UnsafeJsonInput();
    }
    const result: Record<string, unknown> = Object.create(null);
    for (const name of names.sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(current, name);
      if (
        !descriptor
        || !descriptor.enumerable
        || !("value" in descriptor)
        || POLLUTION_KEYS.has(name)
      ) throw new UnsafeJsonInput();
      result[name] = visit(descriptor.value, depth + 1);
    }
    return result;
  }

  return visit(value, 0);
}

function issue(
  code: UniversityResearchArtifactPreflightIssue["code"],
  path: string,
  message: string,
): UniversityResearchArtifactPreflightIssue {
  return { code, path, message };
}

function orderedIssues(
  issues: readonly UniversityResearchArtifactPreflightIssue[],
): readonly UniversityResearchArtifactPreflightIssue[] {
  return [...issues]
    .sort((left, right) => {
      const codeOrder = left.code.localeCompare(right.code);
      return codeOrder !== 0 ? codeOrder : left.path.localeCompare(right.path);
    })
    .slice(0, MAX_ISSUES);
}

function zodIssues(error: ZodError): UniversityResearchArtifactPreflightIssue[] {
  return error.issues.slice(0, MAX_ISSUES).map((entry) => issue(
    "schema.invalid",
    entry.path.join("."),
    "The artifact request does not match the strict bounded schema.",
  ));
}

function exactOrder(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

async function domainDigest(
  digestDomain: string,
  value: unknown,
): Promise<string> {
  return sha256Digest(canonicalJson({ digestDomain, value }));
}

function semanticSignature(
  scenario: UniversityResearchScenarioPackV1["scenarios"][number],
): unknown {
  return {
    scenarioId: scenario.scenarioId,
    expectedStatus: scenario.expectedStatus,
    difficultyClass: scenario.difficultyClass,
    source: scenario.source,
    deadline: {
      title: scenario.deadline.title,
      relativeMinutes: scenario.deadline.relativeMinutes,
      consequence: scenario.deadline.consequence,
      universityTruth: scenario.deadline.universityTruth,
    },
    capacity: scenario.capacity,
    path: {
      actionTitle: scenario.path.actionTitle,
      state: scenario.path.state,
      owner: scenario.path.owner,
      selectedBySourceFacts: scenario.path.selectedBySourceFacts,
    },
    world: {
      state: scenario.world.state,
      similarWorldSubstitutionAllowed:
        scenario.world.similarWorldSubstitutionAllowed,
    },
    terminal: scenario.terminal,
    choices: scenario.choices.map(({ kind, label, owner }) => ({
      kind,
      label,
      owner,
    })),
    nextJob: scenario.nextJob,
    effects: scenario.effects,
    answerKey: scenario.answerKey,
    difficulty: scenario.difficulty,
  };
}

function scenarioSemanticsValid(
  scenario: UniversityResearchScenarioPackV1["scenarios"][number],
): boolean {
  const expected = AUTHORED_UNIVERSITY_RESEARCH_PACK_P.scenarios.find(
    (entry) => entry.scenarioId === scenario.scenarioId,
  );
  if (!expected) return false;
  const deadlineDifference = (
    Date.parse(scenario.deadline.at) - Date.parse(scenario.context.asOf)
  ) / 60_000;
  const capacityRelation = scenario.capacity.availableMinutes
    < scenario.capacity.effortMinutesLow
    ? "below_low"
    : scenario.capacity.availableMinutes < scenario.capacity.effortMinutesHigh
      ? "low_only"
      : "fits";
  const navigationExpected =
    scenario.nextJob.primaryControl.effect
      === "navigate_to_local_synthetic_detail";
  const exactWorldBinding = scenario.world.state !== "binding_changed"
    ? scenario.world.acceptedWorldRef === scenario.world.suppliedWorldRef
    : scenario.world.acceptedWorldRef !== scenario.world.suppliedWorldRef;

  return canonicalJson(semanticSignature(scenario))
      === canonicalJson(semanticSignature(expected))
    && capacityRelation === scenario.capacity.relation
    && scenario.capacity.effortMinutesLow
      <= scenario.capacity.effortMinutesHigh
    && exactWorldBinding
    && scenario.effects.navigationOnly === navigationExpected
    && scenario.answerKey.effectPrediction
      === (navigationExpected ? "navigation_only" : "no_effect")
    && scenario.difficulty.choiceCount === scenario.choices.length
    && scenario.difficulty.navigationStepCount
      === (navigationExpected ? 1 : 0)
    && deadlineDifference === scenario.deadline.relativeMinutes;
}

function uniqueArtifactReferences(
  request: UniversityResearchArtifactPreflightRequestV1,
): boolean {
  const references: string[] = [
    request.substitute.artifactRef,
    request.moderatorPacket.artifactRef,
    request.reviewRequest.reviewRef,
    ...request.substitute.surface.nodes.map((node) => node.nodeRef),
  ];
  for (const pack of request.scenarioPacks) {
    references.push(pack.artifactRef);
    for (const scenario of pack.scenarios) {
      references.push(
        scenario.scenarioRef,
        scenario.context.termRef,
        scenario.context.courseRef,
        scenario.context.sourceRef,
        scenario.deadline.deadlineRef,
        scenario.path.pathRef,
        scenario.path.actionRef,
        scenario.world.acceptedWorldRef,
      );
      if (
        scenario.world.suppliedWorldRef !== scenario.world.acceptedWorldRef
      ) {
        references.push(scenario.world.suppliedWorldRef);
      }
      references.push(...scenario.choices.map((choice) => choice.choiceId));
    }
  }
  return new Set(references).size === references.length;
}

function uniqueSubstituteNodeReferences(
  request: UniversityResearchArtifactPreflightRequestV1,
): boolean {
  const references = request.substitute.surface.nodes.map(
    (node) => node.nodeRef,
  );
  return new Set(references).size === references.length;
}

function lexicalVariantsDistinct(
  left: UniversityResearchScenarioPackV1["scenarios"][number],
  right: UniversityResearchScenarioPackV1["scenarios"][number],
): boolean {
  const leftIds = [
    left.scenarioRef,
    left.context.termRef,
    left.context.courseRef,
    left.context.sourceRef,
    left.deadline.deadlineRef,
    left.path.pathRef,
    left.path.actionRef,
    left.world.acceptedWorldRef,
    left.world.suppliedWorldRef,
    ...left.choices.map((choice) => choice.choiceId),
  ];
  const rightIds = [
    right.scenarioRef,
    right.context.termRef,
    right.context.courseRef,
    right.context.sourceRef,
    right.deadline.deadlineRef,
    right.path.pathRef,
    right.path.actionRef,
    right.world.acceptedWorldRef,
    right.world.suppliedWorldRef,
    ...right.choices.map((choice) => choice.choiceId),
  ];
  return left.context.termLabel !== right.context.termLabel
    && left.context.courseLabel !== right.context.courseLabel
    && Date.parse(left.context.asOf) !== Date.parse(right.context.asOf)
    && Date.parse(left.deadline.at) !== Date.parse(right.deadline.at)
    && leftIds.length === rightIds.length
    && leftIds.every((value, index) => value !== rightIds[index]);
}

function informationCoverageValid(
  request: UniversityResearchArtifactPreflightRequestV1,
): boolean {
  return exactOrder(
    request.informationItems.map((entry) => entry.itemId),
    UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS,
  ) && request.informationItems.every((entry, index) => (
    exactOrder(entry.covers, INFORMATION_COVERAGE[index] ?? [])
  ));
}

function normalizedPolicyText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[_\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function containsForbiddenNeutralLanguage(value: string): boolean {
  if (/[^\u0020-\u007e]/u.test(value)) return true;
  const normalized = normalizedPolicyText(value);
  const forbiddenPhrases = [
    "forge",
    "protected study ready",
    "source review required",
    "recovery required",
    "learner choice required",
    "world review required",
    "path complete",
    "path blocked",
  ];
  return forbiddenPhrases.some((phrase) => (
    ` ${normalized} `.includes(` ${phrase} `)
  ))
    || /\bf\s*o\s*r\s*g\s*e\b/iu.test(normalized)
    || /\b(?:advi\p{L}*|guid\p{L}*|recommend\p{L}*|suggest\p{L}*|scor\p{L}*|rank\p{L}*|autom\p{L}*|generat\p{L}*|synthesi\p{L}*|algorithm\p{L}*|copilot)\b/iu
      .test(normalized)
    || /\b(?:ai|a i|artificial intelligence)\b/iu.test(normalized)
    || /\b(?:ai|a i|artificial intelligence)\b.{0,40}\b(?:advi\p{L}*|recommend\p{L}*)\b/iu
      .test(normalized)
    || /\b(?:advi\p{L}*|recommend\p{L}*)\b.{0,40}\b(?:ai|a i|artificial intelligence)\b/iu
      .test(normalized);
}

function declaredVisibleText(
  request: UniversityResearchArtifactPreflightRequestV1,
): readonly string[] {
  return [
    request.substitute.surface.title,
    ...request.substitute.surface.nodes.flatMap((node) => (
      "text" in node
        ? [node.text]
        : node.kind === "anchor_navigation"
          ? [node.heading, ...node.items.map((item) => item.label)]
          : "heading" in node
            ? [node.heading]
            : []
    )),
    ...request.informationItems.map((entry) => entry.label),
    ...request.scenarioPacks.flatMap((pack) => pack.scenarios.flatMap(
      (scenario) => [
        scenario.context.termLabel,
        scenario.context.courseLabel,
        scenario.deadline.title,
        scenario.path.actionTitle,
        scenario.world.acceptedWorldRef,
        scenario.world.suppliedWorldRef,
        ...scenario.choices.map((choice) => choice.label),
        scenario.nextJob.primaryControl.label,
      ].filter((entry): entry is string => entry !== null),
    )),
  ];
}

function substituteNeutral(
  request: UniversityResearchArtifactPreflightRequestV1,
): boolean {
  const declaration = {
    delivery: request.substitute.delivery,
    surface: request.substitute.surface,
    access: request.substitute.access,
    density: request.substitute.density,
    taskFamilies: request.substitute.taskFamilies,
  };
  return canonicalJson(declaration)
      === canonicalJson(UNIVERSITY_RESEARCH_NEUTRAL_SUBSTITUTE_DECLARATION)
    && canonicalJson(request.informationItems)
      === canonicalJson(UNIVERSITY_RESEARCH_ARTIFACT_INFORMATION_ITEMS)
    && declaredVisibleText(request).every(
      (entry) => !containsForbiddenNeutralLanguage(entry),
    );
}

function substituteManifestDensityValid(
  request: UniversityResearchArtifactPreflightRequestV1,
): boolean {
  const staticSections = request.substitute.surface.nodes.map((node) => (
    "text" in node
      ? [node.text]
      : node.kind === "anchor_navigation"
        ? [node.heading, ...node.items.map((item) => item.label)]
        : [node.heading]
  )).flat();
  return request.scenarioPacks.every((pack) => pack.scenarios.every(
    (scenario) => {
      const visibleLines = [
        request.substitute.surface.title,
        ...staticSections,
        `${request.informationItems[0]!.label}: ${scenario.context.termLabel} / ${scenario.context.courseLabel}`,
        `${request.informationItems[1]!.label}: ${scenario.source.state}; ${scenario.source.freshness}; conflicts ${scenario.source.conflictCount}; ${scenario.source.authority}`,
        `${request.informationItems[2]!.label}: ${scenario.deadline.title}; ${scenario.deadline.at}; ${scenario.deadline.relativeMinutes} minutes; university truth ${scenario.deadline.universityTruth}`,
        `${request.informationItems[3]!.label}: ${scenario.capacity.availableMinutes} minutes available; ${scenario.capacity.effortMinutesLow}-${scenario.capacity.effortMinutesHigh} minutes; ${scenario.capacity.relation}; ${scenario.capacity.declaredBy}`,
        `${request.informationItems[4]!.label}: ${scenario.path.actionTitle}; ${scenario.path.state}; ${scenario.path.owner}; selected by source ${scenario.path.selectedBySourceFacts}`,
        `${request.informationItems[5]!.label}: ${scenario.world.acceptedWorldRef}; ${scenario.world.suppliedWorldRef}; ${scenario.world.state}`,
        `${request.informationItems[6]!.label}: ${scenario.terminal.state}; no course, learner, or semester completion claim; navigation only ${scenario.effects.navigationOnly}; no saves, sends, starts, submits, records, evidence, path changes, external effects, or institutional action`,
        ...scenario.choices.map(
          (choice) => `Choice: ${choice.label}; ${choice.owner}`,
        ),
        `Current bounded job: ${scenario.nextJob.kind}; ${scenario.nextJob.owner}; ${scenario.nextJob.primaryControl.kind}; ${scenario.nextJob.primaryControl.label ?? "no label"}; ${scenario.nextJob.primaryControl.effect}`,
        ...request.moderatorPacket.exposureTasks,
      ];
      return visibleLines.join("\n").length
        <= request.substitute.density.maximumVisibleCharactersPerScenario;
    },
  ));
}

function pairingsComplete(
  request: UniversityResearchArtifactPreflightRequestV1,
): boolean {
  return exactOrder(
    request.pairings.map((pairing) => pairing.pairingId),
    [
      "candidate-pack-p",
      "candidate-pack-q",
      "substitute-pack-p",
      "substitute-pack-q",
    ],
  );
}

function invalidProjection(
  issues: readonly UniversityResearchArtifactPreflightIssue[],
): Readonly<UniversityResearchArtifactPreflightProjectionV1> {
  return deepFreeze({
    schemaVersion:
      UNIVERSITY_RESEARCH_ARTIFACT_PREFLIGHT_PROJECTION_SCHEMA_VERSION,
    status: "invalid",
    artifacts: null,
    informationItems: [],
    mechanicalChecks: EMPTY_CHECKS,
    openGates: OPEN_GATES,
    authority: AUTHORITY,
    issues: orderedIssues(issues),
    projectionDigest: null,
  });
}

export async function projectUniversityResearchArtifacts(
  value: unknown,
): Promise<Readonly<UniversityResearchArtifactPreflightProjectionV1>> {
  let copied: unknown;
  try {
    copied = copyPlainJson(value);
  } catch {
    return invalidProjection([issue(
      "schema.invalid",
      "",
      "The artifact request must be bounded accessor-free plain JSON.",
    )]);
  }
  const parsed = universityResearchArtifactPreflightRequestSchema.safeParse(
    copied,
  );
  if (!parsed.success) return invalidProjection(zodIssues(parsed.error));
  const request = parsed.data;
  const issues: UniversityResearchArtifactPreflightIssue[] = [];
  const [packP, packQ] = request.scenarioPacks;

  const exactScenarioOrder = [packP, packQ].every((pack) => exactOrder(
    pack.scenarios.map((scenario) => scenario.scenarioId),
    UNIVERSITY_RESEARCH_SCENARIO_IDS,
  ));
  if (!exactScenarioOrder) {
    issues.push(issue(
      "scenario.structure_mismatch",
      "scenarioPacks",
      "Both packs must preserve the exact seven scenarios in their locked order.",
    ));
  }

  if (!informationCoverageValid(request)) {
    issues.push(issue(
      "information.coverage_mismatch",
      "informationItems",
      "The seven locked information items must explicitly cover term, course, source, deadline, capacity, accepted action, World binding, terminal state, and effects.",
    ));
  }

  const scenarioSemantics = (
    [...packP.scenarios, ...packQ.scenarios].every(scenarioSemanticsValid)
    && canonicalJson(packP)
      === canonicalJson(AUTHORED_UNIVERSITY_RESEARCH_PACK_P)
    && canonicalJson(packQ)
      === canonicalJson(AUTHORED_UNIVERSITY_RESEARCH_PACK_Q)
  );
  if (!scenarioSemantics) {
    issues.push(issue(
      "scenario.semantic_mismatch",
      "scenarioPacks",
      "A scenario does not preserve the exact frozen authored manifest, state, next-job, timing, authority, or effect invariant.",
    ));
  }

  const globallyUniqueReferences = uniqueArtifactReferences(request);
  if (!globallyUniqueReferences) {
    issues.push(issue(
      "scenario.reference_collision",
      "scenarioPacks",
      "Every artifact, review, node, pack, scenario, term, course, source, deadline, path, action, World, and choice reference must be globally unique except an exact World binding inside one scenario.",
    ));
  }
  const uniqueSubstituteNodeRefs = uniqueSubstituteNodeReferences(request);
  if (!uniqueSubstituteNodeRefs) {
    issues.push(issue(
      "substitute.node_reference_collision",
      "substitute.surface.nodes",
      "Every substitute node reference must be unique.",
    ));
  }
  const uniqueReferences =
    globallyUniqueReferences && uniqueSubstituteNodeRefs;

  const pSignatures = packP.scenarios.map(semanticSignature);
  const qSignatures = packQ.scenarios.map(semanticSignature);
  const semanticSignaturesMatch = pSignatures.every(
    (signature, index) => canonicalJson(signature)
      === canonicalJson(qSignatures[index]),
  );
  if (!semanticSignaturesMatch) {
    issues.push(issue(
      "scenario.semantic_mismatch",
      "scenarioPacks",
      "Pack P and Pack Q differ outside the permitted synthetic labels, absolute times, deadlines, and identifiers.",
    ));
  }

  const distinctLexicalVariants = packP.scenarios.every(
    (scenario, index) => lexicalVariantsDistinct(
      scenario,
      packQ.scenarios[index]!,
    ),
  );
  if (!distinctLexicalVariants) {
    issues.push(issue(
      "scenario.lexical_variation_missing",
      "scenarioPacks",
      "Every paired scenario must use different invented labels, times, deadlines, and identifiers.",
    ));
  }

  const [
    packPDigest,
    packQDigest,
    pScenarioDigests,
    qScenarioDigests,
    pSignatureDigests,
    qSignatureDigests,
    expectedRendererBindingDigest,
    expectedCandidateAdapterDigest,
  ] = await Promise.all([
    domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenarioPack,
      packP,
    ),
    domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenarioPack,
      packQ,
    ),
    Promise.all(packP.scenarios.map((scenario) => domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenario,
      scenario,
    ))),
    Promise.all(packQ.scenarios.map((scenario) => domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenario,
      scenario,
    ))),
    Promise.all(pSignatures.map((signature) => domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.semanticSignature,
      signature,
    ))),
    Promise.all(qSignatures.map((signature) => domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.semanticSignature,
      signature,
    ))),
    domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.rendererBinding,
      UNIVERSITY_RESEARCH_RENDERER_BINDING_DESCRIPTOR,
    ),
    domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.candidateAdapter,
      UNIVERSITY_RESEARCH_CANDIDATE_ADAPTER_DESCRIPTOR,
    ),
  ]);

  const distinctPackDigests = packPDigest !== packQDigest;
  if (!distinctPackDigests) {
    issues.push(issue(
      "scenario.pack_digest_collision",
      "scenarioPacks",
      "The two authored pack identities must be distinct.",
    ));
  }

  const substituteNeutrality = substituteNeutral(request);
  if (!substituteNeutrality) {
    issues.push(issue(
      "substitute.neutrality_mismatch",
      "substitute",
      "The substitute must preserve the exact neutral fixed worksheet contract.",
    ));
  }

  const substituteManifestDensity = substituteManifestDensityValid(request);
  if (!substituteManifestDensity) {
    issues.push(issue(
      "substitute.density_mismatch",
      "substitute.density",
      "At least one declared per-scenario substitute manifest exceeds the locked visible-character budget.",
    ));
  }

  const rendererBindingVerified = request.substitute.rendererBindingDigest
    === expectedRendererBindingDigest;
  if (!rendererBindingVerified) {
    issues.push(issue(
      "substitute.renderer_binding_mismatch",
      "substitute.rendererBindingDigest",
      "The renderer binding must match the locally recomputed frozen renderer descriptor.",
    ));
  }

  const candidateAdapterBindingVerified =
    request.candidateBaseline.adapterDigest === expectedCandidateAdapterDigest;
  if (!candidateAdapterBindingVerified) {
    issues.push(issue(
      "candidate.adapter_binding_mismatch",
      "candidateBaseline.adapterDigest",
      "The candidate adapter binding must match the locally recomputed manifest-only adapter descriptor.",
    ));
  }

  const substitutePackBindings = (
    request.substitute.packBindings[0].packDigest === packPDigest
    && request.substitute.packBindings[1].packDigest === packQDigest
  );
  if (!substitutePackBindings) {
    issues.push(issue(
      "substitute.binding_mismatch",
      "substitute.packBindings",
      "The substitute must bind the locally computed identities of Pack P and Pack Q.",
    ));
  }

  const pairingManifestComplete = pairingsComplete(request);
  if (!pairingManifestComplete) {
    issues.push(issue(
      "pairing.manifest_mismatch",
      "pairings",
      "The manifest must declare all four candidate and substitute pack pairings.",
    ));
  }

  const checklistDigest = await domainDigest(
    UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.reviewChecklist,
    [
      "same_semantic_state_and_bounded_job",
      "same_source_authority_and_effect_boundaries",
      "same_information_order_and_visible_density",
      "same_choice_order_and_navigation_burden",
      "same_task_answer_and_timing_burden",
      "neutral_substitute_has_no_brand_or_candidate_status_names",
      "keyboard_path_reaches_all_states_at_320_css_px",
      "non_motion_alternative_preserves_identical_information",
      "candidate_and_substitute_render_from_the_same_pack_facts",
      "no_real_institution_person_course_account_or_assignment",
    ],
  );
  if (request.reviewRequest.checklistDigest !== checklistDigest) {
    issues.push(issue(
      "review.checklist_mismatch",
      "reviewRequest.checklistDigest",
      "The independent review request must bind the exact review checklist.",
    ));
  }

  const substituteTemplate = Object.fromEntries(
    Object.entries(request.substitute).filter(
      ([key]) => key !== "packBindings",
    ),
  );
  const [
    substituteTemplateDigest,
    substituteArtifactDigest,
    moderatorPacketDigest,
    informationItems,
  ] = await Promise.all([
    domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.neutralSubstituteTemplate,
      substituteTemplate,
    ),
    domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.neutralSubstituteArtifact,
      request.substitute,
    ),
    domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.moderatorPacket,
      request.moderatorPacket,
    ),
    Promise.all(request.informationItems.map(async (entry) => ({
      itemId: entry.itemId,
      digest: await domainDigest(
        UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.informationItem,
        entry,
      ),
      covers: [...entry.covers],
    }))),
  ]);

  const mechanicalChecks = {
    exactScenarioOrder,
    canonicalScenarioSemantics: scenarioSemantics,
    uniqueReferences,
    distinctLexicalVariants,
    semanticSignaturesMatch,
    distinctPackDigests,
    substituteNeutrality,
    substituteManifestDensity,
    rendererBindingVerified,
    candidateAdapterBindingVerified,
    substitutePackBindings,
    pairingManifestComplete,
    candidateRenderParity: "not_rendered" as const,
    substituteRenderParity: "not_rendered" as const,
  };
  const reviewEnvelopeDigest = await domainDigest(
    UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.reviewEnvelope,
    {
      protocolBinding: request.protocolBinding,
      candidateBaseline: request.candidateBaseline,
      artifacts: {
        packPDigest,
        packQDigest,
        pScenarioDigests,
        qScenarioDigests,
        pSignatureDigests,
        qSignatureDigests,
        expectedRendererBindingDigest,
        expectedCandidateAdapterDigest,
        expectedChecklistDigest: checklistDigest,
        substituteTemplateDigest,
        substituteArtifactDigest,
        moderatorPacketDigest,
        informationItems,
      },
      pairings: request.pairings,
      mechanicalChecks,
      reviewRequest: request.reviewRequest,
      authorityCeiling: AUTHORITY,
    },
  );

  let status: UniversityResearchArtifactPreflightProjectionV1["status"] =
    "mechanical_parity_passed_review_required";
  if (issues.some(
    (entry) => entry.code === "scenario.structure_mismatch",
  )) {
    status = "scenario_structure_mismatch";
  } else if (issues.some(
    (entry) => entry.code === "substitute.neutrality_mismatch",
  )) {
    status = "neutrality_mismatch";
  } else if (issues.length > 0) {
    status = "mechanical_parity_mismatch";
  }

  const unsigned = {
    schemaVersion:
      UNIVERSITY_RESEARCH_ARTIFACT_PREFLIGHT_PROJECTION_SCHEMA_VERSION,
    status,
    artifacts: {
      packP: {
        artifactRef: packP.artifactRef,
        artifactVersion: packP.artifactVersion,
        digest: packPDigest,
        scenarios: packP.scenarios.map((scenario, index) => ({
          scenarioId: scenario.scenarioId,
          scenarioDigest: pScenarioDigests[index]!,
          semanticSignatureDigest: pSignatureDigests[index]!,
        })),
      },
      packQ: {
        artifactRef: packQ.artifactRef,
        artifactVersion: packQ.artifactVersion,
        digest: packQDigest,
        scenarios: packQ.scenarios.map((scenario, index) => ({
          scenarioId: scenario.scenarioId,
          scenarioDigest: qScenarioDigests[index]!,
          semanticSignatureDigest: qSignatureDigests[index]!,
        })),
      },
      substitute: {
        artifactRef: request.substitute.artifactRef,
        artifactVersion: request.substitute.artifactVersion,
        rendererId: request.substitute.rendererId,
        rendererBindingDigest: request.substitute.rendererBindingDigest,
        expectedRendererBindingDigest,
        delivery: request.substitute.delivery,
        templateDigest: substituteTemplateDigest,
        artifactDigest: substituteArtifactDigest,
      },
      moderatorPacket: {
        artifactRef: request.moderatorPacket.artifactRef,
        digest: moderatorPacketDigest,
      },
      independentReview: {
        reviewRef: request.reviewRequest.reviewRef,
        requestStatus: request.reviewRequest.status,
        checklistDigest: request.reviewRequest.checklistDigest,
        expectedChecklistDigest: checklistDigest,
        envelopeDigest: reviewEnvelopeDigest,
      },
    },
    informationItems,
    mechanicalChecks,
    openGates: OPEN_GATES,
    authority: AUTHORITY,
    issues: orderedIssues(issues),
  };
  return deepFreeze({
    ...unsigned,
    projectionDigest: await domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.projection,
      unsigned,
    ),
  });
}
