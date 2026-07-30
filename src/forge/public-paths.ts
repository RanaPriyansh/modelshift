import { z } from "zod";

z.config({ jitless: true });

export const PUBLIC_GOAL_DIRECTION_IDS = [
  "ai-literacy",
  "become-an-engineer",
  "general-knowledge",
  "politics-and-government",
  "philosophy",
  "psychology",
  "software-development",
  "scientific-reasoning",
  "financial-literacy",
] as const;

export const publicGoalDirectionSchema = z.strictObject({
  id: z.enum(PUBLIC_GOAL_DIRECTION_IDS),
  title: z.string().trim().min(1).max(80),
  learnerQuestion: z.string().trim().min(3).max(240),
  desiredCapability: z.string().trim().min(3).max(280),
  practicalOutcome: z.string().trim().min(3).max(280),
  status: z.enum(["reviewed_components", "outline_only"]),
  availableNow: z.array(z.string().trim().min(1).max(160)).max(6),
  missingBeforePathPublication: z.array(z.string().trim().min(1).max(200)).min(1).max(8),
});

export type PublicGoalDirection = z.infer<typeof publicGoalDirectionSchema>;

const DIRECTIONS = [
  {
    id: "ai-literacy",
    title: "AI literacy",
    learnerQuestion: "I want to verify AI-generated claims before I rely on them.",
    desiredCapability:
      "Inspect a model-generated claim, trace its support, compare evidence, and state a decision with explicit uncertainty.",
    practicalOutcome: "Produce and defend a source-bound verification memo for a real decision.",
    status: "reviewed_components",
    availableNow: [
      "Source-corroboration ModelShift World",
      "Primary-source observation and inference World",
      "Fixture-only source-verification project",
    ],
    missingBeforePathPublication: [
      "Reviewed end-to-end path sequence",
      "Released project proof and delayed-return family",
      "Reviewed external-resource assignments and alternatives",
    ],
  },
  {
    id: "become-an-engineer",
    title: "Become an engineer",
    learnerQuestion: "I want to think, build, test, and communicate like an engineer.",
    desiredCapability:
      "Turn needs into constraints, reason quantitatively, build testable artifacts, diagnose failure, and defend trade-offs.",
    practicalOutcome: "Design, build, test, and explain a constrained engineering artifact.",
    status: "reviewed_components",
    availableNow: [
      "Force-and-motion causal-model World",
      "Proportional-reasoning exact-comparison World",
    ],
    missingBeforePathPublication: [
      "Materials, measurement, design, safety, and systems capability graph",
      "Reviewed build projects and human critique",
      "External standards and broad foundational coverage",
    ],
  },
  {
    id: "general-knowledge",
    title: "Build broad general knowledge",
    learnerQuestion: "I want a broad map of the world and the ability to connect ideas across domains.",
    desiredCapability:
      "Explain important ideas across science, history, civics, culture, technology, and practical life while tracing sources and limits.",
    practicalOutcome: "Build a source-linked knowledge map and use it to explain a current issue from several perspectives.",
    status: "outline_only",
    availableNow: [],
    missingBeforePathPublication: [
      "Broad reviewed entitlement map and prerequisite sequence",
      "Source packages across every included domain",
      "Cross-domain projects, proof families, and return schedule",
    ],
  },
  {
    id: "politics-and-government",
    title: "Politics and government",
    learnerQuestion: "I want to understand how governments work and evaluate political claims.",
    desiredCapability:
      "Explain institutions, incentives, rights, public finance, and policy trade-offs while distinguishing evidence from rhetoric.",
    practicalOutcome: "Compare a live policy proposal using primary sources, institutional context, and explicit value trade-offs.",
    status: "reviewed_components",
    availableNow: ["Primary-source observation and inference World"],
    missingBeforePathPublication: [
      "Jurisdiction-specific reviewed sources and update policy",
      "Institutional, constitutional, economic, and media-literacy capability graph",
      "Neutrality review, controversy handling, and delayed proof",
    ],
  },
  {
    id: "philosophy",
    title: "Philosophy",
    learnerQuestion: "I want to reason clearly about knowledge, ethics, reality, and a good life.",
    desiredCapability:
      "Reconstruct arguments charitably, expose assumptions, compare objections, and defend a bounded position.",
    practicalOutcome: "Write and orally defend an argument that survives a strong objection and revision.",
    status: "outline_only",
    availableNow: [],
    missingBeforePathPublication: [
      "Reviewed primary-text source packages and interpretation notes",
      "Argument reconstruction, logic, ethics, and epistemology capability graph",
      "Human-reviewed defence and feedback protocol",
    ],
  },
  {
    id: "psychology",
    title: "Psychology",
    learnerQuestion: "I want to understand how people think, learn, feel, and act without falling for weak claims.",
    desiredCapability:
      "Evaluate psychological claims, connect mechanisms to evidence, and distinguish population findings from individual diagnosis.",
    practicalOutcome: "Audit a popular psychology claim and design a safe, ethical observation or literature review.",
    status: "outline_only",
    availableNow: [],
    missingBeforePathPublication: [
      "Reviewed research methods and statistics foundation",
      "Clinical-boundary, crisis, and health-safety policy",
      "Current peer-reviewed source packages and replication context",
    ],
  },
  {
    id: "software-development",
    title: "Software development",
    learnerQuestion: "I want to build reliable software and understand the systems behind it.",
    desiredCapability:
      "Specify, implement, test, debug, secure, operate, and explain software under real constraints.",
    practicalOutcome: "Ship and defend a tested application with threat model, observability, and deployment evidence.",
    status: "outline_only",
    availableNow: [],
    missingBeforePathPublication: [
      "Language, tooling, systems, data, networking, testing, and security graph",
      "Versioned execution environments and safe code runner",
      "Reviewed project ladder, code review, and deployment proof",
    ],
  },
  {
    id: "scientific-reasoning",
    title: "Scientific reasoning",
    learnerQuestion: "I want to test explanations and reason from evidence like a scientist.",
    desiredCapability:
      "Turn explanations into competing predictions, choose separating tests, quantify uncertainty, and revise models.",
    practicalOutcome: "Design, run, analyze, and defend a reproducible investigation.",
    status: "reviewed_components",
    availableNow: [
      "Force-and-motion deterministic ModelShift World",
      "Proportional-reasoning exact-comparison World",
      "Primary-source observation and inference World",
    ],
    missingBeforePathPublication: [
      "Measurement, uncertainty, statistics, experimental design, and ethics graph",
      "Reviewed practical investigations across sciences",
      "Released project and delayed-retention proof families",
    ],
  },
  {
    id: "financial-literacy",
    title: "Financial literacy",
    learnerQuestion: "I want to make informed everyday financial decisions and understand their trade-offs.",
    desiredCapability:
      "Model cash flow, interest, risk, taxes, insurance, credit, and long-term trade-offs without treating education as personal advice.",
    practicalOutcome: "Build and explain a scenario-based financial plan with assumptions, sensitivity checks, and risk limits.",
    status: "reviewed_components",
    availableNow: ["Proportional-reasoning exact-comparison World"],
    missingBeforePathPublication: [
      "Jurisdiction-aware reviewed sources and update schedule",
      "Personal-finance boundary separating education from advice",
      "Interest, risk, tax, credit, insurance, and fraud capability graph",
    ],
  },
] as const;

export const PUBLIC_GOAL_DIRECTIONS: readonly PublicGoalDirection[] = Object.freeze(
  DIRECTIONS.map((direction) => Object.freeze(publicGoalDirectionSchema.parse(direction))),
);
