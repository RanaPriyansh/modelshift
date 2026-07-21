export const TOPIC_IDS = ["force_motion", "proportional_reasoning", "ai_learning"] as const;
export const WORLD_IDS = [
  "modelshift_force_motion_v1",
  "proportional_reasoning_v1",
  "ai_learning_guardrails_v1",
] as const;
export const SOURCE_IDS = [
  "openstax_newtons_first_law",
  "openstax_ratios_and_rate",
  "pnas_guardrailed_ai_learning",
  "unesco_genai_education_guidance",
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];
export type WorldId = (typeof WORLD_IDS)[number];
export type SourceId = (typeof SOURCE_IDS)[number];

export type AuthoredSource = {
  id: SourceId;
  title: string;
  locator: string;
  kind: "authoritative_educational" | "peer_reviewed_research" | "policy_guidance";
};

export type AuthoredMilestone = {
  id: string;
  title: string;
  objective: string;
};

export type AuthoredTopic = {
  id: TopicId;
  worldId: WorldId;
  ageModes: readonly ("child" | "teen" | "adult")[];
  title: string;
  objective: string;
  matchers: ReadonlyArray<{ phrase: string; weight: number }>;
  sourceIds: readonly SourceId[];
  milestones: readonly AuthoredMilestone[];
};

export const SOURCE_CATALOG: Readonly<Record<SourceId, AuthoredSource>> = {
  openstax_newtons_first_law: {
    id: "openstax_newtons_first_law",
    title: "Newton's First Law of Motion: Inertia",
    locator: "https://openstax.org/books/physics/pages/4-2-newtons-first-law-of-motion-inertia",
    kind: "authoritative_educational",
  },
  openstax_ratios_and_rate: {
    id: "openstax_ratios_and_rate",
    title: "Ratios and Rate",
    locator: "https://openstax.org/books/prealgebra-2e/pages/5-6-ratios-and-rate",
    kind: "authoritative_educational",
  },
  pnas_guardrailed_ai_learning: {
    id: "pnas_guardrailed_ai_learning",
    title: "Generative AI without guardrails can harm learning: Evidence from high school mathematics",
    locator: "https://doi.org/10.1073/pnas.2422633122",
    kind: "peer_reviewed_research",
  },
  unesco_genai_education_guidance: {
    id: "unesco_genai_education_guidance",
    title: "Guidance for generative AI in education and research",
    locator: "https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research",
    kind: "policy_guidance",
  },
};

export const TOPIC_INDEX: readonly AuthoredTopic[] = [
  {
    id: "force_motion",
    worldId: "modelshift_force_motion_v1",
    ageModes: ["teen", "adult"],
    title: "Force, motion, and proof after help",
    objective:
      "Build and test a causal model that distinguishes force, acceleration, and an object's existing velocity.",
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
    sourceIds: ["openstax_newtons_first_law"],
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
    worldId: "proportional_reasoning_v1",
    ageModes: ["child", "teen", "adult"],
    title: "Ratios, rates, and relationships that stay the same",
    objective:
      "Build and test a proportional model using exact quantities, then transfer it into a new representation without help.",
    matchers: [
      { phrase: "proportional reasoning", weight: 8 },
      { phrase: "proportion", weight: 7 },
      { phrase: "equivalent ratios", weight: 7 },
      { phrase: "unit rate", weight: 6 },
      { phrase: "ratio", weight: 5 },
      { phrase: "rate", weight: 3 },
      { phrase: "recipe", weight: 2 },
      { phrase: "map scale", weight: 4 },
    ],
    sourceIds: ["openstax_ratios_and_rate"],
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
    worldId: "ai_learning_guardrails_v1",
    ageModes: ["teen", "adult"],
    title: "Learning with AI without outsourcing the proof",
    objective:
      "Design a bounded AI-learning routine that separates assisted performance from independent evidence of learning.",
    matchers: [
      { phrase: "learning with ai", weight: 8 },
      { phrase: "ai learning", weight: 7 },
      { phrase: "generative ai", weight: 5 },
      { phrase: "artificial intelligence", weight: 5 },
      { phrase: "chatgpt", weight: 5 },
      { phrase: "ai tutor", weight: 5 },
      { phrase: "guardrail", weight: 4 },
      { phrase: "independent learning", weight: 3 },
      { phrase: "ai", weight: 2 },
    ],
    sourceIds: ["pnas_guardrailed_ai_learning", "unesco_genai_education_guidance"],
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
] as const;

export function topicById(topicId: TopicId): AuthoredTopic {
  const topic = TOPIC_INDEX.find((candidate) => candidate.id === topicId);
  if (!topic) throw new Error("Authored topic index is inconsistent.");
  return topic;
}

export function sourcesForTopic(topic: AuthoredTopic): AuthoredSource[] {
  return topic.sourceIds.map((sourceId) => SOURCE_CATALOG[sourceId]);
}
