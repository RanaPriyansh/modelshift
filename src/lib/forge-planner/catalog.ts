import type { LearnerAgeMode, LearnerDepthMode, SourceProvenance } from "../../forge/contracts";
import { trustedWorldRegistry } from "../../forge/registry.server";
import {
  PUBLIC_SOURCE_IDS,
  PUBLIC_WORLD_IDS,
  PUBLIC_WORLD_ROUTES,
} from "../../forge/worlds";

export const TOPIC_IDS = [
  "force_motion",
  "proportional_reasoning",
  "ai_learning",
  "primary_source_reasoning",
] as const;
export const WORLD_IDS = PUBLIC_WORLD_IDS;
export const WORLD_ROUTES = PUBLIC_WORLD_ROUTES;
export const SOURCE_IDS = PUBLIC_SOURCE_IDS;

export type TopicId = (typeof TOPIC_IDS)[number];
export type WorldId = (typeof WORLD_IDS)[number];
export type WorldRoute = (typeof WORLD_ROUTES)[number];
export type SourceId = (typeof SOURCE_IDS)[number];

export type AuthoredSource = {
  id: SourceId;
  title: string;
  publisher: string;
  locator: string;
  contentVersion: string;
  kind: "authoritative_educational" | "peer_reviewed_research" | "primary_research" | "policy_guidance";
  reviewStatus: "reviewed";
  reviewedAt: string;
};

export type AuthoredMilestone = {
  id: string;
  title: string;
  objective: string;
};

export type AuthoredTopic = {
  id: TopicId;
  worldId: WorldId;
  worldVersion: string;
  route: WorldRoute;
  ageModes: readonly ("child" | "teen" | "adult")[];
  depthModes: readonly ("quick" | "standard" | "deep")[];
  title: string;
  objective: string;
  matchers: ReadonlyArray<{ phrase: string; weight: number }>;
  sourceIds: readonly SourceId[];
  milestones: readonly AuthoredMilestone[];
};

type TopicBlueprint = Pick<AuthoredTopic, "id" | "worldId" | "matchers" | "milestones">;

const TOPIC_BLUEPRINTS = [
  {
    id: "force_motion",
    worldId: "world.force-and-motion",
    matchers: [
      { phrase: "newton's first law", weight: 8 },
      { phrase: "newtons first law", weight: 8 },
      { phrase: "force and motion", weight: 7 },
      { phrase: "moving object", weight: 7 },
      { phrase: "keeps moving", weight: 6 },
      { phrase: "keep moving", weight: 6 },
      { phrase: "engine turns off", weight: 5 },
      { phrase: "engine is off", weight: 5 },
      { phrase: "force", weight: 2 },
      { phrase: "motion", weight: 2 },
      { phrase: "velocity", weight: 3 },
      { phrase: "acceleration", weight: 3 },
      { phrase: "friction", weight: 3 },
      { phrase: "inertia", weight: 4 },
    ],
    milestones: [
      {
        id: "force_motion_initial_model",
        title: "Commit an initial model",
        objective: "Predict what happens after a brief force ends and state the causal reason before receiving help.",
      },
      {
        id: "force_motion_discriminating_test",
        title: "Run a discriminating test",
        objective: "Compare authored force and motion cases whose outcomes separate plausible causal models.",
      },
      {
        id: "force_motion_reconstruct",
        title: "Reconstruct the rule",
        objective: "Explain how net force changes velocity without treating force as the velocity itself.",
      },
      {
        id: "force_motion_cold_transfer",
        title: "Prove it without help",
        objective: "Apply the reconstructed model to an unfamiliar representation with assistance disabled.",
      },
    ],
  },
  {
    id: "proportional_reasoning",
    worldId: "world.proportional-reasoning",
    matchers: [
      { phrase: "proportional reasoning", weight: 8 },
      { phrase: "proportion", weight: 7 },
      { phrase: "proportions", weight: 7 },
      { phrase: "equivalent ratio", weight: 7 },
      { phrase: "equivalent ratios", weight: 7 },
      { phrase: "unit rate", weight: 6 },
      { phrase: "unit rates", weight: 6 },
      { phrase: "ratio", weight: 5 },
      { phrase: "ratios", weight: 5 },
      { phrase: "rate", weight: 3 },
      { phrase: "rates", weight: 3 },
      { phrase: "recipe", weight: 2 },
      { phrase: "map scale", weight: 4 },
    ],
    milestones: [
      {
        id: "proportional_initial_model",
        title: "Commit a comparison rule",
        objective: "Choose which mixture keeps the same relationship and explain the mechanism before receiving help.",
      },
      {
        id: "proportional_separating_test",
        title: "Run an exact separating test",
        objective: "Compare multiplication and additive-change models using exact rational arithmetic.",
      },
      {
        id: "proportional_reconstruct",
        title: "Reconstruct the invariant",
        objective: "State what must remain equal when both quantities scale together.",
      },
      {
        id: "proportional_cold_transfer",
        title: "Carry it into a map",
        objective: "Use the relationship in an unfamiliar scale representation with all assistance removed.",
      },
    ],
  },
  {
    id: "ai_learning",
    worldId: "world.source-corroboration",
    matchers: [
      { phrase: "learning with ai", weight: 8 },
      { phrase: "ai learning", weight: 7 },
      { phrase: "generative ai", weight: 5 },
      { phrase: "artificial intelligence", weight: 5 },
      { phrase: "chatgpt", weight: 5 },
      { phrase: "ai tutor", weight: 5 },
      { phrase: "guardrail", weight: 4 },
      { phrase: "guardrails", weight: 4 },
      { phrase: "independent learning", weight: 3 },
      { phrase: "ai", weight: 2 },
    ],
    milestones: [
      {
        id: "ai_learning_claim_boundary",
        title: "Set the evidence boundary",
        objective: "Separate claims about immediate assisted performance from claims about independent learning.",
      },
      {
        id: "ai_learning_guardrails",
        title: "Design assistance guardrails",
        objective: "Require an attempt first, scope the help, and keep deterministic checks outside the model.",
      },
      {
        id: "ai_learning_proof_mode",
        title: "Add proof after help",
        objective: "Remove assistance for a transfer task and define the evidence that will count as success.",
      },
      {
        id: "ai_learning_audit",
        title: "Audit the learning contract",
        objective: "Check age controls, provenance labels, fallback behavior, and unsupported generalizations.",
      },
    ],
  },
  {
    id: "primary_source_reasoning",
    worldId: "world.primary-source-reasoning",
    matchers: [
      { phrase: "primary source reasoning", weight: 9 },
      { phrase: "primary source", weight: 8 },
      { phrase: "primary sources", weight: 8 },
      { phrase: "historical photograph", weight: 8 },
      { phrase: "historical photographs", weight: 8 },
      { phrase: "photograph prove", weight: 7 },
      { phrase: "photo prove", weight: 7 },
      { phrase: "catalog metadata", weight: 6 },
      { phrase: "historical evidence", weight: 6 },
      { phrase: "observation and inference", weight: 6 },
      { phrase: "history", weight: 2 },
      { phrase: "photograph", weight: 2 },
    ],
    milestones: [
      {
        id: "primary_source_commit",
        title: "Commit what the image can establish",
        objective: "Make a claim from the photograph before its catalog record or any explanation is revealed.",
      },
      {
        id: "primary_source_separate",
        title: "Separate the evidence layers",
        objective: "Compare the image with its reviewed catalog record and test two plausible readings.",
      },
      {
        id: "primary_source_reconstruct",
        title: "Reconstruct the boundary",
        objective: "State how observation, catalog metadata, inference, and open questions differ.",
      },
      {
        id: "primary_source_transfer",
        title: "Classify an unfamiliar source",
        objective: "Apply the four-part distinction to a different historical photograph with support removed.",
      },
    ],
  },
] as const satisfies readonly TopicBlueprint[];

function plannerAgeMode(mode: LearnerAgeMode): "child" | "teen" | "adult" {
  if (mode === "under-13") return "child";
  if (mode === "13-17") return "teen";
  return "adult";
}

function plannerDepthMode(mode: LearnerDepthMode): "quick" | "standard" | "deep" {
  if (mode === "introductory") return "quick";
  if (mode === "core") return "standard";
  return "deep";
}

function isSourceId(value: string): value is SourceId {
  return SOURCE_IDS.includes(value as SourceId);
}

function sourceKind(source: SourceProvenance): AuthoredSource["kind"] {
  if (source.kind === "peer-reviewed") return "peer_reviewed_research";
  if (source.kind === "primary") return "primary_research";
  if (source.kind === "institutional") return "policy_guidance";
  return "authoritative_educational";
}

function authoredSource(sourceId: SourceId): AuthoredSource {
  const source = trustedWorldRegistry.getSource(sourceId);
  if (!source || source.review.status !== "reviewed") {
    throw new Error(`Canonical source ${sourceId} is missing or unreviewed.`);
  }
  return Object.freeze({
    id: sourceId,
    title: source.title,
    publisher: source.publisher,
    locator: source.url,
    contentVersion: source.contentVersion,
    kind: sourceKind(source),
    reviewStatus: "reviewed",
    reviewedAt: source.review.reviewedAt,
  });
}

export const SOURCE_CATALOG = Object.freeze(
  Object.fromEntries(SOURCE_IDS.map((sourceId) => [sourceId, authoredSource(sourceId)])),
) as Readonly<Record<SourceId, AuthoredSource>>;

function compileTopic(blueprint: TopicBlueprint): AuthoredTopic {
  const pack = trustedWorldRegistry.getPack(blueprint.worldId);
  if (!pack || pack.release.status !== "released" || pack.manifest.availability.status !== "available") {
    throw new Error(`Canonical World ${blueprint.worldId} is missing or unavailable.`);
  }
  const capability = pack.capabilities.find((candidate) => pack.manifest.capabilityIds.includes(candidate.id));
  if (!capability) throw new Error(`Canonical World ${blueprint.worldId} has no bound capability.`);
  const sourceIds = pack.manifest.sources.map((source) => {
    if (!isSourceId(source.id)) throw new Error(`World ${blueprint.worldId} declares an unknown canonical source.`);
    return source.id;
  });

  return Object.freeze({
    id: blueprint.id,
    worldId: blueprint.worldId,
    worldVersion: pack.manifest.version,
    route: pack.manifest.route as WorldRoute,
    ageModes: Object.freeze(pack.manifest.ageModes.map(plannerAgeMode)),
    depthModes: Object.freeze(pack.manifest.depthModes.map(plannerDepthMode)),
    title: pack.manifest.title,
    objective: capability.description,
    matchers: Object.freeze(blueprint.matchers.map((matcher) => Object.freeze({ ...matcher }))),
    sourceIds: Object.freeze(sourceIds),
    milestones: Object.freeze(blueprint.milestones.map((milestone) => Object.freeze({ ...milestone }))),
  });
}

export const TOPIC_INDEX: readonly AuthoredTopic[] = Object.freeze(TOPIC_BLUEPRINTS.map(compileTopic));

export function topicById(topicId: TopicId): AuthoredTopic {
  const topic = TOPIC_INDEX.find((candidate) => candidate.id === topicId);
  if (!topic) throw new Error("Authored topic index is inconsistent.");
  return topic;
}

export function sourcesForTopic(topic: AuthoredTopic): AuthoredSource[] {
  return topic.sourceIds.map((sourceId) => SOURCE_CATALOG[sourceId]);
}
