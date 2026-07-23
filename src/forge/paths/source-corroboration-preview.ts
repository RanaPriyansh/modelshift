import "server-only";

import { createHash } from "node:crypto";

import { canonicalJson } from "../events";
import { FIRST_PILOT_PRACTICE_TEMPLATE } from "../practice/contracts";
import { FIRST_PILOT_PROJECT_TEMPLATE } from "../projects/contracts";
import { deepFreeze } from "../deep-freeze";
import { getCurrentPathwayAvailability } from "../pathways/public-availability";
import { SOURCE_CORROBORATION_RUNTIME_BINDING } from "../world-runtime/source-corroboration-binding";
import {
  createFixtureOnlyYouTubeClickToLoadPolicy,
  planYouTubeEmbedRequest,
} from "../../lib/resource-providers/youtube/policy";

export const SOURCE_CORROBORATION_PATH_ROUTE = "/paths/source-corroboration" as const;

const DISABLED_YOUTUBE_POLICY = createFixtureOnlyYouTubeClickToLoadPolicy({
  origin: "https://forge.example.invalid",
  madeForKids: false,
  policyOwnerIdentityRef: "identity.policy.source-corroboration-preview",
  policyReviewedAt: "2026-07-23T00:00:00.000Z",
});

const DISABLED_YOUTUBE_PLAN = planYouTubeEmbedRequest(DISABLED_YOUTUBE_POLICY, true);

export type SourceCorroborationPreviewInput = Readonly<{
  readonly runtimeBinding?: unknown;
  readonly projectTemplate?: unknown;
  readonly practiceTemplate?: unknown;
  readonly youtubePolicy?: unknown;
  readonly publicAvailability?: unknown;
}>;

export type SourceCorroborationPathPreview = Readonly<{
  readonly route: typeof SOURCE_CORROBORATION_PATH_ROUTE;
  readonly title: "Corroborate a model-generated factual claim";
  readonly banner: Readonly<{
    readonly status: "working-world" | "path-unavailable";
    readonly available: boolean;
    readonly text: string;
  }>;
  readonly steps: ReadonlyArray<Readonly<{
    readonly id: string;
    readonly title: string;
    readonly status:
      | "working-world"
      | "path-unavailable"
      | "legacy-source-metadata"
      | "provider-disabled"
      | "fixture-template-only"
      | "honour-based-local-proof"
      | "return-unavailable";
    readonly text: string;
    readonly action: Readonly<{
      readonly id: string;
      readonly label: string;
      readonly available: boolean;
      readonly unavailableReason: string | null;
    }> | null;
  }>>;
  readonly primaryAction: Readonly<{
    readonly id: "action.source-corroboration.learner-operation";
    readonly label: string;
    readonly available: boolean;
    readonly unavailableReason: string | null;
  }>;
  readonly boundaries: ReadonlyArray<Readonly<{
    readonly id: string;
    readonly status:
      | "legacy-source-metadata"
      | "provider-disabled"
      | "fixture-template-only"
      | "honour-based-local-proof"
      | "return-unavailable";
    readonly text: string;
  }>>;
}>;

type ExactObject = Record<PropertyKey, unknown>;

const EXPECTED_PROJECT = {
  id: "project-template.authored.written-explanation",
  version: "1.0.0",
  digest: "sha256:bc29a41e7e74d78604e437805d63cbeaed79b53e05871a5d57d838bbf20c2869",
  requiredOperationIds: [
    "operation.authored.draft",
    "operation.authored.revise",
    "operation.authored.defence",
    "operation.authored.transfer",
  ],
} as const;

const EXPECTED_LEGACY_SOURCE_IDS = [
  "source.bastani-pnas.genai-learning-2025",
  "source.tutor-copilot.arxiv-2024",
] as const;

const EXPECTED_RUNTIME_BINDING_DIGEST = "sha256:a172f067f6135bdcec13c66053ef250ef92692db734b60ddf8e396fb8b0dc4b5";

const EXPECTED_PRACTICE = {
  id: "practice-template.authored.foundation-rehearsal",
  version: "1.0.0",
  digest: "sha256:2e391c46140c10b6355e79eb014e9962e66cac1d4673b7c9c300b92c7dee7234",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasCurrentRuntimeInvariants(value: unknown): boolean {
  try {
    if (!isRecord(value) || value.protocolVersion !== "1.1.0" || !isRecord(value.evidence) || !isRecord(value.returnProof)) return false;
    const digest = `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
    if (digest !== EXPECTED_RUNTIME_BINDING_DIGEST) return false;
    if (value.evidence.proofAuthority !== "honour_based" || value.evidence.persistence !== "not_persisted" || value.returnProof.enabled !== false) return false;
    if (!Array.isArray(value.actions) || !value.actions.some((entry) => isRecord(entry)
      && entry.id === "action.source-corroboration.learner-operation" && entry.kind === "learner_operation")) return false;
    if (!Array.isArray(value.sourceBindings) || value.sourceBindings.length !== EXPECTED_LEGACY_SOURCE_IDS.length) return false;
    const sourceIds = value.sourceBindings.map((entry) => isRecord(entry) && entry.sourceItemId);
    return sourceIds.every((sourceId) => typeof sourceId === "string")
      && new Set(sourceIds).size === EXPECTED_LEGACY_SOURCE_IDS.length
      && EXPECTED_LEGACY_SOURCE_IDS.every((sourceId) => sourceIds.includes(sourceId))
      && value.sourceBindings.every((entry) => isRecord(entry) && entry.provenanceStatus === "legacy_metadata_only");
  } catch {
    return false;
  }
}

function hasCurrentProjectInvariants(value: unknown): boolean {
  try {
    if (!isRecord(value) || value.id !== EXPECTED_PROJECT.id || value.version !== EXPECTED_PROJECT.version || value.digest !== EXPECTED_PROJECT.digest) return false;
    const content = value.content;
    if (!isRecord(content)) return false;
    const operationIds = content.approvedOperationIds;
    return Array.isArray(operationIds) && EXPECTED_PROJECT.requiredOperationIds.every((operationId) => operationIds.includes(operationId));
  } catch {
    return false;
  }
}

function hasCurrentPracticeInvariants(value: unknown): boolean {
  try {
    return isRecord(value)
      && value.id === EXPECTED_PRACTICE.id
      && value.version === EXPECTED_PRACTICE.version
      && value.digest === EXPECTED_PRACTICE.digest
      && isRecord(value.content)
      && isRecord(value.content.feedbackBoundary)
      && value.content.feedbackBoundary.autonomousScore === false
      && value.content.feedbackBoundary.autonomousMasteryClaim === false;
  } catch {
    return false;
  }
}

function hasCurrentPublicAvailability(value: unknown): boolean {
  try {
    if (!Array.isArray(value)) return false;
    return value.some((entry) => isRecord(entry)
      && entry.area === "computing-ai"
      && entry.status === "released-capability"
      && isRecord(entry.capability)
      && entry.capability.title === "Corroborate a model-generated factual claim"
      && isRecord(entry.world)
      && entry.world.title === "AI & learning"
      && entry.world.route === "/learn/ai-and-learning");
  } catch {
    return false;
  }
}

function trustedPublicAvailability(): readonly unknown[] | null {
  try {
    const availability = getCurrentPathwayAvailability();
    return hasCurrentPublicAvailability(availability) ? availability : null;
  } catch {
    return null;
  }
}

/**
 * Compares values without invoking untrusted getters. This lets the projection
 * fail closed for malformed, cyclic, or getter-backed presentation input.
 */
function isExactly(value: unknown, expected: unknown, pairs = new WeakMap<object, object>()): boolean {
  if (Object.is(value, expected)) return true;
  if (value === null || expected === null || typeof value !== "object" || typeof expected !== "object") return false;
  if (Array.isArray(value) !== Array.isArray(expected)) return false;

  const candidate = value as ExactObject;
  const known = expected as ExactObject;
  if (Object.getPrototypeOf(candidate) !== Object.getPrototypeOf(known)) return false;
  if (pairs.get(candidate) === known) return true;
  pairs.set(candidate, known);

  const candidateKeys = Reflect.ownKeys(candidate).sort((left, right) => String(left).localeCompare(String(right)));
  const knownKeys = Reflect.ownKeys(known).sort((left, right) => String(left).localeCompare(String(right)));
  if (candidateKeys.length !== knownKeys.length || candidateKeys.some((key, index) => key !== knownKeys[index])) return false;

  return candidateKeys.every((key) => {
    const candidateDescriptor = Object.getOwnPropertyDescriptor(candidate, key);
    const knownDescriptor = Object.getOwnPropertyDescriptor(known, key);
    return !!candidateDescriptor
      && !!knownDescriptor
      && "value" in candidateDescriptor
      && "value" in knownDescriptor
      && isExactly(candidateDescriptor.value, knownDescriptor.value, pairs);
  });
}

function candidateIsKnown(candidate: unknown, known: unknown): boolean {
  try {
    return isExactly(candidate, known);
  } catch {
    return false;
  }
}

function projectionInput(value: unknown): SourceCorroborationPreviewInput | null {
  try {
    if (value === undefined) return {};
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const descriptor = (key: keyof SourceCorroborationPreviewInput) => Object.getOwnPropertyDescriptor(value, key);
    const descriptors = [descriptor("runtimeBinding"), descriptor("projectTemplate"), descriptor("practiceTemplate"), descriptor("youtubePolicy"), descriptor("publicAvailability")];
    if (descriptors.some((entry) => entry && !("value" in entry))) return null;
    return {
      runtimeBinding: descriptor("runtimeBinding")?.value,
      projectTemplate: descriptor("projectTemplate")?.value,
      practiceTemplate: descriptor("practiceTemplate")?.value,
      youtubePolicy: descriptor("youtubePolicy")?.value,
      publicAvailability: descriptor("publicAvailability")?.value,
    };
  } catch {
    return null;
  }
}

function action(id: string, label: string, available: boolean, unavailableReason: string): SourceCorroborationPathPreview["steps"][number]["action"] {
  return deepFreeze({ id, label, available, unavailableReason: available ? null : unavailableReason });
}

/**
 * A deeply immutable, presentation-only route projection. It performs no
 * navigation, assignment, proof recording, storage, environment, or provider
 * work. Its optional input exists only to prove that altered dependencies do
 * not acquire authority in a caller's presentation.
 */
export function projectSourceCorroborationPreview(input?: unknown): SourceCorroborationPathPreview {
  const candidates = projectionInput(input);
  const trustedRuntimeAvailable = hasCurrentRuntimeInvariants(SOURCE_CORROBORATION_RUNTIME_BINDING);
  const runtimeAvailable = trustedRuntimeAvailable
    && (input === undefined || !!candidates && candidateIsKnown(candidates.runtimeBinding, SOURCE_CORROBORATION_RUNTIME_BINDING));
  const projectAvailable = hasCurrentProjectInvariants(FIRST_PILOT_PROJECT_TEMPLATE)
    && (input === undefined || !!candidates && candidateIsKnown(candidates.projectTemplate, FIRST_PILOT_PROJECT_TEMPLATE));
  const practiceAvailable = hasCurrentPracticeInvariants(FIRST_PILOT_PRACTICE_TEMPLATE)
    && (input === undefined || !!candidates && candidateIsKnown(candidates.practiceTemplate, FIRST_PILOT_PRACTICE_TEMPLATE));
  const trustedAvailability = trustedPublicAvailability();
  const publicAvailable = !!trustedAvailability
    && (input === undefined || !!candidates && candidateIsKnown(candidates.publicAvailability, trustedAvailability));
  const providerAvailable = (input === undefined || !!candidates && candidateIsKnown(candidates.youtubePolicy, DISABLED_YOUTUBE_POLICY))
    && DISABLED_YOUTUBE_PLAN.kind === "no-iframe-request"
    && DISABLED_YOUTUBE_PLAN.reason === "provider-disabled";
  const primaryAvailable = runtimeAvailable && projectAvailable && publicAvailable;

  return deepFreeze({
    route: SOURCE_CORROBORATION_PATH_ROUTE,
    title: "Corroborate a model-generated factual claim",
    banner: {
      status: primaryAvailable ? "working-world" : "path-unavailable",
      available: primaryAvailable,
      text: primaryAvailable
        ? "A bounded source-corroboration World with local, non-persistent practice."
        : "This path is unavailable because its required public World, runtime, or project manifest is not the exact known package.",
    },
    steps: [
      {
        id: "world",
        title: "Working World",
        status: runtimeAvailable && publicAvailable ? "working-world" : "path-unavailable",
        text: "Compare readings, name their disagreement, and use separating evidence.",
        action: action(
          "action.source-corroboration.learner-operation",
          "Start the learner evidence operation",
          runtimeAvailable && publicAvailable,
          runtimeAvailable ? "public-world-unavailable" : "runtime-binding-unavailable",
        ),
      },
      {
        id: "sources",
        title: "Source boundary",
        status: "legacy-source-metadata",
        text: "The named research references are legacy metadata only; they do not provide source, claim, rights, or review authority.",
        action: null,
      },
      {
        id: "project",
        title: "Practical project",
        status: "fixture-template-only",
        text: "Use the exact written-explanation template: draft, revise, defend, and transfer without instructional assistance for protected operations.",
        action: action("path.source-corroboration.project-template", "Use the authored project template", projectAvailable, "project-template-unavailable"),
      },
      {
        id: "practice",
        title: "Foundation practice",
        status: "fixture-template-only",
        text: "Rehearse one prerequisite with a new example; it has no autonomous score or mastery claim.",
        action: action("path.source-corroboration.practice-template", "Use the authored practice template", practiceAvailable, "practice-template-unavailable"),
      },
      {
        id: "provider",
        title: "YouTube provider",
        status: "provider-disabled",
        text: "YouTube remains fixture-only and disabled; this route cannot create a player, request playback, or assign provider material.",
        action: action("path.source-corroboration.youtube-playback", "Play YouTube material", false, providerAvailable ? "provider-disabled" : "provider-policy-unavailable"),
      },
      {
        id: "proof",
        title: "Local proof boundary",
        status: "honour-based-local-proof",
        text: "Proof is honour-based and not persisted. It is not a public, assignment, or publication authority.",
        action: null,
      },
      {
        id: "return",
        title: "Return proof",
        status: "return-unavailable",
        text: "No reviewed delayed return task family is published for this route.",
        action: action("path.source-corroboration.return-proof", "Open return proof", false, "return-proof-unavailable"),
      },
    ],
    primaryAction: {
      id: "action.source-corroboration.learner-operation" as const,
      label: "Start the practical evidence operation",
      available: primaryAvailable,
      unavailableReason: primaryAvailable ? null : !runtimeAvailable ? "runtime-binding-unavailable" : !projectAvailable ? "project-template-unavailable" : "public-world-unavailable",
    },
    boundaries: [
      { id: "source-metadata", status: "legacy-source-metadata", text: "Research references are not reviewed source packages." },
      { id: "provider", status: "provider-disabled", text: "No provider request, playback, or assignment is available." },
      { id: "templates", status: "fixture-template-only", text: `Exact templates only: ${FIRST_PILOT_PROJECT_TEMPLATE.id}@${FIRST_PILOT_PROJECT_TEMPLATE.version} and ${FIRST_PILOT_PRACTICE_TEMPLATE.id}@${FIRST_PILOT_PRACTICE_TEMPLATE.version}.` },
      { id: "local-proof", status: "honour-based-local-proof", text: "Local proof is non-persistent and does not establish external authority." },
      { id: "return-proof", status: "return-unavailable", text: "Return proof remains unavailable." },
    ],
  });
}

export const SOURCE_CORROBORATION_PATH_PREVIEW = projectSourceCorroborationPreview();
